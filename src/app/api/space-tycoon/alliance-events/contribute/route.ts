import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  ALLIANCE_EVENT_MAP,
  calculateEventPoints,
  calculateAllianceEventScore,
  type AllianceEventType,
} from '@/lib/game/alliance-events';

/**
 * POST /api/space-tycoon/alliance-events/contribute
 * Record a contribution to the current alliance event.
 * Called from the sync cycle or when specific actions happen.
 *
 * Body: {
 *   eventId: string;
 *   metrics: Record<string, number>;  // Sub-metric values for the event
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    // Find user's alliance
    const membership = await prisma.allianceMember.findUnique({
      where: { profileId: profile.id },
      select: { allianceId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    const body = await request.json();
    const { eventId, metrics } = body;

    if (!eventId || !metrics || typeof metrics !== 'object') {
      return NextResponse.json(
        { error: 'eventId and metrics are required' },
        { status: 400 },
      );
    }

    // Validate the event exists and is active
    const event = await prisma.allianceEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Event is not active' }, { status: 400 });
    }

    const now = new Date();
    if (now < event.startsAt || now > event.endsAt) {
      return NextResponse.json({ error: 'Event is not within its active window' }, { status: 400 });
    }

    const eventDef = ALLIANCE_EVENT_MAP.get(event.eventType as AllianceEventType);
    if (!eventDef) {
      return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
    }

    // Calculate points from the metrics
    const points = calculateEventPoints(event.eventType as AllianceEventType, metrics);
    if (points <= 0) {
      return NextResponse.json({ success: true, points: 0, message: 'No points earned from these metrics' });
    }

    // Upsert the individual contribution
    const contribution = await prisma.allianceEventContribution.upsert({
      where: { eventId_profileId: { eventId, profileId: profile.id } },
      create: {
        eventId,
        allianceId: membership.allianceId,
        profileId: profile.id,
        score: points,
        details: metrics,
      },
      update: {
        score: { increment: points },
        details: metrics, // Overwrite details with latest metrics snapshot
      },
    });

    // Get all contributions for this alliance in this event
    const allContributions = await prisma.allianceEventContribution.findMany({
      where: { eventId, allianceId: membership.allianceId },
    });

    const rawTotal = allContributions.reduce((sum, c) => sum + c.score, 0);
    const activeMemberCount = allContributions.filter(c => c.score > 0).length;

    // Get total alliance member count
    const alliance = await prisma.alliance.findUnique({
      where: { id: membership.allianceId },
      select: { memberCount: true },
    });
    const totalMemberCount = alliance?.memberCount ?? 1;

    // Calculate alliance event score
    const { totalScore, perCapitaScore, multiplier } = calculateAllianceEventScore(
      rawTotal,
      activeMemberCount,
      totalMemberCount,
    );

    // Upsert the alliance score for this event
    await prisma.allianceEventScore.upsert({
      where: {
        eventId_allianceId: { eventId, allianceId: membership.allianceId },
      },
      create: {
        eventId,
        allianceId: membership.allianceId,
        totalScore,
        perCapitaScore,
        activeMemberCount,
      },
      update: {
        totalScore,
        perCapitaScore,
        activeMemberCount,
      },
    });

    // Update member's last active time and mark as active
    await prisma.allianceMember.update({
      where: { profileId: profile.id },
      data: {
        lastActiveAt: now,
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      points,
      totalContribution: contribution.score,
      allianceTotalScore: totalScore,
      alliancePerCapitaScore: perCapitaScore,
      participationMultiplier: multiplier,
      activeMemberCount,
    });
  } catch (error) {
    logger.error('Alliance event contribution error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to record contribution' },
      { status: 500 },
    );
  }
}
