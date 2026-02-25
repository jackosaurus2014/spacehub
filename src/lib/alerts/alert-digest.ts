import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

// ============================================================
// Types
// ============================================================

export type AlertDigestMode = 'instant' | 'hourly' | 'daily' | 'weekly';

export interface NotificationPreferences {
  alertDigestMode: AlertDigestMode;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  quietHoursTimezone: string;
}

export interface DigestItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  url?: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  alertDigestMode: 'instant',
  quietHoursStart: null,
  quietHoursEnd: null,
  quietHoursTimezone: 'UTC',
};

// ============================================================
// Quiet Hours
// ============================================================

/**
 * Check if the current time is within a user's configured quiet hours.
 *
 * Quiet hours can span midnight (e.g., 22:00 - 07:00). When
 * quietStart > quietEnd it wraps around midnight. Returns false
 * if quiet hours are disabled (either value is null).
 */
export function isQuietHours(
  quietStart: number | null,
  quietEnd: number | null,
  timezone: string
): boolean {
  if (quietStart === null || quietEnd === null) return false;

  let currentHour: number;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    currentHour = parseInt(formatter.format(now), 10);
    // Intl can return 24 for midnight in some locales
    if (currentHour === 24) currentHour = 0;
  } catch {
    // Invalid timezone — fall back to UTC
    logger.warn('Invalid timezone for quiet hours, falling back to UTC', { timezone });
    currentHour = new Date().getUTCHours();
  }

  if (quietStart <= quietEnd) {
    // Same-day range, e.g. 9-17 (quiet during business hours)
    return currentHour >= quietStart && currentHour < quietEnd;
  }

  // Overnight range, e.g. 22-7 (quiet overnight)
  return currentHour >= quietStart || currentHour < quietEnd;
}

// ============================================================
// Notification Preferences Lookup
// ============================================================

/**
 * Retrieve a user's notification preferences from the
 * NotificationPreference table. Returns sensible defaults
 * if no record exists.
 */
export async function getNotificationPreferences(
  userId: string,
  prisma: PrismaClient
): Promise<NotificationPreferences> {
  try {
    // Use `as any` for new schema fields until prisma generate picks them up (EPERM on Windows)
    const record = await (prisma.notificationPreference as any).findUnique({
      where: { userId },
    });

    if (!record) {
      return { ...DEFAULT_PREFERENCES };
    }

    return {
      alertDigestMode: (record as any).alertDigestMode || DEFAULT_PREFERENCES.alertDigestMode,
      quietHoursStart: (record as any).quietHoursStart ?? DEFAULT_PREFERENCES.quietHoursStart,
      quietHoursEnd: (record as any).quietHoursEnd ?? DEFAULT_PREFERENCES.quietHoursEnd,
      quietHoursTimezone: (record as any).quietHoursTimezone || DEFAULT_PREFERENCES.quietHoursTimezone,
    };
  } catch (error) {
    logger.error('Error fetching notification preferences', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...DEFAULT_PREFERENCES };
  }
}

// ============================================================
// Digest Queue (using DynamicContent as a simple KV store)
// ============================================================

/**
 * Queue an alert to be included in the next digest email for a user.
 * Items are stored in a DynamicContent row keyed by user ID.
 */
