import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { getStalestPodcasts, syncPodcastFeed } from '@/lib/podcast-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Number of shows synced per invocation. Each RSS fetch can take several
// seconds on slow hosts (25s parser timeout worst case), so this is kept
// low enough that a full batch stays well under maxDuration even if a few
// feeds are slow. At 4-hourly cadence (see src/lib/cron-scheduler.ts) this
// cycles through a ~30-show directory roughly every 15 hours.
const BATCH_SIZE = 8;

/**
 * POST /api/cron/podcasts-sync
 *
 * Scheduled replacement for the old (no-op) `podcast-feed-refresh` cron
 * entry, which previously pointed at the read-only GET /api/podcasts
 * directory endpoint and synced nothing. This route actually fetches RSS
 * feeds: it syncs the N stalest podcasts (never-synced first, then oldest
 * lastFetchedAt) each run via the shared syncPodcastFeed() helper in
 * src/lib/podcast-sync.ts — the same logic the admin-triggered
 * POST /api/podcasts/sync/[slug] route uses.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (or localhost when
 * CRON_SECRET is unset) — same pattern as the rest of the /api/cron/*
 * family. /api/cron/* paths are CSRF-exempt automatically (src/middleware.ts).
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();

  try {
    const targets = await getStalestPodcasts(BATCH_SIZE);

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No podcasts with a feedUrl to sync',
        synced: 0,
        durationMs: Date.now() - startedAt,
      });
    }

    const results = [];
    for (const podcast of targets) {
      const result = await syncPodcastFeed(podcast);
      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;
    const durationMs = Date.now() - startedAt;

    logger.info('[cron/podcasts-sync] Batch complete', {
      attempted: targets.length,
      succeeded,
      failed,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      attempted: targets.length,
      succeeded,
      failed,
      results: results.map((r) => ({
        slug: r.slug,
        success: r.success,
        upserted: r.upserted,
        totalEpisodes: r.totalEpisodes,
        error: r.error,
      })),
      durationMs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[cron/podcasts-sync] Batch failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
