import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';

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

    const { searchParams } = new URL(request.url);
    const companiesParam = searchParams.get('companies');
    const periodParam = (searchParams.get('period') || '3y') as Period;

    if (!companiesParam) {
      return validationError('companies query parameter is required');
    }

    const slugs = companiesParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (slugs.length === 0) {
      return validationError('At least one company slug is required');
    }

    if (slugs.length > 5) {
      return validationError('Maximum 5 companies allowed for comparison');
    }

    if (!VALID_PERIODS.includes(periodParam)) {
      return validationError(`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`);
    }

    const periodStart = periodToDate(periodParam);

    // Fetch company profiles
    const profiles = await prisma.companyProfile.findMany({
      where: { slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        name: true,
        sector: true,
        totalFunding: true,
        valuation: true,
        employeeRange: true,
      },
    });

    if (profiles.length !== slugs.length) {
      const foundSlugs = profiles.map((p) => p.slug);
      const missing = slugs.filter((s) => !foundSlugs.includes(s));
      return validationError(`Companies not found: ${missing.join(', ')}`);
    }

    // Build the response for each company in parallel
    const companies = await Promise.all(
      profiles.map(async (profile) => {
        const [scores, contracts, fundingRounds, personnel, products, executiveMoves] =
          await Promise.all([
            // Scores
            prisma.companyScore.findMany({
              where: { companyId: profile.id },
              select: { scoreType: true, score: true, breakdown: true },
            }),
            // Government contracts within period
            prisma.governmentContractAward.findMany({
              where: {
                companyId: profile.id,
                awardDate: { gte: periodStart },
              },
              orderBy: { awardDate: 'desc' },
              select: {
                agency: true,
                value: true,
                awardDate: true,
              },
            }),
            // Funding rounds within period
            prisma.fundingRound.findMany({
              where: {
                companyId: profile.id,
                date: { gte: periodStart },
              },
              orderBy: { date: 'asc' },
              select: {
                date: true,
                amount: true,
                seriesLabel: true,
              },
            }),
            // Key personnel (all for tenure calc)
            prisma.keyPersonnel.findMany({
              where: { companyId: profile.id },
              select: {
                name: true,
                title: true,
                startDate: true,
                endDate: true,
                isCurrent: true,
              },
            }),
            // Products
            prisma.companyProduct.findMany({
              where: { companyId: profile.id },
              select: {
                name: true,
                category: true,
                status: true,
                launchDate: true,
              },
            }),
            // Executive moves (recent)
            prisma.executiveMove.findMany({
              where: {
                companySlug: profile.slug,
                date: { gte: periodStart },
              },
              orderBy: { date: 'desc' },
              take: 5,
              select: {
                personName: true,
                moveType: true,
                date: true,
                fromCompany: true,
                toCompany: true,
              },
            }),
          ]);

        // Aggregate scores into a map
        const scoreMap: Record<string, number> = {};
        for (const s of scores) {
          scoreMap[s.scoreType] = s.score;
        }

        // Contract aggregations
        const contractsByAgency: Record<string, number> = {};
        const contractsByYear: Record<string, { count: number; value: number }> = {};
        let totalContractValue = 0;

        for (const c of contracts) {
          // By agency
          contractsByAgency[c.agency] = (contractsByAgency[c.agency] || 0) + 1;
          // By year
          if (c.awardDate) {
            const year = c.awardDate.getFullYear().toString();
            if (!contractsByYear[year]) {
              contractsByYear[year] = { count: 0, value: 0 };
            }
            contractsByYear[year].count += 1;
            contractsByYear[year].value += c.value || 0;
          }
          totalContractValue += c.value || 0;
        }

        // Funding aggregations
        const totalRaised = fundingRounds.reduce((sum, r) => sum + (r.amount || 0), 0);
        const lastRound = fundingRounds.length > 0 ? fundingRounds[fundingRounds.length - 1] : null;
        const timeToLastRound = lastRound
          ? Math.round(
              (new Date().getTime() - new Date(lastRound.date).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null;

        // Team stability calculations
        const currentPersonnel = personnel.filter((p) => p.isCurrent);
        const departedPersonnel = personnel.filter((p) => !p.isCurrent);
        const now = new Date();

        const tenures = personnel
          .filter((p) => p.startDate)
          .map((p) => {
            const end = p.endDate ? new Date(p.endDate) : now;
            const start = new Date(p.startDate!);
            return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
          });

        const avgTenureMonths =
          tenures.length > 0 ? Math.round(tenures.reduce((a, b) => a + b, 0) / tenures.length) : null;

        // Product portfolio
        const activeProducts = products.filter((p) => p.status === 'active');
        const inDevProducts = products.filter((p) => p.status === 'development');
        const productsByCategory: Record<string, number> = {};
        for (const p of products) {
          const cat = p.category || 'other';
          productsByCategory[cat] = (productsByCategory[cat] || 0) + 1;
        }

        return {
          slug: profile.slug,
          name: profile.name,
          sector: profile.sector,
          totalFunding: profile.totalFunding,
          valuation: profile.valuation,
          employeeRange: profile.employeeRange,
          scores: {
            overall: scoreMap.overall ?? null,
            technology: scoreMap.technology ?? null,
            team: scoreMap.team ?? null,
            funding: scoreMap.funding ?? null,
            market_position: scoreMap.market_position ?? null,
            growth: scoreMap.growth ?? null,
            momentum: scoreMap.momentum ?? null,
          },
          contracts: {
            total: contracts.length,
            totalValue: totalContractValue,
            byAgency: contractsByAgency,
            byYear: contractsByYear,
          },
          funding: {
            totalRounds: fundingRounds.length,
            totalRaised,
            rounds: fundingRounds.map((r) => ({
              date: r.date,
              amount: r.amount,
              seriesLabel: r.seriesLabel,
            })),
            timeToLastRound,
          },
          team: {
            currentCount: currentPersonnel.length,
            departedCount: departedPersonnel.length,
            avgTenureMonths,
            recentMoves: executiveMoves.map((m) => ({
              name: m.personName,
              type: m.moveType,
              date: m.date,
              fromCompany: m.fromCompany,
              toCompany: m.toCompany,
            })),
          },
          products: {
            total: products.length,
            active: activeProducts.length,
            inDevelopment: inDevProducts.length,
            byCategory: productsByCategory,
          },
        };
      })
    );

    return NextResponse.json({ companies });
  } catch (error) {
    logger.error('War room API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch competitive intelligence data');
  }
}
