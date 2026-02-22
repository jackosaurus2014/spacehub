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

/**
 * Create a single in-app notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    // Don't notify yourself
    if (params.relatedUserId && params.relatedUserId === params.userId) {
      return null;
    }

    const notification = await (prisma as any).notification.create({
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
    const subscriptions = await (prisma as any).threadSubscription.findMany({
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

    await (prisma as any).notification.createMany({
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
    const count = await (prisma as any).notification.count({
      where: { userId, read: false },
    });
    return count;
  } catch {
    return 0;
  }
}
