import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createSuccessResponse, unauthorizedError, internalError, validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const VALID_PERIODS = ['1y', '2y', '3y', '5y'] as const;
type Period = (typeof VALID_PERIODS)[number];

function periodToDate(period: Period): Date {
  const now = new Date();
  const years = parseInt(period.replace('y', ''), 10);
  return new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorizedError();
    }

    const { searchParams } = request.nextUrl;
    const periodParam = (searchParams.get('period') || '3y') as string;
    const companyId = searchParams.get('companyId') || undefined;

    if (!VALID_PERIODS.includes(periodParam as Period)) {
      return validationError(`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`);
    }

    const period = periodParam as Period;
    const sinceDate = periodToDate(period);

    const dateFilter = { awardDate: { gte: sinceDate } };
    const companyFilter = companyId ? { companyId } : {};
    const baseWhere = { ...dateFilter, ...companyFilter };

    // Run all queries in parallel
    const [
      totalAgg,
      largestContract,
      byAgency,
      byNaics,
      bySetAside,
      byType,
      recentAwards,
      topAwardees,
      proposalStats,
      ratings,
    ] = await Promise.all([
      // Summary aggregation
      prisma.governmentContractAward.aggregate({
        where: baseWhere,
        _count: { id: true },
        _sum: { value: true },
        _avg: { value: true },
        _max: { value: true },
      }),

      // Largest contract details
      prisma.governmentContractAward.findFirst({
        where: baseWhere,
        orderBy: { value: 'desc' },
        select: {
          companyName: true,
          agency: true,
          title: true,
          value: true,
          awardDate: true,
        },
      }),

      // By agency
      prisma.governmentContractAward.groupBy({
        by: ['agency'],
        where: baseWhere,
        _count: { id: true },
        _sum: { value: true },
        _avg: { value: true },
        orderBy: { _sum: { value: 'desc' } },
      }),

      // By NAICS code (top 10)
      prisma.governmentContractAward.groupBy({
        by: ['naicsCode'],
        where: { ...baseWhere, naicsCode: { not: null } },
        _count: { id: true },
        _sum: { value: true },
        orderBy: { _sum: { value: 'desc' } },
        take: 10,
      }),

      // By set-aside
      prisma.governmentContractAward.groupBy({
        by: ['setAside'],
        where: baseWhere,
        _count: { id: true },
        _sum: { value: true },
        orderBy: { _sum: { value: 'desc' } },
      }),

      // By type
      prisma.governmentContractAward.groupBy({
        by: ['type'],
        where: baseWhere,
        _count: { id: true },
        _sum: { value: true },
        orderBy: { _sum: { value: 'desc' } },
      }),

      // Recent awards (last 20)
      prisma.governmentContractAward.findMany({
        where: baseWhere,
        orderBy: { awardDate: 'desc' },
        take: 20,
        select: {
          companyName: true,
          agency: true,
          title: true,
          value: true,
          awardDate: true,
          naicsCode: true,
          setAside: true,
          type: true,
        },
      }),

      // Top awardees (top 15 by total value)
      prisma.governmentContractAward.groupBy({
        by: ['companyName'],
        where: baseWhere,
        _count: { id: true },
        _sum: { value: true },
        orderBy: { _sum: { value: 'desc' } },
        take: 15,
      }),

      // Proposal stats (only when companyId provided)
      companyId
        ? prisma.proposal.groupBy({
            by: ['status'],
            where: { companyId },
            _count: { id: true },
          })
        : Promise.resolve(null),

      // Provider ratings (only when companyId provided)
      companyId
        ? prisma.providerReview.aggregate({
            where: { companyId, status: 'published' },
            _avg: {
              overallRating: true,
              qualityRating: true,
              timelineRating: true,
              commRating: true,
              valueRating: true,
            },
            _count: { id: true },
          })
        : Promise.resolve(null),
    ]);

    // Build by-year aggregation from raw data
    // Prisma doesn't support groupBy on date parts directly, so we use a raw query
    const byYearRaw = companyId
      ? await prisma.$queryRaw<
          Array<{ year: number; count: bigint; total_value: number | null }>
        >`
          SELECT
            EXTRACT(YEAR FROM "awardDate")::int AS year,
            COUNT(*)::bigint AS count,
            SUM("value") AS total_value
          FROM "GovernmentContractAward"
          WHERE "awardDate" >= ${sinceDate}
            AND "companyId" = ${companyId}
          GROUP BY EXTRACT(YEAR FROM "awardDate")
          ORDER BY year DESC
        `
      : await prisma.$queryRaw<
          Array<{ year: number; count: bigint; total_value: number | null }>
        >`
          SELECT
            EXTRACT(YEAR FROM "awardDate")::int AS year,
            COUNT(*)::bigint AS count,
            SUM("value") AS total_value
          FROM "GovernmentContractAward"
          WHERE "awardDate" >= ${sinceDate}
          GROUP BY EXTRACT(YEAR FROM "awardDate")
          ORDER BY year DESC
        `;

    // Process proposal stats into a clean object
    let proposalStatsResult = null;
    if (proposalStats) {
      const statusMap: Record<string, number> = {};
      for (const row of proposalStats) {
        statusMap[row.status] = row._count.id;
      }
      const submitted = statusMap['submitted'] || 0;
      const shortlisted = statusMap['shortlisted'] || 0;
      const awarded = statusMap['awarded'] || 0;
      const rejected = statusMap['rejected'] || 0;
      const withdrawn = statusMap['withdrawn'] || 0;
      const total = submitted + shortlisted + awarded + rejected + withdrawn;
      proposalStatsResult = {
        submitted,
        shortlisted,
        awarded,
        rejected,
        withdrawn,
        total,
        winRate: total > 0 ? Math.round((awarded / total) * 100) : 0,
      };
    }

    // Process ratings
    let ratingsResult = null;
    if (ratings) {
      ratingsResult = {
        overall: ratings._avg.overallRating,
        quality: ratings._avg.qualityRating,
        timeline: ratings._avg.timelineRating,
        communication: ratings._avg.commRating,
        value: ratings._avg.valueRating,
        reviewCount: ratings._count.id,
      };
    }

    const data = {
      summary: {
        totalContracts: totalAgg._count.id,
        totalValue: totalAgg._sum.value || 0,
        avgValue: totalAgg._avg.value || 0,
        largestContract: largestContract
          ? {
              value: largestContract.value,
              title: largestContract.title,
              company: largestContract.companyName,
              agency: largestContract.agency,
              date: largestContract.awardDate,
            }
          : null,
      },
      byAgency: byAgency.map((a) => ({
        agency: a.agency,
        count: a._count.id,
        totalValue: a._sum.value || 0,
        avgValue: a._avg.value || 0,
      })),
      byNaics: byNaics.map((n) => ({
        naicsCode: n.naicsCode || 'Unknown',
        count: n._count.id,
        totalValue: n._sum.value || 0,
      })),
      bySetAside: bySetAside.map((s) => ({
        setAside: s.setAside || 'None',
        count: s._count.id,
        totalValue: s._sum.value || 0,
      })),
      byType: byType.map((t) => ({
        type: t.type || 'Unknown',
        count: t._count.id,
        totalValue: t._sum.value || 0,
      })),
      byYear: byYearRaw.map((y) => ({
        year: y.year,
        count: Number(y.count),
        totalValue: y.total_value || 0,
      })),
      proposalStats: proposalStatsResult,
      ratings: ratingsResult,
      topAwardees: topAwardees.map((a) => ({
        companyName: a.companyName,
        count: a._count.id,
        totalValue: a._sum.value || 0,
      })),
      recentAwards: recentAwards.map((a) => ({
        companyName: a.companyName,
        agency: a.agency,
        title: a.title,
        value: a.value,
        awardDate: a.awardDate,
        naicsCode: a.naicsCode,
        setAside: a.setAside,
        type: a.type,
      })),
    };

    return createSuccessResponse(data);
  } catch (error) {
    logger.error('Failed to fetch proposal analytics', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch proposal analytics');
  }
}