export async function queueForDigest(
  userId: string,
  alert: DigestItem,
  prisma: PrismaClient
): Promise<void> {
  const contentKey = `user:${userId}:alert-digest-queue`;

  try {
    const record = await prisma.dynamicContent.findUnique({
      where: { contentKey },
    });

    const queue: DigestItem[] = record ? JSON.parse(record.data) : [];
    queue.push(alert);

    const dataStr = JSON.stringify(queue);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days

    await prisma.dynamicContent.upsert({
      where: { contentKey },
      update: {
        data: dataStr,
        refreshedAt: now,
      },
      create: {
        contentKey,
        module: 'alert-digest',
        section: 'queue',
        data: dataStr,
        sourceType: 'system',
        lastVerified: now,
        refreshedAt: now,
        expiresAt,
      },
    });

    logger.debug('Alert queued for digest', { userId, alertId: alert.id });
  } catch (error) {
    logger.error('Error queuing alert for digest', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Retrieve and clear the digest queue for a user.
 * Returns the queued items and removes the DynamicContent record.
 */
export async function drainDigestQueue(
  userId: string,
  prisma: PrismaClient
): Promise<DigestItem[]> {
  const contentKey = `user:${userId}:alert-digest-queue`;

  try {
    const record = await prisma.dynamicContent.findUnique({
      where: { contentKey },
    });

    if (!record) return [];

    const queue: DigestItem[] = JSON.parse(record.data);

    // Clear the queue
    await prisma.dynamicContent.delete({ where: { contentKey } });

    return queue;
  } catch (error) {
    logger.error('Error draining digest queue', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ============================================================
// Delivery Decision
// ============================================================

/**
 * Determine whether an alert should be delivered immediately or
 * queued for a future digest, taking both the user's digest mode
 * and quiet hours into account.
 *
 * Returns `'deliver'` when the alert should be sent right away,
 * or `'queue'` when it should be batched into a digest.
 */
export function shouldDeliverNow(prefs: NotificationPreferences): 'deliver' | 'queue' {
  // If user is in quiet hours, always queue (regardless of digest mode)
  if (isQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd, prefs.quietHoursTimezone)) {
    return 'queue';
  }

  // If digest mode is anything other than instant, queue
  if (prefs.alertDigestMode !== 'instant') {
    return 'queue';
  }

  return 'deliver';
}

// ============================================================
// Batch Digest Processing
// ============================================================

/**
 * Process digest queues for all users who have pending items and
 * match the specified digest mode. This function is designed to be
 * called by a cron job:
 *
 *   - Hourly cron  -> processDigestBatch(prisma, 'hourly')
 *   - Daily cron   -> processDigestBatch(prisma, 'daily')
 *   - Weekly cron  -> processDigestBatch(prisma, 'weekly')
 *
 * It also processes any alerts that were queued during quiet hours
 * (regardless of the user's digest mode) if quiet hours have ended.
 */
export async function processDigestBatch(
  prisma: PrismaClient,
  mode: 'hourly' | 'daily' | 'weekly'
): Promise<{ usersProcessed: number; alertsSent: number; errors: number }> {
  const stats = { usersProcessed: 0, alertsSent: 0, errors: 0 };

  try {
    // Find all digest queue entries
    const queueEntries = await prisma.dynamicContent.findMany({
      where: {
        module: 'alert-digest',
        section: 'queue',
      },
    });

    if (queueEntries.length === 0) {
      logger.debug(`No pending digest queues for ${mode} batch`);
      return stats;
    }

    for (const entry of queueEntries) {
      // Extract userId from contentKey: "user:{userId}:alert-digest-queue"
      const match = entry.contentKey.match(/^user:(.+):alert-digest-queue$/);
      if (!match) continue;

      const userId = match[1];

      try {
        const prefs = await getNotificationPreferences(userId, prisma);

        // Only process if this user's digest mode matches OR if they're
        // no longer in quiet hours (so queued quiet-hours alerts get released).
        const modeMatches = prefs.alertDigestMode === mode;
        const wasQuietNowClear =
          !isQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd, prefs.quietHoursTimezone);

        if (!modeMatches && !wasQuietNowClear) {
          continue;
        }

        const items = await drainDigestQueue(userId, prisma);
        if (items.length === 0) continue;

        stats.usersProcessed++;

        // Create pending AlertDelivery records for each queued item so
        // the existing deliverAlerts() pipeline picks them up.
        const deliveryRecords = items.map((item) => ({
          userId,
          channel: 'email' as const,
          status: 'pending',
          title: item.title,
          message: item.message,
          source: 'digest',
          data: {
            digestMode: mode,
            originalType: item.type,
            url: item.url,
          } as any,
        }));

        if (deliveryRecords.length > 0) {
          await prisma.alertDelivery.createMany({ data: deliveryRecords });
          stats.alertsSent += deliveryRecords.length;
        }

        logger.info('Digest batch processed for user', {
          userId,
          mode,
          itemCount: items.length,
        });
      } catch (userError) {
        logger.error('Error processing digest for user', {
          userId,
          mode,
          error: userError instanceof Error ? userError.message : String(userError),
        });
        stats.errors++;
      }
    }

    logger.info('Digest batch processing complete', { mode, ...stats });
  } catch (error) {
    logger.error('Error in processDigestBatch', {
      mode,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return stats;
}
