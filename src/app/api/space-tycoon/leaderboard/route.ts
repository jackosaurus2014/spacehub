import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/leaderboard?sort=netWorth&limit=50
 * Returns the global leaderboard with alliance tags and real player data.
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
        id: true,
        companyName: true,
        title: true,
        netWorth: true,
        totalEarned: true,
        buildingCount: true,
        researchCount: true,
        serviceCount: true,
        locationsUnlocked: true,
        gameYear: true,
        lastSyncAt: true,
        allianceMembership: {
          select: {
            role: true,
            alliance: { select: { tag: true, name: true } },
          },
        },
      },
    });

    const entries = profiles.map((p, i) => ({
      rank: i + 1,
      // PvP Discoverability pass (2026-08): the opaque profile id was already
      // selected here and is already public elsewhere (the /space-tycoon/corp/
      // [id] pages and the espionage target list both expose it). Emitting it
      // lets client surfaces that need to NAME a counterparty — the talent-
      // poaching launcher — do so without a second round trip or a new
      // endpoint. No additional information is disclosed.
      profileId: p.id,
      companyName: p.companyName,
      title: p.title,
      netWorth: p.netWorth,
      totalEarned: p.totalEarned,
      buildingCount: p.buildingCount,
      researchCount: p.researchCount,
      serviceCount: p.serviceCount,
      locationsUnlocked: p.locationsUnlocked,
      gameYear: p.gameYear,
      allianceTag: p.allianceMembership?.alliance?.tag || null,
      allianceName: p.allianceMembership?.alliance?.name || null,
      isOnline: (Date.now() - new Date(p.lastSyncAt).getTime()) < 5 * 60 * 1000, // synced in last 5 min
    }));

    // Also get alliance leaderboard
    const alliances = await prisma.alliance.findMany({
      orderBy: { totalNetWorth: 'desc' },
      take: 10,
      select: { name: true, tag: true, memberCount: true, totalNetWorth: true },
    });

    return NextResponse.json({ entries, alliances });
  } catch (error) {
    return NextResponse.json({ entries: [], alliances: [] });
  }
}
