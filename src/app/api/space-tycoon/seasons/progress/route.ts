import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getEventPhase,
  isPlayablePhase,
  getTierFromSP,
  SP_PER_TIER,
  SEASON_PASS_TIERS,
  getDailyChallenges,
  SEASON_DEFINITIONS,
  type SeasonType,
  type BracketTier,
  type EventGameState,
} from '@/lib/game/seasonal-events';

/**
 * POST /api/space-tycoon/seasons/progress
 * Update seasonal event progress.
 * Body: { challengeId: string, progress: number }
 * Checks challenge completion, awards SP, advances tier.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { challengeId, progress } = body;

    if (!challengeId || typeof progress !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: challengeId (string), progress (number)' },
        { status: 400 }
      );
    }

    // Find the player's profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, eventTokens: true, netWorth: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Game profile not found' }, { status: 404 });
    }

    // Find active event
    const now = new Date();
    const activeEvents = await prisma.seasonalEvent.findMany({
      where: {
        OR: [{ status: 'active' }, { status: 'upcoming' }],
      },
      orderBy: { startsAt: 'asc' },
      take: 3,
    });

    let currentEvent = null;
    for (const event of activeEvents) {
      const phase = getEventPhase(new Date(event.startsAt), new Date(event.endsAt), now);
      if (isPlayablePhase(phase)) {
        currentEvent = event;
        break;
      }
    }

    if (!currentEvent) {
      return NextResponse.json({ error: 'No active seasonal event found' }, { status: 400 });
    }

    // Get player's participation
    const participation = await prisma.seasonParticipation.findUnique({
      where: {
        eventId_profileId: {
          eventId: currentEvent.id,
          profileId: profile.id,
        },
      },
    });

    if (!participation) {
      return NextResponse.json(
        { error: 'You are not participating in this event. Join first.' },
        { status: 403 }
      );
    }

    // Parse event state
    const eventState = participation.eventState as unknown as EventGameState;
    const challengeProgress = eventState.challengeProgress || {};

    // Get current daily challenges to validate the challengeId
    const seasonType = currentEvent.seasonType as SeasonType;
    const bracketTiers: BracketTier[] = ['frontier', 'pioneer', 'commander', 'admiral', 'titan'];
    const bracketTier = bracketTiers[Math.max(0, Math.min(4, participation.bracket - 1))];
    const dailyChallenges = getDailyChallenges(seasonType, bracketTier, now);

    // Also check if this is a stored SeasonChallenge from the DB
    const dbChallenge = await prisma.seasonChallenge.findFirst({
      where: {
        eventId: currentEvent.id,
        id: challengeId,
      },
    });

    // Find matching daily challenge
    const dailyMatch = dailyChallenges.find(c => c.id === challengeId);

    if (!dailyMatch && !dbChallenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Determine challenge target and reward
    const challengeMetric = dailyMatch ? dailyMatch.metric : (dbChallenge?.metric || '');
    const challengeTarget = dailyMatch ? dailyMatch.target : (dbChallenge?.target || 0);
    const challengeSPReward = dailyMatch ? dailyMatch.spReward : (dbChallenge?.spReward || 0);

    // Update progress
    const previousProgress = challengeProgress[challengeMetric] || 0;
    const newProgress = Math.max(previousProgress, progress);
    challengeProgress[challengeMetric] = newProgress;

    // Check if challenge was just completed
    const wasCompleted = previousProgress >= challengeTarget;
    const isNowCompleted = newProgress >= challengeTarget;
    let spAwarded = 0;
    let tierAdvanced = false;
    let newTier = participation.currentTier;
    let newSeasonPoints = participation.seasonPoints;

    if (!wasCompleted && isNowCompleted) {
      // Award SP
      spAwarded = challengeSPReward;

      // Check for Final Sprint multiplier (1.25x)
      const phase = getEventPhase(
        new Date(currentEvent.startsAt),
        new Date(currentEvent.endsAt),
        now
      );
      if (phase === 'FINAL_SPRINT') {
        spAwarded = Math.round(spAwarded * 1.25);
      }

      newSeasonPoints = participation.seasonPoints + spAwarded;
      newTier = getTierFromSP(newSeasonPoints);
      tierAdvanced = newTier > participation.currentTier;

      // Award Event Tokens for tier advancement
      let tokensToAward = 0;
      if (tierAdvanced) {
        // Award tokens for each tier passed
        for (let t = participation.currentTier + 1; t <= newTier; t++) {
          const bonusTiers = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
          tokensToAward += bonusTiers.includes(t) ? 150 : 50;
        }
      }

      // Update event state
      const updatedEventState: EventGameState = {
        ...eventState,
        challengeProgress,
        eventScore: eventState.eventScore + spAwarded,
      };

      // Update participation
      await prisma.seasonParticipation.update({
        where: { id: participation.id },
        data: {
          seasonPoints: newSeasonPoints,
          currentTier: newTier,
          totalScore: participation.totalScore + spAwarded,
          eventState: JSON.parse(JSON.stringify(updatedEventState)),
        },
      });

      // Award event tokens
      if (tokensToAward > 0) {
        await prisma.gameProfile.update({
          where: { id: profile.id },
          data: {
            eventTokens: { increment: tokensToAward },
          },
        });
      }

      return NextResponse.json({
        success: true,
        challengeCompleted: true,
        spAwarded,
        newSeasonPoints,
        newTier,
        tierAdvanced,
        tokensAwarded: tierAdvanced ? tokensToAward : 0,
        nextTierAt: (newTier + 1) * SP_PER_TIER,
        progress: newProgress,
        target: challengeTarget,
      });
    }

    // Progress updated but not yet completed
    const updatedEventState: EventGameState = {
      ...eventState,
      challengeProgress,
    };

    await prisma.seasonParticipation.update({
      where: { id: participation.id },
      data: {
        eventState: JSON.parse(JSON.stringify(updatedEventState)),
      },
    });

    return NextResponse.json({
      success: true,
      challengeCompleted: false,
      spAwarded: 0,
      newSeasonPoints: participation.seasonPoints,
      newTier: participation.currentTier,
      tierAdvanced: false,
      tokensAwarded: 0,
      nextTierAt: (participation.currentTier + 1) * SP_PER_TIER,
      progress: newProgress,
      target: challengeTarget,
    });
  } catch (error) {
    console.error('Season progress error:', error);
    return NextResponse.json({ error: 'Failed to update seasonal progress' }, { status: 500 });
  }
}
