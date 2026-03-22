import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getGlobalGameDate, formatServerDate } from '@/lib/game/server-time';

/**
 * POST /api/space-tycoon/sync
 * Sync client game state to server for leaderboard ranking.
 * Returns: rank, netWorth, alliance bonuses, global milestones, active bounties count.
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
      minedThisTick = {},
    } = body;

    // Calculate net worth using live market prices
    let resourceValue = 0;
    try {
      const marketResources = await prisma.marketResource.findMany({
        select: { slug: true, currentPrice: true },
      });
      const priceMap = new Map(marketResources.map(r => [r.slug, r.currentPrice]));
      if (typeof resources === 'object' && resources !== null) {
        for (const [id, qty] of Object.entries(resources)) {
          if (typeof qty === 'number') {
            resourceValue += qty * (priceMap.get(id) || 50_000);
          }
        }
      }
    } catch {
      // Fallback to flat $50K/unit
      if (typeof resources === 'object' && resources !== null) {
        for (const qty of Object.values(resources)) {
          if (typeof qty === 'number') resourceValue += qty * 50_000;
        }
      }
    }
    const netWorth = money + resourceValue;

    // Upsert game profile
    const profile = await prisma.gameProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        companyName: String(companyName).slice(0, 50),
        money, totalEarned, totalSpent, netWorth,
        buildingCount, researchCount, serviceCount, locationsUnlocked, gameYear,
        resources: resources as object,
        lastSyncAt: new Date(),
      },
      update: {
        companyName: String(companyName).slice(0, 50),
        money, totalEarned, totalSpent, netWorth,
        buildingCount, researchCount, serviceCount, locationsUnlocked, gameYear,
        resources: resources as object,
        lastSyncAt: new Date(),
      },
    });

    // Apply mining pressure to global market (if resources were mined this tick)
    if (minedThisTick && typeof minedThisTick === 'object') {
      try {
        const { calculatePriceAfterMining } = await import('@/lib/game/market-engine');
        for (const [slug, qty] of Object.entries(minedThisTick)) {
          if (typeof qty !== 'number' || qty <= 0) continue;
          const resource = await prisma.marketResource.findUnique({ where: { slug } });
          if (!resource) continue;
          const newPrice = calculatePriceAfterMining(
            resource.currentPrice, resource.basePrice, qty,
            resource.volatility, resource.minPrice, resource.maxPrice,
          );
          if (newPrice !== resource.currentPrice) {
            await prisma.marketResource.update({
              where: { id: resource.id },
              data: { currentPrice: newPrice, totalSupply: resource.totalSupply + qty },
            });
          }
        }
      } catch { /* mining pressure is non-critical */ }
    }

    // Get player's rank
    const rank = await prisma.gameProfile.count({
      where: { netWorth: { gt: netWorth } },
    }) + 1;

    const totalPlayers = await prisma.gameProfile.count();

    // Get alliance bonus if member
    let allianceBonus = 0;
    let allianceName: string | null = null;
    let allianceTag: string | null = null;
    try {
      const membership = await prisma.allianceMember.findUnique({
        where: { profileId: profile.id },
        include: { alliance: true },
      });
      if (membership?.alliance) {
        allianceBonus = membership.alliance.bonusRevenue;
        allianceName = membership.alliance.name;
        allianceTag = membership.alliance.tag;

        // Update alliance total net worth
        const members = await prisma.allianceMember.findMany({
          where: { allianceId: membership.allianceId },
          include: { profile: { select: { netWorth: true } } },
        });
        const totalAllianceNetWorth = members.reduce((sum, m) => sum + m.profile.netWorth, 0);
        await prisma.alliance.update({
          where: { id: membership.allianceId },
          data: { totalNetWorth: totalAllianceNetWorth },
        });
      }
    } catch { /* alliance lookup non-critical */ }

    // Get count of open bounties
    let openBounties = 0;
    try {
      openBounties = await prisma.resourceBounty.count({
        where: { status: { in: ['open', 'partial'] }, expiresAt: { gt: new Date() } },
      });
    } catch { /* non-critical */ }

    // Get claimed global milestones
    let globalMilestones: Record<string, string> = {};
    try {
      const claimed = await prisma.globalMilestone.findMany({
        select: { milestoneId: true, companyName: true },
      });
      globalMilestones = Object.fromEntries(claimed.map(m => [m.milestoneId, m.companyName]));
    } catch { /* non-critical */ }

    // Include canonical server game date so clients stay in sync
    const serverGameDate = getGlobalGameDate();

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      netWorth,
      rank,
      totalPlayers,
      allianceBonus,
      allianceName,
      allianceTag,
      openBounties,
      globalMilestones,
      // Global game date — all players must use this
      serverGameDate: {
        year: serverGameDate.year,
        month: serverGameDate.month,
        formatted: formatServerDate(serverGameDate),
      },
    });
  } catch (error) {
    logger.error('Game sync error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
