import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/company-scores
 * Public API: Fetch company scoring data (technology, team, funding, etc.).
 *
 * Params: limit, offset, companySlug, scoreType
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
    const companySlug = searchParams.get('companySlug') || undefined;
    const scoreType = searchParams.get('scoreType') || undefined;

    const where: Record<string, unknown> = {};

    if (companySlug) {
      where.company = { slug: companySlug };
    }

    if (scoreType) {
      where.scoreType = scoreType;
    }

    const [scores, total] = await Promise.all([
      prisma.companyScore.findMany({
        where,
        include: {
          company: {
            select: {
              slug: true,
              name: true,
              sector: true,
            },
          },
        },
        orderBy: { calculatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.companyScore.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: scores,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/company-scores error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch company scores');
  }
}
