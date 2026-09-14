import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { createSuccessResponse, internalError, notFoundError, validationError } from '@/lib/errors';
import { researchPortfolioSchema, validateBody } from '@/lib/validations';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';

export const dynamic = 'force-dynamic';

/**
 * Ownership is checked on EVERY verb by scoping the query to the caller's
 * userId, never by reading the row and then comparing — a not-found and a
 * not-yours are the same response, so the route cannot be used to enumerate
 * other firms' portfolio ids.
 */
async function loadOwned(userId: string, id: string) {
  return prisma.researchPortfolio.findFirst({ where: { id, userId } });
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const portfolio = await loadOwned(session!.user!.id, id);
  if (!portfolio) return notFoundError('Portfolio not found.');

  return createSuccessResponse({
    id: portfolio.id,
    name: portfolio.name,
    holdings: Array.isArray(portfolio.holdings) ? portfolio.holdings : [],
    notes: portfolio.notes,
    updatedAt: portfolio.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const existing = await loadOwned(session!.user!.id, id);
  if (!existing) return notFoundError('Portfolio not found.');

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
    const seen = new Set<string>();
    const holdings = parsed.data.holdings.filter((h) => {
      const k = h.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const updated = await prisma.researchPortfolio.update({
      where: { id: existing.id },
      data: { name: parsed.data.name, holdings, notes: parsed.data.notes ?? null },
    });
    return createSuccessResponse({
      id: updated.id,
      name: updated.name,
      holdings,
      notes: updated.notes,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update research portfolio', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not save that portfolio.');
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const existing = await loadOwned(session!.user!.id, id);
  if (!existing) return notFoundError('Portfolio not found.');

  try {
    await prisma.researchPortfolio.delete({ where: { id: existing.id } });
    return createSuccessResponse({ deleted: true, id: existing.id });
  } catch (error) {
    logger.error('Failed to delete research portfolio', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not delete that portfolio.');
  }
}
