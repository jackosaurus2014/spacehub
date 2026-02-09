import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/regulatory
 * Public API: Fetch regulatory data (proposed regulations, policy changes).
 *
 * Params: limit, offset, category, agency
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
    const category = searchParams.get('category') || undefined;
    const agency = searchParams.get('agency') || undefined;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (agency) where.agency = agency;

    const [regulations, total] = await Promise.all([
      prisma.proposedRegulation.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          agency: true,
          type: true,
          category: true,
          impactSeverity: true,
          publishedDate: true,
          commentDeadline: true,
          effectiveDate: true,
          status: true,
          sourceUrl: true,
        },
        orderBy: { publishedDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.proposedRegulation.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: regulations,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/regulatory error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch regulatory data');
  }
}
