import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getEventPhase,
  isJoinablePhase,
  createEventState,
  getBracket,
  getBracketNumber,
  SEASON_DEFINITIONS,
  type SeasonType,
} from '@/lib/game/seasonal-events';

/**
 * POST /api/space-tycoon/seasons/join
 * Join the active seasonal event.
 * Creates SeasonParticipation with fresh EventGameState and bracket assignment.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the player's game profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        netWorth: true,
        companyName: true,
        buildingCount: true,
        researchCount: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Game profile not found. Play the main game first.' },
        { status: 400 }
      );
    }

    // Anti-gaming: minimum account age (7 days) and activity
    const accountAgeDays = (Date.now() - new Date(profile.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    if (accountAgeDays < 7) {
      return NextResponse.json(
        { error: 'Your account must be at least 7 days old to join seasonal events.' },
        { status: 403 }
      );
    }
    if (profile.buildingCount < 3 || profile.researchCount < 1) {
      return NextResponse.json(
        { error: 'Complete at least 3 buildings and 1 research in the main game before joining events.' },
        { status: 403 }
      );
    }

    // Find the current active or registration-open event
    const now = new Date();
    const events = await prisma.seasonalEvent.findMany({
      where: {
        OR: [
          { status: 'active' },
          { status: 'upcoming' },
        ],
      },
      orderBy: { startsAt: 'asc' },
      take: 5,
    });

    // Find the first event in a joinable phase
    let targetEvent = null;
    let eventPhase = null;
    for (const event of events) {
      const phase = getEventPhase(new Date(event.startsAt), new Date(event.endsAt), now);
      if (isJoinablePhase(phase)) {
        targetEvent = event;
        eventPhase = phase;
        break;
      }
    }

    if (!targetEvent || !eventPhase) {
      return NextResponse.json(
        { error: 'No seasonal event is currently open for registration.' },
        { status: 400 }
      );
    }

    // Check if already participating
    const existing = await prisma.seasonParticipation.findUnique({
      where: {
        eventId_profileId: {
          eventId: targetEvent.id,
          profileId: profile.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You are already participating in this event.' },
        { status: 409 }
      );
    }

    // Determine bracket
    const bracket = getBracket(profile.netWorth);
    const bracketNumber = getBracketNumber(profile.netWorth);
    const seasonType = targetEvent.seasonType as SeasonType;

    // Validate season type
    if (!SEASON_DEFINITIONS[seasonType]) {
      return NextResponse.json(
        { error: 'Invalid season type configuration.' },
        { status: 500 }
      );
    }

    // Create fresh event state
    const eventState = createEventState(seasonType, bracket, targetEvent.id, profile.id);

    // Determine if late join
    const msSinceStart = now.getTime() - new Date(targetEvent.startsAt).getTime();
    const isLateJoin = msSinceStart > 0;

    // Create participation record
    const participation = await prisma.seasonParticipation.create({
      data: {
        eventId: targetEvent.id,
        profileId: profile.id,
        bracket: bracketNumber,
        eventState: JSON.parse(JSON.stringify(eventState)),
        seasonPoints: 0,
        currentTier: 0,
        totalScore: 0,
      },
    });

    // Update event status to active if it was upcoming and we are past start date
    if (targetEvent.status === 'upcoming' && msSinceStart > 0) {
      await prisma.seasonalEvent.update({
        where: { id: targetEvent.id },
        data: { status: 'active' },
      });
    }

    return NextResponse.json({
      success: true,
      participation: {
        id: participation.id,
        eventId: targetEvent.id,
        bracket: bracketNumber,
        bracketLabel: bracket.label,
        seasonType: targetEvent.seasonType,
        seasonTitle: targetEvent.title,
        isLateJoin,
      },
      eventState,
    });
  } catch (error) {
    console.error('Season join error:', error);
    return NextResponse.json({ error: 'Failed to join seasonal event' }, { status: 500 });
  }
}
