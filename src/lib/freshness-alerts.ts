import { getAllModuleFreshness, upsertContent } from '@/lib/dynamic-content';
import { isStale, isExpired, FRESHNESS_POLICIES } from '@/lib/freshness-policies';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export interface FreshnessCheckResult {
  staleModules: string[];
  expiredModules: string[];
  alertsSent: number;
}

export interface CronFreshnessAlert {
  jobLabel: string;
  lastRunAt: string | null;
  expectedIntervalMinutes: number;
  detectedAt: string;
  severity: 'warning' | 'critical';
}

/**
 * Send a freshness alert when a cron job is detected as stale by the watchdog.
 *
 * 1. Persists the alert into DynamicContent (key: system:freshness-alerts)
 * 2. Optionally emails the admin via Resend if ADMIN_EMAIL is set
 * 3. Logs with structured logger — never throws so the watchdog keeps running
 */
export async function sendFreshnessAlert(
  jobLabel: string,
  lastRunAt: number | null,
  expectedIntervalMinutes: number,
): Promise<void> {
  try {
    const alert: CronFreshnessAlert = {
      jobLabel,
      lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null,
      expectedIntervalMinutes,
      detectedAt: new Date().toISOString(),
      severity: lastRunAt === null ? 'critical' : 'warning',
    };

    // --- 1. Persist to DynamicContent ---
    // Read existing alerts, append, and cap at 50 entries
    let existingAlerts: CronFreshnessAlert[] = [];
    try {
      const existing = await prisma.dynamicContent.findUnique({
        where: { contentKey: 'system:freshness-alerts' },
      });
      if (existing) {
        existingAlerts = JSON.parse(existing.data) as CronFreshnessAlert[];
      }
    } catch {
      // First time — no record yet, start fresh
    }

    // Remove any previous alert for the same job (keep latest only)
    existingAlerts = existingAlerts.filter(a => a.jobLabel !== jobLabel);
    existingAlerts.unshift(alert);
    // Cap at 50 most recent alerts
    if (existingAlerts.length > 50) {
      existingAlerts = existingAlerts.slice(0, 50);
    }

    await upsertContent(
      'system:freshness-alerts',
      'system',
      'freshness-alerts',
      existingAlerts,
      { sourceType: 'manual' },
    );

    logger.warn('Cron freshness alert recorded', {
      jobLabel,
      lastRunAt: alert.lastRunAt,
      expectedIntervalMinutes,
      severity: alert.severity,
    });

    // --- 2. Optionally email admin via Resend ---
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      try {
        const { Resend } = await import('resend');
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          const resend = new Resend(apiKey);
          const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <alerts@spacenexus.us>';

          await resend.emails.send({
            from: fromEmail,
            to: adminEmail,
            subject: `[SpaceNexus] Stale cron job: ${jobLabel}`,
            html: `
              <h2>Cron Job Freshness Alert</h2>
              <p><strong>Job:</strong> ${jobLabel}</p>
              <p><strong>Last successful run:</strong> ${alert.lastRunAt || 'Never'}</p>
              <p><strong>Expected interval:</strong> ${expectedIntervalMinutes} minutes</p>
              <p><strong>Severity:</strong> ${alert.severity}</p>
              <p><strong>Detected at:</strong> ${alert.detectedAt}</p>
              <hr/>
              <p style="color:#666;font-size:12px">This is an automated alert from SpaceNexus data pipeline monitoring.</p>
            `,
          });

          logger.info('Freshness alert email sent', { jobLabel, to: adminEmail });
        }
      } catch (emailError) {
        // Email is best-effort — don't crash the watchdog
        logger.warn('Failed to send freshness alert email', {
          jobLabel,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }
    }
  } catch (error) {
    // Never crash the watchdog — log and move on
    logger.error('Failed to record freshness alert', {
      jobLabel,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check all modules for data staleness and create admin notifications
 * for any critical modules that have gone stale (past their TTL).
 *
 * Expired modules (>2x TTL) get higher-priority alerts.
 */
export async function checkAndAlertStaleness(): Promise<FreshnessCheckResult> {
  const staleModules: string[] = [];
  const expiredModules: string[] = [];
  let alertsSent = 0;

  try {
    // 1. Get all module freshness data
    const allFreshness = await getAllModuleFreshness();

    // 2. Check each module against its TTL policy
    for (const [moduleName, freshness] of Object.entries(allFreshness)) {
      if (!freshness.lastRefreshed) continue;

      const lastRefreshed = new Date(freshness.lastRefreshed);

      if (isExpired(moduleName, lastRefreshed)) {
        expiredModules.push(moduleName);
      } else if (isStale(moduleName, lastRefreshed)) {
        staleModules.push(moduleName);
      }
    }

    // Also check modules in FRESHNESS_POLICIES that have no data at all
    for (const policyModule of Object.keys(FRESHNESS_POLICIES)) {
      if (!allFreshness[policyModule]) {
        // Module has a policy but no data - treat as expired
        expiredModules.push(policyModule);
      }
    }

    // Deduplicate
    const uniqueExpired = Array.from(new Set(expiredModules));
    const uniqueStale = Array.from(new Set(staleModules));

    // 3. If any critical modules are stale or expired, create admin notifications
    if (uniqueExpired.length > 0 || uniqueStale.length > 0) {
      // Find all admin users
      const adminUsers = await prisma.user.findMany({
        where: { isAdmin: true },
        select: { id: true },
      });

      if (adminUsers.length > 0) {
        const expiredList = uniqueExpired.length > 0
          ? `Expired (>2x TTL): ${uniqueExpired.join(', ')}`
          : '';
        const staleList = uniqueStale.length > 0
          ? `Stale (>TTL): ${uniqueStale.join(', ')}`
          : '';

        const message = [
          `${uniqueExpired.length + uniqueStale.length} module(s) need attention.`,
          expiredList,
          staleList,
        ].filter(Boolean).join('\n');

        // Create notification for each admin
        for (const admin of adminUsers) {
          // Check if a similar notification was already sent in the last 6 hours
          // to avoid spamming admins
          const recentAlert = await prisma.notification.findFirst({
            where: {
              userId: admin.id,
              type: 'system',
              title: 'Data Stale Alert',
              createdAt: {
                gte: new Date(Date.now() - 6 * 60 * 60 * 1000),
              },
            },
          });

          if (!recentAlert) {
            await prisma.notification.create({
              data: {
                userId: admin.id,
                type: 'system',
                title: 'Data Stale Alert',
                message,
                linkUrl: '/admin/data-freshness',
                read: false,
              },
            });
            alertsSent++;
          }
        }
      }

      logger.warn('Freshness check found stale/expired modules', {
        staleCount: uniqueStale.length,
        expiredCount: uniqueExpired.length,
        alertsSent,
      });
    } else {
      logger.info('Freshness check: all modules within TTL');
    }

    return {
      staleModules: uniqueStale,
      expiredModules: uniqueExpired,
      alertsSent,
    };
  } catch (error) {
    logger.error('Freshness check failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      staleModules,
      expiredModules,
      alertsSent: 0,
    };
  }
}
