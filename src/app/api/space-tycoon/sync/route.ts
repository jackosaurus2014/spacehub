import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getGlobalGameDate, formatServerDate } from '@/lib/game/server-time';
import { getAllServicePriceMultipliers } from '@/lib/game/service-pricing';
import {
  calculateMetricScore,
  getMetricDefinition,
  getWeeklyMetric,
  getLeagueDefinition,
} from '@/lib/game/league-system';
import { getCurrentWeekId } from '@/lib/game/weekly-events';

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
      gameYear = 2026,
      companyName = 'Untitled Aerospace',
      minedThisTick = {},
      // Full state for multiplayer visibility
      buildings = [],
      activeServices = [],
      unlockedLocations = [],
      completedResearch = [],
      ships = [],
      workforce = null,
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

    // Sanitize arrays for storage
    const safeBuildings = Array.isArray(buildings) ? buildings.slice(0, 200) : [];
    const safeServices = Array.isArray(activeServices) ? activeServices.slice(0, 100) : [];
    const safeLocations = Array.isArray(unlockedLocations) ? unlockedLocations.filter((l: unknown) => typeof l === 'string').slice(0, 30) : [];
    const safeResearch = Array.isArray(completedResearch) ? completedResearch.filter((r: unknown) => typeof r === 'string').slice(0, 500) : [];
    const safeShips = Array.isArray(ships) ? ships.slice(0, 50) : [];

    // Upsert game profile with full state
    const profile = await prisma.gameProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        companyName: String(companyName).slice(0, 50),
        money, totalEarned, totalSpent, netWorth,
        buildingCount, researchCount, serviceCount, locationsUnlocked, gameYear,
        resources: resources as object,
        buildingsData: safeBuildings,
        activeServicesData: safeServices,
        unlockedLocationsList: safeLocations,
        completedResearchList: safeResearch,
        shipsData: safeShips,
        workforceData: workforce,
        lastSyncAt: new Date(),
      },
      update: {
        companyName: String(companyName).slice(0, 50),
        money, totalEarned, totalSpent, netWorth,
        buildingCount, researchCount, serviceCount, locationsUnlocked, gameYear,
        resources: resources as object,
        buildingsData: safeBuildings,
        activeServicesData: safeServices,
        unlockedLocationsList: safeLocations,
        completedResearchList: safeResearch,
        shipsData: safeShips,
        workforceData: workforce,
        lastSyncAt: new Date(),
      },
    });

    // ── Ghost Rivals: Update peakNetWorth ──
    if (netWorth > (profile.peakNetWorth ?? 0)) {
      await prisma.gameProfile.update({
        where: { id: profile.id },
        data: { peakNetWorth: netWorth },
      });
    }

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

    // ── League Metric Tracking ──────────────────────────────────────────────
    // Update the player's active LeagueBracketEntry with their latest metric value.
    let leagueInfo: {
      league: number;
      leagueName: string;
      leagueColor: string;
      leagueIcon: string;
      bracketRank: number | null;
      bracketSize: number;
      metricSlug: string;
      metricName: string;
      score: number;
      timeRemainingMs: number;
    } | null = null;

    try {
      const weekId = getCurrentWeekId();
      const weekMetric = getWeeklyMetric(weekId);

      // Find the player's active bracket entry
      const activeSeason = await prisma.leagueSeason.findFirst({
        where: { isActive: true },
      });

      if (activeSeason) {
        const bracketEntry = await prisma.leagueBracketEntry.findFirst({
          where: {
            profileId: profile.id,
            bracket: { seasonId: activeSeason.id },
          },
          include: { bracket: true },
        });

        if (bracketEntry) {
          // Determine current metric value from profile fields
          const metricDef = getMetricDefinition(activeSeason.metricSlug);
          let currentMetricValue = 0;
          switch (metricDef?.profileField) {
            case 'netWorth': currentMetricValue = netWorth; break;
            case 'totalEarned': currentMetricValue = totalEarned; break;
            case 'buildingCount': currentMetricValue = buildingCount; break;
            case 'researchCount': currentMetricValue = researchCount; break;
            case 'serviceCount': currentMetricValue = serviceCount; break;
            case 'locationsUnlocked': currentMetricValue = locationsUnlocked; break;
            default: currentMetricValue = netWorth;
          }

          const score = metricDef
            ? calculateMetricScore(metricDef, bracketEntry.startValue, currentMetricValue)
            : 0;

          await prisma.leagueBracketEntry.update({
            where: { id: bracketEntry.id },
            data: {
              currentValue: currentMetricValue,
              score: Math.max(0, score),
            },
          });

          // Get bracket rank
          const higherScoreCount = await prisma.leagueBracketEntry.count({
            where: {
              bracketId: bracketEntry.bracketId,
              score: { gt: Math.max(0, score) },
            },
          });
          const bracketPlayerCount = await prisma.leagueBracketEntry.count({
            where: { bracketId: bracketEntry.bracketId },
          });

          const leagueDef = getLeagueDefinition(bracketEntry.bracket.league);
          leagueInfo = {
            league: bracketEntry.bracket.league,
            leagueName: leagueDef.name,
            leagueColor: leagueDef.color,
            leagueIcon: leagueDef.icon,
            bracketRank: higherScoreCount + 1,
            bracketSize: bracketPlayerCount,
            metricSlug: activeSeason.metricSlug,
            metricName: weekMetric.name,
            score: Math.max(0, score),
            timeRemainingMs: activeSeason.endsAt.getTime() - Date.now(),
          };
        }
      }
    } catch { /* league tracking is non-critical */ }

    // Get player's rank
    const rank = await prisma.gameProfile.count({
      where: { netWorth: { gt: netWorth } },
    }) + 1;

    const totalPlayers = await prisma.gameProfile.count();

    // Get alliance bonus if member — deep alliance system aggregation
    let allianceBonus = 0;
    let allianceName: string | null = null;
    let allianceTag: string | null = null;
    let allianceBonuses: { revenueBonus: number; miningBonus: number; researchBonus: number; buildSpeedBonus: number } | null = null;
    try {
      const membership = await prisma.allianceMember.findUnique({
        where: { profileId: profile.id },
        include: { alliance: true },
      });
      if (membership?.alliance) {
        const ally = membership.alliance;
        allianceName = ally.name;
        allianceTag = ally.tag;

        // 1. Member count bonus (existing — legacy field)
        allianceBonus = ally.bonusRevenue;

        // 2. Tier bonus (from alliance-events.ts)
        const { getAllianceTier } = await import('@/lib/game/alliance-events');
        const tierInfo = getAllianceTier(ally.powerScore);

        // 3. Research bonuses (from completed AllianceResearch)
        const { getAllianceResearchBonuses } = await import('@/lib/game/alliance-research');
        const completedResearch = await prisma.allianceResearch.findMany({
          where: { allianceId: ally.id, status: 'completed' },
          select: { bonusType: true, bonusValue: true },
        });
        const researchBonuses = getAllianceResearchBonuses(completedResearch);

        // 4. Perk bonuses (from active AlliancePerk)
        const { getActivePerks, getPerkBonuses } = await import('@/lib/game/alliance-treasury');
        const activePerks = await getActivePerks(prisma, ally.id);
        const perkBonuses = getPerkBonuses(activePerks);

        // 5. Project bonuses (from completed AllianceProject)
        const completedProjects = await prisma.allianceProject.findMany({
          where: { allianceId: ally.id, status: 'completed' },
          select: { bonuses: true },
        });
        let projectRevenueBonus = 0;
        let projectMiningBonus = 0;
        let projectResearchBonus = 0;
        let projectBuildSpeedBonus = 0;
        for (const proj of completedProjects) {
          const b = proj.bonuses as Record<string, number> | null;
          if (b) {
            projectRevenueBonus += b.revenueBonus ?? 0;
            projectMiningBonus += b.miningBonus ?? 0;
            projectResearchBonus += b.researchBonus ?? 0;
            projectBuildSpeedBonus += b.buildSpeedBonus ?? 0;
          }
        }

        // Aggregate all bonus sources
        allianceBonuses = {
          revenueBonus:
            allianceBonus +
            tierInfo.perks.revenueBonus +
            researchBonuses.revenueBonus +
            perkBonuses.revenueBonus +
            projectRevenueBonus,
          miningBonus:
            tierInfo.perks.miningBonus +
            researchBonuses.miningBonus +
            perkBonuses.miningBonus +
            projectMiningBonus,
          researchBonus:
            tierInfo.perks.researchBonus +
            researchBonuses.researchBonus +
            perkBonuses.researchBonus +
            projectResearchBonus,
          buildSpeedBonus:
            tierInfo.perks.buildSpeedBonus +
            researchBonuses.buildSpeedBonus +
            perkBonuses.buildSpeedBonus +
            projectBuildSpeedBonus,
        };

        // Update member's lastActiveAt
        await prisma.allianceMember.update({
          where: { profileId: profile.id },
          data: { lastActiveAt: new Date(), status: 'active' },
        });

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

    // Compute global service counts for dynamic pricing
    // Count how many instances of each service exist across ALL players
    let servicePriceMultipliers: Record<string, number> = {};
    try {
      const allProfiles = await prisma.gameProfile.findMany({
        select: { activeServicesData: true },
        where: { lastSyncAt: { gt: new Date(Date.now() - 7 * 24 * 3600_000) } }, // Active in last 7 days
      });
      const globalServiceCounts: Record<string, number> = {};
      for (const p of allProfiles) {
        const services = (p.activeServicesData as { definitionId: string }[] | null) || [];
        for (const svc of services) {
          if (svc.definitionId) {
            globalServiceCounts[svc.definitionId] = (globalServiceCounts[svc.definitionId] || 0) + 1;
          }
        }
      }
      servicePriceMultipliers = getAllServicePriceMultipliers(globalServiceCounts);
    } catch { /* non-critical — fall back to no adjustment */ }

    // ── Ghost Rivals: Lightweight summary for dashboard widget ──
    let rivalsSummary: { activeCount: number; topRivalScore: number | null; topRivalName: string | null; hasNewEvents: boolean } = {
      activeCount: 0,
      topRivalScore: null,
      topRivalName: null,
      hasNewEvents: false,
    };
    try {
      const activeRivals = await prisma.rivalAssignment.findMany({
        where: { playerId: profile.id, isActive: true },
        include: {
          rival: { select: { companyName: true } },
          events: { where: { notified: false }, select: { id: true }, take: 1 },
        },
        orderBy: { rivalryScore: 'desc' },
      });
      if (activeRivals.length > 0) {
        const top = activeRivals[0];
        rivalsSummary = {
          activeCount: activeRivals.length,
          topRivalScore: Math.round(top.rivalryScore),
          topRivalName: top.rival.companyName,
          hasNewEvents: activeRivals.some((r) => r.events.length > 0),
        };
      }
    } catch { /* rivals summary non-critical */ }

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      netWorth,
      rank,
      totalPlayers,
      allianceBonus,
      allianceName,
      allianceTag,
      allianceBonuses,
      openBounties,
      globalMilestones,
      servicePriceMultipliers,
      rivals: rivalsSummary,
      leagueInfo,
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
