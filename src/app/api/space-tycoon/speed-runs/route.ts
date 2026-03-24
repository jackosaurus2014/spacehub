import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getCurrentChallenge,
  getNextWeekChallenge,
  getPrestigeBracket,
  getBracketDisplayName,
  formatElapsedTime,
} from '@/lib/game/speed-runs';
import { getCurrentWeekId, getWeekTimeRemaining } from '@/lib/game/weekly-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/speed-runs
 * Returns: current weekly challenge, player's active attempt (if any),
 * and the top-20 leaderboard for the current challenge.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekId = getCurrentWeekId();
    const challenge = getCurrentChallenge(weekId);
    const nextChallenge = getNextWeekChallenge();
    const timeRemaining = getWeekTimeRemaining();

    // Get the profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    // Find or get the DB challenge record
    const dbChallenge = await prisma.speedRunChallenge.findUnique({
      where: { weekId },
    });

    // Get player's active attempt for this challenge
    let activeAttempt = null;
    if (dbChallenge) {
      const attempt = await prisma.speedRunAttempt.findUnique({
        where: {
          challengeId_profileId: {
            challengeId: dbChallenge.id,
            profileId: profile.id,
          },
        },
      });

      if (attempt) {
        const elapsedMs = attempt.completedAtMs
          ? attempt.completedAtMs - attempt.startedAtMs
          : Date.now() - attempt.startedAtMs;

        activeAttempt = {
          id: attempt.id,
          prestigeLevel: attempt.prestigeLevel,
          bracket: attempt.bracket,
          bracketName: getBracketDisplayName(getPrestigeBracket(attempt.prestigeLevel)),
          startedAtMs: attempt.startedAtMs,
          completedAtMs: attempt.completedAtMs,
          durationSeconds: attempt.durationSeconds,
          elapsedMs,
          elapsedFormatted: formatElapsedTime(elapsedMs),
          rank: attempt.rank,
          isCompleted: !!attempt.completedAtMs,
        };
      }
    }

    // Get top 20 for the current challenge (across all brackets)
    const leaderboard: {
      rank: number;
      companyName: string;
      bracket: string;
      bracketName: string;
      durationSeconds: number;
      elapsedFormatted: string;
      prestigeLevel: number;
      completedAt: number;
      isCurrentPlayer: boolean;
    }[] = [];

    if (dbChallenge) {
      const topAttempts = await prisma.speedRunAttempt.findMany({
        where: {
          challengeId: dbChallenge.id,
          completedAtMs: { not: null },
          isVerified: true,
        },
        orderBy: { durationSeconds: 'asc' },
        take: 20,
        include: {
          profile: {
            select: { id: true, companyName: true },
          },
        },
      });

      for (let i = 0; i < topAttempts.length; i++) {
        const a = topAttempts[i];
        const elapsedMs = (a.durationSeconds ?? 0) * 1000;
        leaderboard.push({
          rank: i + 1,
          companyName: a.profile.companyName,
          bracket: a.bracket,
          bracketName: getBracketDisplayName(a.bracket as 'rookie' | 'veteran' | 'elite' | 'grandmaster'),
          durationSeconds: a.durationSeconds ?? 0,
          elapsedFormatted: formatElapsedTime(elapsedMs),
          prestigeLevel: a.prestigeLevel,
          completedAt: a.completedAtMs ?? 0,
          isCurrentPlayer: a.profile.id === profile.id,
        });
      }
    }

    // Count total participants
    const participantCount = dbChallenge
      ? await prisma.speedRunAttempt.count({
          where: { challengeId: dbChallenge.id },
        })
      : 0;

    return NextResponse.json({
      currentChallenge: {
        weekId,
        milestoneId: challenge.primaryMilestone.id,
        milestoneName: challenge.primaryMilestone.name,
        milestoneDescription: challenge.primaryMilestone.description,
        milestoneTier: challenge.primaryMilestone.tier,
        compositeMilestoneId: challenge.compositeMilestone.id,
        compositeMilestoneName: challenge.compositeMilestone.name,
        compositeMilestoneDescription: challenge.compositeMilestone.description,
        timeRemaining,
        participantCount,
      },
      nextChallenge: {
        milestoneId: nextChallenge.primaryMilestone.id,
        milestoneName: nextChallenge.primaryMilestone.name,
        milestoneTier: nextChallenge.primaryMilestone.tier,
        compositeMilestoneId: nextChallenge.compositeMilestone.id,
        compositeMilestoneName: nextChallenge.compositeMilestone.name,
      },
      activeAttempt,
      leaderboard,
    });
  } catch (error) {
    console.error('Speed runs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
