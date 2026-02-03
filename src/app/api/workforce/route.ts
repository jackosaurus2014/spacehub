import { NextResponse } from 'next/server';
import { JobCategory, SeniorityLevel } from '@/types';
import {
  getJobPostings,
  getWorkforceTrends,
  getWorkforceStats,
  getSalaryBenchmarks,
} from '@/lib/workforce-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || undefined) as JobCategory | undefined;
    const seniorityLevel = (searchParams.get('seniorityLevel') || undefined) as SeniorityLevel | undefined;
    const company = searchParams.get('company') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    const [jobs, trends, stats, salaryBenchmarks] = await Promise.all([
      getJobPostings({ category, seniorityLevel, company, limit }),
      getWorkforceTrends(),
      getWorkforceStats(),
      getSalaryBenchmarks(),
    ]);

    return NextResponse.json({
      jobs,
      trends,
      stats,
      salaryBenchmarks,
    });
  } catch (error) {
    console.error('Failed to fetch workforce data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workforce data' },
      { status: 500 }
    );
  }
}
