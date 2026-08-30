import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, createSuccessResponse } from '@/lib/errors';
import { apiCache, CacheTTL } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cacheKey = 'procurement:stats';
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    const [
      totalOpportunities,
      activeOpportunities,
      byAgency,
      byType,
      avgValues,
      totalSBIR,
      activeSBIR,
      totalBudgetItems,
      totalCongressional,
      recentOpportunities,
    ] = await Promise.all([
      prisma.procurementOpportunity.count(),
      // "Active" spans both pipelines: SAM/procurement rows AND open funding
      // opportunities (grants.gov et al). Counting only the keyless-blocked SAM
      // table is what showed "1 opportunity" (audit 2026-08-30).
      prisma.procurementOpportunity.count({ where: { isActive: true, OR: [{ responseDeadline: null }, { responseDeadline: { gte: new Date() } }] } }).then(async (n) => n + (await prisma.fundingOpportunity.count({ where: { status: 'open', OR: [{ deadline: null }, { deadline: { gte: new Date() } }] } }))),
      prisma.procurementOpportunity.groupBy({
        by: ['agency'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.procurementOpportunity.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      prisma.procurementOpportunity.aggregate({
        _avg: { estimatedValue: true, awardAmount: true },
        _sum: { awardAmount: true },
        _count: { id: true },
      }),
      prisma.sBIRSolicitation.count(),
      prisma.sBIRSolicitation.count({ where: { isActive: true } }),
      prisma.spaceBudgetItem.count(),
      prisma.congressionalActivity.count(),
      prisma.procurementOpportunity.findMany({
        where: { isActive: true },
        orderBy: { postedDate: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          agency: true,
          type: true,
          estimatedValue: true,
          responseDeadline: true,
          postedDate: true,
        },
      }),
    ]);

    // Count opportunities with upcoming deadlines (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const [procDeadlines, fundingDeadlines] = await Promise.all([
      prisma.procurementOpportunity.count({
        where: { isActive: true, responseDeadline: { gte: new Date(), lte: thirtyDaysFromNow } },
      }),
      prisma.fundingOpportunity.count({
        where: { status: 'open', deadline: { gte: new Date(), lte: thirtyDaysFromNow } },
      }),
    ]);
    const upcomingDeadlines = procDeadlines + fundingDeadlines;

    const stats = {
      overview: {
        totalOpportunities,
        activeOpportunities,
        upcomingDeadlines,
        avgEstimatedValue: avgValues._avg.estimatedValue,
        avgAwardAmount: avgValues._avg.awardAmount,
        totalAwardValue: avgValues._sum.awardAmount,
      },
      sbir: {
        total: totalSBIR,
        active: activeSBIR,
      },
      budget: {
        totalItems: totalBudgetItems,
      },
      congressional: {
        totalActivities: totalCongressional,
      },
      byAgency: byAgency.map((a) => ({
        agency: a.agency,
        count: a._count.id,
      })),
      byType: byType.map((t) => ({
        type: t.type,
        count: t._count.id,
      })),
      recentOpportunities,
    };

    apiCache.set(cacheKey, stats, CacheTTL.DEFAULT);

    return createSuccessResponse(stats);
  } catch (error) {
    logger.error('Failed to fetch procurement stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch procurement stats');
  }
}
