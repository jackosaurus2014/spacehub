import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/space-tycoon/sync
 * Sync client game state to server for leaderboard ranking.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      money = 0,
      totalEarned = 0,
      totalSpent = 0,
      buildingCount = 0,
      researchCount = 0,
      serviceCount = 0,
      locationsUnlocked = 0,
      resources = {},
      gameYear = 2025,
      companyName = 'Untitled Aerospace',
    } = body;

    // Calculate net worth (money + estimated resource value)
    let resourceValue = 0;
    if (typeof resources === 'object' && resources !== null) {
      for (const qty of Object.values(resources)) {
        if (typeof qty === 'number') resourceValue += qty * 50_000; // rough avg price per unit
      }
    }
    const netWorth = money + resourceValue;

    // Upsert game profile
    const profile = await prisma.gameProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        companyName: String(companyName).slice(0, 50),
        money,
        totalEarned,
        totalSpent,
        netWorth,
        buildingCount,
        researchCount,
        serviceCount,
        locationsUnlocked,
        gameYear,
        resources: resources as object,
        lastSyncAt: new Date(),
      },
      update: {
        companyName: String(companyName).slice(0, 50),
        money,
        totalEarned,
        totalSpent,
        netWorth,
        buildingCount,
        researchCount,
        serviceCount,
        locationsUnlocked,
        gameYear,
        resources: resources as object,
        lastSyncAt: new Date(),
      },
    });

    // Get player's rank
    const rank = await prisma.gameProfile.count({
      where: { netWorth: { gt: netWorth } },
    }) + 1;

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      netWorth,
      rank,
    });
  } catch (error) {
    logger.error('Game sync error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
