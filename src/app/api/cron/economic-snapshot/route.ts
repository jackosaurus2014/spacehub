import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { runDailyEconomicSnapshots, ACTIVE_WINDOW_DAYS } from '@/lib/game/economic-snapshot';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/economic-snapshot — daily 03:20 UTC (cron-scheduler.ts).
 *
 * Snapshots the economic columns of every GameProfile that synced in the
 * last ACTIVE_WINDOW_DAYS into EconomicSnapshot (reason 'daily'), then
 * prunes: daily rows > 14 d (the Monday row is kept 90 d as the weekly
 * keeper), pre-clamp rows > 90 d, manual rows > 365 d. Rollback
 * prerequisite for docs/SIMULATION_INTEGRITY_TOOLING.md §S3.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — same as every /api/cron/*.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();
  try {
    const result = await runDailyEconomicSnapshots(new Date());
    const durationMs = Date.now() - startedAt;
    logger.info('economic-snapshot cron completed', { ...result, activeWindowDays: ACTIVE_WINDOW_DAYS, durationMs });
    return NextResponse.json({ success: true, ...result, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('economic-snapshot cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
