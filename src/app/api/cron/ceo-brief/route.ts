import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { processCeoBrief } from '@/lib/ceo-brief';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/ceo-brief
 *
 * Weekly cron (Mondays 13:37 UTC) that composes and sends the founder's CEO
 * brief — growth vs the 10k-MAU goal (with week-over-week deltas), the
 * content-accuracy sentinel, cron-fleet health, business signals, and the
 * gated-on-you checklist. Idempotent per calendar week via a DynamicContent
 * marker. See src/lib/ceo-brief.ts for the full design.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (or localhost when
 * CRON_SECRET is unset) — same pattern as the rest of the /api/cron/* family.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();

  try {
    const result = await processCeoBrief();
    const durationMs = Date.now() - startedAt;

    logger.info('ceo-brief cron completed', { ...result, durationMs });

    return NextResponse.json({ ...result, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('ceo-brief cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
