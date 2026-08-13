import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { processJobAlerts } from '@/lib/job-alerts';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/job-alerts
 *
 * Daily cron that re-runs every enabled space_jobs saved search
 * (SavedSearch.searchType='space_jobs', alertEnabled=true) against
 * SpaceJobPosting and emails users whose search has new ACTIVE matches since
 * its last run. See src/lib/job-alerts.ts for the full matching/idempotency
 * design.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (or localhost when
 * CRON_SECRET is unset) — same pattern as the rest of the /api/cron/* family.
 * No changes to src/lib/cron-scheduler.ts or src/middleware.ts were made
 * here; see the report for the exact CRON_JOBS entry the orchestrator needs.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();

  try {
    const result = await processJobAlerts();
    const durationMs = Date.now() - startedAt;

    logger.info('job-alerts cron completed', { ...result, durationMs });

    return NextResponse.json({ ...result, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('job-alerts cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
