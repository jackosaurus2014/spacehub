import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PERIOD_DAYS: Record<string, number> = { '1y': 365, '2y': 730, '3y': 1095, '5y': 1825 };

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '3y';
    const sector = searchParams.get('sector') || undefined;
    const days = PERIOD_DAYS[period] || 1095;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const roundWhere: any = { date: { gte: since } };
    if (sector) {
      roundWhere.company = { sector };
    }

    const [rounds, exits, investors, totalAgg] = await Promise.all([
      prisma.fundingRound.findMany({
        where: roundWhere,
        orderBy: { date: 'desc' },
        include: {
          company: { select: { slug: true, name: true, sector: true } },
        },
      }),
      prisma.mergerAcquisition.findMany({
        where: { date: { gte: since } },
        orderBy: { date: 'desc' },
        take: 20,
        include: {
          acquirer: { select: { slug: true, name: true } },
        },
      }),
      prisma.investor.findMany({
        where: { status: 'active' },
        orderBy: { aum: 'desc' },
        take: 30,
      }),
      prisma.fundingRound.aggregate({
        where: roundWhere,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
        _max: { amount: true },
      }),
    ]);

    // Aggregate by quarter
    const byQuarter: Record<string, { totalRaised: number; roundCount: number }> = {};
    const bySector: Record<string, { totalRaised: number; roundCount: number }> = {};
    const byStage: Record<string, { totalRaised: number; roundCount: number; amounts: number[] }> = {};
    const investorDeals: Record<string, { count: number; totalInvested: number }> = {};

    for (const r of rounds) {
      const amt = r.amount || 0;

      // By quarter
      const d = new Date(r.date);
      const qKey = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
      if (!byQuarter[qKey]) byQuarter[qKey] = { totalRaised: 0, roundCount: 0 };
      byQuarter[qKey].totalRaised += amt;
      byQuarter[qKey].roundCount++;

      // By sector
      const sec = r.company?.sector || 'Unknown';
      if (!bySector[sec]) bySector[sec] = { totalRaised: 0, roundCount: 0 };
      bySector[sec].totalRaised += amt;
      bySector[sec].roundCount++;

      // By stage
      const stage = r.seriesLabel || r.roundType || 'Unknown';
      if (!byStage[stage]) byStage[stage] = { totalRaised: 0, roundCount: 0, amounts: [] };
      byStage[stage].totalRaised += amt;
      byStage[stage].roundCount++;
      if (amt > 0) byStage[stage].amounts.push(amt);

      // Investor tracking
      const allInvestors = [r.leadInvestor, ...(r.investors || [])].filter(Boolean) as string[];
      for (const inv of allInvestors) {
        if (!investorDeals[inv]) investorDeals[inv] = { count: 0, totalInvested: 0 };
        investorDeals[inv].count++;
        investorDeals[inv].totalInvested += amt / Math.max(allInvestors.length, 1);
      }
    }

    return NextResponse.json({
      summary: {
        totalRaised: totalAgg._sum.amount || 0,
        roundCount: totalAgg._count,
        avgRoundSize: totalAgg._avg.amount || 0,
        largestRound: totalAgg._max.amount || 0,
      },
      byQuarter: Object.entries(byQuarter)
        .map(([quarter, d]) => ({ quarter, ...d }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter)),
      bySector: Object.entries(bySector)
        .map(([sectorName, d]) => ({ sector: sectorName, ...d }))
        .sort((a, b) => b.totalRaised - a.totalRaised),
      byStage: Object.entries(byStage)
        .map(([stage, d]) => ({
          stage,
          totalRaised: d.totalRaised,
          roundCount: d.roundCount,
          avgSize: d.amounts.length > 0 ? d.amounts.reduce((s, a) => s + a, 0) / d.amounts.length : 0,
        }))
        .sort((a, b) => b.totalRaised - a.totalRaised),
      topInvestors: Object.entries(investorDeals)
        .map(([name, d]) => ({ name, dealCount: d.count, totalInvested: d.totalInvested }))
        .sort((a, b) => b.dealCount - a.dealCount)
        .slice(0, 15),
      recentRounds: rounds.slice(0, 20).map(r => ({
        companyName: r.company?.name || 'Unknown',
        companySlug: r.company?.slug || '',
        amount: r.amount,
        seriesLabel: r.seriesLabel,
        date: r.date,
        leadInvestor: r.leadInvestor,
        roundType: r.roundType,
      })),
      exits: exits.map(e => ({
        targetName: e.targetName,
        acquirerName: e.acquirer?.name || 'Unknown',
        acquirerSlug: e.acquirer?.slug || '',
        price: e.price,
        date: e.date,
        dealType: e.dealType,
        status: e.status,
      })),
      activeInvestors: investors.slice(0, 15).map(inv => ({
        name: inv.name,
        type: inv.type,
        aum: inv.aum,
        fundSize: inv.fundSize,
        sectorFocus: inv.sectorFocus,
        portfolioCount: inv.portfolioCount,
        investmentStage: inv.investmentStage,
      })),
    });
  } catch (error) {
    logger.error('Funding analytics error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch funding analytics' }, { status: 500 });
  }
}
