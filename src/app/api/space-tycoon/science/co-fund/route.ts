import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import { getGlobalGameDate } from '@/lib/game/server-time';
import {
  NPC_PROGRAM_MAP, getNpcProgramStatuses, getNpcCycleIndexForMonth,
} from '@/lib/game/science-missions';
import { sweepNpcCoFundSettlements } from '@/lib/game/npc-cofund-settlement';

/**
 * NPC flagship science program co-funding — REAL server ledger (Live-Service
 * Wave LS5 part 2, docs/LIVE_SERVICE_2026-08.md §LS5). Closes the
 * long-deferred NPC_BACKDROP watch-item: the client-simulated version in
 * science-missions.ts (coFundNpcProgram) stays untouched for legacy saves;
 * this route is the new, real path — money actually moves, and the pool is
 * genuinely world-shared (every player's stake counts toward one settlement).
 *
 * GET  — world-shared status per program (open window? total staked this
 *        cycle? by how many stakers?), my own stake, and my settled history.
 * POST — { action: "stake", npcProgramId, shares?, allianceId? }
 */

const MAX_SHARES = 5;

export async function GET() {
  try {
    await sweepNpcCoFundSettlements(prisma);

    const session = await getServerSession(authOptions);
    let myProfileId: string | null = null;
    if (session?.user?.id) {
      const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      myProfileId = profile?.id ?? null;
    }

    const worldMonth = getGlobalGameDate().totalMonths;
    const statuses = getNpcProgramStatuses(worldMonth);

    const programs = await Promise.all(statuses.map(async s => {
      const cycleStakes = await prisma.npcProgramStake.findMany({
        where: { npcProgramId: s.def.id, cycleIndex: s.cycleIndex },
        select: { profileId: true, amount: true, shares: true, settled: true, payout: true, allianceId: true },
      });
      const totalStaked = cycleStakes.reduce((sum, r) => sum + r.amount, 0);
      const myStake = myProfileId ? cycleStakes.find(r => r.profileId === myProfileId) : undefined;

      return {
        npcProgramId: s.def.id,
        cycleIndex: s.cycleIndex,
        phaseLabel: s.phaseLabel,
        coFundOpen: s.coFundOpen,
        monthsToSettlement: s.monthsToSettlement,
        settlesAtMonth: s.settlesAtMonth,
        totalStaked,
        stakerCount: cycleStakes.length,
        myStake: myStake ? { shares: myStake.shares, amount: myStake.amount, settled: myStake.settled, payout: myStake.payout } : null,
      };
    }));

    let history: unknown[] = [];
    if (myProfileId) {
      const settled = await prisma.npcProgramStake.findMany({
        where: { profileId: myProfileId, settled: true },
        orderBy: { settledAt: 'desc' },
        take: 10,
        select: { npcProgramId: true, cycleIndex: true, amount: true, payout: true, settledAt: true },
      });
      history = settled.map(r => ({
        npcProgramId: r.npcProgramId,
        name: NPC_PROGRAM_MAP.get(r.npcProgramId)?.name ?? r.npcProgramId,
        cycleIndex: r.cycleIndex,
        amount: r.amount,
        payout: r.payout,
        settledAt: r.settledAt?.getTime(),
      }));
    }

    return NextResponse.json({ programs, history, ledgerAvailable: await isLedgerAvailable() });
  } catch (error) {
    logger.error('NPC co-fund fetch error', { error: String(error) });
    return NextResponse.json({ programs: [], history: [] });
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

    await sweepNpcCoFundSettlements(prisma);

    const body = await request.json();
    if (body.action !== 'stake') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const def = NPC_PROGRAM_MAP.get(String(body.npcProgramId || ''));
    if (!def) return NextResponse.json({ error: 'Unknown program' }, { status: 400 });

    const shares = Math.min(MAX_SHARES, Math.max(1, Math.round(Number(body.shares) || 1)));
    const worldMonth = getGlobalGameDate().totalMonths;
    const cycleIndex = getNpcCycleIndexForMonth(def, worldMonth);
    const status = getNpcProgramStatuses(worldMonth).find(s => s.def.id === def.id);
    if (!status || !status.coFundOpen) {
      return NextResponse.json({ error: 'Co-fund window is closed for this program' }, { status: 400 });
    }

    const existing = await prisma.npcProgramStake.findUnique({
      where: { npcProgramId_cycleIndex_profileId: { npcProgramId: def.id, cycleIndex, profileId: profile.id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already staked this program cycle' }, { status: 400 });
    }

    let allianceId: string | null = null;
    if (body.allianceId) {
      const membership = await prisma.allianceMember.findUnique({ where: { profileId: profile.id }, select: { allianceId: true } });
      if (membership && membership.allianceId === body.allianceId) allianceId = membership.allianceId;
    }

    const amount = Math.round(shares * def.coFundCost);
    const ledgerOn = await isLedgerAvailable();
    if (ledgerOn && profile.money < amount) {
      return NextResponse.json({
        error: `Insufficient funds to stake ($${amount.toLocaleString()} required)`,
      }, { status: 400 });
    }

    const stake = await prisma.$transaction(async tx => {
      const created = await tx.npcProgramStake.create({
        data: {
          npcProgramId: def.id, cycleIndex, profileId: profile.id, allianceId,
          shares, amount,
        },
      });
      if (ledgerOn) {
        await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: amount } } });
        await recordLedger(tx, {
          profileId: profile.id, moneyDelta: -amount,
          reason: 'npc_program_stake', refId: `${def.id}:${cycleIndex}`,
        });
      }
      return created;
    });

    await prisma.playerActivity.create({
      data: {
        profileId: profile.id,
        companyName: profile.companyName,
        type: 'npc_program_staked',
        title: `${profile.companyName} co-funded ${def.name}`,
        metadata: { npcProgramId: def.id, cycleIndex, amount, shares },
      },
    }).catch(() => { /* non-critical */ });

    return NextResponse.json({ success: true, stake, escrowed: ledgerOn ? amount : 0, settlesAtMonth: status.settlesAtMonth });
  } catch (error) {
    logger.error('NPC co-fund stake error', { error: String(error) });
    return NextResponse.json({ error: 'Co-fund operation failed' }, { status: 500 });
  }
}
