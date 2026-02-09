import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/launches
 * Public API: Fetch upcoming launches.
 *
 * Params: limit, offset, provider
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
    const provider = searchParams.get('provider') || undefined;

    const now = new Date();

    const where: Record<string, unknown> = {
      launchDate: { gte: now },
      status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
    };

    if (provider) {
      where.agency = { contains: provider, mode: 'insensitive' };
    }

    const [events, total] = await Promise.all([
      prisma.spaceEvent.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          launchDate: true,
          agency: true,
          location: true,
          mission: true,
          description: true,
          country: true,
          rocket: true,
          windowStart: true,
          windowEnd: true,
          launchDatePrecision: true,
        },
        orderBy: { launchDate: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.spaceEvent.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: events,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/launches error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch launches');
  }
}
