import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/supply-chain
 * Public API: Fetch subaward relationships (prime-sub contractor pairings).
 *
 * Params: limit, offset, primeCompany, subCompany
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));
    const primeCompany = searchParams.get('primeCompany') || undefined;
    const subCompany = searchParams.get('subCompany') || undefined;

    const where: Record<string, unknown> = {};

    if (primeCompany) {
      where.primeCompanyName = { contains: primeCompany, mode: 'insensitive' };
    }

    if (subCompany) {
      where.subCompanyName = { contains: subCompany, mode: 'insensitive' };
    }

    const [relationships, total] = await Promise.all([
      prisma.subawardRelationship.findMany({
        where,
        orderBy: { subawardDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.subawardRelationship.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: relationships,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/supply-chain error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch supply chain data');
  }
}
