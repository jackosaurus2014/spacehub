import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getLeaderboard,
  getCompanyScore,
  ALL_COMPANY_SCORES,
  SPACE_SCORE_TIERS,
  type CompanyScoreEntry,
} from '@/lib/space-score';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const tier = searchParams.get('tier');
    const sector = searchParams.get('sector');
    const sortBy = searchParams.get('sortBy') || 'total';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

    // Single company lookup
    if (slug) {
      const entry = getCompanyScore(slug);
      if (!entry) {
        return NextResponse.json(
          { error: 'Company not found', slug },
          { status: 404 }
        );
      }
      return NextResponse.json(entry);
    }

    // Leaderboard
    let results: CompanyScoreEntry[] = getLeaderboard();

    // Filter by tier label
    if (tier) {
      results = results.filter(e => e.score.tier.label.toLowerCase() === tier.toLowerCase());
    }

    // Filter by sector
    if (sector) {
      results = results.filter(e => e.sector === sector);
    }

    // Sort by dimension
    const validDimensions = ['innovation', 'financial', 'market', 'operations', 'growth'];
    if (sortBy !== 'total' && validDimensions.includes(sortBy)) {
      results.sort((a, b) => {
        const aScore = a.score.breakdown.find(d => d.key === sortBy)?.score || 0;
        const bScore = b.score.breakdown.find(d => d.key === sortBy)?.score || 0;
        return bScore - aScore;
      });
    }

    const total = results.length;
    results = results.slice(offset, offset + limit);

    // Compute summary stats
    const allScores = Object.values(ALL_COMPANY_SCORES);
    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((sum, e) => sum + e.score.total, 0) / allScores.length)
      : 0;
    const tierDistribution = SPACE_SCORE_TIERS.map(t => ({
      tier: t.label,
      count: allScores.filter(e => e.score.tier.label === t.label).length,
      minScore: t.minScore,
      maxScore: t.maxScore,
    }));

    return NextResponse.json({
      companies: results,
      total,
      stats: {
        totalCompanies: allScores.length,
        averageScore: avgScore,
        highestScore: allScores[0] ? Math.max(...allScores.map(e => e.score.total)) : 0,
        lowestScore: allScores[0] ? Math.min(...allScores.map(e => e.score.total)) : 0,
        tierDistribution,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch space scores', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
