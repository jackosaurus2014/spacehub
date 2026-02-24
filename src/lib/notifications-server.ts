import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedUserId?: string;
  relatedContentType?: string;
  relatedContentId?: string;
  linkUrl?: string;
}

// Map notification types to NotificationPreference boolean fields
const typeToPreference: Record<string, string> = {
  reply: 'forumReplies',
  mention: 'forumReplies',
  thread_reply: 'forumReplies',
  follow: 'directMessages',
  message: 'directMessages',
  vote: 'forumReplies',
  accepted_answer: 'forumReplies',
  marketplace_update: 'marketplaceUpdates',
  marketplace_match: 'marketplaceUpdates',
  watchlist: 'watchlistAlerts',
  watchlist_alert: 'watchlistAlerts',
  news_digest: 'newsDigest',
};

// Types that should always be delivered regardless of preferences
const ALWAYS_DELIVER_TYPES = new Set(['moderation', 'system']);

/**
 * Create a single in-app notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    // Don't notify yourself
    if (params.relatedUserId && params.relatedUserId === params.userId) {
      return null;
    }

    // --- Preference check ---
    // System/moderation notifications always get through
    if (!ALWAYS_DELIVER_TYPES.has(params.type)) {
      const prefField = typeToPreference[params.type];
      if (prefField) {
        const prefs = await prisma.notificationPreference.findUnique({
          where: { userId: params.userId },
        });
        // If preferences exist and user opted out, skip creation
        if (prefs && (prefs as Record<string, unknown>)[prefField] === false) {
          logger.debug('Notification skipped due to user preference', {
            userId: params.userId,
            type: params.type,
            preferenceField: prefField,
          });
          return null;
        }
        // If no preferences exist, defaults are all true — allow through
      }
    }

    // --- Deduplication check ---
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        ...(params.relatedContentId ? { relatedContentId: params.relatedContentId } : {}),
        createdAt: { gte: fiveMinutesAgo },
      },
    });
    if (existing) {
      logger.debug('Notification skipped due to deduplication', {
        userId: params.userId,
        type: params.type,
        relatedContentId: params.relatedContentId || null,
        existingNotificationId: existing.id,
      });
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedUserId: params.relatedUserId || null,
        relatedContentType: params.relatedContentType || null,
        relatedContentId: params.relatedContentId || null,
        linkUrl: params.linkUrl || null,
      },
    });

    return notification;
  } catch (error) {
    logger.error('Failed to create notification', {
      error: error instanceof Error ? error.message : String(error),
      params: { userId: params.userId, type: params.type },
    });
    return null;
  }
}

/**
 * Notify all subscribers of a thread about a new reply
 * Excludes the author of the reply
 */
export async function notifyThreadSubscribers(
  threadId: string,
  threadTitle: string,
  replyAuthorId: string,
  replyAuthorName: string,
  categorySlug: string
) {
  try {
    const subscriptions = await prisma.threadSubscription.findMany({
      where: {
        threadId,
        userId: { not: replyAuthorId },
      },
      select: { userId: true },
    });

    if (subscriptions.length === 0) return;

    const notifications = subscriptions.map((sub: { userId: string }) => ({
      userId: sub.userId,
      type: 'reply',
      title: 'New reply',
      message: `${replyAuthorName || 'Someone'} replied to "${threadTitle.substring(0, 60)}${threadTitle.length > 60 ? '...' : ''}"`,
      relatedUserId: replyAuthorId,
      relatedContentType: 'thread',
      relatedContentId: threadId,
      linkUrl: `/community/forums/${categorySlug}/${threadId}`,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    logger.info('Thread subscribers notified', {
      threadId,
      subscriberCount: subscriptions.length,
    });
  } catch (error) {
    logger.error('Failed to notify thread subscribers', {
      error: error instanceof Error ? error.message : String(error),
      threadId,
    });
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    return count;
  } catch {
    return 0;
  }
}
