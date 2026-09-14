// ─── Space Tycoon: interstellar expeditions — the SERVER half (CC-4) ────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §3. Until CC-4 an expedition
// existed only inside the client save. Two things depended on it and could
// not be built:
//
//   1. The interstellar HQ rung's gate ("Completed interstellar expedition +
//      colony charter") had to stand on a PROXY — the research plus a Colony
//      Ark hull — because a completion signal would have been the client's
//      word for it (hq-relocation.ts HQ_STAGE_REQUIREMENTS, CC-3 note).
//   2. The $8-17B survey payout an expedition pays on return had no server
//      counterpart, so the sync's money ceiling (ledger-reconcile.ts
//      clampPlausibleMoney) rejected it as implausible one-shot income — the
//      exact failure mode that cost the founder real money twice the week
//      CC-2 shipped.
//
// So expeditions get the authority Mining Orders and HQ relocations already
// have. This module is the prisma I/O half, modelled line for line on
// server-mining.ts (completeDueMiningOrders) and hq-relocation-server.ts
// (completeDueHqRelocations): every writer takes its `db` as an argument so
// the cron passes the client and a route can pass a transaction, every
// writer is status-guarded so a double pass is a no-op, and every reader
// degrades to "no expeditions" against a lagging schema rather than
// throwing a sync.
//
// What the server owns: the CLOCK (departure, arrival, return) and the
// PAYOUT CEILING (the survey figure, rolled from a seed the SERVER issued).
// What stays client-side: hull integrity, the hazard log, crew pools,
// resource samples, colony growth and trade routes — none of it gates
// anything, none of it is money, and all of it is far richer than a gate
// needs. See the Expedition model in prisma/schema.prisma.
//
// Time loop: CAMPAIGN (docs/SESSION_DESIGN.md). A Proxima round trip is
// ~260 game-months ≈ 64 real days; the 5-minute cron only ever flips a
// handful of rows.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { INTERSTELLAR_SYSTEM_MAP } from './interstellar';
import { REAL_MS_PER_GAME_MONTH } from './server-time';
import {
  EXPEDITION_SURVEY_SCIENCE_MULT_CAP,
  SERVER_EXPEDITION_SUCCESS_STATUSES,
  rollExpeditionOutcome,
  type ServerExpeditionBlock,
} from './expeditions';
import { DEFAULT_HQ_STAGE, hqExpeditionReturnMultForStage, type HqStageId } from './headquarters';

type Db = Prisma.TransactionClient | PrismaClient;

// ─── Statuses ───────────────────────────────────────────────────────────────

export const EXPEDITION_OUTBOUND = 'outbound';
export const EXPEDITION_EXPLORING = 'exploring';
export const EXPEDITION_RETURNING = 'returning';
/** Terminal: the explorer is home with its survey. */
export const EXPEDITION_COMPLETE = 'complete';
/** Terminal: the ark committed itself to founding a colony. */
export const EXPEDITION_COLONIZED = 'colonized';
/** Terminal: destroyed en route (client-reported — see reportExpeditionOutcome). */
export const EXPEDITION_LOST = 'lost';

/** Statuses still moving on the clock. */
export const EXPEDITION_LIVE_STATUSES: readonly string[] = [
  EXPEDITION_OUTBOUND, EXPEDITION_EXPLORING, EXPEDITION_RETURNING,
];

/** PlayerActivity.type when an expedition comes home — the first corporation
 *  to reach a star is news (design §5: "the corporation writes its own
 *  chapter"), and a rival's reach is intelligence. */
export const EXPEDITION_RETURNED_ACTIVITY = 'expedition_returned';

export interface ExpeditionRow {
  id: string;
  profileId: string;
  clientId: string | null;
  targetSystemId: string;
  shipInstanceId: string;
  shipDefinitionId: string;
  colonyShip: boolean;
  status: string;
  seed: number;
  outboundMonths: number;
  exploreMonths: number;
  departedAt: Date;
  arrivesAt: Date;
  returnsAt: Date | null;
  completedAt: Date | null;
  launchCost: number;
  surveyPayout: number;
  colonySuitability: number;
  creditedAt: Date | null;
}

