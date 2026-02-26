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
  jobName: string;
  lastRun: string | null;
  expectedInterval: string;
  alertedAt: string;
  resolved: boolean;
  severity: 'warning' | 'critical';
}

/**
 * Format minutes into a human-readable interval string.
 */
function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

/**
 * Read persisted freshness alerts from DynamicContent.
 */
async function readPersistedAlerts(): Promise<CronFreshnessAlert[]> {
  try {
    const existing = await prisma.dynamicContent.findUnique({
      where: { contentKey: 'system:freshness-alerts' },
    });
    if (existing) {
      return JSON.parse(existing.data) as CronFreshnessAlert[];
    }
  } catch {
    // First time — no record yet
  }
  return [];
}

/**
 * Write persisted freshness alerts to DynamicContent, capped at 50.
 */
async function writePersistedAlerts(alerts: CronFreshnessAlert[]): Promise<void> {
  const capped = alerts.slice(0, 50);
  await upsertContent(
    'system:freshness-alerts',
    'system',
    'freshness-alerts',
    capped,
    { sourceType: 'manual' },
  );
}

/**
 * Send a freshness alert when a cron job is detected as stale by the watchdog.
 *
 * 1. Persists the alert into DynamicContent (key: system:freshness-alerts)
 * 2. Optionally emails the admin via Resend if ADMIN_EMAIL is set
 * 3. Logs with structured logger — never throws so the watchdog keeps running
 */
export async function sendFreshnessAlert(
  jobName: string,
  lastRunAt: number | null,
  expectedIntervalMinutes: number,
): Promise<void> {
  try {
    const alert: CronFreshnessAlert = {
      jobName,
      lastRun: lastRunAt ? new Date(lastRunAt).toISOString() : null,
      expectedInterval: formatInterval(expectedIntervalMinutes),
      alertedAt: new Date().toISOString(),
      resolved: false,
      severity: lastRunAt === null ? 'critical' : 'warning',
    };

    // --- 1. Persist to DynamicContent ---
    let existingAlerts = await readPersistedAlerts();

    // Remove any previous unresolved alert for the same job (keep latest only)
    existingAlerts = existingAlerts.filter(
      a => !(a.jobName === jobName && !a.resolved)
    );
    existingAlerts.unshift(alert);

    await writePersistedAlerts(existingAlerts);

    logger.warn('Cron freshness alert recorded', {
      jobName,
      lastRun: alert.lastRun,
      expectedInterval: alert.expectedInterval,
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
            subject: `[SpaceNexus] Stale cron job: ${jobName}`,
            html: `
              <h2>Cron Job Freshness Alert</h2>
              <p><strong>Job:</strong> ${jobName}</p>
              <p><strong>Last successful run:</strong> ${alert.lastRun || 'Never'}</p>
              <p><strong>Expected interval:</strong> ${alert.expectedInterval}</p>
              <p><strong>Severity:</strong> ${alert.severity}</p>
              <p><strong>Detected at:</strong> ${alert.alertedAt}</p>
              <hr/>
              <p style="color:#666;font-size:12px">This is an automated alert from SpaceNexus data pipeline monitoring.</p>
            `,
          });

          logger.info('Freshness alert email sent', { jobName, to: adminEmail });
        }
      } catch (emailError) {
        // Email is best-effort — don't crash the watchdog
        logger.warn('Failed to send freshness alert email', {
          jobName,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }
    }
  } catch (error) {
    // Never crash the watchdog — log and move on
    logger.error('Failed to record freshness alert', {
      jobName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Resolve any outstanding freshness alert for a job that has recovered.
 * Called when a cron job succeeds after previously being stale.
 * Never throws so the caller keeps running.
 */
export async function resolveFreshnessAlert(jobName: string): Promise<void> {
  try {
    const alerts = await readPersistedAlerts();
    let changed = false;

    for (const alert of alerts) {
      if (alert.jobName === jobName && !alert.resolved) {
        alert.resolved = true;
        changed = true;
      }
    }

    if (changed) {
      await writePersistedAlerts(alerts);
      logger.info('Cron freshness alert resolved', { jobName });
    }
  } catch (error) {
    logger.error('Failed to resolve freshness alert', {
      jobName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get all persisted freshness alerts. Safe for monitoring endpoints.
 */
export async function getFreshnessAlerts(): Promise<CronFreshnessAlert[]> {
  try {
    return await readPersistedAlerts();
  } catch (error) {
    logger.error('Failed to read freshness alerts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
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
