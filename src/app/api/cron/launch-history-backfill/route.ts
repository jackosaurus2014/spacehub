import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { syncRecentLaunchOutcomes } from '@/lib/events-fetcher';

// One-off / occasional: walk Launch Library's previous-launch feed further
// back than the nightly 50-row outcome sync does, importing full rows for
// launches we never saw (the /upcoming feed only ever holds ~3 months) and
// recording outcomes on the ones we did. Gives /rockets and /launches real
// history. LL2's anonymous rate limit is ~15 requests/hour, so `pages` is
// capped and each page is followed by a pause.
//
//   POST /api/cron/launch-history-backfill?pages=3&pageSize=100
//
// Pages walk backwards in time from the most recent launch.
export const dynamic = 'force-dynamic';
export const maxDuration = 240;

const MAX_PAGES = 6;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const pages = Math.min(MAX_PAGES, Math.max(1, parseInt(searchParams.get('pages') || '3', 10) || 3));
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') || '100', 10) || 100));
  const startOffset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);

  const results: Array<{ offset: number; checked: number; updated: number; created: number; error?: string }> = [];
  for (let i = 0; i < pages; i++) {
    const offset = startOffset + i * pageSize;
    try {
      const r = await syncRecentLaunchOutcomes(fetch, { limit: pageSize, offset });
      results.push({ offset, ...r });
      if (r.checked < pageSize) break; // reached the end of the feed
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ offset, checked: 0, updated: 0, created: 0, error: msg });
      logger.warn('launch-history-backfill: page failed', { offset, error: msg });
      break;
    }
    if (i < pages - 1) await new Promise((r) => setTimeout(r, 2500));
  }
  const totals = results.reduce((a, r) => ({ checked: a.checked + r.checked, updated: a.updated + r.updated, created: a.created + r.created }), { checked: 0, updated: 0, created: 0 });
  logger.info('launch-history-backfill completed', { pages: results.length, ...totals });
  return NextResponse.json({ success: true, ...totals, pages: results, timestamp: new Date().toISOString() });
}
