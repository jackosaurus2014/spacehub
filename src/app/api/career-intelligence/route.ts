import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Salary benchmarks: grouped by category AND seniorityLevel
    const salaryBenchmarks = await prisma.spaceJobPosting.groupBy({
      by: ['category', 'seniorityLevel'],
      where: {
        isActive: true,
        salaryMin: { not: null },
      },
      _avg: {
        salaryMin: true,
        salaryMax: true,
        salaryMedian: true,
      },
      _count: { id: true },
    });

    // 2. Clearance premium: average salaries with vs without clearance, by category
    const clearanceData = await prisma.spaceJobPosting.groupBy({
      by: ['category', 'clearanceRequired'],
      where: {
        isActive: true,
        salaryMin: { not: null },
        salaryMax: { not: null },
      },
      _avg: {
        salaryMin: true,
        salaryMax: true,
        salaryMedian: true,
      },
      _count: { id: true },
    });

    // Build clearance premium per category
    const clearancePremium: {
      category: string;
      withClearance: { avgMin: number; avgMax: number; avgMedian: number; count: number } | null;
      withoutClearance: { avgMin: number; avgMax: number; avgMedian: number; count: number } | null;
      premiumAmount: number;
      premiumPercent: number;
    }[] = [];

    type ClearanceRow = (typeof clearanceData)[number];
    const clearanceMap = new Map<string, { withClearance: ClearanceRow | null; withoutClearance: ClearanceRow | null }>();
    for (const row of clearanceData) {
      const existing = clearanceMap.get(row.category) || { withClearance: null, withoutClearance: null };
      if (row.clearanceRequired) {
        existing.withClearance = row;
      } else {
        existing.withoutClearance = row;
      }
      clearanceMap.set(row.category, existing);
    }

    for (const [category, data] of Array.from(clearanceMap.entries())) {
      const withAvg = data.withClearance?._avg.salaryMedian ?? data.withClearance?._avg.salaryMin ?? 0;
      const withoutAvg = data.withoutClearance?._avg.salaryMedian ?? data.withoutClearance?._avg.salaryMin ?? 0;
      const premiumAmount = Math.round(withAvg - withoutAvg);
      const premiumPercent = withoutAvg > 0 ? Math.round((premiumAmount / withoutAvg) * 100) : 0;

      clearancePremium.push({
        category,
        withClearance: data.withClearance
          ? {
              avgMin: Math.round(data.withClearance._avg.salaryMin ?? 0),
              avgMax: Math.round(data.withClearance._avg.salaryMax ?? 0),
              avgMedian: Math.round(data.withClearance._avg.salaryMedian ?? 0),
              count: data.withClearance._count.id,
            }
          : null,
        withoutClearance: data.withoutClearance
          ? {
              avgMin: Math.round(data.withoutClearance._avg.salaryMin ?? 0),
              avgMax: Math.round(data.withoutClearance._avg.salaryMax ?? 0),
              avgMedian: Math.round(data.withoutClearance._avg.salaryMedian ?? 0),
              count: data.withoutClearance._count.id,
            }
          : null,
        premiumAmount,
        premiumPercent,
      });
    }

    // 3. Skills demand: latest quarter WorkforceTrend, parse topSkills
    const latestTrend = await prisma.workforceTrend.findFirst({
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });

    let skillsDemand: { skill: string; index: number }[] = [];
    if (latestTrend?.topSkills) {
      try {
        const parsed = JSON.parse(latestTrend.topSkills);
        if (Array.isArray(parsed)) {
          skillsDemand = parsed.map((skill: string, i: number) => ({
            skill,
            index: parsed.length - i, // higher index = more demand
          }));
        }
      } catch {
        // topSkills isn't valid JSON, skip
      }
    }

    // 4. Workforce trends: latest 4 quarters
    const workforceTrends = await prisma.workforceTrend.findMany({
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      take: 4,
      select: {
        period: true,
        year: true,
        quarter: true,
        totalOpenings: true,
        avgSalary: true,
        yoyGrowth: true,
        topCompanies: true,
      },
    });

    // 5. Top hiring companies from latest trend
    let topHiringCompanies: string[] = [];
    if (latestTrend?.topCompanies) {
      try {
        const parsed = JSON.parse(latestTrend.topCompanies);
        if (Array.isArray(parsed)) {
          topHiringCompanies = parsed;
        }
      } catch {
        // topCompanies isn't valid JSON, skip
      }
    }

    // 6. Category distribution: count active postings by category
    const categoryDistribution = await prisma.spaceJobPosting.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // 7. Seniority distribution: count active postings by seniorityLevel
    const seniorityDistribution = await prisma.spaceJobPosting.groupBy({
      by: ['seniorityLevel'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return NextResponse.json({
      salaryBenchmarks: salaryBenchmarks.map((b: (typeof salaryBenchmarks)[number]) => ({
        category: b.category,
        seniorityLevel: b.seniorityLevel,
        avgMin: Math.round(b._avg.salaryMin ?? 0),
        avgMax: Math.round(b._avg.salaryMax ?? 0),
        avgMedian: Math.round(b._avg.salaryMedian ?? 0),
        count: b._count.id,
      })),
      clearancePremium,
      skillsDemand,
      workforceTrends: workforceTrends.reverse(), // chronological order
      topHiringCompanies,
      categoryDistribution: categoryDistribution.map((c: (typeof categoryDistribution)[number]) => ({
        category: c.category,
        count: c._count.id,
      })),
      seniorityDistribution: seniorityDistribution.map((s: (typeof seniorityDistribution)[number]) => ({
        seniorityLevel: s.seniorityLevel,
        count: s._count.id,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch career intelligence data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch career intelligence data' },
      { status: 500 }
    );
  }
}
