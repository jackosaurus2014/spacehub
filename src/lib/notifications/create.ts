import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Mapping of notification `type` strings to the corresponding boolean field
 * on NotificationPreference. When a type has no mapping the notification is
 * always delivered (subject to ALWAYS_DELIVER_TYPES exceptions).
 */
const typeToPreference: Record<string, string> = {
  reply: 'forumReplies',
  mention: 'forumReplies',
  thread_reply: 'forumReplies',
  follow: 'directMessages',
  message: 'directMessages',
  direct_message: 'directMessages',
  vote: 'forumReplies',
  accepted_answer: 'forumReplies',
  marketplace_update: 'marketplaceUpdates',
  marketplace_match: 'marketplaceUpdates',
  job_match: 'marketplaceUpdates',
  claim_approved: 'marketplaceUpdates',
  watchlist: 'watchlistAlerts',
  watchlist_alert: 'watchlistAlerts',
  news_digest: 'newsDigest',
};

// Types that always get delivered regardless of preferences.
const ALWAYS_DELIVER_TYPES = new Set([
  'moderation',
  'system',
  'trial_expiring',
  'billing',
]);

export interface CreateNotificationOptions {
  userId: string;
  /** Enum-like string, e.g. 'direct_message', 'claim_approved', 'reply'. */
  type: string;
  title: string;
  body?: string;
  link?: string;
  /** Defaults to true. When false, preference checks are bypassed. */
  respectPreferences?: boolean;
  relatedUserId?: string;
  relatedContentType?: string;
  relatedContentId?: string;
}

/**
 * Create an in-app notification for a user. Safe to call from any
 * event site — all errors are logged and swallowed so the caller flow
 * is never broken by a notification failure.
 */
export async function createNotification(
  opts: CreateNotificationOptions
): Promise<void> {
  try {
    const respectPrefs = opts.respectPreferences !== false;

    // Don't notify a user about their own action.
    if (opts.relatedUserId && opts.relatedUserId === opts.userId) {
      return;
    }

    if (respectPrefs && !ALWAYS_DELIVER_TYPES.has(opts.type)) {
      const prefField = typeToPreference[opts.type];
      if (prefField) {
        const prefs = await prisma.notificationPreference.findUnique({
          where: { userId: opts.userId },
        });
        if (
          prefs &&
          (prefs as unknown as Record<string, unknown>)[prefField] === false
        ) {
          logger.debug('Notification skipped due to user preference', {
            userId: opts.userId,
            type: opts.type,
            preferenceField: prefField,
          });
          return;
        }
      }
    }

    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        // The Prisma model stores the body in `message`.
        message: opts.body ?? '',
        linkUrl: opts.link ?? null,
        relatedUserId: opts.relatedUserId ?? null,
        relatedContentType: opts.relatedContentType ?? null,
        relatedContentId: opts.relatedContentId ?? null,
      },
    });
  } catch (error) {
    logger.error('createNotification failed', {
      error: error instanceof Error ? error.message : String(error),
      userId: opts.userId,
      type: opts.type,
    });
  }
}
