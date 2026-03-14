import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// Core scalar fields for the listing card — safe to query even if recent
// prisma db push deployments failed to add newer columns.
const CORE_SELECT = {
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
};

// Relation counts displayed on cards
const RELATION_COUNT_SELECT = {
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
};

// Newer fields that may not exist if a db push failed
const EXTENDED_SELECT = {
  sponsorTier: true,
  sponsorTagline: true,
};

// Empty _count fallback when relation-count queries fail
const EMPTY_COUNT = {
  fundingRounds: 0,
  products: 0,
  keyPersonnel: 0,
  contracts: 0,
  events: 0,
  satelliteAssets: 0,
  facilities: 0,
};

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

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

    // ── Fetch companies with progressive fallback ──────────────────────
    // Try the full query first (extended fields + relation counts). If it
    // fails, fall back to core fields + counts, then core fields only.
    // This mirrors the resilient pattern used in the [slug] detail route.
    let companies: unknown[] = [];
    let total = 0;

    try {
      // Full query: core + extended fields + relation counts
      [companies, total] = await Promise.all([
        db.findMany({
          where,
          orderBy,
          skip: offset,
          take: Math.min(limit, 100),
          select: { ...CORE_SELECT, ...EXTENDED_SELECT, ...RELATION_COUNT_SELECT },
        }),
        db.count({ where }),
      ]);
    } catch (fullErr) {
      logger.warn('Full company list query failed, trying core + counts', {
        error: fullErr instanceof Error ? fullErr.message : String(fullErr),
      });

      try {
        // Fallback 1: core fields + relation counts (no extended fields)
        [companies, total] = await Promise.all([
          db.findMany({
            where,
            orderBy,
            skip: offset,
            take: Math.min(limit, 100),
            select: { ...CORE_SELECT, ...RELATION_COUNT_SELECT },
          }),
          db.count({ where }),
        ]);
      } catch (coreCountErr) {
        logger.warn('Core+counts query failed, trying core only', {
          error: coreCountErr instanceof Error ? coreCountErr.message : String(coreCountErr),
        });

        try {
          // Fallback 2: core fields only (no relation counts)
          [companies, total] = await Promise.all([
            db.findMany({
              where,
              orderBy,
              skip: offset,
              take: Math.min(limit, 100),
              select: CORE_SELECT,
            }),
            db.count({ where }),
          ]);

          // Patch in empty _count objects so the frontend doesn't break
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          companies = (companies as any[]).map((c: any) => ({
            ...c,
            _count: EMPTY_COUNT,
          }));
        } catch (minErr) {
          // Even the minimal query failed — genuine database issue
          const errMsg = minErr instanceof Error ? minErr.message : String(minErr);
          const errName = minErr instanceof Error ? minErr.constructor.name : 'Unknown';
          logger.error('All company list queries failed', {
            error: errMsg,
            errorType: errName,
          });
          return internalError(`Failed to fetch company profiles: [${errName}] ${errMsg.slice(0, 200)}`);
        }
      }
    }

    // ── Aggregate stats (non-critical — failures degrade gracefully) ───
    let stats = {
      totalCompanies: total,
      totalFundingTracked: 0,
      totalMarketCap: 0,
      avgCompleteness: 0,
      sectors: [] as { sector: string | null; count: number }[],
    };

    try {
      const agg = await db.aggregate({
        _count: true,
        _sum: { totalFunding: true, marketCap: true },
        _avg: { dataCompleteness: true },
      });

      const sectorGroups = await db.groupBy({
        by: ['sector'],
        _count: true,
        where: { sector: { not: null } },
      });

      // Prisma aggregate _count can be a number or { _all: N } depending
      // on version — normalise to number.
      const countVal = typeof agg._count === 'number'
        ? agg._count
        : (agg._count?._all ?? total);

      stats = {
        totalCompanies: countVal,
        totalFundingTracked: agg._sum?.totalFunding || 0,
        totalMarketCap: agg._sum?.marketCap || 0,
        avgCompleteness: Math.round(agg._avg?.dataCompleteness || 0),
        sectors: sectorGroups.map((s: { sector: string | null; _count: number | { _all: number } }) => ({
          sector: s.sector,
          count: typeof s._count === 'number' ? s._count : (s._count?._all ?? 0),
        })),
      };
    } catch (statsErr) {
      // Stats are non-critical — log and continue with defaults
      logger.warn('Failed to fetch aggregate stats for company directory', {
        error: statsErr instanceof Error ? statsErr.message : String(statsErr),
      });
    }

    return NextResponse.json({
      companies,
      total,
      limit,
      offset,
      stats,
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600' },
    });
  } catch (error) {
    logger.error('Failed to fetch company profiles', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch company profiles');
  }
}
