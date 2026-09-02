import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  RIVAL_DESIGNATED_EVENT,
  RIVALRY_STAKE,
  checkRivalryDesignation,
} from '@/lib/game/rivalry-stake';
import { assignPlayerToLeague } from '@/lib/game/league-system';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/rivals/designate
 * Body: { assignmentId: string, designate?: boolean }   (default true)
 *
 * GAME_DESIGN_REVIEW_2026-09 row 14 — the rivalry stake. Designating a
 * shadow rival puts a weekly stake on the pair: Monday's league cron
 * (/leagues/process-week) compares week-over-week net-worth growth and the
 * winner earns a small reputation gain. Server rules:
 *   - the assignment must belong to the caller and be active
 *   - at most RIVALRY_STAKE.MAX_DESIGNATED stakes at once
 *   - the pair must be within RIVALRY_STAKE.MAX_LEAGUE_GAP league brackets
 *     (0 = same bracket) — league from PlayerLeagueProfile, falling back to
 *     the net-worth assignment for profiles the cron has never bracketed
 *
 * Storage (no schema change): a RivalEvent of type 'rival_designated' on
 * the assignment IS the designation; un-designating deletes it.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body: { assignmentId?: unknown; designate?: unknown } = {};
    try { body = await request.json(); } catch { /* empty body */ }
    const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : '';
    const designate = body.designate !== false;
    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, netWorth: true, peakNetWorth: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    const assignment = await prisma.rivalAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        rival: { select: { id: true, companyName: true, netWorth: true, peakNetWorth: true } },
        events: { where: { type: RIVAL_DESIGNATED_EVENT }, select: { id: true } },
      },
    });
    if (!assignment || assignment.playerId !== profile.id) {
      return NextResponse.json({ error: 'Rival assignment not found' }, { status: 404 });
    }
    if (!assignment.isActive) {
      return NextResponse.json({ error: 'This rivalry week has already settled' }, { status: 409 });
    }

    if (!designate) {
      if (assignment.events.length > 0) {
        await prisma.rivalEvent.deleteMany({ where: { assignmentId, type: RIVAL_DESIGNATED_EVENT } });
      }
      const remaining = await countDesignated(profile.id);
      return NextResponse.json({ success: true, designated: false, designatedCount: remaining, max: RIVALRY_STAKE.MAX_DESIGNATED });
    }

    if (assignment.events.length > 0) {
      const count = await countDesignated(profile.id);
      return NextResponse.json({ success: true, designated: true, designatedCount: count, max: RIVALRY_STAKE.MAX_DESIGNATED, alreadyDesignated: true });
    }

    // League gap — PlayerLeagueProfile is the truth once the cron has run;
    // otherwise fall back to the deterministic net-worth assignment.
    const leagues = await prisma.playerLeagueProfile.findMany({
      where: { profileId: { in: [profile.id, assignment.rival.id] } },
      select: { profileId: true, currentLeague: true },
    });
    const leagueOf = (id: string, netWorth: number, peak: number) =>
      leagues.find(l => l.profileId === id)?.currentLeague ?? assignPlayerToLeague(netWorth, peak);
    const playerLeague = leagueOf(profile.id, profile.netWorth, profile.peakNetWorth);
    const rivalLeague = leagueOf(assignment.rival.id, assignment.rival.netWorth, assignment.rival.peakNetWorth);

    const designatedCount = await countDesignated(profile.id);
    const check = checkRivalryDesignation(playerLeague, rivalLeague, designatedCount);
    if (!check.ok) {
      return NextResponse.json({
        success: false,
        error: check.reason,
        designatedCount,
        max: RIVALRY_STAKE.MAX_DESIGNATED,
        playerLeague,
        rivalLeague,
      }, { status: 400 });
    }

    await prisma.rivalEvent.create({
      data: {
        assignmentId,
        type: RIVAL_DESIGNATED_EVENT,
        title: 'Rivalry stake set',
        description: `You staked reputation on out-growing ${assignment.rival.companyName} this week.`,
        metadata: { rivalCompanyName: assignment.rival.companyName, playerLeague, rivalLeague, weekId: assignment.weekId },
        // Not a notification-worthy event — the player just did it.
        notified: true,
      },
    });

    return NextResponse.json({
      success: true,
      designated: true,
      designatedCount: designatedCount + 1,
      max: RIVALRY_STAKE.MAX_DESIGNATED,
    });
  } catch (error) {
    logger.error('Rival designate error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function countDesignated(playerId: string): Promise<number> {
  return prisma.rivalEvent.count({
    where: { type: RIVAL_DESIGNATED_EVENT, assignment: { playerId, isActive: true } },
  });
}
