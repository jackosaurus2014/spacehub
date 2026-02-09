import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sector = searchParams.get('sector') || '';
    const status = searchParams.get('status') || '';
    const tier = searchParams.get('tier') || '';
    const country = searchParams.get('country') || '';
    const tag = searchParams.get('tag') || '';
    const isPublic = searchParams.get('isPublic');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticker: { contains: search, mode: 'insensitive' } },
        { headquarters: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (sector) where.sector = sector;
    if (status) where.status = status;
    if (tier) where.tier = parseInt(tier);
    if (country) where.country = country;
    if (isPublic !== null && isPublic !== undefined && isPublic !== '') {
      where.isPublic = isPublic === 'true';
    }
    if (tag) {
      where.tags = { has: tag };
    }

    const orderBy: Record<string, string> = {};
    const validSortFields = ['name', 'totalFunding', 'employeeCount', 'foundedYear', 'marketCap', 'tier', 'dataCompleteness'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.name = 'asc';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma.companyProfile as any;
    const [companies, total] = await Promise.all([
      db.findMany({
        where,
        orderBy,
        skip: offset,
        take: Math.min(limit, 100),
        select: {
          id: true,
          slug: true,
          name: true,
          ticker: true,
          exchange: true,
          headquarters: true,
          country: true,
          foundedYear: true,
          employeeRange: true,
          website: true,
          description: true,
          logoUrl: true,
          isPublic: true,
          marketCap: true,
          status: true,
          sector: true,
          subsector: true,
          tags: true,
          tier: true,
          totalFunding: true,
          lastFundingRound: true,
          valuation: true,
          revenueEstimate: true,
          ownershipType: true,
          dataCompleteness: true,
          _count: {
            select: {
              fundingRounds: true,
              products: true,
              keyPersonnel: true,
              contracts: true,
              events: true,
              satelliteAssets: true,
              facilities: true,
            },
          },
        },
      }),
      db.count({ where }),
    ]);

    // Get aggregate stats
    const stats = await db.aggregate({
      _count: true,
      _sum: { totalFunding: true, marketCap: true },
      _avg: { dataCompleteness: true },
    });

    const sectors = await db.groupBy({
      by: ['sector'],
      _count: true,
      where: { sector: { not: null } },
    });

    return NextResponse.json({
      companies,
      total,
      limit,
      offset,
      stats: {
        totalCompanies: stats._count,
        totalFundingTracked: stats._sum.totalFunding || 0,
        totalMarketCap: stats._sum.marketCap || 0,
        avgCompleteness: Math.round(stats._avg.dataCompleteness || 0),
        sectors: sectors.map((s: { sector: string | null; _count: number }) => ({ sector: s.sector, count: s._count })),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch company profiles', { error });
    return NextResponse.json(
      { error: 'Failed to fetch company profiles' },
      { status: 500 }
    );
  }
}
