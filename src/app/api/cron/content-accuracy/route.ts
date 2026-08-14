import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { runContentAccuracySentinel } from '@/lib/content-accuracy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/content-accuracy
 *
 * Daily content-accuracy sentinel — runs the checklist in
 * src/lib/content-accuracy.ts (Mission Control featured-mission date guard,
 * countdown-widget staleness, curated as-of stamps, and the ATS/news/AI
 * pipeline liveness checks) and, on any failure, sends ONE summary alert by
 * reusing the existing freshness-alerts admin-email mechanism.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (or localhost when
 * CRON_SECRET is unset) — same pattern as the rest of the /api/cron/* family.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();

  try {
    const result = await runContentAccuracySentinel();
    const durationMs = Date.now() - startedAt;

    logger.info('content-accuracy cron completed', {
      failedCount: result.failedCount,
      totalChecks: result.checks.length,
      durationMs,
    });

    return NextResponse.json({ ...result, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('content-accuracy cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
