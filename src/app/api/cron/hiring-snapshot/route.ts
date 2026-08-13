import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { captureHiringSnapshot } from '@/lib/hiring-snapshots';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/cron/hiring-snapshot
 *
 * Daily cron. Captures today's active-job count per company (plus the
 * site-wide _TOTAL / _PRIVATE_TOTAL rows) into CompanyJobSnapshot, building
 * the hiring-velocity history shown on company profiles.
 *
 * Should run after the ATS jobs sync ('ats-jobs-refresh', 06:30 UTC) so the
 * day's snapshot reflects freshly-synced postings. Idempotent per UTC date.
 *
 * Auth: Bearer ${CRON_SECRET}.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await captureHiringSnapshot();
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('hiring-snapshot cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
