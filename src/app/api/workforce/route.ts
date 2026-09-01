import { NextResponse } from 'next/server';
import { JobCategory, SeniorityLevel } from '@/types';
import {
  getJobPostings,
  getWorkforceTrends,
  getWorkforceStats,
  getSalaryBenchmarks,
} from '@/lib/workforce-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || undefined) as JobCategory | undefined;
    const seniorityLevel = (searchParams.get('seniorityLevel') || undefined) as SeniorityLevel | undefined;
    const company = searchParams.get('company') || undefined;
    const search = searchParams.get('search') || undefined;
    const remoteOnly = searchParams.get('remoteOnly');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const [jobsResult, trends, stats, salaryBenchmarks] = await Promise.all([
      getJobPostings({
        category,
        seniorityLevel,
        company,
        search,
        remoteOk: remoteOnly === 'true' ? true : undefined,
        limit,
        offset,
      }),
      getWorkforceTrends(),
      getWorkforceStats(),
      getSalaryBenchmarks(),
    ]);

    // Honest vintage label (2026-08-31 freshness audit, item 5): trends is a
    // hand-curated quarterly series (currently ending 2025-Q4) seeded by
    // initializeWorkforceData(), NOT recomputed from live postings. jobs/
    // stats/salaryBenchmarks are live SpaceJobPosting data.
    const latestPeriod = trends.reduce<string | null>(
      (latest, t) => (!latest || t.period > latest ? t.period : latest),
      null
    );

    return NextResponse.json({
      jobs: jobsResult.jobs,
      totalJobs: jobsResult.total,
      trends,
      trendsMeta: {
        latestPeriod,
        source: 'curated-quarterly-series',
        note: latestPeriod
          ? `Quarterly trend series through ${latestPeriod}; job listings and salary benchmarks are live.`
          : 'No workforce trend series available.',
      },
      stats,
      salaryBenchmarks,
    });
  } catch (error) {
    logger.error('Failed to fetch workforce data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch workforce data' },
      { status: 500 }
    );
  }
}
