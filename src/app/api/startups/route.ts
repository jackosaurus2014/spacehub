import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// ────────────────────────────────────────
// GET /api/startups
//
// Powers the Startup & Pre-IPO Hub (/startups). Returns a bundle of
// database-backed sections:
//   - watchlist: top private, active companies by valuation/funding
//   - recentRounds: funding rounds in the last 18 months
//   - hiring: private companies ranked by open (active) job count
//   - stats: aggregate counts for the hero stat tiles
//
// Editorial/curated IPO data (recent IPOs, IPO pipeline, founder toolkit
// links) lives in src/lib/startup-hub-data.ts and is imported directly by
// the page component — it does not need a database round-trip.
// ────────────────────────────────────────

const WATCHLIST_SELECT = {
  slug: true,
  name: true,
  sector: true,
  valuation: true,
  totalFunding: true,
  lastFundingRound: true,
  lastFundingDate: true,
  employeeRange: true,
  headquarters: true,
  country: true,
  logoUrl: true,
  _count: {
    select: {
      jobPostings: { where: { isActive: true } },
    },
  },
};

export async function GET() {
  try {
    const now = new Date();
    const eighteenMonthsAgo = new Date(now);
    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    // ── Watchlist: private, active companies ranked by valuation then funding ──
    let watchlist: unknown[] = [];
    try {
      watchlist = await db.companyProfile.findMany({
        where: { isPublic: false, status: 'active' },
        orderBy: [
          { valuation: { sort: 'desc', nulls: 'last' } },
          { totalFunding: 'desc' },
        ],
        take: 24,
        select: WATCHLIST_SELECT,
      });
    } catch (watchlistErr) {
      // Fallback: some deployments may not have the newer sort/nulls syntax
      // or the filtered relation-count select applied via `db push` yet.
      logger.warn('Startup watchlist full query failed, retrying without filtered count', {
        error: watchlistErr instanceof Error ? watchlistErr.message : String(watchlistErr),
      });
      try {
        const fallbackRows = await db.companyProfile.findMany({
          where: { isPublic: false, status: 'active' },
          orderBy: [{ totalFunding: 'desc' }],
          take: 24,
          select: {
            slug: true,
            name: true,
            sector: true,
            valuation: true,
            totalFunding: true,
            lastFundingRound: true,
            lastFundingDate: true,
            employeeRange: true,
            headquarters: true,
            country: true,
            logoUrl: true,
          },
        });
        watchlist = (fallbackRows as Record<string, unknown>[]).map((c) => ({
          ...c,
          _count: { jobPostings: 0 },
        }));
      } catch (fallbackErr) {
        logger.error('Startup watchlist fallback query failed', {
          error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
        });
        watchlist = [];
      }
    }

    // ── Recent funding rounds (last 18 months) ──
    let recentRounds: unknown[] = [];
    try {
      recentRounds = await db.fundingRound.findMany({
        where: { date: { gte: eighteenMonthsAgo } },
        orderBy: { date: 'desc' },
        take: 30,
        include: {
          company: {
            select: { slug: true, name: true, sector: true },
          },
        },
      });
    } catch (roundsErr) {
      logger.warn('Startup hub recent rounds query failed', {
        error: roundsErr instanceof Error ? roundsErr.message : String(roundsErr),
      });
      recentRounds = [];
    }

    // ── Hiring: private companies ranked by active job count ──
    // Prisma's orderBy-on-relation-count cannot be filtered by isActive, so
    // this is computed via groupBy on SpaceJobPosting, then joined against
    // private CompanyProfile rows in a second query.
    let hiring: { slug: string; name: string; count: number }[] = [];
    try {
      const jobCountGroups = await db.spaceJobPosting.groupBy({
        by: ['companyProfileId'],
        where: { isActive: true, companyProfileId: { not: null } },
        _count: { companyProfileId: true },
        orderBy: { _count: { companyProfileId: 'desc' } },
        take: 50, // buffer — some of these will belong to public companies and get filtered out
      });

      const candidateIds = jobCountGroups
        .map((g: { companyProfileId: string | null }) => g.companyProfileId)
        .filter((id: string | null): id is string => !!id);

      const candidateCompanies = candidateIds.length
        ? await db.companyProfile.findMany({
            where: { id: { in: candidateIds }, isPublic: false },
            select: { id: true, slug: true, name: true },
          })
        : [];

      const companyMap = new Map<string, { id: string; slug: string; name: string }>(
        candidateCompanies.map((c: { id: string; slug: string; name: string }) => [c.id, c])
      );

      hiring = jobCountGroups
        .map((g: { companyProfileId: string | null; _count: { companyProfileId: number } }) => {
          const c = g.companyProfileId ? companyMap.get(g.companyProfileId) : undefined;
          if (!c) return null;
          return { slug: c.slug, name: c.name, count: g._count.companyProfileId };
        })
        .filter((x: { slug: string; name: string; count: number } | null): x is { slug: string; name: string; count: number } => x !== null)
        .slice(0, 12);
    } catch (hiringErr) {
      logger.warn('Startup hub hiring ranking query failed', {
        error: hiringErr instanceof Error ? hiringErr.message : String(hiringErr),
      });
      hiring = [];
    }

    // ── Aggregate stats ──
    let stats = {
      privateCompanies: 0,
      trackedFundingUSD: 0,
      roundsLast18mo: 0,
      openRolesAtPrivate: 0,
    };
    try {
      const [privateAgg, roundsLast18mo, openRolesAtPrivate] = await Promise.all([
        db.companyProfile.aggregate({
          where: { isPublic: false },
          _count: true,
          _sum: { totalFunding: true },
        }),
        db.fundingRound.count({ where: { date: { gte: eighteenMonthsAgo } } }),
        db.spaceJobPosting.count({
          where: { isActive: true, companyProfile: { isPublic: false } },
        }),
      ]);

      const privateCompanies =
        typeof privateAgg._count === 'number' ? privateAgg._count : privateAgg._count?._all ?? 0;

      stats = {
        privateCompanies,
        trackedFundingUSD: privateAgg._sum?.totalFunding || 0,
        roundsLast18mo,
        openRolesAtPrivate,
      };
    } catch (statsErr) {
      logger.warn('Startup hub stats aggregate failed', {
        error: statsErr instanceof Error ? statsErr.message : String(statsErr),
      });
    }

    return NextResponse.json(
      { watchlist, recentRounds, hiring, stats },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    logger.error('Failed to build startup hub data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch startup hub data');
  }
}
