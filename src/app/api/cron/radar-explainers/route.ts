import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { generateRadarExplainers } from '@/lib/radar-explainer-generator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/radar-explainers
 *
 * Daily cron (12:45 UTC, after the 12:00 regulatory-feeds refresh — see
 * src/lib/cron-scheduler.ts) that drafts plain-English explainers for
 * significant Regulatory Radar actions. Max 2 per day (cost control),
 * oldest-significant-first backlog draining; each draft passes the same
 * fact-check gate as the AI dailies before publishing (major issues → held
 * as pending_review, surfacing in the editorial-review email backlog).
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`. The /api/cron/ prefix is
 * covered by the middleware CSRF cron allowlist.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await generateRadarExplainers();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('Radar explainers cron failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Radar explainer generation failed' }, { status: 500 });
  }
}
