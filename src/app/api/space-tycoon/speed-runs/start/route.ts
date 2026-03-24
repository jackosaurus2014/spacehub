import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getCurrentChallenge,
  getPrestigeBracket,
  getBracketDisplayName,
  SPEED_RUN_MILESTONES,
} from '@/lib/game/speed-runs';
import { getCurrentWeekId } from '@/lib/game/weekly-events';

/**
 * POST /api/space-tycoon/speed-runs/start
 * Start a speed run attempt after prestiging.
 * Body: { prestigeLevel: number }
 *
 * Creates a SpeedRunAttempt with startedAtMs = now.
 * Player must have prestige level >= 1 (P0 cannot participate).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prestigeLevel } = body;

    if (typeof prestigeLevel !== 'number' || prestigeLevel < 1) {
      return NextResponse.json(
        { error: 'Must have prestiged at least once (P1+) to start a speed run' },
        { status: 400 },
      );
    }

    // Get player profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    const weekId = getCurrentWeekId();
    const challenge = getCurrentChallenge(weekId);
    const bracket = getPrestigeBracket(prestigeLevel);

    // Ensure the weekly challenge record exists
    let dbChallenge = await prisma.speedRunChallenge.findUnique({
      where: { weekId },
    });

    if (!dbChallenge) {
      dbChallenge = await prisma.speedRunChallenge.create({
        data: {
          weekId,
          milestoneId: challenge.primaryMilestone.id,
          milestoneName: challenge.primaryMilestone.name,
          milestoneTarget: challenge.primaryMilestone.description,
          startsAt: new Date(challenge.startsAt),
          endsAt: new Date(challenge.endsAt),
          status: 'active',
        },
      });
    }

    // Check if player already has an attempt for this challenge
    const existingAttempt = await prisma.speedRunAttempt.findUnique({
      where: {
        challengeId_profileId: {
          challengeId: dbChallenge.id,
          profileId: profile.id,
        },
      },
    });

    if (existingAttempt) {
      return NextResponse.json(
        { error: 'You already have an attempt for this week\'s challenge. Prestige again next week for a new attempt.' },
        { status: 409 },
      );
    }

    // Create the attempt
    const now = Date.now();
    const attempt = await prisma.speedRunAttempt.create({
      data: {
        challengeId: dbChallenge.id,
        profileId: profile.id,
        prestigeLevel,
        bracket,
        startedAtMs: now,
      },
    });

    // Increment participant count
    await prisma.speedRunChallenge.update({
      where: { id: dbChallenge.id },
      data: {}, // Touch to update timestamp; participant count derived from attempts
    });

    // Get personal bests for all milestones
    const personalBests: Record<string, number> = {};
    const prevAttempts = await prisma.speedRunAttempt.findMany({
      where: {
        profileId: profile.id,
        completedAtMs: { not: null },
        isVerified: true,
      },
      orderBy: { durationSeconds: 'asc' },
    });

    // Group by challenge milestone to find PBs
    for (const prev of prevAttempts) {
      const prevChallenge = await prisma.speedRunChallenge.findUnique({
        where: { id: prev.challengeId },
        select: { milestoneId: true },
      });
      if (prevChallenge && prev.durationSeconds !== null) {
        const mid = prevChallenge.milestoneId;
        if (!personalBests[mid] || prev.durationSeconds < personalBests[mid]) {
          personalBests[mid] = prev.durationSeconds;
        }
      }
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        challengeId: dbChallenge.id,
        prestigeLevel,
        bracket,
        bracketName: getBracketDisplayName(bracket),
        startedAtMs: now,
      },
      featuredMilestone: {
        id: challenge.primaryMilestone.id,
        name: challenge.primaryMilestone.name,
        description: challenge.primaryMilestone.description,
        tier: challenge.primaryMilestone.tier,
      },
      compositeMilestone: {
        id: challenge.compositeMilestone.id,
        name: challenge.compositeMilestone.name,
        description: challenge.compositeMilestone.description,
      },
      allMilestones: SPEED_RUN_MILESTONES.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        tier: m.tier,
      })),
      personalBests,
    });
  } catch (error) {
    console.error('Speed run start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
