import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, safeJsonParse, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/companies
 * Public API: Fetch space company profiles.
 *
 * Params: limit, offset, sector, search
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
    const search = searchParams.get('search') || undefined;

    const where: Record<string, unknown> = {};

    if (sector) {
      where.focusAreas = { contains: sector };
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [companies, total] = await Promise.all([
      prisma.spaceCompany.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          country: true,
          headquarters: true,
          founded: true,
          website: true,
          isPublic: true,
          ticker: true,
          exchange: true,
          marketCap: true,
          stockPrice: true,
          isPreIPO: true,
          valuation: true,
          focusAreas: true,
          subSectors: true,
          employeeCount: true,
        },
        orderBy: [
          { isPublic: 'desc' },
          { marketCap: 'desc' },
          { name: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.spaceCompany.count({ where }),
    ]);

    const parsedCompanies = companies.map((company) => ({
      ...company,
      focusAreas: safeJsonParse(company.focusAreas, []),
      subSectors: company.subSectors ? safeJsonParse(company.subSectors, null) : null,
    }));

    const response = NextResponse.json({
      success: true,
      data: parsedCompanies,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/companies error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch companies');
  }
}
