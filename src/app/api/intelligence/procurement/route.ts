import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCompanyTeamingIntelligence } from '@/lib/fetchers/sam-subaward-fetcher';
import { getSBIRCompetitors } from '@/lib/fetchers/sbir-awards-fetcher';

export const dynamic = 'force-dynamic';

/**
 * GET /api/intelligence/procurement?companySlug=spacex
 *
 * Returns comprehensive procurement intelligence for a company:
 * - Contract awards with competition data (numberOfOffers, extentCompeted)
 * - Teaming relationships (subaward data — who they prime/sub with)
 * - SBIR competitors (companies winning awards on same topics)
 * - Contract analytics (by agency, year, type, set-aside)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get('companySlug');
    if (!companySlug) {
      return NextResponse.json({ error: 'companySlug parameter required' }, { status: 400 });
    }

    const company = await prisma.companyProfile.findUnique({
      where: { slug: companySlug },
      select: { id: true, name: true, cageCode: true, samUei: true, naicsCode: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Run all procurement queries in parallel
    const [
      contracts,
      contractAgg,
      highCompetitionContracts,
      teamingData,
      sbirData,
      openOpportunities,
    ] = await Promise.all([
      // All contracts for this company
      prisma.governmentContractAward.findMany({
        where: { companyId: company.id },
        orderBy: { awardDate: 'desc' },
        take: 50,
      }),

      // Aggregate contract stats
      prisma.governmentContractAward.aggregate({
        where: { companyId: company.id },
        _count: true,
        _sum: { value: true, ceiling: true },
        _avg: { value: true, numberOfOffers: true },
        _max: { value: true },
      }),

      // Contracts with highest competition (most bidders)
      prisma.governmentContractAward.findMany({
        where: { companyId: company.id, numberOfOffers: { gt: 1 } },
        orderBy: { numberOfOffers: 'desc' },
        take: 10,
        select: {
          title: true, agency: true, value: true, numberOfOffers: true,
          extentCompeted: true, awardDate: true, naicsCode: true,
        },
      }),

      // Teaming intelligence (prime ↔ sub relationships)
      getCompanyTeamingIntelligence(company.id),

      // SBIR competitor analysis
      getSBIRCompetitors(company.id),

      // Open procurement opportunities matching company's NAICS
      company.naicsCode
        ? prisma.procurementOpportunity.findMany({
            where: {
              naicsCode: company.naicsCode,
              isActive: true,
              responseDeadline: { gte: new Date() },
            },
            orderBy: { responseDeadline: 'asc' },
            take: 10,
            select: {
              title: true, agency: true, type: true, estimatedValue: true,
              responseDeadline: true, setAside: true, samUrl: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Aggregate by agency
    const byAgency: Record<string, { count: number; totalValue: number; avgOffers: number; offerCounts: number[] }> = {};
    const byYear: Record<number, { count: number; totalValue: number }> = {};
    const competitionSummary = { fullyCompeted: 0, notCompeted: 0, setAside: 0, other: 0, avgBidders: 0 };
    let totalBidders = 0;
    let biddersCount = 0;

    for (const c of contracts) {
      const agency = c.agency || 'Unknown';
      if (!byAgency[agency]) byAgency[agency] = { count: 0, totalValue: 0, avgOffers: 0, offerCounts: [] };
      byAgency[agency].count++;
      byAgency[agency].totalValue += c.value || 0;
      if (c.numberOfOffers) byAgency[agency].offerCounts.push(c.numberOfOffers);

      const year = c.awardDate ? new Date(c.awardDate).getFullYear() : 0;
      if (year > 0) {
        if (!byYear[year]) byYear[year] = { count: 0, totalValue: 0 };
        byYear[year].count++;
        byYear[year].totalValue += c.value || 0;
      }

      // Competition breakdown
      const extent = (c.extentCompeted || '').toLowerCase();
      if (extent.includes('full and open')) competitionSummary.fullyCompeted++;
      else if (extent.includes('not competed') || extent.includes('not available')) competitionSummary.notCompeted++;
      else if (extent.includes('set-aside') || extent.includes('set aside')) competitionSummary.setAside++;
      else competitionSummary.other++;

      if (c.numberOfOffers) { totalBidders += c.numberOfOffers; biddersCount++; }
    }

    competitionSummary.avgBidders = biddersCount > 0 ? parseFloat((totalBidders / biddersCount).toFixed(1)) : 0;

    // Calculate avg offers per agency
    for (const [, data] of Object.entries(byAgency)) {
      data.avgOffers = data.offerCounts.length > 0
        ? parseFloat((data.offerCounts.reduce((s, n) => s + n, 0) / data.offerCounts.length).toFixed(1))
        : 0;
    }

    return NextResponse.json({
      company: {
        name: company.name,
        cageCode: company.cageCode,
        samUei: company.samUei,
        naicsCode: company.naicsCode,
      },
      summary: {
        totalContracts: contractAgg._count,
        totalValue: contractAgg._sum.value || 0,
        totalCeiling: contractAgg._sum.ceiling || 0,
        avgContractValue: contractAgg._avg.value || 0,
        largestContract: contractAgg._max.value || 0,
        avgBiddersPerContract: competitionSummary.avgBidders,
      },
      competition: competitionSummary,
      highCompetitionContracts,
      byAgency: Object.entries(byAgency)
        .map(([agency, d]) => ({ agency, count: d.count, totalValue: d.totalValue, avgOffers: d.avgOffers }))
        .sort((a, b) => b.totalValue - a.totalValue),
      byYear: Object.entries(byYear)
        .map(([year, d]) => ({ year: parseInt(year), ...d }))
        .sort((a, b) => a.year - b.year),
      teaming: {
        asSubcontractor: teamingData.asSubcontractor.length,
        asPrime: teamingData.asPrime.length,
        totalSubawardValue: teamingData.totalSubawardValue,
        totalPrimeSubawardValue: teamingData.totalPrimeSubawardValue,
        frequentPartners: teamingData.frequentPartners,
      },
      sbir: {
        totalAwards: sbirData.myAwards.length,
        topicCoverage: sbirData.topicAnalysis.length,
        competitors: sbirData.competitors,
      },
      openOpportunities,
      recentContracts: contracts.slice(0, 15).map(c => ({
        title: c.title,
        agency: c.agency,
        value: c.value,
        ceiling: c.ceiling,
        awardDate: c.awardDate,
        type: c.type,
        naicsCode: c.naicsCode,
        setAside: c.setAside,
        numberOfOffers: c.numberOfOffers,
        extentCompeted: c.extentCompeted,
      })),
    });
  } catch (error) {
    logger.error('Procurement intelligence error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch procurement intelligence' }, { status: 500 });
  }
}
