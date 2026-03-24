import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getEventPhase,
  getTierFromSP,
  getDailyChallenges,
  SEASON_DEFINITIONS,
  BRACKETS,
  getBracketNumber,
  formatSeasonCountdown,
  type SeasonType,
  type BracketTier,
} from '@/lib/game/seasonal-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/seasons
 * Returns current/upcoming seasonal event, player's participation status,
 * SP progress, tier, and daily challenges.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const now = new Date();

    // Fetch current or nearest upcoming event
    const events = await prisma.seasonalEvent.findMany({
      where: {
        OR: [
          { status: 'active' },
          { status: 'upcoming', startsAt: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
          { status: 'completed', endsAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: { startsAt: 'asc' },
      take: 3,
      include: {
        seasonChallenges: {
          where: {
            OR: [
              { challengeType: 'daily', activeDate: { gte: new Date(now.toISOString().split('T')[0]) } },
              { challengeType: 'weekly' },
              { challengeType: 'season' },
            ],
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { participations: true } },
      },
    });

    // Determine current/active event and upcoming event
    let activeEvent = events.find(e => e.status === 'active') || null;
    let upcomingEvent = events.find(e => e.status === 'upcoming') || null;
    const recentlyEnded = events.find(e => e.status === 'completed') || null;

    // Compute live phase for events
    const computePhase = (event: typeof events[0]) => {
      return getEventPhase(new Date(event.startsAt), new Date(event.endsAt), now);
    };

    // If an upcoming event is actually in registration/active phase, treat it as active
    if (!activeEvent && upcomingEvent) {
      const phase = computePhase(upcomingEvent);
      if (['ACTIVE', 'LATE_JOIN', 'FINAL_SPRINT', 'REGISTRATION'].includes(phase)) {
        activeEvent = upcomingEvent;
        upcomingEvent = null;
      }
    }

    // Player participation data
    let participation = null;
    let playerChallenges: {
      id: string;
      title: string;
      description: string;
      metric: string;
      target: number;
      spReward: number;
      progress: number;
      expiresAt: number;
    }[] = [];
    let playerProfile = null;

    if (session?.user?.id) {
      playerProfile = await prisma.gameProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          eventTokens: true,
          netWorth: true,
          companyName: true,
        },
      });

      if (playerProfile && activeEvent) {
        const existing = await prisma.seasonParticipation.findUnique({
          where: {
            eventId_profileId: {
              eventId: activeEvent.id,
              profileId: playerProfile.id,
            },
          },
        });

        if (existing) {
          const eventState = existing.eventState as Record<string, unknown>;
          const challengeProgress = (eventState?.challengeProgress || {}) as Record<string, number>;

          participation = {
            id: existing.id,
            seasonPoints: existing.seasonPoints,
            currentTier: existing.currentTier,
            bracket: existing.bracket,
            totalScore: existing.totalScore,
            rank: existing.rank,
            rewardsClaimed: existing.rewardsClaimed,
            createdAt: existing.createdAt,
          };

          // Get daily challenges for this player
          const seasonType = activeEvent.seasonType as SeasonType;
          const bracketTiers: BracketTier[] = ['frontier', 'pioneer', 'commander', 'admiral', 'titan'];
          const bracketTier = bracketTiers[Math.max(0, Math.min(4, existing.bracket - 1))];

          const dailyChallenges = getDailyChallenges(seasonType, bracketTier, now);
          playerChallenges = dailyChallenges.map(c => ({
            ...c,
            progress: challengeProgress[c.metric] || 0,
          }));
        }
      }
    }

    // Format active event response
    const formatEvent = (event: typeof events[0]) => {
      const phase = computePhase(event);
      const seasonDef = SEASON_DEFINITIONS[event.seasonType as SeasonType];
      const remainingMs = new Date(event.endsAt).getTime() - now.getTime();
      const untilStartMs = new Date(event.startsAt).getTime() - now.getTime();

      return {
        id: event.id,
        seasonType: event.seasonType,
        seasonNumber: event.seasonNumber,
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        status: event.status,
        phase,
        participantCount: event._count.participations,
        countdown: remainingMs > 0
          ? formatSeasonCountdown(remainingMs)
          : untilStartMs > 0
            ? formatSeasonCountdown(untilStartMs)
            : 'Ended',
        countdownLabel: phase === 'ACTIVE' || phase === 'LATE_JOIN' || phase === 'FINAL_SPRINT'
          ? 'Ends in'
          : untilStartMs > 0
            ? 'Starts in'
            : 'Event ended',
        seasonDefinition: seasonDef
          ? {
              name: seasonDef.name,
              description: seasonDef.description,
              themeColor: seasonDef.themeColor,
              accentColor: seasonDef.accentColor,
              icon: seasonDef.icon,
              uniqueMechanic: seasonDef.uniqueMechanic,
              scoringRules: seasonDef.scoringRules,
              durationDays: seasonDef.durationDays,
            }
          : null,
        metadata: event.metadata,
      };
    };

    return NextResponse.json({
      activeEvent: activeEvent ? formatEvent(activeEvent) : null,
      upcomingEvent: upcomingEvent ? formatEvent(upcomingEvent) : null,
      recentlyEnded: recentlyEnded ? formatEvent(recentlyEnded) : null,
      participation,
      dailyChallenges: playerChallenges,
      player: playerProfile
        ? {
            eventTokens: playerProfile.eventTokens,
            netWorth: playerProfile.netWorth,
            bracketNumber: getBracketNumber(playerProfile.netWorth),
            bracketLabel: BRACKETS[Math.max(0, getBracketNumber(playerProfile.netWorth) - 1)]?.label || 'Frontier',
          }
        : null,
    });
  } catch (error) {
    console.error('Seasons GET error:', error);
    return NextResponse.json(
      { activeEvent: null, upcomingEvent: null, recentlyEnded: null, participation: null, dailyChallenges: [], player: null },
      { status: 500 }
    );
  }
}
