import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { createNotification } from '@/lib/notifications/create';
import { generateSavedSearchesDigestEmail } from '@/lib/newsletter/email-templates';
import { executeSavedSearch, savedSearchResultKey as resultKey } from '@/lib/saved-search-runner';
import {
  GLOBAL_SEARCH_TYPES,
  SAVED_SEARCH_NOTIFY_CHANNELS,
  type GlobalSearchType,
  type SavedSearchNotifyChannel,
} from '@/lib/validations';
import type { SearchResult } from '@/lib/full-text-search';

export const dynamic = 'force-dynamic';

interface SavedSearchMeta {
  type: GlobalSearchType;
  notifyVia: SavedSearchNotifyChannel;
  lastResultIds: string[];
}

function readSearchMeta(filters: unknown): SavedSearchMeta {
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

interface PerSearchSummary {
  searchId: string;
  searchName: string;
  query: string;
  type: GlobalSearchType;
  newMatches: SearchResult[];
}

/**
 * POST /api/cron/saved-searches-digest
 *
 * Daily cron that:
 *   1. Iterates every SavedSearch row marked with searchType='global_search'
 *   2. Re-runs the search using the same FTS helpers as /api/search
 *   3. Diffs against the cached `lastResultIds` (stored in `filters` JSON)
 *   4. For each NEW match: creates an in-app Notification (if notifyVia
 *      includes 'notification' or 'both')
 *   5. For each user with at least one new match where notifyVia includes
 *      'email' or 'both': batches all of that user's new matches into a
 *      single digest email via Resend
 *   6. Persists `lastRunAt` + new `lastResultIds` cursor on each search
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (or localhost when
 * CRON_SECRET is unset). Matches the rest of the cron route family.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();

  try {
    const searches = await prisma.savedSearch.findMany({
      where: { searchType: 'global_search' },
      orderBy: { updatedAt: 'asc' },
    });

    let processed = 0;
    let errors = 0;
    let totalNewMatches = 0;
    let notificationsCreated = 0;

    // user-id -> per-search summaries (for the eventual digest email)
    const perUserSummaries = new Map<string, PerSearchSummary[]>();
    // user-id -> notifyVia (for routing decisions)
    const perUserNotifyChannels = new Map<string, Set<SavedSearchNotifyChannel>>();

    for (const search of searches) {
      try {
        if (!search.query) {
          processed++;
          continue;
        }

        const meta = readSearchMeta(search.filters);
        const previousIds = new Set(meta.lastResultIds);

        const run = await executeSavedSearch(search.query, meta.type);
        const newMatches = run.results.filter((r) => !previousIds.has(resultKey(r)));

        // Persist cursor regardless of whether there were new matches
        const newFilters: Record<string, unknown> = {
          ...((search.filters && typeof search.filters === 'object'
            ? (search.filters as Record<string, unknown>)
            : {})),
          type: meta.type,
          notifyVia: meta.notifyVia,
          lastRunAt: new Date().toISOString(),
          lastResultIds: run.results.map(resultKey),
          lastResultCount: run.results.length,
        };

        await prisma.savedSearch.update({
          where: { id: search.id },
          data: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filters: newFilters as any,
          },
        });

        if (newMatches.length === 0) {
          processed++;
          continue;
        }

        totalNewMatches += newMatches.length;

        // In-app notifications (one per saved-search per run; not per match)
        if (meta.notifyVia === 'notification' || meta.notifyVia === 'both') {
          const linkParams = new URLSearchParams();
          linkParams.set('q', search.query);
          if (meta.type !== 'all') linkParams.set('type', meta.type);
          const link = `/search?${linkParams.toString()}`;

          await createNotification({
            userId: search.userId,
            type: 'watchlist_alert',
            title: `New matches for ${search.name}`,
            body: `${newMatches.length} new ${newMatches.length === 1 ? 'result' : 'results'} for your saved search "${search.name}".`,
            link,
            relatedContentType: 'saved_search',
            relatedContentId: search.id,
          });
          notificationsCreated++;
        }

        // Bucket for the per-user digest email
        if (meta.notifyVia === 'email' || meta.notifyVia === 'both') {
          const summaries = perUserSummaries.get(search.userId) || [];
          summaries.push({
            searchId: search.id,
            searchName: search.name,
            query: search.query,
            type: meta.type,
            newMatches,
          });
          perUserSummaries.set(search.userId, summaries);
        }

        const channels = perUserNotifyChannels.get(search.userId) || new Set<SavedSearchNotifyChannel>();
        channels.add(meta.notifyVia);
        perUserNotifyChannels.set(search.userId, channels);

        processed++;
      } catch (err) {
        errors++;
        logger.error('Saved-search digest: per-search failure', {
          searchId: search.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ─── Send digest emails ───────────────────────────────────
    let emailsSent = 0;
    let emailErrors = 0;

    if (perUserSummaries.size > 0) {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        logger.warn('Saved-search digest: RESEND_API_KEY not configured — skipping emails');
      } else {
        const { Resend } = await import('resend');
        const resend = new Resend(resendKey);
        const fromAddress =
          process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.us>';

        const userIds = Array.from(perUserSummaries.keys());
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        });

        for (const user of users) {
          const summaries = perUserSummaries.get(user.id) || [];
          if (summaries.length === 0) continue;

          try {
            const { html, text, subject } = generateSavedSearchesDigestEmail(
              { name: user.name, email: user.email },
              summaries
            );

            await resend.emails.send({
              from: fromAddress,
              to: user.email,
              subject,
              html,
              text,
            });
            emailsSent++;
            logger.info('Saved-search digest email sent', {
              userId: user.id,
              searchCount: summaries.length,
            });
          } catch (err) {
            emailErrors++;
            logger.error('Saved-search digest email failed', {
              userId: user.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    const durationMs = Date.now() - startedAt;

    logger.info('Saved-search digest cron completed', {
      processed,
      errors,
      totalNewMatches,
      notificationsCreated,
      emailsSent,
      emailErrors,
      durationMs,
    });

    return NextResponse.json({
      processed,
      errors,
      totalNewMatches,
      notificationsCreated,
      emailsSent,
      emailErrors,
      durationMs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Saved-search digest cron failed', { error: msg });
    return NextResponse.json(
      { error: 'Internal server error', detail: msg },
      { status: 500 }
    );
  }
}
