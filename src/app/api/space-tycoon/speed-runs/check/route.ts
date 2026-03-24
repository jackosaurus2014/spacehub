import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  checkMilestoneCompletion,
  calculateSuspicionScore,
  formatElapsedTime,
  getSpeedRunRewards,
  getPersonalBestReward,
  getMilestoneById,
} from '@/lib/game/speed-runs';
import type { GameState } from '@/lib/game/types';

/**
 * POST /api/space-tycoon/speed-runs/check
 * Check if the player has completed the milestone during an active speed run.
 * Called during sync with the current game state.
 *
 * Body: { gameState: { money, buildings, completedResearch, activeServices, unlockedLocations } }
 *
 * Server-side validation: checks milestone condition against provided state,
 * records completedAtMs, calculates durationSeconds, updates rank.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gameState } = body;

    if (!gameState || typeof gameState !== 'object') {
      return NextResponse.json({ error: 'gameState is required' }, { status: 400 });
    }

    // Get player profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    // Find the player's active (incomplete) attempt
    const activeAttempt = await prisma.speedRunAttempt.findFirst({
      where: {
        profileId: profile.id,
        completedAtMs: null,
      },
      include: {
        challenge: {
          select: { milestoneId: true, milestoneName: true, weekId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeAttempt) {
      return NextResponse.json({
        success: false,
        message: 'No active speed run attempt found',
      });
    }

    // Construct a minimal GameState for milestone checking
    const state: GameState = {
      version: 1,
      createdAt: Date.now(),
      lastTickAt: Date.now(),
      money: gameState.money ?? 0,
      totalEarned: gameState.totalEarned ?? 0,
      totalSpent: gameState.totalSpent ?? 0,
      gameDate: gameState.gameDate ?? { year: 2026, month: 1 },
      tickSpeed: 1,
      buildings: Array.isArray(gameState.buildings) ? gameState.buildings : [],
      completedResearch: Array.isArray(gameState.completedResearch) ? gameState.completedResearch : [],
      activeResearch: null,
      activeServices: Array.isArray(gameState.activeServices) ? gameState.activeServices : [],
      unlockedLocations: Array.isArray(gameState.unlockedLocations) ? gameState.unlockedLocations : [],
      resources: gameState.resources ?? {},
      eventLog: [],
      stats: gameState.stats ?? {
        rocketsLaunched: 0,
        satellitesDeployed: 0,
        stationsBuilt: 0,
        researchCompleted: 0,
        missionsToMoon: 0,
        missionsToMars: 0,
        missionsToOuterPlanets: 0,
      },
    };

    const milestoneId = activeAttempt.challenge.milestoneId;
    const isComplete = checkMilestoneCompletion(state, milestoneId);

    if (!isComplete) {
      // Return current progress info
      const elapsedMs = Date.now() - activeAttempt.startedAtMs;
      return NextResponse.json({
        success: true,
        milestoneId,
        milestoneName: activeAttempt.challenge.milestoneName,
        isComplete: false,
        elapsedMs,
        elapsedFormatted: formatElapsedTime(elapsedMs),
      });
    }

    // Milestone completed -- record it
    const now = Date.now();
    const elapsedMs = now - activeAttempt.startedAtMs;
    const durationSeconds = elapsedMs / 1000;

    // Reject times under 1 second
    if (durationSeconds < 1) {
      return NextResponse.json(
        { error: 'Completion time too short, rejected' },
        { status: 400 },
      );
    }

    // Check minimum time floor
    const milestone = getMilestoneById(milestoneId);
    if (milestone && durationSeconds < milestone.minimumSeconds * 0.5) {
      return NextResponse.json(
        { error: 'Completion time below physical minimum, rejected' },
        { status: 400 },
      );
    }

    // Calculate suspicion score
    const suspicionScore = calculateSuspicionScore(milestoneId, elapsedMs);

    // Update the attempt
    await prisma.speedRunAttempt.update({
      where: { id: activeAttempt.id },
      data: {
        completedAtMs: now,
        durationSeconds,
        isVerified: suspicionScore < 100,
        suspicionScore,
      },
    });

    // Calculate rank within bracket
    const bracket = activeAttempt.bracket as 'rookie' | 'veteran' | 'elite' | 'grandmaster';
    const fasterCount = await prisma.speedRunAttempt.count({
      where: {
        challengeId: activeAttempt.challengeId,
        bracket: activeAttempt.bracket,
        completedAtMs: { not: null },
        durationSeconds: { lt: durationSeconds },
        isVerified: true,
      },
    });

    const totalInBracket = await prisma.speedRunAttempt.count({
      where: {
        challengeId: activeAttempt.challengeId,
        bracket: activeAttempt.bracket,
        completedAtMs: { not: null },
        isVerified: true,
      },
    });

    const rank = fasterCount + 1;

    // Update rank on attempt
    await prisma.speedRunAttempt.update({
      where: { id: activeAttempt.id },
      data: { rank },
    });

    // Check if this is a personal best
    const previousBest = await prisma.speedRunAttempt.findFirst({
      where: {
        profileId: profile.id,
        id: { not: activeAttempt.id },
        completedAtMs: { not: null },
        isVerified: true,
        challenge: { milestoneId },
      },
      orderBy: { durationSeconds: 'asc' },
      select: { durationSeconds: true },
    });

    const isPersonalBest = !previousBest || durationSeconds < (previousBest.durationSeconds ?? Infinity);

    // Check if this is a new bracket record
    const currentRecord = await prisma.speedRunAttempt.findFirst({
      where: {
        id: { not: activeAttempt.id },
        bracket: activeAttempt.bracket,
        completedAtMs: { not: null },
        isVerified: true,
        challenge: { milestoneId },
      },
      orderBy: { durationSeconds: 'asc' },
      select: { durationSeconds: true },
    });

    const isNewRecord = !currentRecord || durationSeconds < (currentRecord.durationSeconds ?? Infinity);

    // Calculate rewards
    const rewards = getSpeedRunRewards(rank, totalInBracket, bracket);
    if (isPersonalBest) {
      const pbReward = getPersonalBestReward();
      rewards.cash += pbReward.cash;
      rewards.legacyPoints += pbReward.legacyPoints;
    }

    return NextResponse.json({
      success: true,
      milestoneId,
      milestoneName: activeAttempt.challenge.milestoneName,
      isComplete: true,
      elapsedMs,
      elapsedFormatted: formatElapsedTime(elapsedMs),
      durationSeconds,
      rank,
      totalInBracket,
      isPersonalBest,
      previousBest: previousBest?.durationSeconds
        ? previousBest.durationSeconds * 1000
        : null,
      improvement: previousBest?.durationSeconds
        ? (previousBest.durationSeconds - durationSeconds) * 1000
        : null,
      isNewRecord,
      currentRecord: currentRecord?.durationSeconds
        ? currentRecord.durationSeconds * 1000
        : null,
      suspicionScore,
      rewards,
    });
  } catch (error) {
    console.error('Speed run check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
