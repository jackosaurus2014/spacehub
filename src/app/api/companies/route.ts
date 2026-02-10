import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, safeJsonParse, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const isPublic = searchParams.get('isPublic');
    const preIPO = searchParams.get('preIPO');
    const focusArea = searchParams.get('focusArea');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '50'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const where: Record<string, unknown> = {};

    if (country) {
      where.country = country;
    }

    if (isPublic !== null && isPublic !== '') {
      where.isPublic = isPublic === 'true';
    }

    if (preIPO === 'true') {
      where.isPreIPO = true;
    }

    if (focusArea) {
      where.focusAreas = {
        contains: focusArea,
      };
    }

    const sort = searchParams.get('sort');
    const orderBy = sort === 'totalFunding'
      ? [{ totalFunding: 'desc' as const }, { valuation: 'desc' as const }, { name: 'asc' as const }]
      : [{ isPublic: 'desc' as const }, { marketCap: 'desc' as const }, { valuation: 'desc' as const }, { name: 'asc' as const }];

    const [companies, total] = await Promise.all([
      prisma.spaceCompany.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          ticker: true,
          country: true,
          headquarters: true,
          founded: true,
          website: true,
          isPublic: true,
          isPreIPO: true,
          marketCap: true,
          valuation: true,
          totalFunding: true,
          lastFundingRound: true,
          lastFundingAmount: true,
          lastFundingDate: true,
          focusAreas: true,
          subSectors: true,
          employeeCount: true,
          description: true,
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.spaceCompany.count({ where }),
    ]);

    // Parse JSON fields safely
    const parsedCompanies = companies.map((company) => ({
      ...company,
      focusAreas: safeJsonParse(company.focusAreas, []),
      subSectors: company.subSectors ? safeJsonParse(company.subSectors, null) : null,
    }));

    return NextResponse.json({
      companies: parsedCompanies,
      total,
      hasMore: offset + companies.length < total,
    });
  } catch (error) {
    logger.error('Failed to fetch companies', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch companies');
  }
}
