import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { runLaunchWatchDeliveries } from '@/lib/launch-watch';

// Every 20 minutes (src/lib/cron-scheduler.ts): T-24h, T-1h and outcome
// emails for verified launch watches. Idempotent per (watch, event, kind).
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;
  try {
    const r = await runLaunchWatchDeliveries();
    if (r.sent > 0 || r.skipped > 0) logger.info('launch-watch deliveries', r);
    return NextResponse.json({ success: true, ...r, timestamp: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('launch-watch cron failed', { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
