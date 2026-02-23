import { getAllModuleFreshness } from '@/lib/dynamic-content';
import { isStale, isExpired, FRESHNESS_POLICIES } from '@/lib/freshness-policies';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export interface FreshnessCheckResult {
  staleModules: string[];
  expiredModules: string[];
  alertsSent: number;
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
