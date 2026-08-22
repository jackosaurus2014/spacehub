// ─── Space Tycoon AAA Round 2: server-side systemic-crisis helpers ──────────
// docs/AAA_PROGRAM_2026-08.md "Round 2". Prisma-touching glue shared by
// /api/space-tycoon/crisis (player actions), /api/space-tycoon/crisis/resolve
// (the cron sealer), and the sync route's CrisisSnapshot assembly.
//
// Architecture mirrors server-chair.ts exactly: every DECISION lives in the
// pure module (systemic-crises.ts); this file only reads rows, shapes inputs,
// and provides the schema-probe plumbing. The SystemicCrisis* tables may not
// exist when this ships (the deployment window server-ledger.ts,
// server-equity.ts and server-chair.ts all document), so every entry point is
// probe-guarded and every caller wraps it in try/catch.
//
// ─── The measurement contract (this is the load-bearing part) ─────────────
//
// Round 2's brief: "Scale to the world, not to a hand-tuned constant …
// Derive from real telemetry." Every world index below is a real aggregate
// over rows the game already maintains for other reasons:
//
//   orbital_density      OrbitalSlotOccupancy row count (E7)
//   insured_capital      sum of latest PublishedCorpReport netWorth (E6)
//   extraction_pressure  decayed LocationExtraction accumulator (E5)
//   market_concentration largest single supplier share in LocationDemandPool (E4)
//   built_capacity       sum of GameProfile.buildingCount for recent syncs
//
// None of them is a constant, and each has an ANCHOR — the scale at which
// the world counts as fully developed for that peril. The anchors are
// estimates and are labelled as estimates wherever they appear; the measured
// numerator is never an estimate. Both are stored on the cycle row and
// shipped to the client so a player can audit the scaling from inside the
// game rather than taking the severity on faith.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  CRISIS_ASSESSMENT_TARGET_FLOOR,
  clampCrisisIndex,
  computeAssessmentTarget,
  containmentFraction,
  crisisTierForIndex,
  getCrisisForCycle,
  getCrisisWindow,
  type CrisisSnapshot,
  type CrisisWorldIndexChannel,
} from './systemic-crises';

// ─── Schema availability probe ──────────────────────────────────────────────

const PROBE_TTL_MS = 5 * 60 * 1000;
let crisisAvailable: boolean | null = null;
let lastProbeAt = 0;

