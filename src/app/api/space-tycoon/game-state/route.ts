import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getGlobalGameDate, formatServerDate } from '@/lib/game/server-time';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/game-state
 * Returns the full multiplayer game world state visible to all players:
 * - Global game date
 * - All colony claims (who's where)
 * - Top players with their public game state
 * - Global milestones (who claimed what)
 * - Active market events
 * - Alliance summary
 *
 * This is the "world view" that every player's map and UI should reference.
 */
export async function GET(request: NextRequest) {
  try {
    const gameDate = getGlobalGameDate();

    // Colony claims — who occupies each location
    const colonyClaims = await prisma.colonyClaim.findMany({
      select: {
        locationId: true,
        companyName: true,
        claimedAt: true,
      },
      orderBy: { claimedAt: 'asc' },
    });

    const coloniesByLocation: Record<string, string[]> = {};
    const colonyCounts: Record<string, number> = {};
    for (const claim of colonyClaims) {
      if (!coloniesByLocation[claim.locationId]) coloniesByLocation[claim.locationId] = [];
      coloniesByLocation[claim.locationId].push(claim.companyName);
      colonyCounts[claim.locationId] = (colonyCounts[claim.locationId] || 0) + 1;
    }

    // Top players with public state
    const topPlayers = await prisma.gameProfile.findMany({
      orderBy: { netWorth: 'desc' },
      take: 50,
      select: {
        companyName: true,
        title: true,
        netWorth: true,
        buildingCount: true,
        researchCount: true,
        serviceCount: true,
        locationsUnlocked: true,
        unlockedLocationsList: true,
        buildingsData: true,
        gameYear: true,
        lastSyncAt: true,
        allianceMembership: {
          select: { alliance: { select: { tag: true, name: true } } },
        },
      },
    });

    // Global milestones
    const milestones = await prisma.globalMilestone.findMany({
      select: { milestoneId: true, companyName: true, claimedAt: true },
      orderBy: { claimedAt: 'asc' },
    });

    // Alliances
    const alliances = await prisma.alliance.findMany({
      orderBy: { totalNetWorth: 'desc' },
      take: 20,
      select: { name: true, tag: true, memberCount: true, totalNetWorth: true },
    });

    // Active bounties count
    const openBounties = await prisma.resourceBounty.count({
      where: { status: { in: ['open', 'partial'] }, expiresAt: { gt: new Date() } },
    });

    return NextResponse.json({
      serverTime: {
        gameDate: { year: gameDate.year, month: gameDate.month, formatted: formatServerDate(gameDate) },
        serverMs: Date.now(),
      },
      world: {
        colonies: coloniesByLocation,
        colonyCounts,
        totalColonists: colonyClaims.length,
      },
      players: topPlayers.map((p, i) => ({
        rank: i + 1,
        companyName: p.companyName,
        title: p.title,
        netWorth: p.netWorth,
        buildings: p.buildingCount,
        research: p.researchCount,
        services: p.serviceCount,
        locations: p.locationsUnlocked,
        unlockedLocations: p.unlockedLocationsList,
        allianceTag: p.allianceMembership?.alliance?.tag || null,
        isOnline: (Date.now() - new Date(p.lastSyncAt).getTime()) < 5 * 60 * 1000,
      })),
      milestones: Object.fromEntries(milestones.map(m => [m.milestoneId, m.companyName])),
      alliances,
      openBounties,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch game state' }, { status: 500 });
  }
}
