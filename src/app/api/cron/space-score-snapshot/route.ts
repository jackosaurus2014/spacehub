import { NextRequest } from 'next/server';
import { createSuccessResponse, internalError, requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { captureSpaceScoreSnapshot } from '@/lib/research-export';

export const dynamic = 'force-dynamic';

/**
 * Write today's Space Score reading for every scored company.
 *
 * Runs regardless of RESEARCH_TIER_ENABLED, deliberately: history cannot be
 * backfilled, so if snapshots only started on launch day the Research tier
 * would ship with an empty time series and a promise it could not keep for a
 * year. Collecting is free; only READING the series is gated.
 *
 * Idempotent per UTC day — a retry updates the day's rows rather than
 * duplicating them.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  try {
    const result = await captureSpaceScoreSnapshot();
    logger.info('Space Score snapshot written', result);
    return createSuccessResponse(result);
  } catch (error) {
    logger.error('Space Score snapshot failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not write the Space Score snapshot.');
  }
}