export async function isCrisisSchemaAvailable(): Promise<boolean> {
  if (crisisAvailable === true) return true;
  const now = Date.now();
  if (crisisAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.systemicCrisisCycle.count({ take: 1 });
    crisisAvailable = true;
  } catch {
    crisisAvailable = false;
    logger.warn('SystemicCrisisCycle table unavailable — systemic crises dormant (run prisma db push)');
  }
  return crisisAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetCrisisAvailability(): void {
  crisisAvailable = null;
  lastProbeAt = 0;
}

// ─── World-index anchors ────────────────────────────────────────────────────
//
// ESTIMATES, stated as such. Each is the scale at which the world counts as
// "fully developed" for that peril, i.e. worldIndex 1.0 → the `severe` band
// begins at 0.8 and `systemic` at 1.4. Provenance for each is given inline;
// none is a number picked to make a demo look good, and every one of them
// reads far below 1.0 on today's shard, which is exactly why the shipped
// state of this system is honest Advisory rather than a staged emergency.

export const CRISIS_WORLD_ANCHORS: Record<CrisisWorldIndexChannel, { anchor: number; unit: string; note: string }> = {
  orbital_density: {
    anchor: 60,
    unit: 'registered orbital objects',
    note: 'ESTIMATE. BALANCE.md Pass 8 measured GEO occupancy at 2-3 of 180 slots after 96 sim-months against a 153-slot congestion trigger; 60 registered objects is a third of one shell and sits comfortably below that trigger, so orbital-density severity climbs long before the slot-auction machinery would fire.',
  },
  insured_capital: {
    anchor: 50_000_000_000,
    unit: 'published corporate net worth',
    note: 'ESTIMATE. BALANCE.md Pass 5 C2 measured the best archetype\'s 50-year cumulative gross at ~$611B; $50B of PUBLISHED book net worth across the whole filing electorate is roughly the point at which a single insurer failure is a market event rather than a private one.',
  },
  extraction_pressure: {
    anchor: 40,
    unit: 'pressure-units across the deposit registry',
    note: 'ESTIMATE. extraction-pressure.ts scores each worked deposit in [0.4, 1.0]; the accumulator here sums (1 - pressure) across rows, so 40 units is ~66 deposits worked to the floor.',
  },
  market_concentration: {
    anchor: 1,
    unit: 'largest single supplier share (0-1) scaled by contested markets',
    note: 'ESTIMATE. The measure is the mean of the top supplier share across demand pools that have more than one supplier, multiplied by the count of such pools and divided by 20 — so a world with 20 genuinely contested markets each 100% dominated reads 1.0.',
  },
  built_capacity: {
    anchor: 400,
    unit: 'installed facilities across corporations synced in 30 days',
    note: 'ESTIMATE. BALANCE.md Pass 5 measured mature archetypes plateauing around 12-30 buildings; 400 is roughly 20 mature corporations\' worth of installed base.',
  },
};

const RECENT_SYNC_MS = 30 * 24 * 60 * 60 * 1000;
const PUBLISHED_REPORT_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;
/** extraction-pressure.ts's own lazy decay: 10%/day off `updatedAt`. */
const EXTRACTION_DECAY_PER_DAY = 0.10;

export interface WorldIndexMeasurement {
  channel: CrisisWorldIndexChannel;
  measured: number;
  anchor: number;
  index: number;
  /** World economic scale used to derive the assessment target — always the
   *  published-net-worth aggregate regardless of channel, because the
   *  assessment is a money target and money is what it must be sized in. */
  worldScaleUsd: number;
}

/** Sum of each corporation's most recent published book net worth inside the
 *  Accord's 90-day filing window. Used both as the `insured_capital` channel
 *  and — for every channel — as the money scale the assessment target is a
 *  fraction of. Publication is opt-in, so this deliberately measures the
 *  DISCLOSED economy: an emergency assessment can only be sized against what
 *  the Accord can actually see. */
async function sumPublishedNetWorth(nowMs: number): Promise<number> {
  try {
    const rows = await prisma.publishedCorpReport.findMany({
      where: { publishedAt: { gte: new Date(nowMs - PUBLISHED_REPORT_LOOKBACK_MS) } },
      orderBy: { publishedAt: 'desc' },
      select: { corpId: true, reportJson: true },
      take: 2000,
    });
    const seen = new Set<string>();
    let total = 0;
    for (const r of rows) {
      if (seen.has(r.corpId)) continue;
      seen.add(r.corpId);
      try {
        const parsed = JSON.parse(r.reportJson) as { netWorth?: unknown };
        const nw = typeof parsed?.netWorth === 'number' && Number.isFinite(parsed.netWorth) ? parsed.netWorth : 0;
        if (nw > 0) total += nw;
      } catch { /* a malformed filing contributes nothing rather than throwing */ }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Measure the world index for a crisis channel. Every branch is a real
 * aggregate; a query that fails returns 0, which reads as Advisory — the
 * fail-soft direction (a telemetry outage must never manufacture an
 * emergency).
 */
export async function measureWorldIndex(
  channel: CrisisWorldIndexChannel,
  nowMs: number = Date.now(),
): Promise<WorldIndexMeasurement> {
  const spec = CRISIS_WORLD_ANCHORS[channel];
  const worldScaleUsd = await sumPublishedNetWorth(nowMs);
  let measured = 0;

  try {
    switch (channel) {
      case 'orbital_density': {
        measured = await prisma.orbitalSlotOccupancy.count();
        break;
      }
      case 'insured_capital': {
        measured = worldScaleUsd;
        break;
      }
      case 'extraction_pressure': {
        const rows = await prisma.locationExtraction.findMany({
          select: { accumulated: true, updatedAt: true },
          take: 2000,
        });
        // Mirror extraction-pressure.ts's lazy decay so a stale row does not
        // read as fresh pressure.
        let sum = 0;
        for (const r of rows) {
          const days = Math.max(0, (nowMs - r.updatedAt.getTime()) / 86_400_000);
          const decayed = r.accumulated * Math.pow(1 - EXTRACTION_DECAY_PER_DAY, days);
          if (decayed > 0) sum += decayed;
        }
        measured = sum;
        break;
      }
      case 'market_concentration': {
        const rows = await prisma.locationDemandPool.findMany({
          where: { supplierCount: { gt: 1 } },
          select: { topShares: true },
          take: 2000,
        });
        let contested = 0;
        let shareSum = 0;
        for (const r of rows) {
          const shares = Array.isArray(r.topShares) ? (r.topShares as unknown[]) : [];
          const top = typeof shares[0] === 'number' ? (shares[0] as number) : 0;
          if (top <= 0) continue;
          contested++;
          shareSum += Math.max(0, Math.min(1, top));
        }
        // mean top share x contested markets / 20 — see the anchor note.
        measured = contested > 0 ? (shareSum / contested) * contested / 20 : 0;
        break;
      }
      case 'built_capacity': {
        const agg = await prisma.gameProfile.aggregate({
          where: { lastSyncAt: { gte: new Date(nowMs - RECENT_SYNC_MS) } },
          _sum: { buildingCount: true },
        });
        measured = agg._sum.buildingCount ?? 0;
        break;
      }
    }
  } catch (error) {
    logger.warn('Crisis world-index measurement failed — falling back to Advisory', { channel, error: String(error) });
    measured = 0;
  }

  const anchor = spec.anchor > 0 ? spec.anchor : 1;
  return { channel, measured, anchor, index: clampCrisisIndex(measured / anchor), worldScaleUsd };
}

// ─── Cycle rows ─────────────────────────────────────────────────────────────

export interface CrisisCycleRow {
  cycleIndex: number;
  crisisId: string;
  worldIndex: number;
  worldIndexMeasured: number;
  worldIndexAnchor: number;
  worldIndexChannel: string;
  worldScaleUsd: number;
  assessmentTargetUsd: number;
  reliefId: string;
  reliefSetByProfileId: string | null;
  reliefSetByCorp: string | null;
  status: string;
  pledgedUsd: number;
  pledgeCount: number;
  containment: number;
}

/**
 * Read (creating if absent) the cycle row for `cycleIndex`.
 *
 * The row is created ONCE, at first touch, and the world index it stores is
 * never re-measured for that cycle. That is deliberate: the whole point of
 * publishing the index at forecast time is that every corporation plans
 * against a number that cannot move under them mid-crisis.
 */
export async function ensureCrisisCycle(
  cycleIndex: number,
  nowMs: number = Date.now(),
): Promise<CrisisCycleRow | null> {
  if (!(await isCrisisSchemaAvailable())) return null;
  if (cycleIndex < 0) return null;
  try {
    const existing = await prisma.systemicCrisisCycle.findUnique({ where: { cycleIndex } });
    if (existing) return existing as unknown as CrisisCycleRow;

    const def = getCrisisForCycle(cycleIndex);
    const m = await measureWorldIndex(def.worldIndexChannel, nowMs);
    const tier = crisisTierForIndex(m.index);
    const target = computeAssessmentTarget(tier, m.worldScaleUsd);
    const created = await prisma.systemicCrisisCycle.create({
      data: {
        cycleIndex,
        crisisId: def.id,
        worldIndex: m.index,
        worldIndexMeasured: m.measured,
        worldIndexAnchor: m.anchor,
        worldIndexChannel: def.worldIndexChannel,
        worldScaleUsd: m.worldScaleUsd,
        assessmentTargetUsd: target,
        reliefId: def.defaultReliefId,
      },
    });
    return created as unknown as CrisisCycleRow;
  } catch (error) {
    // A concurrent create is the expected race here (two syncs at once);
    // re-read rather than failing the caller.
    try {
      const row = await prisma.systemicCrisisCycle.findUnique({ where: { cycleIndex } });
      if (row) return row as unknown as CrisisCycleRow;
    } catch { /* fall through */ }
    logger.warn('ensureCrisisCycle failed', { cycleIndex, error: String(error) });
    return null;
  }
}

// ─── Pledges ────────────────────────────────────────────────────────────────

export interface PledgeResult {
  ok: boolean;
  reason?: string;
  totalPledgedByMe?: number;
  poolUsd?: number;
  pledgeCount?: number;
}

/**
 * Record a pledge to the Accord Stabilization Assessment.
 *
 * The money is BURNED (`crisis_assessment_burn`) inside the same transaction
 * that increments the pool, so the pool total and the ledger can never
 * disagree. Charging happens server-side against `GameProfile.money` — the
 * client is never trusted for a money movement, exactly as the Chair filing
 * fee and league payouts do it.
 */
export async function recordCrisisPledge(input: {
  cycleIndex: number;
  profileId: string;
  corpName: string;
  amountUsd: number;
  nowMs?: number;
}): Promise<PledgeResult> {
  const nowMs = input.nowMs ?? Date.now();
  if (!(await isCrisisSchemaAvailable())) return { ok: false, reason: 'schema_unavailable' };
  const amount = Math.floor(input.amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'invalid_amount' };

  const win = getCrisisWindow(nowMs);
  if (win.cycleIndex !== input.cycleIndex) return { ok: false, reason: 'wrong_cycle' };
  if (win.phase !== 'active') return { ok: false, reason: 'window_closed' };

  const cycle = await ensureCrisisCycle(input.cycleIndex, nowMs);
  if (!cycle) return { ok: false, reason: 'no_cycle' };
  if (cycle.status !== 'open') return { ok: false, reason: 'sealed' };

  const { recordLedger } = await import('./server-ledger');

  try {
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.findUnique({
        where: { id: input.profileId },
        select: { money: true },
      });
      if (!profile) return { ok: false as const, reason: 'no_profile' };
      if (profile.money < amount) return { ok: false as const, reason: 'insufficient_funds' };

      await tx.gameProfile.update({
        where: { id: input.profileId },
        data: { money: { decrement: amount }, totalSpent: { increment: amount } },
      });
      await recordLedger(tx, {
        profileId: input.profileId,
        moneyDelta: -amount,
        reason: 'crisis_assessment_burn',
        refId: `crisis:${input.cycleIndex}`,
      });

      const existing = await tx.systemicCrisisPledge.findUnique({
        where: { cycleIndex_profileId: { cycleIndex: input.cycleIndex, profileId: input.profileId } },
        select: { amountUsd: true },
      });
      const pledge = await tx.systemicCrisisPledge.upsert({
        where: { cycleIndex_profileId: { cycleIndex: input.cycleIndex, profileId: input.profileId } },
        create: {
          cycleIndex: input.cycleIndex,
          profileId: input.profileId,
          corpName: input.corpName.slice(0, 64),
          amountUsd: amount,
        },
        update: { amountUsd: { increment: amount }, corpName: input.corpName.slice(0, 64) },
      });
      const row = await tx.systemicCrisisCycle.update({
        where: { cycleIndex: input.cycleIndex },
        data: {
          pledgedUsd: { increment: amount },
          pledgeCount: existing ? undefined : { increment: 1 },
        },
        select: { pledgedUsd: true, pledgeCount: true },
      });
      return {
        ok: true as const,
        totalPledgedByMe: pledge.amountUsd,
        poolUsd: row.pledgedUsd,
        pledgeCount: row.pledgeCount,
      };
    });
    return result;
  } catch (error) {
    logger.error('recordCrisisPledge failed', { error: String(error) });
    return { ok: false, reason: 'error' };
  }
}

// ─── The Chair's relief directive ───────────────────────────────────────────

export async function setCrisisRelief(input: {
  cycleIndex: number;
  reliefId: string;
  profileId: string;
  corpName: string;
  nowMs?: number;
}): Promise<{ ok: boolean; reason?: string }> {
  const nowMs = input.nowMs ?? Date.now();
  if (!(await isCrisisSchemaAvailable())) return { ok: false, reason: 'schema_unavailable' };
  const def = getCrisisForCycle(input.cycleIndex);
  if (!def.reliefOptions.some(r => r.id === input.reliefId)) return { ok: false, reason: 'unknown_relief' };
  const win = getCrisisWindow(nowMs);
  if (win.cycleIndex !== input.cycleIndex) return { ok: false, reason: 'wrong_cycle' };
  if (win.phase !== 'forecast' && win.phase !== 'active') return { ok: false, reason: 'window_closed' };

  const cycle = await ensureCrisisCycle(input.cycleIndex, nowMs);
  if (!cycle) return { ok: false, reason: 'no_cycle' };
  // One directive per crisis. A Chair who has already allocated the relief
  // cannot re-allocate it after watching the pool fill — the directive is a
  // commitment, published, and the corporations deciding whether to pledge
  // are entitled to know what they are funding.
  if (cycle.reliefSetByProfileId) return { ok: false, reason: 'already_directed' };

  try {
    await prisma.systemicCrisisCycle.update({
      where: { cycleIndex: input.cycleIndex },
      data: {
        reliefId: input.reliefId,
        reliefSetByProfileId: input.profileId,
        reliefSetByCorp: input.corpName.slice(0, 64),
        reliefSetAt: new Date(nowMs),
      },
    });
    return { ok: true };
  } catch (error) {
    logger.error('setCrisisRelief failed', { error: String(error) });
    return { ok: false, reason: 'error' };
  }
}

// ─── Sealing (the cron) ─────────────────────────────────────────────────────

/**
 * Seal every open cycle whose active window has closed, oldest first. Bounded
 * so a shard that was down for months fills its register in order with no
 * holes — the same shape the Chair certifier uses.
 */
export async function sealClosedCrisisCycles(nowMs: number = Date.now(), limit = 12): Promise<number> {
  if (!(await isCrisisSchemaAvailable())) return 0;
  const currentCycle = getCrisisWindow(nowMs).cycleIndex;
  let sealed = 0;
  try {
    const open = await prisma.systemicCrisisCycle.findMany({
      where: { status: 'open' },
      orderBy: { cycleIndex: 'asc' },
      take: limit,
    });
    for (const row of open) {
      const win = getCrisisWindow(nowMs);
      const closed = row.cycleIndex < currentCycle
        || (row.cycleIndex === currentCycle && (win.phase === 'aftermath' || win.phase === 'recess'));
      if (!closed) continue;
      await prisma.systemicCrisisCycle.update({
        where: { cycleIndex: row.cycleIndex },
        data: {
          status: 'sealed',
          containment: containmentFraction(row.pledgedUsd, row.assessmentTargetUsd),
          sealedAt: new Date(nowMs),
        },
      });
      sealed++;
    }
    // Open the next cycle's row so the forecast is published (and the world
    // index measured) the moment the forecast phase begins, rather than on
    // the first player sync.
    await ensureCrisisCycle(currentCycle, nowMs);
  } catch (error) {
    logger.error('sealClosedCrisisCycles failed', { error: String(error) });
  }
  return sealed;
}

// ─── Snapshot assembly (the sync hop) ───────────────────────────────────────

const TOP_PLEDGES = 8;
const SNAPSHOT_HISTORY = 8;

export async function buildCrisisSnapshot(
  profile: { id: string; companyName: string },
  opts: { isSeatedChair?: boolean; nowMs?: number } = {},
): Promise<CrisisSnapshot | null> {
  const nowMs = opts.nowMs ?? Date.now();
  if (!(await isCrisisSchemaAvailable())) return null;
  const win = getCrisisWindow(nowMs);
  const cycle = await ensureCrisisCycle(win.cycleIndex, nowMs);
  if (!cycle) return null;

  let myPledgeUsd = 0;
  let topPledges: { corpName: string; amountUsd: number }[] = [];
  let history: CrisisSnapshot['history'] = [];
  try {
    const [mine, top, past] = await Promise.all([
      prisma.systemicCrisisPledge.findUnique({
        where: { cycleIndex_profileId: { cycleIndex: win.cycleIndex, profileId: profile.id } },
        select: { amountUsd: true },
      }),
      prisma.systemicCrisisPledge.findMany({
        where: { cycleIndex: win.cycleIndex },
        orderBy: { amountUsd: 'desc' },
        take: TOP_PLEDGES,
        select: { corpName: true, amountUsd: true },
      }),
      prisma.systemicCrisisCycle.findMany({
        where: { status: 'sealed' },
        orderBy: { cycleIndex: 'desc' },
        take: SNAPSHOT_HISTORY,
        select: { cycleIndex: true, crisisId: true, containment: true, reliefId: true, worldIndex: true, pledgeCount: true },
      }),
    ]);
    myPledgeUsd = mine?.amountUsd ?? 0;
    topPledges = top.map(p => ({ corpName: p.corpName, amountUsd: p.amountUsd }));
    history = past.map(h => ({
      cycleIndex: h.cycleIndex,
      crisisId: h.crisisId,
      containment: h.containment,
      reliefId: h.reliefId,
      worldIndex: h.worldIndex,
      pledgeCount: h.pledgeCount,
    }));
  } catch { /* a partial snapshot is better than none; totals still come from the cycle row */ }

  return {
    enabled: true,
    cycleIndex: cycle.cycleIndex,
    crisisId: cycle.crisisId,
    worldIndex: cycle.worldIndex,
    worldIndexMeasured: cycle.worldIndexMeasured,
    worldIndexAnchor: cycle.worldIndexAnchor,
    worldIndexChannel: cycle.worldIndexChannel as CrisisWorldIndexChannel,
    assessmentTargetUsd: cycle.assessmentTargetUsd || CRISIS_ASSESSMENT_TARGET_FLOOR,
    pledgedUsd: cycle.pledgedUsd,
    pledgeCount: cycle.pledgeCount,
    myPledgeUsd,
    reliefId: cycle.reliefId,
    reliefSetByCorp: cycle.reliefSetByCorp,
    canSetRelief: opts.isSeatedChair === true && !cycle.reliefSetByProfileId
      && (win.phase === 'forecast' || win.phase === 'active'),
    topPledges,
    history,
    asOf: nowMs,
  };
}
