export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getScorecards, getScorecardBySlug, ScorecardGrade } from '@/lib/operational-awareness-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const grade = searchParams.get('grade') as ScorecardGrade | null;
    const sortBy = searchParams.get('sortBy') as 'overallScore' | 'totalSatellites' | 'operatorName' | null;
    const order = searchParams.get('order') as 'asc' | 'desc' | null;

    // If a specific slug is requested, return that scorecard
    if (slug) {
      const scorecard = await getScorecardBySlug(slug);
      if (!scorecard) {
        return NextResponse.json(
          { error: 'Scorecard not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(scorecard);
    }

    // Otherwise return all scorecards with optional filters
    const scorecards = await getScorecards({
      grade: grade || undefined,
      sortBy: sortBy || undefined,
      order: order || undefined,
    });

    // Calculate aggregate stats
    const totalSatellites = scorecards.reduce((sum, s) => sum + s.totalSatellites, 0);
    const averageScore = scorecards.length > 0
      ? Math.round(scorecards.reduce((sum, s) => sum + s.overallScore, 0) / scorecards.length)
      : 0;

    const gradeDistribution = scorecards.reduce((acc, s) => {
      acc[s.grade] = (acc[s.grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      scorecards,
      stats: {
        totalOperators: scorecards.length,
        totalSatellites,
        averageScore,
        gradeDistribution,
      },
    });
  } catch (error) {
    console.error('Failed to fetch sustainability scorecards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sustainability scorecards' },
      { status: 500 }
    );
  }
}
