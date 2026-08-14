import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  LEGACY_PROFILE_SELECT,
  profileToLegacyCompany,
  focusAreaWhere,
  ROSTER_BASE_WHERE,
} from '@/lib/company-roster';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/companies
 * Public API: Fetch space company profiles.
 * Backed by CompanyProfile (single source of truth); response keeps the legacy
 * field names and units (marketCap/valuation in billions USD).
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

    const where: Prisma.CompanyProfileWhereInput = { AND: [ROSTER_BASE_WHERE] };
    const and = where.AND as Prisma.CompanyProfileWhereInput[];

    if (sector) {
      and.push(focusAreaWhere(sector));
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [rows, total] = await Promise.all([
      prisma.companyProfile.findMany({
        where,
        select: LEGACY_PROFILE_SELECT,
        orderBy: [
          { isPublic: 'desc' },
          { marketCap: { sort: 'desc', nulls: 'last' } },
          { name: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.companyProfile.count({ where }),
    ]);

    const data = rows.map(profileToLegacyCompany).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      country: c.country,
      headquarters: c.headquarters,
      founded: c.founded,
      website: c.website,
      isPublic: c.isPublic,
      ticker: c.ticker,
      exchange: c.exchange,
      marketCap: c.marketCap,
      stockPrice: c.stockPrice,
      isPreIPO: c.isPreIPO,
      valuation: c.valuation,
      focusAreas: c.focusAreas,
      subSectors: c.subSectors,
      employeeCount: c.employeeCount,
    }));

    const response = NextResponse.json({
      success: true,
      data,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/companies error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch companies');
  }
}
