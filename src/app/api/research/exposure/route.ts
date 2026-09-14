import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import {
  createSuccessResponse,
  internalError,
  notFoundError,
  validationError,
} from '@/lib/errors';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import { computePortfolioExposure } from '@/lib/research-exposure';

export const dynamic = 'force-dynamic';

const MAX_AD_HOC_HOLDINGS = 500;

/**
 * Supply-chain exposure for a saved portfolio.
 *
 * GATE: requireResearchAccess first, then the portfolio is loaded scoped to the
 * caller's own userId — a Research subscriber cannot read another firm's
 * portfolio by guessing an id.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const portfolioId = new URL(req.url).searchParams.get('portfolioId');
  if (!portfolioId) {
    return validationError('Pass ?portfolioId=, or POST a holdings array for an ad-hoc run.');
  }

  try {
    const portfolio = await prisma.researchPortfolio.findFirst({
      where: { id: portfolioId, userId: session!.user!.id },
    });
    if (!portfolio) return notFoundError('Portfolio not found.');

    const holdings = Array.isArray(portfolio.holdings)
      ? (portfolio.holdings as unknown[]).filter((h): h is string => typeof h === 'string')
      : [];

    return createSuccessResponse({
      portfolio: { id: portfolio.id, name: portfolio.name },
      exposure: computePortfolioExposure(holdings),
    });
  } catch (error) {
    logger.error('Research exposure failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not compute exposure for that portfolio.');
  }
}

/** Ad-hoc exposure for a pasted list, without saving it first. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError('Request body must be JSON.');
  }

  const raw = (body as { holdings?: unknown })?.holdings;
  if (!Array.isArray(raw)) {
    return validationError('Provide "holdings": an array of company names, slugs or ids.');
  }
  if (raw.length > MAX_AD_HOC_HOLDINGS) {
    return validationError(`At most ${MAX_AD_HOC_HOLDINGS} holdings per run.`);
  }

  const holdings = raw
    .filter((h): h is string => typeof h === 'string')
    .map((h) => h.trim())
    .filter(Boolean);

  return createSuccessResponse({ exposure: computePortfolioExposure(holdings) });
}
