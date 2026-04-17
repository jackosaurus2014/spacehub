import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/executive-moves
 * Public API: Fetch executive moves in the space industry.
 *
 * Params: limit, offset, company (slug), moveType, dateFrom
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
    const company = searchParams.get('company') || undefined;
    const moveType = searchParams.get('moveType') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;

    const where: Record<string, unknown> = {};

    if (company) {
      where.companySlug = company;
    }

    if (moveType) {
      where.moveType = moveType;
    }

    if (dateFrom) {
      const parsedDate = new Date(dateFrom);
      if (!isNaN(parsedDate.getTime())) {
        where.date = { gte: parsedDate };
      }
    }

    const [executiveMoves, total] = await Promise.all([
      prisma.executiveMove.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.executiveMove.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: executiveMoves,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/executive-moves error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch executive moves');
  }
}
