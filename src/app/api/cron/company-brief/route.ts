import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { runCompanyBriefDeliveries } from '@/lib/company-brief';

// Mondays 09:00 UTC (src/lib/cron-scheduler.ts): one owned-data brief per
// verified company watch. Idempotent per (watch, ISO week); quiet weeks
// record the period without sending.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;
  try {
    const r = await runCompanyBriefDeliveries();
    if (r.sent > 0 || r.quiet > 0 || r.skipped > 0) logger.info('company-brief deliveries', r);
    return NextResponse.json({ success: true, ...r, timestamp: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('company-brief cron failed', { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
