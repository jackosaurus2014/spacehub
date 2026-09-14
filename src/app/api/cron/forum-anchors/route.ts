import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { runForumAnchorSync } from '@/lib/forum-anchor-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/cron/forum-anchors — hourly.
 *
 * Opens a standing discussion thread for every launch inside the horizon,
 * refreshes the ones whose date moved, retires the ones whose launch left the
 * feed, and sweeps anchors whose thread a moderator deleted.
 *
 * Runs at :50 so it lands clear of the :00/:15/:20/:30 game jobs and clear of
 * the :20-minute launch-watch cron, which is the consumer of what this
 * produces — anchors should exist before the alert emails go looking for a
 * discussion link.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await runForumAnchorSync();
    if (result.created > 0 || result.retired > 0 || result.orphansSwept > 0 || result.categoriesSeeded > 0) {
      logger.info('forum-anchors cron', { ...result });
    }
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('forum-anchors cron failed', { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
