import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { runTycoonWeeklyReportDeliveries } from '@/lib/game/weekly-report-email';

// Mondays 09:30 UTC (src/lib/cron-scheduler.ts): one Space Tycoon weekly
// corporation report per opted-in profile (GameProfile.weeklyReportEmail).
// Idempotent per (profile, ISO week) via TycoonWeeklySend; capped at 300
// sends per run.
export const dynamic = 'force-dynamic';
export const maxDuration = 240;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;
  try {
    const r = await runTycoonWeeklyReportDeliveries();
    if (r.sent > 0 || r.skipped > 0) logger.info('tycoon-weekly-report deliveries', r);
    return NextResponse.json({ success: true, ...r, timestamp: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('tycoon-weekly-report cron failed', { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
