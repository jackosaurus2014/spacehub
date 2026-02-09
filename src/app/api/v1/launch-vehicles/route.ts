import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/launch-vehicles
 * Public API: Fetch launch vehicle specifications.
 *
 * Params: limit, offset, status, country
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
    const status = searchParams.get('status') || undefined;
    const country = searchParams.get('country') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (country) where.country = country;

    const [vehicles, total] = await Promise.all([
      prisma.launchProvider.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          vehicle: true,
          costPerKgToLEO: true,
          costPerKgToGEO: true,
          costPerKgToMoon: true,
          costPerKgToMars: true,
          payloadToLEO: true,
          status: true,
          country: true,
          reusable: true,
        },
        orderBy: { costPerKgToLEO: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.launchProvider.count({ where }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: vehicles,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/launch-vehicles error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch launch vehicles');
  }
}
