import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getLeagueDefinition,
  getWeeklyMetric,
  getTimeRemainingMs,
  assignPlayerToLeague,
  calculateMetricScore,
  getLeagueRewards,
  isPromotionZone,
  isDemotionZone,
  BRACKET_SIZE,
  PROMOTION_COUNT,
  DEMOTION_COUNT,
} from '@/lib/game/league-system';
import { getCurrentWeekId } from '@/lib/game/weekly-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/leagues
 * Returns the player's current league, bracket standings, rank, metric info, and season info.
 * Requires authentication.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up game profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile found. Play the game first!' }, { status: 404 });
    }

    // Get or create league profile
    let leagueProfile = await prisma.playerLeagueProfile.findUnique({
      where: { profileId: profile.id },
    });
    if (!leagueProfile) {
      const assignedLeague = assignPlayerToLeague(profile.netWorth, profile.peakNetWorth);
      leagueProfile = await prisma.playerLeagueProfile.create({
        data: {
          profileId: profile.id,
          currentLeague: assignedLeague,
          peakLeague: assignedLeague,
        },
      });
    }

    const weekId = getCurrentWeekId();
    const metric = getWeeklyMetric(weekId);
    const leagueDef = getLeagueDefinition(leagueProfile.currentLeague);

    // Find active season for this week
    const activeSeason = await prisma.leagueSeason.findFirst({
      where: { isActive: true },
    });

    if (!activeSeason) {
      // No active season — return basic league info without bracket standings
      return NextResponse.json({
        league: {
          number: leagueProfile.currentLeague,
          name: leagueDef.name,
          color: leagueDef.color,
          icon: leagueDef.icon,
          minNetWorth: leagueDef.minNetWorth,
          maxNetWorth: leagueDef.maxNetWorth === Infinity ? null : leagueDef.maxNetWorth,
        },
        metric: {
          slug: metric.slug,
          name: metric.name,
          description: metric.description,
          icon: metric.icon,
          scoreType: metric.scoreType,
        },
        season: null,
        bracket: null,
        standings: [],
        myEntry: null,
        timeRemainingMs: getTimeRemainingMs(),
        weekId,
        promotionZone: PROMOTION_COUNT,
        demotionZone: DEMOTION_COUNT,
        bracketSize: BRACKET_SIZE,
        leagueProfile: {
          currentLeague: leagueProfile.currentLeague,
          peakLeague: leagueProfile.peakLeague,
          promotionShield: leagueProfile.promotionShield,
          seasonPoints: leagueProfile.seasonPoints,
          totalWeeksPlayed: leagueProfile.totalWeeksPlayed,
        },
      });
    }

    // Find this player's bracket entry for the active season
    const myEntry = await prisma.leagueBracketEntry.findFirst({
      where: {
        profileId: profile.id,
        bracket: {
          seasonId: activeSeason.id,
        },
      },
      include: {
        bracket: true,
      },
    });

    let standings: {
      rank: number;
      companyName: string;
      allianceTag: string | null;
      score: number;
      startValue: number;
      currentValue: number;
      isYou: boolean;
      promoted: boolean;
      demoted: boolean;
      shielded: boolean;
      inPromotionZone: boolean;
      inDemotionZone: boolean;
    }[] = [];
    let bracketInfo = null;

    if (myEntry) {
      // Fetch all entries in this bracket, ordered by score desc
      const bracketEntries = await prisma.leagueBracketEntry.findMany({
        where: { bracketId: myEntry.bracketId },
        orderBy: { score: 'desc' },
        include: {
          profile: {
            select: {
              id: true,
              companyName: true,
              allianceMembership: {
                select: {
                  alliance: { select: { tag: true } },
                },
              },
            },
          },
        },
      });

      const bracketSize = bracketEntries.length;

      standings = bracketEntries.map((entry, index) => {
        const rank = index + 1;
        return {
          rank,
          companyName: entry.profile.companyName,
          allianceTag: entry.profile.allianceMembership?.alliance?.tag ?? null,
          score: entry.score,
          startValue: entry.startValue,
          currentValue: entry.currentValue,
          isYou: entry.profileId === profile.id,
          promoted: entry.promoted,
          demoted: entry.demoted,
          shielded: entry.shielded,
          inPromotionZone: isPromotionZone(rank),
          inDemotionZone: isDemotionZone(rank, bracketSize),
        };
      });

      bracketInfo = {
        bracketId: myEntry.bracketId,
        league: myEntry.bracket.league,
        bracketIndex: myEntry.bracket.bracketIndex,
        playerCount: bracketSize,
      };
    }

    // My rank and score
    const myStanding = standings.find(s => s.isYou);
    const myRank = myStanding?.rank ?? null;
    const myScore = myStanding?.score ?? 0;
    const projectedRewards = myRank ? getLeagueRewards(myRank, leagueProfile.currentLeague) : null;

    return NextResponse.json({
      league: {
        number: leagueProfile.currentLeague,
        name: leagueDef.name,
        color: leagueDef.color,
        icon: leagueDef.icon,
        minNetWorth: leagueDef.minNetWorth,
        maxNetWorth: leagueDef.maxNetWorth === Infinity ? null : leagueDef.maxNetWorth,
      },
      metric: {
        slug: metric.slug,
        name: metric.name,
        description: metric.description,
        icon: metric.icon,
        scoreType: metric.scoreType,
      },
      season: activeSeason
        ? {
            id: activeSeason.id,
            seasonNumber: activeSeason.seasonNumber,
            weekNumber: activeSeason.weekNumber,
            metricSlug: activeSeason.metricSlug,
            startsAt: activeSeason.startsAt.toISOString(),
            endsAt: activeSeason.endsAt.toISOString(),
          }
        : null,
      bracket: bracketInfo,
      standings,
      myEntry: myEntry
        ? {
            rank: myRank,
            score: myScore,
            startValue: myEntry.startValue,
            currentValue: myEntry.currentValue,
            promoted: myEntry.promoted,
            demoted: myEntry.demoted,
            shielded: myEntry.shielded,
          }
        : null,
      projectedRewards: projectedRewards
        ? {
            cashReward: projectedRewards.cashReward,
            title: projectedRewards.title,
            boostType: projectedRewards.boostType,
            boostMultiplier: projectedRewards.boostMultiplier,
            boostDurationSeconds: projectedRewards.boostDurationSeconds,
          }
        : null,
      timeRemainingMs: getTimeRemainingMs(),
      weekId,
      promotionZone: PROMOTION_COUNT,
      demotionZone: DEMOTION_COUNT,
      bracketSize: BRACKET_SIZE,
      leagueProfile: {
        currentLeague: leagueProfile.currentLeague,
        peakLeague: leagueProfile.peakLeague,
        promotionShield: leagueProfile.promotionShield,
        seasonPoints: leagueProfile.seasonPoints,
        totalWeeksPlayed: leagueProfile.totalWeeksPlayed,
      },
    });
  } catch (error) {
    console.error('League GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
