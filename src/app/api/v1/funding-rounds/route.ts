import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/funding-rounds
 * Public API: Fetch space company funding rounds.
 *
 * Params: limit, offset, sector, minAmount, dateFrom
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
    const sector = searchParams.get('sector') || undefined;
    const minAmount = searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;

    const where: Record<string, unknown> = {};

    if (sector) {
      where.company = { sector };
    }

    if (minAmount && !isNaN(minAmount)) {
      where.amount = { gte: minAmount };
    }

    if (dateFrom) {
      const parsedDate = new Date(dateFrom);
      if (!isNaN(parsedDate.getTime())) {
        where.date = { gte: parsedDate };
      }
    }

    const [fundingRounds, total] = await Promise.all([
      prisma.fundingRound.findMany({
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
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.fundingRound.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: fundingRounds,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/funding-rounds error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch funding rounds');
  }
}
