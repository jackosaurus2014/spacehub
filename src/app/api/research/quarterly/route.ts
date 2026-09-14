import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { createSuccessResponse, internalError, validationError } from '@/lib/errors';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import {
  buildQuarterlyReport,
  latestCompleteQuarter,
  parseQuarterParam,
  quarterId,
  scoredCompanyCount,
} from '@/lib/research-quarterly';

export const dynamic = 'force-dynamic';

/**
 * The quarterly sector report. GATE: requireResearchAccess, server-side.
 *
 * Only COMPLETE quarters are served. A half-finished quarter reported as if it
 * were done is the fastest way to lose a research customer, so a request for
 * the live quarter is refused with the reason rather than quietly served.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const latest = latestCompleteQuarter();
  const requested = new URL(req.url).searchParams.get('period');
  const period = requested ? parseQuarterParam(requested) : latest;

  if (!period) {
    return validationError('period must look like 2026-Q2.');
  }

  const isAfterLatest =
    period.year > latest.year ||
    (period.year === latest.year && period.quarter > latest.quarter);
  if (isAfterLatest) {
    return validationError(
      `${quarterId(period)} has not finished yet. The most recent complete quarter is ${quarterId(latest)}.`
    );
  }

  try {
    const report = await buildQuarterlyReport(period);
    return createSuccessResponse({
      ...report,
      latestCompletePeriod: quarterId(latest),
      scoredCompanyUniverse: scoredCompanyCount(),
    });
  } catch (error) {
    logger.error('Quarterly report failed', {
      period: quarterId(period),
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not build that quarterly report.');
  }
}
