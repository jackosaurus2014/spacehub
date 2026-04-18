import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  notFoundError,
  createSuccessResponse,
} from '@/lib/errors';
import { createNotification } from '@/lib/notifications/create';
import { executeSavedSearch, savedSearchResultKey as resultKey } from '@/lib/saved-search-runner';
import {
  GLOBAL_SEARCH_TYPES,
  SAVED_SEARCH_NOTIFY_CHANNELS,
  type GlobalSearchType,
  type SavedSearchNotifyChannel,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

function readSearchMeta(filters: unknown): {
  type: GlobalSearchType;
  notifyVia: SavedSearchNotifyChannel;
  lastResultIds: string[];
} {
  const blob = filters && typeof filters === 'object' ? (filters as Record<string, unknown>) : {};
  const rawType = typeof blob.type === 'string' ? blob.type : 'all';
  const type = (GLOBAL_SEARCH_TYPES as readonly string[]).includes(rawType)
    ? (rawType as GlobalSearchType)
    : 'all';
  const rawNotify = typeof blob.notifyVia === 'string' ? blob.notifyVia : 'notification';
  const notifyVia = (SAVED_SEARCH_NOTIFY_CHANNELS as readonly string[]).includes(rawNotify)
    ? (rawNotify as SavedSearchNotifyChannel)
    : 'notification';
  const lastResultIds = Array.isArray(blob.lastResultIds)
    ? blob.lastResultIds.filter((v): v is string => typeof v === 'string')
    : [];
  return { type, notifyVia, lastResultIds };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = params;
    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing) return notFoundError('Saved search not found');
    if (existing.userId !== session.user.id) {
      return unauthorizedError('Not authorized to run this search');
    }

    if (!existing.query) {
      return createSuccessResponse({
        results: [],
        totals: {},
        newMatches: [],
        newCount: 0,
        message: 'This saved search has no query to execute.',
      });
    }

    const meta = readSearchMeta(existing.filters);
    const previousIds = new Set(meta.lastResultIds);

    const run = await executeSavedSearch(existing.query, meta.type);

    const newMatches = run.results.filter((r) => !previousIds.has(resultKey(r)));
    const newCount = newMatches.length;

    // Persist updated cursor
    const newFilters: Record<string, unknown> = {
      ...((existing.filters && typeof existing.filters === 'object'
        ? (existing.filters as Record<string, unknown>)
        : {})),
      type: meta.type,
      notifyVia: meta.notifyVia,
      lastRunAt: new Date().toISOString(),
      lastResultIds: run.results.map(resultKey),
      lastResultCount: run.results.length,
    };

    await prisma.savedSearch.update({
      where: { id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filters: newFilters as any,
      },
    });

    // For manual runs, also create in-app notifications for new matches if
    // the user opted into 'notification' or 'both' channels. Email is sent
    // only by the daily digest cron — never inline on a manual Run Now click.
    if (newCount > 0 && (meta.notifyVia === 'notification' || meta.notifyVia === 'both')) {
      const linkParams = new URLSearchParams();
      linkParams.set('q', existing.query);
      if (meta.type !== 'all') linkParams.set('type', meta.type);
      const link = `/search?${linkParams.toString()}`;

      await createNotification({
        userId: session.user.id,
        type: 'watchlist_alert',
        title: `${newCount} new ${newCount === 1 ? 'match' : 'matches'} for "${existing.name}"`,
        body: `Your saved search found ${newCount} new ${newCount === 1 ? 'result' : 'results'}.`,
        link,
        relatedContentType: 'saved_search',
        relatedContentId: existing.id,
      });
    }

    logger.info('Saved search run completed', {
      userId: session.user.id,
      searchId: id,
      total: run.results.length,
      newCount,
    });

    return createSuccessResponse({
      results: run.results,
      totals: run.totals,
      newMatches,
      newCount,
      lastRunAt: newFilters.lastRunAt,
    });
  } catch (error) {
    logger.error('Failed to run saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to run saved search');
  }
}
