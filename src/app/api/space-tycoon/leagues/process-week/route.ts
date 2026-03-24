import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  assignPlayerToLeague,
  assignBrackets,
  calculateMetricScore,
  getLeagueRewards,
  getWeeklyMetric,
  getWeekStartMs,
  getWeekEndMs,
  getMetricDefinition,
  isPromotionZone,
  isDemotionZone,
  BRACKET_SIZE,
  PROMOTION_COUNT,
  DEMOTION_COUNT,
  LEAGUES,
} from '@/lib/game/league-system';
import { getCurrentWeekId } from '@/lib/game/weekly-events';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/leagues/process-week
 * Server-side weekly processing: finalize current week, create new brackets,
 * process promotions/demotions, distribute rewards.
 * Should be called by cron every Monday at 00:05 UTC.
 *
 * Body: { secret: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const body = await request.json().catch(() => ({}));
    const cronSecret = process.env.LEAGUE_CRON_SECRET || process.env.CRON_SECRET;
    if (cronSecret && body.secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentWeekId = getCurrentWeekId();
    const metric = getWeeklyMetric(currentWeekId);

    // ── Step 1: Finalize the previous week's season (if any) ──────────────

    const activeSeason = await prisma.leagueSeason.findFirst({
      where: { isActive: true },
      include: {
        brackets: {
          include: {
            entries: {
              include: {
                profile: {
                  select: {
                    id: true,
                    netWorth: true,
                    peakNetWorth: true,
                    money: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const stats = {
      totalPlayers: 0,
      byLeague: {} as Record<number, number>,
      promotions: 0,
      demotions: 0,
      totalCashDistributed: 0,
      rewardsDistributed: 0,
    };

    if (activeSeason) {
      // Finalize each bracket: rank entries, assign promotions/demotions, distribute rewards
      for (const bracket of activeSeason.brackets) {
        const entries = bracket.entries.sort((a, b) => b.score - a.score);
        const bracketSize = entries.length;

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const rank = i + 1;
          const inPromoZone = isPromotionZone(rank);
          const inDemoZone = isDemotionZone(rank, bracketSize);

          // Get league profile for shield logic
          const leagueProfile = await prisma.playerLeagueProfile.findUnique({
            where: { profileId: entry.profileId },
          });

          let promoted = false;
          let demoted = false;

          // Promotion: top 5 move up (if not already in highest league)
          if (inPromoZone && bracket.league < 8) {
            promoted = true;
            stats.promotions++;
          }

          // Demotion: bottom 5 move down (if not in lowest league, and not shielded)
          if (inDemoZone && bracket.league > 1) {
            if (leagueProfile?.promotionShield) {
              // Shield consumed, no demotion
              await prisma.playerLeagueProfile.update({
                where: { id: leagueProfile.id },
                data: { promotionShield: false },
              });
            } else {
              demoted = true;
              stats.demotions++;
            }
          }

          // Calculate rewards
          const rewards = getLeagueRewards(rank, bracket.league);
          stats.totalCashDistributed += rewards.cashReward;
          stats.rewardsDistributed++;

          // Update entry with final rank and results
          await prisma.leagueBracketEntry.update({
            where: { id: entry.id },
            data: {
              rank,
              promoted,
              demoted,
              rewardClaimed: true,
            },
          });

          // Update league profile
          if (leagueProfile) {
            const newLeague = promoted
              ? Math.min(8, leagueProfile.currentLeague + 1)
              : demoted
              ? Math.max(1, leagueProfile.currentLeague - 1)
              : leagueProfile.currentLeague;

            await prisma.playerLeagueProfile.update({
              where: { id: leagueProfile.id },
              data: {
                currentLeague: newLeague,
                peakLeague: Math.max(leagueProfile.peakLeague, newLeague),
                // Newly promoted players get a demotion shield
                promotionShield: promoted ? true : leagueProfile.promotionShield,
                seasonPoints: leagueProfile.seasonPoints + (rank <= 3 ? 3 - rank + 1 : 0),
                totalWeeksPlayed: leagueProfile.totalWeeksPlayed + 1,
                consecutiveLow: inDemoZone ? leagueProfile.consecutiveLow + 1 : 0,
              },
            });

            // Award cash reward to player's game profile
            if (rewards.cashReward > 0) {
              await prisma.gameProfile.update({
                where: { id: entry.profileId },
                data: {
                  money: { increment: rewards.cashReward },
                  totalEarned: { increment: rewards.cashReward },
                },
              });
            }

            // Set title on game profile for top 3
            if (rewards.title) {
              await prisma.gameProfile.update({
                where: { id: entry.profileId },
                data: { title: rewards.title },
              });
            }
          }
        }

        stats.totalPlayers += entries.length;
        stats.byLeague[bracket.league] = (stats.byLeague[bracket.league] || 0) + entries.length;
      }

      // Mark the old season as inactive
      await prisma.leagueSeason.update({
        where: { id: activeSeason.id },
        data: { isActive: false },
      });
    }

    // ── Step 2: Create a new season with new brackets ──────────────────────

    const newSeasonNumber = activeSeason ? activeSeason.seasonNumber + 1 : 1;
    const weekStart = new Date(getWeekStartMs(currentWeekId));
    const weekEnd = new Date(getWeekEndMs(currentWeekId));

    const newSeason = await prisma.leagueSeason.create({
      data: {
        seasonNumber: newSeasonNumber,
        weekNumber: currentWeekId,
        metricSlug: metric.slug,
        startsAt: weekStart,
        endsAt: weekEnd,
        isActive: true,
      },
    });

    // ── Step 3: Assign all active players to leagues and brackets ──────────

    // Get all players who have synced in the last 14 days
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const activePlayers = await prisma.gameProfile.findMany({
      where: {
        lastSyncAt: { gt: twoWeeksAgo },
      },
      select: {
        id: true,
        netWorth: true,
        peakNetWorth: true,
        totalEarned: true,
        buildingCount: true,
        researchCount: true,
        serviceCount: true,
        locationsUnlocked: true,
      },
      orderBy: { netWorth: 'desc' },
    });

    // Ensure all players have a league profile
    for (const player of activePlayers) {
      const existing = await prisma.playerLeagueProfile.findUnique({
        where: { profileId: player.id },
      });
      if (!existing) {
        const league = assignPlayerToLeague(player.netWorth, player.peakNetWorth);
        await prisma.playerLeagueProfile.create({
          data: {
            profileId: player.id,
            currentLeague: league,
            peakLeague: league,
          },
        });
      }
    }

    // Re-fetch league profiles for all active players
    const playerLeagueProfiles = await prisma.playerLeagueProfile.findMany({
      where: {
        profileId: { in: activePlayers.map(p => p.id) },
      },
    });

    const profileToLeague = new Map(playerLeagueProfiles.map(lp => [lp.profileId, lp.currentLeague]));

    // Group players by league
    const playersByLeague: Record<number, string[]> = {};
    for (let i = 1; i <= 8; i++) playersByLeague[i] = [];

    for (const player of activePlayers) {
      const league = profileToLeague.get(player.id) ?? 1;
      playersByLeague[league].push(player.id);
    }

    // Create brackets for each league (groups of BRACKET_SIZE via serpentine)
    const newByLeague: Record<number, number> = {};
    for (let league = 1; league <= 8; league++) {
      const playerIds = playersByLeague[league];
      if (playerIds.length === 0) continue;

      const brackets = assignBrackets(playerIds);

      for (let bIdx = 0; bIdx < brackets.length; bIdx++) {
        const bracketPlayerIds = brackets[bIdx];

        const newBracket = await prisma.leagueBracket.create({
          data: {
            seasonId: newSeason.id,
            league,
            bracketIndex: bIdx,
          },
        });

        // Create entries for each player in this bracket
        // Get the metric's profile field for snapshot
        const metricDef = getMetricDefinition(metric.slug);
        const profileField = metricDef?.profileField ?? 'netWorth';

        for (const playerId of bracketPlayerIds) {
          const player = activePlayers.find(p => p.id === playerId);
          if (!player) continue;

          // Snapshot the start value from the player's current state
          let startValue = 0;
          switch (profileField) {
            case 'netWorth': startValue = player.netWorth; break;
            case 'totalEarned': startValue = player.totalEarned; break;
            case 'buildingCount': startValue = player.buildingCount; break;
            case 'researchCount': startValue = player.researchCount; break;
            case 'serviceCount': startValue = player.serviceCount; break;
            case 'locationsUnlocked': startValue = player.locationsUnlocked; break;
            default: startValue = player.netWorth;
          }

          await prisma.leagueBracketEntry.create({
            data: {
              bracketId: newBracket.id,
              profileId: playerId,
              startValue,
              currentValue: startValue,
              score: 0,
            },
          });
        }

        newByLeague[league] = (newByLeague[league] || 0) + bracketPlayerIds.length;
      }
    }

    return NextResponse.json({
      success: true,
      weekId: currentWeekId,
      seasonNumber: newSeasonNumber,
      metricSlug: metric.slug,
      metricName: metric.name,
      processed: {
        ...stats,
        newSeason: {
          id: newSeason.id,
          byLeague: newByLeague,
          totalPlayers: activePlayers.length,
        },
      },
    });
  } catch (error) {
    console.error('League process-week error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
