import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications/create';
import type { WatchlistEntityType } from '@/lib/validations';

export interface AlertWatchersPayload {
  title: string;
  body?: string;
  link?: string;
  /**
   * When `severity === 'major'`, users with alertLevel='major' also receive
   * the notification. When omitted (or 'normal'), only users with
   * alertLevel='all' are notified.
   */
  severity?: 'major' | 'normal';
}

/**
 * Fan out an alert to every user who has added a given entity to their
 * universal watchlist and opted into alerts. Never throws — failures are
 * logged and swallowed so the caller flow keeps running.
 */
export async function alertWatchers(
  entityType: WatchlistEntityType | string,
  entityId: string,
  payload: AlertWatchersPayload
): Promise<{ delivered: number }> {
  try {
    const severity = payload.severity ?? 'normal';
    const activeLevels = severity === 'major' ? ['all', 'major'] : ['all'];

    const watchers = await prisma.watchlistItem.findMany({
      where: {
        entityType,
        entityId,
        alertLevel: { in: activeLevels },
      },
      select: { userId: true, entityLabel: true },
    });

    if (watchers.length === 0) {
      return { delivered: 0 };
    }

    let delivered = 0;
    for (const watcher of watchers) {
      await createNotification({
        userId: watcher.userId,
        type: 'watchlist_alert',
        title: payload.title,
        body: payload.body,
        link: payload.link,
        relatedContentType: entityType,
        relatedContentId: entityId,
      });
      delivered += 1;
    }

    logger.info('Watchlist alerts dispatched', {
      entityType,
      entityId,
      severity,
      watchers: watchers.length,
      delivered,
    });

    return { delivered };
  } catch (error) {
    logger.error('alertWatchers failed', {
      error: error instanceof Error ? error.message : String(error),
      entityType,
      entityId,
    });
    return { delivered: 0 };
  }
}
