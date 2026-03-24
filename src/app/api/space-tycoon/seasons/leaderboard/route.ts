import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getEventPhase,
  BRACKETS,
  type SeasonType,
} from '@/lib/game/seasonal-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/seasons/leaderboard
 * Season leaderboard: top 50 players, player's rank, bracket filtering.
 * Query params:
 *   - bracket: 1-5 (optional, filter by bracket number)
 *   - limit: number (default 50, max 100)
 *   - eventId: string (optional, specific event; defaults to active event)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bracketFilter = searchParams.get('bracket')
      ? parseInt(searchParams.get('bracket')!, 10)
      : null;
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const eventId = searchParams.get('eventId');

    // Find the target event
    let targetEvent;
    if (eventId) {
      targetEvent = await prisma.seasonalEvent.findUnique({
        where: { id: eventId },
      });
    } else {
      // Find current active event
      targetEvent = await prisma.seasonalEvent.findFirst({
        where: { status: 'active' },
        orderBy: { startsAt: 'desc' },
      });

      // If no active, check for recently completed
      if (!targetEvent) {
        targetEvent = await prisma.seasonalEvent.findFirst({
          where: { status: 'completed' },
          orderBy: { endsAt: 'desc' },
        });
      }
    }

    if (!targetEvent) {
      return NextResponse.json({
        entries: [],
        playerEntry: null,
        eventInfo: null,
        totalParticipants: 0,
        brackets: [],
      });
    }

    // Build query filter
    const whereClause: Record<string, unknown> = {
      eventId: targetEvent.id,
    };
    if (bracketFilter && bracketFilter >= 1 && bracketFilter <= 5) {
      whereClause.bracket = bracketFilter;
    }

    // Get leaderboard entries
    const participations = await prisma.seasonParticipation.findMany({
      where: whereClause,
      orderBy: { totalScore: 'desc' },
      take: limit,
      include: {
        profile: {
          select: {
            companyName: true,
            title: true,
            netWorth: true,
            allianceMembership: {
              select: {
                alliance: { select: { tag: true, name: true } },
              },
            },
          },
        },
      },
    });

    const entries = participations.map((p, i) => ({
      rank: i + 1,
      companyName: p.profile.companyName,
      title: p.profile.title,
      totalScore: p.totalScore,
      seasonPoints: p.seasonPoints,
      currentTier: p.currentTier,
      bracket: p.bracket,
      bracketLabel: BRACKETS[Math.max(0, Math.min(4, p.bracket - 1))]?.label || 'Unknown',
      allianceTag: p.profile.allianceMembership?.alliance?.tag || null,
    }));

    // Get total participant count
    const totalParticipants = await prisma.seasonParticipation.count({
      where: { eventId: targetEvent.id },
    });

    // Get per-bracket counts
    const bracketCounts: Record<number, number> = {};
    for (let b = 1; b <= 5; b++) {
      bracketCounts[b] = await prisma.seasonParticipation.count({
        where: { eventId: targetEvent.id, bracket: b },
      });
    }

    // Get player's own entry if logged in
    let playerEntry = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const profile = await prisma.gameProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          companyName: true,
          title: true,
          allianceMembership: {
            select: {
              alliance: { select: { tag: true } },
            },
          },
        },
      });

      if (profile) {
        const playerParticipation = await prisma.seasonParticipation.findUnique({
          where: {
            eventId_profileId: {
              eventId: targetEvent.id,
              profileId: profile.id,
            },
          },
        });

        if (playerParticipation) {
          // Calculate player's rank within their bracket
          const bracketRank = await prisma.seasonParticipation.count({
            where: {
              eventId: targetEvent.id,
              bracket: playerParticipation.bracket,
              totalScore: { gt: playerParticipation.totalScore },
            },
          });

          // Calculate global rank
          const globalRank = await prisma.seasonParticipation.count({
            where: {
              eventId: targetEvent.id,
              totalScore: { gt: playerParticipation.totalScore },
            },
          });

          playerEntry = {
            rank: globalRank + 1,
            bracketRank: bracketRank + 1,
            companyName: profile.companyName,
            title: profile.title,
            totalScore: playerParticipation.totalScore,
            seasonPoints: playerParticipation.seasonPoints,
            currentTier: playerParticipation.currentTier,
            bracket: playerParticipation.bracket,
            bracketLabel: BRACKETS[Math.max(0, Math.min(4, playerParticipation.bracket - 1))]?.label || 'Unknown',
            allianceTag: profile.allianceMembership?.alliance?.tag || null,
          };
        }
      }
    }

    // Event phase info
    const phase = getEventPhase(
      new Date(targetEvent.startsAt),
      new Date(targetEvent.endsAt),
      new Date()
    );

    return NextResponse.json({
      entries,
      playerEntry,
      eventInfo: {
        id: targetEvent.id,
        title: targetEvent.title,
        seasonType: targetEvent.seasonType,
        phase,
        startsAt: targetEvent.startsAt,
        endsAt: targetEvent.endsAt,
      },
      totalParticipants,
      bracketCounts,
      brackets: BRACKETS.map((b, i) => ({
        number: i + 1,
        label: b.label,
        count: bracketCounts[i + 1] || 0,
      })),
    });
  } catch (error) {
    console.error('Season leaderboard error:', error);
    return NextResponse.json(
      { entries: [], playerEntry: null, eventInfo: null, totalParticipants: 0, brackets: [] },
      { status: 500 }
    );
  }
}
