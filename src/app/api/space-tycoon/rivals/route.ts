import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  RIVAL_CONSTANTS,
  getWeekTimeRemainingMs,
  getScoreLabel,
  getStreakTitle,
  compareMetric,
} from '@/lib/game/rival-system';
import { getCurrentWeekId } from '@/lib/game/weekly-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/rivals
 * Returns the current player's active rival assignments with latest snapshots,
 * comparison metrics, trend data, and summary stats.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the player's game profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        netWorth: true,
        buildingCount: true,
        researchCount: true,
        serviceCount: true,
        locationsUnlocked: true,
        rivalWins: true,
        rivalLosses: true,
        rivalDraws: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    const weekId = getCurrentWeekId();

    // Fetch active rival assignments with recent snapshots and events
    const assignments = await prisma.rivalAssignment.findMany({
      where: {
        playerId: profile.id,
        isActive: true,
      },
      include: {
        rival: {
          select: {
            companyName: true,
            netWorth: true,
            buildingCount: true,
            researchCount: true,
            serviceCount: true,
            locationsUnlocked: true,
          },
        },
        snapshots: {
          orderBy: { snapshotAt: 'desc' },
          take: 6, // last 6 snapshots for trend
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5, // recent events
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build rival response objects
    const rivals = assignments.map((a) => {
      const rival = a.rival;
      const scoreInfo = getScoreLabel(a.rivalryScore);

      // Build trend from snapshots (most recent last)
      const trend = a.snapshots
        .slice()
        .reverse()
        .map((s) => (s.scoreDelta > 0 ? 1 : s.scoreDelta < 0 ? -1 : 0));

      // Compute comparison metrics (player vs rival, as % diff)
      const comparison = {
        netWorthDiffPct: parseFloat(
          compareMetric(profile.netWorth, rival.netWorth).toFixed(1),
        ),
        buildingDiffPct: parseFloat(
          compareMetric(profile.buildingCount, rival.buildingCount).toFixed(1),
        ),
        researchDiffPct: parseFloat(
          compareMetric(profile.researchCount, rival.researchCount).toFixed(1),
        ),
        serviceDiffPct: parseFloat(
          compareMetric(profile.serviceCount, rival.serviceCount).toFixed(1),
        ),
        locationsDiffPct: parseFloat(
          compareMetric(
            profile.locationsUnlocked,
            rival.locationsUnlocked,
          ).toFixed(1),
        ),
      };

      // Compute weekly growth % from snapshots (first vs last snapshot this week)
      let playerGrowthPct = 0;
      let rivalGrowthPct = 0;
      if (a.snapshots.length >= 2) {
        const oldest = a.snapshots[a.snapshots.length - 1];
        const newest = a.snapshots[0];
        if (oldest.playerNetWorth > 0) {
          playerGrowthPct = parseFloat(
            (
              ((newest.playerNetWorth - oldest.playerNetWorth) /
                oldest.playerNetWorth) *
              100
            ).toFixed(1),
          );
        }
        if (oldest.rivalNetWorth > 0) {
          rivalGrowthPct = parseFloat(
            (
              ((newest.rivalNetWorth - oldest.rivalNetWorth) /
                oldest.rivalNetWorth) *
              100
            ).toFixed(1),
          );
        }
      }

      return {
        assignmentId: a.id,
        weekId: a.weekId,
        status: a.isActive ? 'active' : 'completed',
        score: Math.round(a.rivalryScore),
        scoreLabel: scoreInfo.label,
        scoreColor: scoreInfo.color,
        rival: {
          companyName: rival.companyName,
          netWorth: rival.netWorth,
          buildingCount: rival.buildingCount,
          serviceCount: rival.serviceCount,
          researchCount: rival.researchCount,
          locationsCount: rival.locationsUnlocked,
          growthPct: rivalGrowthPct,
        },
        player: {
          companyName: profile.companyName,
          netWorth: profile.netWorth,
          buildingCount: profile.buildingCount,
          serviceCount: profile.serviceCount,
          researchCount: profile.researchCount,
          locationsCount: profile.locationsUnlocked,
          growthPct: playerGrowthPct,
        },
        comparison,
        trend,
        recentEvents: a.events.map((e) => ({
          id: e.id,
          type: e.type,
          title: e.title,
          description: e.description ?? '',
          createdAt: e.createdAt.toISOString(),
        })),
        createdAt: a.createdAt.toISOString(),
      };
    });

    // Get last week's history
    const lastWeekId = weekId - 1;
    const historyAssignments = await prisma.rivalAssignment.findMany({
      where: {
        playerId: profile.id,
        weekId: lastWeekId,
      },
      include: {
        rival: { select: { companyName: true } },
      },
    });

    const history =
      historyAssignments.length > 0
        ? [
            {
              weekId: lastWeekId,
              rivals: historyAssignments.map((ha) => ({
                companyName: ha.rival.companyName,
                finalScore: Math.round(ha.rivalryScore),
                result:
                  ha.rivalryScore > RIVAL_CONSTANTS.WIN_THRESHOLD
                    ? 'win'
                    : ha.rivalryScore < RIVAL_CONSTANTS.LOSS_THRESHOLD
                      ? 'loss'
                      : 'draw',
              })),
            },
          ]
        : [];

    // Compute streak from wins
    // To compute active streak, look at recent completed assignments
    const recentCompleted = await prisma.rivalAssignment.findMany({
      where: {
        playerId: profile.id,
        isActive: false,
      },
      orderBy: { weekId: 'desc' },
      take: 20,
      select: { rivalryScore: true, weekId: true },
    });

    let currentStreak = 0;
    // Count consecutive weeks with at least one win and no losses
    const weekScores = new Map<number, number[]>();
    for (const r of recentCompleted) {
      const scores = weekScores.get(r.weekId) || [];
      scores.push(r.rivalryScore);
      weekScores.set(r.weekId, scores);
    }

    const sortedWeeks = Array.from(weekScores.keys()).sort((a, b) => b - a);
    for (const wk of sortedWeeks) {
      const scores = weekScores.get(wk) || [];
      const wins = scores.filter(
        (s) => s > RIVAL_CONSTANTS.WIN_THRESHOLD,
      ).length;
      const losses = scores.filter(
        (s) => s < RIVAL_CONSTANTS.LOSS_THRESHOLD,
      ).length;
      if (wins > 0 && losses === 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    const streakTitle = getStreakTitle(currentStreak);

    const summary = {
      currentStreak,
      streakTitle,
      allTimeRecord: {
        wins: profile.rivalWins,
        losses: profile.rivalLosses,
        draws: profile.rivalDraws,
      },
      weekTimeRemainingMs: getWeekTimeRemainingMs(),
      weekId,
    };

    return NextResponse.json({ rivals, summary, history });
  } catch (error) {
    console.error('Rivals GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
