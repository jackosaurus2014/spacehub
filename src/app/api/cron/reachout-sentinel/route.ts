import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { runReachoutSentinel, STALE_AFTER_HOURS } from '@/lib/reachout-sentinel';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/reachout-sentinel
 *
 * Daily watchdog over every inbound channel on the site (contact form,
 * feedback, help, feature and company-listing requests, service-provider
 * submissions, introductions, meetings, partnerships, marketplace interest,
 * moderation reports). Emails the founder only when something has been open
 * longer than STALE_AFTER_HOURS — quiet on a clean day.
 *
 * Registry and rationale: src/lib/reachout-sentinel.ts.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (or localhost when CRON_SECRET
 * is unset) — same pattern as the rest of the /api/cron/* family.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();

  try {
    const result = await runReachoutSentinel();
    const durationMs = Date.now() - startedAt;

    logger.info('reachout-sentinel cron completed', {
      totalOpen: result.totalOpen,
      totalStale: result.totalStale,
      emailed: result.emailed,
      staleAfterHours: STALE_AFTER_HOURS,
      errors: result.errors.length,
      durationMs,
    });

    return NextResponse.json({ ...result, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('reachout-sentinel cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
