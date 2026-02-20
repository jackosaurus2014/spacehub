import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all funding rounds with company data
    const allRounds = await prisma.fundingRound.findMany({
      include: {
        company: {
          select: {
            name: true,
            slug: true,
            sector: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // ── Total funding by quarter (last 8 quarters) ──
    const now = new Date();
    const quarters: { label: string; start: Date; end: Date }[] = [];
    for (let i = 7; i >= 0; i--) {
      const quarterDate = new Date(now);
      quarterDate.setMonth(quarterDate.getMonth() - i * 3);
      const q = Math.floor(quarterDate.getMonth() / 3);
      const year = quarterDate.getFullYear();
      const start = new Date(year, q * 3, 1);
      const end = new Date(year, (q + 1) * 3, 0, 23, 59, 59);
      const label = `Q${q + 1} ${year}`;
      // Avoid duplicates
      if (!quarters.find((qr) => qr.label === label)) {
        quarters.push({ label, start, end });
      }
    }

    const fundingByQuarter = quarters.map((q) => {
      const quarterRounds = allRounds.filter(
        (r) => r.date >= q.start && r.date <= q.end
      );
      const total = quarterRounds.reduce((sum, r) => sum + (r.amount || 0), 0);
      const dealCount = quarterRounds.length;
      return {
        quarter: q.label,
        total,
        dealCount,
      };
    });

    // ── Funding by sector ──
    const sectorMap: Record<string, { total: number; deals: number }> = {};
    allRounds.forEach((r) => {
      const sector = r.company?.sector || 'Unknown';
      if (!sectorMap[sector]) sectorMap[sector] = { total: 0, deals: 0 };
      sectorMap[sector].total += r.amount || 0;
      sectorMap[sector].deals += 1;
    });
    const fundingBySector = Object.entries(sectorMap)
      .map(([sector, data]) => ({ sector, ...data }))
      .sort((a, b) => b.total - a.total);

    // ── Average round size by stage ──
    const stageMap: Record<string, { total: number; count: number }> = {};
    allRounds.forEach((r) => {
      const stage = r.seriesLabel || r.roundType || 'Unknown';
      // Normalize stage names
      let normalizedStage = stage;
      if (stage.toLowerCase().includes('seed')) normalizedStage = 'Seed';
      else if (stage.toLowerCase().includes('series a')) normalizedStage = 'Series A';
      else if (stage.toLowerCase().includes('series b')) normalizedStage = 'Series B';
      else if (stage.toLowerCase().includes('series c')) normalizedStage = 'Series C';
      else if (stage.toLowerCase().includes('series d') || stage.toLowerCase().includes('series e') || stage.toLowerCase().includes('series f') || stage.toLowerCase().includes('series g')) normalizedStage = 'Series D+';
      else if (stage.toLowerCase().includes('spac')) normalizedStage = 'SPAC';
      else if (stage.toLowerCase().includes('ipo')) normalizedStage = 'IPO';
      else if (stage.toLowerCase().includes('acquisition')) normalizedStage = 'Acquisition';
      else if (stage.toLowerCase().includes('tender') || stage.toLowerCase().includes('follow-on') || stage.toLowerCase().includes('offering')) normalizedStage = 'Secondary/Follow-on';

      if (!stageMap[normalizedStage]) stageMap[normalizedStage] = { total: 0, count: 0 };
      if (r.amount) {
        stageMap[normalizedStage].total += r.amount;
        stageMap[normalizedStage].count += 1;
      }
    });
    const avgRoundByStage = Object.entries(stageMap)
      .map(([stage, data]) => ({
        stage,
        avgAmount: data.count > 0 ? data.total / data.count : 0,
        totalAmount: data.total,
        dealCount: data.count,
      }))
      .sort((a, b) => b.avgAmount - a.avgAmount);

    // ── Top investors by deal count ──
    const investorDeals: Record<string, { deals: number; totalAmount: number }> = {};
    allRounds.forEach((r) => {
      const allInvestors = [
        ...(r.leadInvestor ? [r.leadInvestor] : []),
        ...r.investors,
      ];
      const uniqueInvestors = Array.from(new Set(allInvestors));
      uniqueInvestors.forEach((inv) => {
        if (!investorDeals[inv]) investorDeals[inv] = { deals: 0, totalAmount: 0 };
        investorDeals[inv].deals += 1;
        investorDeals[inv].totalAmount += r.amount || 0;
      });
    });
    const topInvestors = Object.entries(investorDeals)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 20);

    // ── Largest rounds ──
    const largestRounds = allRounds
      .filter((r) => r.amount && r.amount > 0)
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        companyName: r.company?.name || 'Unknown',
        companySlug: r.company?.slug,
        amount: r.amount,
        seriesLabel: r.seriesLabel,
        roundType: r.roundType,
        date: r.date,
        leadInvestor: r.leadInvestor,
        postValuation: r.postValuation,
      }));

    // ── YTD summary stats ──
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const ytdRounds = allRounds.filter((r) => r.date >= yearStart);
    const ytdTotal = ytdRounds.reduce((sum, r) => sum + (r.amount || 0), 0);
    const ytdDealCount = ytdRounds.length;
    const allTimeTotal = allRounds.reduce((sum, r) => sum + (r.amount || 0), 0);
    const avgRoundSize =
      allRounds.filter((r) => r.amount).length > 0
        ? allTimeTotal / allRounds.filter((r) => r.amount).length
        : 0;
    const largestRound = allRounds.reduce(
      (max, r) => ((r.amount || 0) > max ? r.amount || 0 : max),
      0
    );

    return NextResponse.json({
      summary: {
        ytdTotal,
        ytdDealCount,
        allTimeTotal,
        totalDeals: allRounds.length,
        avgRoundSize,
        largestRound,
      },
      fundingByQuarter,
      fundingBySector,
      avgRoundByStage,
      topInvestors,
      largestRounds,
    });
  } catch (error) {
    logger.error('Funding stats error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch funding stats' },
      { status: 500 }
    );
  }
}
