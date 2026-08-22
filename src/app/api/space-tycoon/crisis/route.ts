import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  getCrisisWindow,
  getCrisisForCycle,
  CRISIS_QUALIFYING_PLEDGE_MIN,
} from '@/lib/game/systemic-crises';
import {
  isCrisisSchemaAvailable,
  buildCrisisSnapshot,
  recordCrisisPledge,
  setCrisisRelief,
} from '@/lib/game/server-crises';

export const dynamic = 'force-dynamic';

/**
 * AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md "Round 2"): the systemic
 * crisis — every player-facing action. Sealing and cycle rollover live in
 * ./resolve (cron).
 *
 * POST actions:
 *   pledge      — contribute to the Accord Stabilization Assessment. The
 *                 money is BURNED server-side inside the same transaction
 *                 that increments the pool (server-crises.ts), so the pool
 *                 and the ledger can never disagree and the client is never
 *                 trusted for a money movement. A pledge buys a bounded
 *                 mitigation on the pledger's OWN situation plus a share of
 *                 a public good — never resources, never a multiplier over
 *                 another corporation. (POLICY.md: no pay-to-win.)
 *   set_relief  — THE CHAIR'S VERB for this round. The seated Accord Chair
 *                 directs which of the crisis's three published relief
 *                 allocations the pool funds, once per crisis, before the
 *                 pool is spent. It changes what EVERY corporation receives
 *                 in the aftermath week — power over a public good, exactly
 *                 like the agenda writ, and structurally incapable of being
 *                 PvP.
 *
 * The Chair check is server-side: `AccordChairTerm` is consulted directly
 * rather than trusting a client claim.
 */

async function getProfile(userId: string) {
  return prisma.gameProfile.findUnique({
    where: { userId },
    select: { id: true, companyName: true, money: true },
  });
}

/** Is this profile the seated Accord Chair right now? Read from the Chair
 *  tables, never from the request body. Degrades to `false` when the Chair
 *  schema is absent — a shard without an election simply has no directive. */
async function isSeatedChair(profileId: string, nowMs: number): Promise<boolean> {
  try {
    const { getCurrentChairTermIndex } = await import('@/lib/game/accord-chair');
    const termIndex = getCurrentChairTermIndex(nowMs);
    const term = await prisma.accordChairTerm.findUnique({
      where: { termIndex },
      select: { status: true, chairProfileId: true },
    });
    return term?.status === 'certified' && term.chairProfileId === profileId;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isCrisisSchemaAvailable())) {
      return NextResponse.json({ crisis: null, reason: 'schema_unavailable' });
    }
    const profile = await getProfile(session.user.id);
    if (!profile) return NextResponse.json({ error: 'No game profile' }, { status: 404 });

    const nowMs = Date.now();
    const crisis = await buildCrisisSnapshot(profile, {
      isSeatedChair: await isSeatedChair(profile.id, nowMs),
      nowMs,
    });
    return NextResponse.json({ crisis });
  } catch (error) {
    logger.error('Crisis GET failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isCrisisSchemaAvailable())) {
      return NextResponse.json(
        { error: 'The Accord emergency register is not yet available on this shard.', reason: 'schema_unavailable' },
        { status: 409 },
      );
    }
    const profile = await getProfile(session.user.id);
    if (!profile) return NextResponse.json({ error: 'No game profile' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? '');
    const nowMs = Date.now();
    const win = getCrisisWindow(nowMs);

    if (action === 'pledge') {
      const amount = Math.floor(Number(body?.amountUsd));
      if (!Number.isFinite(amount) || amount < CRISIS_QUALIFYING_PLEDGE_MIN) {
        return NextResponse.json(
          { error: `The smallest pledge the Accord will record is $${(CRISIS_QUALIFYING_PLEDGE_MIN / 1e6).toFixed(0)}M.` },
          { status: 400 },
        );
      }
      const result = await recordCrisisPledge({
        cycleIndex: win.cycleIndex,
        profileId: profile.id,
        corpName: profile.companyName,
        amountUsd: amount,
        nowMs,
      });
      if (!result.ok) {
        const status = result.reason === 'insufficient_funds' ? 400
          : result.reason === 'window_closed' || result.reason === 'sealed' ? 409
            : 400;
        return NextResponse.json({ error: pledgeErrorText(result.reason), reason: result.reason }, { status });
      }
      const crisis = await buildCrisisSnapshot(profile, {
        isSeatedChair: await isSeatedChair(profile.id, nowMs),
        nowMs,
      });
      return NextResponse.json({
        ok: true,
        totalPledgedByMe: result.totalPledgedByMe,
        poolUsd: result.poolUsd,
        pledgeCount: result.pledgeCount,
        crisis,
      });
    }

    if (action === 'set_relief') {
      if (!(await isSeatedChair(profile.id, nowMs))) {
        return NextResponse.json(
          { error: 'Only the seated Accord Chair may direct the relief allocation.', reason: 'not_chair' },
          { status: 403 },
        );
      }
      const reliefId = String(body?.reliefId ?? '');
      const def = getCrisisForCycle(win.cycleIndex);
      if (!def.reliefOptions.some(r => r.id === reliefId)) {
        return NextResponse.json({ error: 'Unknown relief allocation.' }, { status: 400 });
      }
      const result = await setCrisisRelief({
        cycleIndex: win.cycleIndex,
        reliefId,
        profileId: profile.id,
        corpName: profile.companyName,
        nowMs,
      });
      if (!result.ok) {
        return NextResponse.json({ error: reliefErrorText(result.reason), reason: result.reason }, { status: 409 });
      }
      const crisis = await buildCrisisSnapshot(profile, { isSeatedChair: false, nowMs });
      return NextResponse.json({ ok: true, crisis });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logger.error('Crisis POST failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function pledgeErrorText(reason: string | undefined): string {
  switch (reason) {
    case 'insufficient_funds': return 'Insufficient cash on hand for that pledge.';
    case 'window_closed': return 'The Accord assessment is closed for this cycle.';
    case 'sealed': return 'This cycle has already been sealed into the register.';
    case 'wrong_cycle': return 'The emergency register has moved on to a new cycle — reload and try again.';
    case 'no_profile': return 'No game profile.';
    default: return 'The pledge could not be recorded.';
  }
}

function reliefErrorText(reason: string | undefined): string {
  switch (reason) {
    case 'already_directed': return 'The relief allocation for this emergency has already been directed. A directive is a public commitment and cannot be revised once corporations have begun pledging against it.';
    case 'window_closed': return 'The directive window for this emergency has closed.';
    default: return 'The directive could not be recorded.';
  }
}
