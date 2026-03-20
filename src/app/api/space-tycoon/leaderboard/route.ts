import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/leaderboard?sort=netWorth&limit=50
 * Public endpoint — no auth required.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sort = searchParams.get('sort') || 'netWorth';
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

    const validSorts = ['netWorth', 'totalEarned', 'buildingCount', 'researchCount'];
    const sortField = validSorts.includes(sort) ? sort : 'netWorth';

    const profiles = await prisma.gameProfile.findMany({
      orderBy: { [sortField]: 'desc' },
      take: limit,
      select: {
        companyName: true,
        title: true,
        netWorth: true,
        totalEarned: true,
        buildingCount: true,
        researchCount: true,
        locationsUnlocked: true,
      },
    });

    const entries = profiles.map((p, i) => ({
      rank: i + 1,
      companyName: p.companyName,
      title: p.title,
      netWorth: p.netWorth,
      totalEarned: p.totalEarned,
      buildingCount: p.buildingCount,
      researchCount: p.researchCount,
      locationsUnlocked: p.locationsUnlocked,
    }));

    return NextResponse.json({ entries });
  } catch (error) {
    logger.error('Leaderboard error', { error: String(error) });
    return NextResponse.json({ entries: [] });
  }
}
