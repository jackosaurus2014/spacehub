import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { createSuccessResponse, internalError, validationError } from '@/lib/errors';
import {
  RESEARCH_MAX_PORTFOLIOS_PER_USER,
  researchPortfolioSchema,
  validateBody,
} from '@/lib/validations';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  try {
    const portfolios = await prisma.researchPortfolio.findMany({
      where: { userId: session!.user!.id },
      orderBy: { updatedAt: 'desc' },
    });
    return createSuccessResponse({
      portfolios: portfolios.map((p) => ({
        id: p.id,
        name: p.name,
        holdings: Array.isArray(p.holdings) ? p.holdings : [],
        notes: p.notes,
        updatedAt: p.updatedAt.toISOString(),
      })),
      limit: RESEARCH_MAX_PORTFOLIOS_PER_USER,
    });
  } catch (error) {
    logger.error('Failed to list research portfolios', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not load your portfolios.');
  }
}

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

  const parsed = validateBody(researchPortfolioSchema, body);
  if (!parsed.success) {
    const first = Object.values(parsed.errors)[0]?.[0] || 'Validation failed';
    return validationError(first, parsed.errors);
  }

  try {
    const count = await prisma.researchPortfolio.count({ where: { userId: session!.user!.id } });
    if (count >= RESEARCH_MAX_PORTFOLIOS_PER_USER) {
      return validationError(
        `You already have ${RESEARCH_MAX_PORTFOLIOS_PER_USER} portfolios. Delete one to add another.`
      );
    }

    // De-duplicate case-insensitively but keep the analyst's own spelling.
    const seen = new Set<string>();
    const holdings = parsed.data.holdings.filter((h) => {
      const k = h.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const created = await prisma.researchPortfolio.create({
      data: {
        userId: session!.user!.id,
        name: parsed.data.name,
        holdings,
        notes: parsed.data.notes ?? null,
      },
    });
    return createSuccessResponse({
      id: created.id,
      name: created.name,
      holdings,
      notes: created.notes,
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create research portfolio', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not save that portfolio.');
  }
}
