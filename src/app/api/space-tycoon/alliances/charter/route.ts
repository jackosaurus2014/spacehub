import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  ALLIANCE_CHARTER_DEFINITIONS,
  ALLIANCE_CHARTER_MAP,
  computeCharterGoal,
  computeCharterEscrow,
  computeDefaultWeeklyQuota,
  aggregateCharterProgress,
  getCharterWeekIndex,
  CHARTER_WEEK_MS,
  type AllianceCharterType,
} from '@/lib/game/alliance-charters';
import { computeWeeklyContribution } from '@/lib/game/alliance-charter-metrics';
import { getCurrentSeasonNumber, getSeasonSchedule } from '@/lib/game/seasonal-events';

/**
 * Alliance Season Charters (Live-Service Wave LS5,
 * docs/LIVE_SERVICE_2026-08.md §LS5).
 *
 * GET  — the alliance's active charter (or the catalogue to ratify one),
 *        the pledge board (every member's current-week status, live), and
 *        my own pledge.
 * POST — ratify | pledge | adjust_member_pledge
 */

async function requireMembership(profileId: string) {
  return prisma.allianceMember.findUnique({
    where: { profileId },
    select: { allianceId: true, role: true },
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ charter: null, catalogue: ALLIANCE_CHARTER_DEFINITIONS });
    }
    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json({ charter: null, catalogue: ALLIANCE_CHARTER_DEFINITIONS });
    }
    const membership = await requireMembership(profile.id);
    if (!membership) {
      return NextResponse.json({ charter: null, catalogue: ALLIANCE_CHARTER_DEFINITIONS, inAlliance: false });
    }

    const charter = await prisma.allianceCharter.findFirst({
      where: { allianceId: membership.allianceId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!charter) {
      return NextResponse.json({
        charter: null,
        catalogue: ALLIANCE_CHARTER_DEFINITIONS,
        inAlliance: true,
        canRatify: ['leader', 'officer'].includes(membership.role),
      });
    }

    const def = ALLIANCE_CHARTER_MAP.get(charter.charterType as AllianceCharterType);
    const nowMs = Date.now();
    const weekIndex = getCharterWeekIndex(nowMs);
    const weekStartMs = weekIndex * CHARTER_WEEK_MS;
    const weekEndMs = weekStartMs + CHARTER_WEEK_MS;

    const members = await prisma.allianceMember.findMany({
      where: { allianceId: membership.allianceId },
      select: { profileId: true, role: true, profile: { select: { companyName: true } } },
    });

    // Board: for every member, their current (open, live) week pledge if
    // any + a short 3-week history for the "who's met their week" strip.
    const currentPledges = await prisma.alliancePledge.findMany({
      where: { charterId: charter.id, weekIndex },
    });
    const historyPledges = await prisma.alliancePledge.findMany({
      where: { charterId: charter.id, weekIndex: { gte: weekIndex - 3, lt: weekIndex } },
      orderBy: { weekIndex: 'asc' },
    });

    const board = await Promise.all(members.map(async m => {
      const mine = currentPledges.find(p => p.profileId === m.profileId);
      // Live in-progress contribution — never persisted until the weekly
      // cron closes the week; this is a read-only preview so the board
      // feels alive without letting the client dictate the final number.
      const liveContributed = mine && def
        ? await computeWeeklyContribution(prisma, def.type, membership.allianceId, m.profileId, weekStartMs, weekEndMs)
        : 0;
      return {
        profileId: m.profileId,
        companyName: m.profile.companyName,
        role: m.role,
        isYou: m.profileId === profile.id,
        pledged: !!mine && mine.quotaAmount > 0,
        quotaAmount: mine?.quotaAmount ?? 0,
        contributed: liveContributed,
        history: historyPledges
          .filter(p => p.profileId === m.profileId)
          .map(p => ({ weekIndex: p.weekIndex, met: p.met, quotaAmount: p.quotaAmount, contributed: p.contributed })),
      };
    }));

    // Progress is the sum of every CLOSED week's persisted `contributed`
    // plus this week's live preview — never double counts because current
    // week rows start at contributed=0 until the cron closes them.
    const allClosedPledges = await prisma.alliancePledge.findMany({
      where: { charterId: charter.id, weekIndex: { lt: weekIndex } },
      select: { contributed: true },
    });
    const closedProgress = aggregateCharterProgress(allClosedPledges);
    const liveProgress = closedProgress + board.reduce((s, b) => s + b.contributed, 0);

    return NextResponse.json({
      inAlliance: true,
      canRatify: ['leader', 'officer'].includes(membership.role),
      isOfficer: ['leader', 'officer'].includes(membership.role),
      charter: {
        id: charter.id,
        charterType: charter.charterType,
        def,
        goalTarget: charter.goalTarget,
        progress: liveProgress,
        escrowTotal: charter.escrowTotal,
        escrowSpent: charter.escrowSpent,
        escrowRemaining: Math.max(0, charter.escrowTotal - charter.escrowSpent),
        status: charter.status,
        seasonNumber: charter.seasonNumber,
        startsAt: charter.startsAt.getTime(),
        endsAt: charter.endsAt.getTime(),
        grade: charter.grade,
      },
      weekIndex,
      weekEndsAtMs: weekEndMs,
      board,
    });
  } catch (error) {
    logger.error('Charter fetch error', { error: String(error) });
    return NextResponse.json({ charter: null, catalogue: ALLIANCE_CHARTER_DEFINITIONS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }
    const membership = await requireMembership(profile.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    const body = await request.json();

    // ── Ratify a new season charter ─────────────────────────────────────
    if (body.action === 'ratify') {
      if (!['leader', 'officer'].includes(membership.role)) {
        return NextResponse.json({ error: 'Only leaders and officers can ratify a charter' }, { status: 403 });
      }
      const charterType = body.charterType as AllianceCharterType;
      const def = ALLIANCE_CHARTER_MAP.get(charterType);
      if (!def) return NextResponse.json({ error: 'Unknown charter type' }, { status: 400 });

      const existing = await prisma.allianceCharter.findFirst({
        where: { allianceId: membership.allianceId, status: 'active' },
      });
      if (existing) {
        return NextResponse.json({ error: 'An active charter already exists this season' }, { status: 400 });
      }

      const alliance = await prisma.alliance.findUniqueOrThrow({
        where: { id: membership.allianceId },
        select: { treasury: true, memberCount: true },
      });

      const goalTarget = computeCharterGoal(charterType, alliance.memberCount);
      const escrowTotal = computeCharterEscrow(goalTarget);
      if (alliance.treasury < escrowTotal) {
        return NextResponse.json({
          error: `Insufficient treasury to fund escrow ($${escrowTotal.toLocaleString()} required, have $${alliance.treasury.toLocaleString()})`,
        }, { status: 400 });
      }

      const seasonNumber = getCurrentSeasonNumber();
      const seasonSchedule = getSeasonSchedule(seasonNumber);

      const charter = await prisma.$transaction(async tx => {
        await tx.alliance.update({
          where: { id: membership.allianceId },
          data: { treasury: { decrement: escrowTotal } },
        });
        const created = await tx.allianceCharter.create({
          data: {
            allianceId: membership.allianceId,
            seasonNumber,
            charterType,
            goalTarget,
            escrowTotal,
            ratifiedBy: profile.id,
            endsAt: seasonSchedule.endsAt,
          },
        });
        await tx.allianceLog.create({
          data: {
            allianceId: membership.allianceId,
            type: 'charter_ratified',
            actorId: profile.id,
            actorName: profile.companyName,
            title: `${profile.companyName} ratified the ${def.name}`,
            description: `Season ${seasonNumber} goal: ${goalTarget.toLocaleString()} ${def.metricLabel.toLowerCase()}. Escrow funded: $${escrowTotal.toLocaleString()}.`,
            metadata: { charterId: created.id, charterType, goalTarget, escrowTotal },
          },
        });
        return created;
      });

      return NextResponse.json({ success: true, charter });
    }

    // ── Self-pledge: opt in / adjust my own weekly quota ────────────────
    if (body.action === 'pledge') {
      const charter = await prisma.allianceCharter.findFirst({
        where: { allianceId: membership.allianceId, status: 'active' },
      });
      if (!charter) return NextResponse.json({ error: 'No active charter' }, { status: 400 });

      const quotaAmount = Math.max(0, Math.round(Number(body.quotaAmount) || 0));
      const weekIndex = getCharterWeekIndex(Date.now());

      const pledge = await prisma.alliancePledge.upsert({
        where: { charterId_profileId_weekIndex: { charterId: charter.id, profileId: profile.id, weekIndex } },
        create: {
          charterId: charter.id, allianceId: membership.allianceId, profileId: profile.id,
          weekIndex, quotaAmount,
        },
        update: { quotaAmount },
      });

      return NextResponse.json({ success: true, pledge });
    }

    // ── Officer adjusts a member's quota ─────────────────────────────────
    if (body.action === 'adjust_member_pledge') {
      if (!['leader', 'officer'].includes(membership.role)) {
        return NextResponse.json({ error: 'Only leaders and officers can adjust member quotas' }, { status: 403 });
      }
      const targetProfileId = String(body.profileId || '');
      const target = await prisma.allianceMember.findUnique({ where: { profileId: targetProfileId } });
      if (!target || target.allianceId !== membership.allianceId) {
        return NextResponse.json({ error: 'Not a member of this alliance' }, { status: 400 });
      }
      const charter = await prisma.allianceCharter.findFirst({
        where: { allianceId: membership.allianceId, status: 'active' },
      });
      if (!charter) return NextResponse.json({ error: 'No active charter' }, { status: 400 });

      const quotaAmount = Math.max(0, Math.round(Number(body.quotaAmount) || 0));
      const weekIndex = getCharterWeekIndex(Date.now());

      const pledge = await prisma.alliancePledge.upsert({
        where: { charterId_profileId_weekIndex: { charterId: charter.id, profileId: targetProfileId, weekIndex } },
        create: {
          charterId: charter.id, allianceId: membership.allianceId, profileId: targetProfileId,
          weekIndex, quotaAmount,
        },
        update: { quotaAmount },
      });

      return NextResponse.json({ success: true, pledge });
    }

    // ── Suggested default quota for a not-yet-ratified charter type ──────
    if (body.action === 'preview') {
      const charterType = body.charterType as AllianceCharterType;
      const def = ALLIANCE_CHARTER_MAP.get(charterType);
      if (!def) return NextResponse.json({ error: 'Unknown charter type' }, { status: 400 });
      const alliance = await prisma.alliance.findUniqueOrThrow({
        where: { id: membership.allianceId },
        select: { memberCount: true },
      });
      const goalTarget = computeCharterGoal(charterType, alliance.memberCount);
      return NextResponse.json({
        goalTarget,
        escrowTotal: computeCharterEscrow(goalTarget),
        defaultWeeklyQuota: computeDefaultWeeklyQuota(goalTarget, alliance.memberCount),
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Charter action error', { error: String(error) });
    return NextResponse.json({ error: 'Charter operation failed' }, { status: 500 });
  }
}
