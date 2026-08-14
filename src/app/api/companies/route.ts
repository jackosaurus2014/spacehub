import { NextResponse } from 'next/server';
import { getRosterCompanies } from '@/lib/company-roster';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/companies
 * Market roster for /market-intel and dashboard modules.
 * Backed by CompanyProfile (single source of truth); the response keeps the
 * legacy SpaceCompany shape (marketCap/valuation in billions, funding in
 * millions, ISO-3 countries, snake_case focusAreas).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const isPublic = searchParams.get('isPublic');
    const preIPO = searchParams.get('preIPO');
    const focusArea = searchParams.get('focusArea');
    const minFunding = searchParams.get('minFunding');
    const foundedAfter = searchParams.get('foundedAfter');
    const sort = searchParams.get('sort');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '50'), 300);
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    let parsedMinFunding: number | undefined;
    if (minFunding) {
      const min = parseFloat(minFunding);
      if (!isNaN(min) && min > 0) parsedMinFunding = min;
    }

    let parsedFoundedAfter: number | undefined;
    if (foundedAfter) {
      const year = parseInt(foundedAfter);
      if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
        parsedFoundedAfter = year;
      }
    }

    const { companies, total } = await getRosterCompanies({
      country: country || undefined,
      isPublic: isPublic !== null && isPublic !== '' ? isPublic === 'true' : undefined,
      preIPO: preIPO === 'true' ? true : undefined,
      focusArea: focusArea || undefined,
      minFunding: parsedMinFunding,
      foundedAfter: parsedFoundedAfter,
      sort: sort === 'totalFunding' ? 'totalFunding' : 'default',
      limit,
      offset,
    });

    return NextResponse.json({
      companies,
      total,
      hasMore: offset + companies.length < total,
    });
  } catch (error) {
    logger.error('Failed to fetch companies', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch companies');
  }
}