export const EXPEDITION_SELECT = {
  id: true, profileId: true, clientId: true, targetSystemId: true, shipInstanceId: true,
  shipDefinitionId: true, colonyShip: true, status: true, seed: true, outboundMonths: true,
  exploreMonths: true, departedAt: true, arrivesAt: true, returnsAt: true, completedAt: true,
  launchCost: true, surveyPayout: true, colonySuitability: true, creditedAt: true,
} as const;

/** The instant an explorer turns for home: arrival + its survey window. A
 *  colony ark never does (it holds station indefinitely — expeditions.ts). */
export function expeditionReturnStartsAt(row: Pick<ExpeditionRow, 'arrivesAt' | 'exploreMonths'>): number {
  return row.arrivesAt.getTime() + row.exploreMonths * REAL_MS_PER_GAME_MONTH;
}

/** The client-facing shape of a row (the launch response and GET). */
export function expeditionBlock(row: ExpeditionRow): ServerExpeditionBlock {
  return {
    id: row.id,
    clientId: row.clientId,
    targetSystemId: row.targetSystemId,
    status: row.status,
    seed: row.seed,
    surveyPayout: row.surveyPayout,
    colonySuitability: row.colonySuitability,
    arrivesAtMs: row.arrivesAt.getTime(),
    returnsAtMs: row.returnsAt ? row.returnsAt.getTime() : null,
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function loadExpeditions(profileId: string, db: Db = prisma, take = 200): Promise<ExpeditionRow[]> {
  try {
    return await db.expedition.findMany({ where: { profileId }, select: EXPEDITION_SELECT, orderBy: { departedAt: 'desc' }, take });
  } catch { return []; }
}

/** Live expeditions this profile is running (one per committed hull). */
export async function loadLiveExpeditions(profileId: string, db: Db = prisma): Promise<ExpeditionRow[]> {
  try {
    return await db.expedition.findMany({ where: { profileId, status: { in: [...EXPEDITION_LIVE_STATUSES] } }, select: EXPEDITION_SELECT, take: 100 });
  } catch { return []; }
}

/**
 * THE number the interstellar HQ gate is decided on (hq-relocation.ts
 * HqExpeditionRequirement): interstellar expeditions this corporation
 * brought to a terminal SUCCESS. A lost expedition never counts, and a row
 * cannot reach a success status ahead of the server's own clock — which is
 * what makes the gate real rather than a proxy. A lagging schema reads 0,
 * i.e. the gate stays shut; it never fails open.
 */
export async function countCompletedExpeditions(profileId: string, db: Db = prisma): Promise<number> {
  try {
    return await db.expedition.count({ where: { profileId, status: { in: [...SERVER_EXPEDITION_SUCCESS_STATUSES] } } });
  } catch { return 0; }
}

// ─── Creation ───────────────────────────────────────────────────────────────

export interface CreateExpeditionInput {
  profileId: string;
  clientId?: string | null;
  targetSystemId: string;
  shipInstanceId: string;
  shipDefinitionId: string;
  colonyShip: boolean;
  seed: number;
  outboundMonths: number;
  exploreMonths: number;
  launchCost: number;
  now: Date;
}

/** Insert the row. Runs inside the launch route's transaction, beside the
 *  ledgered debit, exactly like the Mining-Order insert. The schedule is
 *  stamped here and never moves again: the client cannot bring an arrival
 *  forward, and a client that never syncs again still has an expedition
 *  that arrives. */
export async function createExpeditionRow(tx: Db, input: CreateExpeditionInput): Promise<ExpeditionRow> {
  const arrivesAt = new Date(input.now.getTime() + input.outboundMonths * REAL_MS_PER_GAME_MONTH);
  // Explorers plan a full round trip; a colony ark is one-way (it becomes
  // the colony's core), so it has no return leg at all.
  const returnsAt = input.colonyShip
    ? null
    : new Date(arrivesAt.getTime() + (input.exploreMonths + input.outboundMonths) * REAL_MS_PER_GAME_MONTH);
  return tx.expedition.create({
    data: {
      profileId: input.profileId,
      clientId: input.clientId ?? null,
      targetSystemId: input.targetSystemId,
      shipInstanceId: input.shipInstanceId,
      shipDefinitionId: input.shipDefinitionId,
      colonyShip: input.colonyShip,
      status: EXPEDITION_OUTBOUND,
      seed: input.seed,
      outboundMonths: input.outboundMonths,
      exploreMonths: input.exploreMonths,
      departedAt: input.now,
      arrivesAt,
      returnsAt,
      launchCost: Math.round(input.launchCost),
    },
    select: EXPEDITION_SELECT,
  });
}

// ─── The cron pass ──────────────────────────────────────────────────────────

/**
 * Advance every expedition whose clock has run out, in the assets-complete
 * pass beside the Mining-Order settlement and the HQ relocation completion.
 *
 *   outbound  → exploring  at arrivesAt, stamping the survey OUTCOME rolled
 *               from the seed this server issued (expeditions.ts
 *               rollExpeditionOutcome — the identical roll the client makes,
 *               which is what makes the payout a shared figure rather than a
 *               claim);
 *   exploring → returning  when the survey window closes (explorers only;
 *               a colony ark holds station until its owner commits it);
 *   returning → complete   at returnsAt, and the return is posted to the
 *               public timeline.
 *
 * Idempotent: every flip is a status-guarded updateMany. Best-effort per row
 * — one bad row never stops the pass.
 */
export async function advanceDueExpeditions(db: Db = prisma, profileId?: string, now: Date = new Date()): Promise<{ arrived: number; returning: number; completed: number }> {
  let live: ExpeditionRow[];
  try {
    live = await db.expedition.findMany({
      where: { status: { in: [...EXPEDITION_LIVE_STATUSES] }, arrivesAt: { lte: now }, ...(profileId ? { profileId } : {}) },
      select: EXPEDITION_SELECT,
      take: 500,
    });
  } catch { return { arrived: 0, returning: 0, completed: 0 }; }
  let arrived = 0;
  let returning = 0;
  let completed = 0;
  for (const row of live) {
    try {
      if (row.status === EXPEDITION_OUTBOUND) {
        const system = INTERSTELLAR_SYSTEM_MAP.get(row.targetSystemId);
        const outcome = system ? rollExpeditionOutcome(row.seed, system) : null;
        const flipped = await db.expedition.updateMany({
          where: { id: row.id, status: EXPEDITION_OUTBOUND },
          data: {
            status: EXPEDITION_EXPLORING,
            surveyPayout: outcome ? Math.round(outcome.surveyDataPayout) : 0,
            colonySuitability: outcome ? outcome.colonySuitability : 0,
          },
        });
        if (flipped.count === 1) { arrived++; row.status = EXPEDITION_EXPLORING; }
      }
      if (row.status === EXPEDITION_EXPLORING && !row.colonyShip && now.getTime() >= expeditionReturnStartsAt(row)) {
        const flipped = await db.expedition.updateMany({ where: { id: row.id, status: EXPEDITION_EXPLORING }, data: { status: EXPEDITION_RETURNING } });
        if (flipped.count === 1) { returning++; row.status = EXPEDITION_RETURNING; }
      }
      if (row.status === EXPEDITION_RETURNING && row.returnsAt && row.returnsAt.getTime() <= now.getTime()) {
        const flipped = await db.expedition.updateMany({
          where: { id: row.id, status: EXPEDITION_RETURNING },
          data: { status: EXPEDITION_COMPLETE, completedAt: now },
        });
        if (flipped.count === 1) {
          completed++;
          row.status = EXPEDITION_COMPLETE;
          await postExpeditionReturn(db, row);
        }
      }
    } catch (err) {
      logger.error('Expedition advance failed', { expeditionId: row.id, error: String(err) });
    }
  }
  return { arrived, returning, completed };
}

/** Public timeline entry for a return. Best-effort — a failed feed row never
 *  undoes a completed expedition. */
async function postExpeditionReturn(db: Db, row: ExpeditionRow): Promise<void> {
  try {
    const system = INTERSTELLAR_SYSTEM_MAP.get(row.targetSystemId);
    const prof = await db.gameProfile.findUnique({ where: { id: row.profileId }, select: { companyName: true } });
    const name = prof?.companyName || 'A corporation';
    await db.playerActivity.create({
      data: {
        profileId: row.profileId,
        companyName: name,
        type: EXPEDITION_RETURNED_ACTIVITY,
        title: `${name} brought an interstellar expedition home from ${system?.name || row.targetSystemId}`,
        description: `${row.outboundMonths * 2 + row.exploreMonths} game-months out and back. First-party stellar cartography is on the market.`,
        metadata: { targetSystemId: row.targetSystemId, expeditionId: row.id, shipDefinitionId: row.shipDefinitionId },
      },
    });
  } catch (err) {
    logger.warn('Expedition return feed row failed', { expeditionId: row.id, error: String(err) });
  }
}

// ─── Client-reported terminal outcomes ──────────────────────────────────────

export type ReportedExpeditionOutcome = 'lost' | 'colonized';

export class ExpeditionReportError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/**
 * The client owns two facts the server cannot compute: whether hazards
 * destroyed the ship (hull integrity depends on shielding, research and
 * science programs that live in the save), and whether an ark was committed
 * to founding a colony. It may report those — and ONLY those — and only
 * downward:
 *
 *   - 'lost' is accepted on any live row. It can only cost the reporter (the
 *     expedition stops counting toward the interstellar gate and its payout
 *     credit is forfeit), so there is nothing to gain by lying.
 *   - 'colonized' is accepted only on a COLONY ARK whose arrival the
 *     server's own clock has already passed. A client that claims it the
 *     day it launched gains nothing: the clock refuses.
 *
 * A client can never report 'complete'. That transition belongs to the cron
 * and to the clock alone.
 */
export async function reportExpeditionOutcome(
  db: Db,
  profileId: string,
  expeditionId: string,
  outcome: ReportedExpeditionOutcome,
  now: Date = new Date(),
): Promise<ExpeditionRow> {
  // The whitelist is the guard, not the type: this is reached from a route
  // body, so an unexpected string must be refused rather than fall through
  // to the more generous branch.
  if (outcome !== 'lost' && outcome !== 'colonized') {
    throw new ExpeditionReportError('invalid_outcome', 'An expedition can only be reported lost or colonized. Completion belongs to the clock.');
  }
  let row: ExpeditionRow | null = null;
  try {
    row = await db.expedition.findFirst({ where: { id: expeditionId, profileId }, select: EXPEDITION_SELECT });
  } catch { row = null; }
  if (!row) throw new ExpeditionReportError('not_found', 'No such expedition.');
  if (!EXPEDITION_LIVE_STATUSES.includes(row.status)) {
    throw new ExpeditionReportError('terminal', 'That expedition has already ended.');
  }
  if (outcome === 'colonized') {
    if (!row.colonyShip) throw new ExpeditionReportError('not_an_ark', 'Only a Colony Ark can found a colony.');
    if (row.arrivesAt.getTime() > now.getTime()) {
      throw new ExpeditionReportError('not_arrived', 'The ark has not reached the system yet.');
    }
  }
  const status = outcome === 'lost' ? EXPEDITION_LOST : EXPEDITION_COLONIZED;
  const flipped = await db.expedition.updateMany({
    where: { id: row.id, profileId, status: { in: [...EXPEDITION_LIVE_STATUSES] } },
    data: { status, completedAt: now },
  });
  if (flipped.count !== 1) throw new ExpeditionReportError('conflict', 'That expedition changed underneath the report.');
  return { ...row, status, completedAt: now };
}

// ─── The server mirror of expeditionReturnMult ──────────────────────────────

/** How many returns one sync may credit. A corporation cannot plausibly land
 *  more in one window (a round trip is weeks of real time); more than this
 *  is either a very long absence — the rest credit on the next sync — or
 *  something worth an audit line. */
export const MAX_EXPEDITION_CREDITS_PER_SYNC = 5;

export interface ExpeditionHeadroomCredit {
  /** $ the money ceiling is lifted by, once, for these returns. */
  headroomCredit: number;
  /** Expedition ids credited in this pass. */
  creditedNow: string[];
  /** Returns that waited for the next sync (over the cap). */
  deferred: string[];
  /** The seat the term was priced at. */
  hqStage: HqStageId;
  /** The HQ multiplier applied — the SAME figure the client tick applied. */
  hqExpeditionMult: number;
}

/**
 * CC-4: the server-side mirror of `expeditionReturnMult`.
 *
 * Every other HQ bonus is mirrored inside computeServerMonthlyGrossDetailed
 * (resource-plausibility.ts) through headquarters.ts hqServiceRevenueMult,
 * because every other HQ bonus lands on TICK income. The expedition term
 * does not: it lands on a one-shot payout when a mission comes home, which
 * the monthly-gross ceiling models not at all. So the mirror is a one-shot
 * HEADROOM CREDIT of exactly the same shape the completed-contract,
 * timed-event and delivery credits already have (contract-credit.ts), and
 * it is driven entirely by the SERVER's own Expedition rows — the client
 * neither supplies the ids nor the amounts, so a forged claim gains nothing.
 *
 * The amount is the theoretical maximum that return could legitimately have
 * paid: the survey figure this server stamped at arrival, × the science
 * cap (+30%, science-missions.ts, which the server cannot measure per
 * profile), × the seated seat's expedition term from headquarters.ts
 * hqExpeditionReturnMultForStage — the ONE helper the client tick calls
 * too. Client and server therefore cannot disagree about the multiplier,
 * which is the failure mode this whole contract exists to prevent.
 *
 * Idempotent by `creditedAt`: a return lifts the ceiling once, ever.
 */
export async function creditDueExpeditionReturns(
  db: Db = prisma,
  profileId: string,
  hqStage: HqStageId | string | null | undefined,
  now: Date = new Date(),
): Promise<ExpeditionHeadroomCredit> {
  const stage = (hqStage && typeof hqStage === 'string' ? hqStage : DEFAULT_HQ_STAGE) as HqStageId;
  const hqExpeditionMult = hqExpeditionReturnMultForStage(stage);
  const empty: ExpeditionHeadroomCredit = { headroomCredit: 0, creditedNow: [], deferred: [], hqStage: stage, hqExpeditionMult };
  let due: ExpeditionRow[];
  try {
    due = await db.expedition.findMany({
      where: { profileId, status: EXPEDITION_COMPLETE, creditedAt: null },
      select: EXPEDITION_SELECT,
      orderBy: { completedAt: 'asc' },
      take: MAX_EXPEDITION_CREDITS_PER_SYNC + 25,
    });
  } catch { return empty; }
  if (due.length === 0) return empty;
  const take = due.slice(0, MAX_EXPEDITION_CREDITS_PER_SYNC);
  const deferred = due.slice(MAX_EXPEDITION_CREDITS_PER_SYNC).map(r => r.id);
  let headroomCredit = 0;
  const creditedNow: string[] = [];
  for (const row of take) {
    const payout = Number.isFinite(row.surveyPayout) && row.surveyPayout > 0 ? row.surveyPayout : 0;
    if (payout <= 0) {
      // Nothing to credit, but the row must stop being selected.
      try { await db.expedition.updateMany({ where: { id: row.id, creditedAt: null }, data: { creditedAt: now } }); } catch { /* ignore */ }
      continue;
    }
    try {
      const claimed = await db.expedition.updateMany({ where: { id: row.id, creditedAt: null }, data: { creditedAt: now } });
      if (claimed.count !== 1) continue; // another sync took it
      headroomCredit += Math.round(payout * EXPEDITION_SURVEY_SCIENCE_MULT_CAP * hqExpeditionMult);
      creditedNow.push(row.id);
    } catch (err) {
      logger.warn('Expedition headroom credit failed', { expeditionId: row.id, error: String(err) });
    }
  }
  return { headroomCredit: Math.round(headroomCredit), creditedNow, deferred, hqStage: stage, hqExpeditionMult };
}
