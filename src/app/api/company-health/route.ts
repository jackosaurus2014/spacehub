import { NextResponse } from 'next/server';
import { calculateAllHealthScores } from '@/lib/company-health-index';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company-health
 * Returns health index rankings for all tracked companies.
 * Public endpoint for transparency.
 */
export async function GET() {
  try {
    const scores = await calculateAllHealthScores();

    return NextResponse.json({
      rankings: scores.map((s, i) => ({
        rank: i + 1,
        companyId: s.companyId,
        companyName: s.companyName,
        score: s.score,
        grade: s.grade,
        gradeColor: s.gradeColor,
        signals: s.signals.slice(0, 3),
        updatedAt: s.updatedAt,
      })),
      total: scores.length,
      methodology: 'SpaceNexus Company Health Index (SCHI) v1.0',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Company health API error', { error: String(error) });
    return NextResponse.json({ rankings: [], total: 0 });
  }
}
