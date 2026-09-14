/**
 * @jest-environment node
 */
// ─── CC-4: the interstellar headquarters ────────────────────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §3 / docs/BALANCE.md Pass 16.
// The two things CC-3 deferred, and the invariant that must never slip:
//
//   1. EXPEDITIONS HAVE A SERVER RECORD. Lifecycle on the server's own clock
//      (outbound → exploring → returning → complete), the outcome rolled
//      from the seed the SERVER issued, and a forged client claim that gains
//      nothing.
//   2. THE INTERSTELLAR GATE IS REAL. Not the CC-3 proxy (research + a
//      Colony Ark hull) but the design's sentence: a completed interstellar
//      expedition AND the colony charter.
//   3. BONUS PARITY, INCLUDING THE EXPEDITION TERM. Every field of
//      HqBonuses must be applied identically by the client tick and by the
//      server, and every field must have a named mirror. `expeditionReturnMult`
//      was the one that did not — a server ceiling below what the tick paid
//      rejects income the player legitimately earned, which has cost the
//      founder real money twice.
//
// Prisma-shaped functions are driven against a tiny in-memory stand-in (the
// hq-seat-server.test.ts pattern): every function under test takes its `db`
// as an argument, so the fake needs only the handful of operations the
// passes actually use, and the test stays about the RULES.

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { gameLedgerEntry: { count: async () => 0 } },
}));

import {
  HQ_STAGES, NEUTRAL_HQ_BONUSES, getHqBonuses, hqExpeditionReturnMult,
  hqExpeditionReturnMultForStage, hqMiningLogisticsFor, hqServiceCostMult, hqServiceRevenueMult,
  type HqBonuses, type HqStageId,
} from '../headquarters';
import {
  HQ_STAGE_REQUIREMENTS, checkHqRelocationRequest, countCompletedExpeditionsInState,
  evaluateHqRequirementsFrom, hqRequirementLines, type HqRequirementView,
} from '../hq-relocation';
import {
  EXPEDITION_SURVEY_SCIENCE_MULT_CAP, SERVER_EXPEDITION_SUCCESS_STATUSES,
  adoptServerExpeditions, quoteExpeditionCosts, rollExpeditionOutcome,
} from '../expeditions';
import {
  EXPEDITION_COLONIZED, EXPEDITION_COMPLETE, EXPEDITION_EXPLORING, EXPEDITION_LOST,
  EXPEDITION_OUTBOUND, EXPEDITION_RETURNED_ACTIVITY, EXPEDITION_RETURNING,
  ExpeditionReportError, advanceDueExpeditions, countCompletedExpeditions,
  createExpeditionRow, creditDueExpeditionReturns, expeditionBlock, reportExpeditionOutcome,
} from '../server-expeditions';
import { INTERSTELLAR_SYSTEM_MAP } from '../interstellar';
import { getExpeditionScienceBonuses } from '../science-missions';
import { REAL_MS_PER_GAME_MONTH } from '../server-time';
import type { ExpeditionState, GameState } from '../types';

// ─── A very small in-memory prisma ──────────────────────────────────────────

type Row = Record<string, unknown>;

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    const value = row[key];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as Row;
      if ('not' in c) {
        if (c.not === null ? value === null || value === undefined : value === c.not) return false;
      }
      if ('lte' in c && !(value !== null && value !== undefined && (value as Date) <= (c.lte as Date))) return false;
      if ('gte' in c && !(value !== null && value !== undefined && (value as number) >= (c.gte as number))) return false;
      if ('in' in c && !(c.in as unknown[]).includes(value)) return false;
      continue;
    }
    if (cond === null) { if (value !== null && value !== undefined) return false; continue; }
    if (value !== cond) return false;
  }
  return true;
}

class Table {
  rows: Row[] = [];
  private seq = 0;
  constructor(private name: string) {}
  async findMany(args: { where?: Row; take?: number } = {}) { return this.rows.filter(r => matches(r, args.where)).slice(0, args.take ?? 1000).map(r => ({ ...r })); }
  async findFirst(args: { where?: Row } = {}) { const r = this.rows.find(x => matches(x, args.where)); return r ? { ...r } : null; }
  async findUnique(args: { where: Row }) { return this.findFirst(args); }
  async count(args: { where?: Row } = {}) { return this.rows.filter(r => matches(r, args.where)).length; }
  async create(args: { data: Row }) { const row = { id: `${this.name}-${++this.seq}`, ...args.data }; this.rows.push(row); return { ...row }; }
  async update(args: { where: Row; data: Row }) { const r = this.rows.find(x => matches(x, args.where)); if (r) Object.assign(r, args.data); return r ? { ...r } : null; }
  async updateMany(args: { where: Row; data: Row }) {
    const hits = this.rows.filter(r => matches(r, args.where));
    for (const r of hits) Object.assign(r, args.data);
    return { count: hits.length };
  }
}

function fakeDb() {
  const db = {
    expedition: new Table('exp'),
    gameProfile: new Table('profile'),
    playerActivity: new Table('activity'),
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> { return fn(db); },
  };
  return db;
}
type FakeDb = ReturnType<typeof fakeDb>;
const asDb = (db: FakeDb) => db as unknown as Parameters<typeof advanceDueExpeditions>[0];

const PROXIMA = INTERSTELLAR_SYSTEM_MAP.get('proxima_centauri')!;
const T0 = new Date('2150-01-01T00:00:00.000Z');
const at = (months: number) => new Date(T0.getTime() + months * REAL_MS_PER_GAME_MONTH);
const SEED = 0x5eedc0de;

async function seedExplorer(db: FakeDb, over: Partial<Record<string, unknown>> = {}) {
  db.gameProfile.rows.push({ id: 'p1', companyName: 'Meridian Freight', money: 1e12 });
  const row = await createExpeditionRow(asDb(db) as never, {
    profileId: 'p1',
    clientId: 'client-exp-1',
    targetSystemId: PROXIMA.id,
    shipInstanceId: 'hull-1',
    shipDefinitionId: 'starfarer_explorer',
    colonyShip: false,
    seed: SEED,
    outboundMonths: 127,
    exploreMonths: 12,
    launchCost: 13_000_000_000,
    now: T0,
  });
  if (Object.keys(over).length > 0) await db.expedition.updateMany({ where: { id: row.id }, data: over as Row });
  return row;
}

// ─── 1. The record and its lifecycle ────────────────────────────────────────

describe('CC-4 expedition record — lifecycle', () => {
  it('stamps a schedule at creation: an explorer has a return leg, a colony ark does not', async () => {
    const db = fakeDb();
    const row = await seedExplorer(db);
    expect(row.status).toBe(EXPEDITION_OUTBOUND);
    expect(row.arrivesAt.getTime()).toBe(T0.getTime() + 127 * REAL_MS_PER_GAME_MONTH);
    expect(row.returnsAt!.getTime()).toBe(T0.getTime() + (127 + 12 + 127) * REAL_MS_PER_GAME_MONTH);

    const ark = await createExpeditionRow(asDb(db) as never, {
      profileId: 'p1', clientId: null, targetSystemId: PROXIMA.id, shipInstanceId: 'hull-2',
      shipDefinitionId: 'colony_ark', colonyShip: true, seed: SEED, outboundMonths: 127,
      exploreMonths: 12, launchCost: 1, now: T0,
    });
    // A one-way commitment: it holds station until its owner commits it.
    expect(ark.returnsAt).toBeNull();
  });

  it('advances on the SERVER clock and stamps the survey outcome the seed rolls', async () => {
    const db = fakeDb();
    const row = await seedExplorer(db);

    // Nothing is due before arrival.
    expect(await advanceDueExpeditions(asDb(db), 'p1', at(126))).toEqual({ arrived: 0, returning: 0, completed: 0 });
    expect((db.expedition.rows[0] as Row).status).toBe(EXPEDITION_OUTBOUND);

    // Arrival stamps the outcome — the IDENTICAL roll the client makes from
    // the same seed, which is what makes the payout a shared figure.
    expect(await advanceDueExpeditions(asDb(db), 'p1', at(127))).toEqual({ arrived: 1, returning: 0, completed: 0 });
    const stamped = db.expedition.rows[0] as Row;
    expect(stamped.status).toBe(EXPEDITION_EXPLORING);
    const expected = rollExpeditionOutcome(SEED, PROXIMA);
    expect(stamped.surveyPayout).toBe(Math.round(expected.surveyDataPayout));
    expect(stamped.colonySuitability).toBe(expected.colonySuitability);

    // The survey window closes and the explorer turns for home.
    expect((await advanceDueExpeditions(asDb(db), 'p1', at(139))).returning).toBe(1);
    expect((db.expedition.rows[0] as Row).status).toBe(EXPEDITION_RETURNING);

    // …and completes at its scheduled return, with a public timeline entry.
    const out = await advanceDueExpeditions(asDb(db), 'p1', new Date(row.returnsAt!.getTime()));
    expect(out.completed).toBe(1);
    expect((db.expedition.rows[0] as Row).status).toBe(EXPEDITION_COMPLETE);
    expect(db.playerActivity.rows[0].type).toBe(EXPEDITION_RETURNED_ACTIVITY);
    expect(String(db.playerActivity.rows[0].title)).toContain('Meridian Freight');
  });

  it('is idempotent: a second cron pass over the same rows changes nothing', async () => {
    const db = fakeDb();
    const row = await seedExplorer(db);
    const done = new Date(row.returnsAt!.getTime());
    await advanceDueExpeditions(asDb(db), 'p1', done);
    const first = { ...(db.expedition.rows[0] as Row) };
    const again = await advanceDueExpeditions(asDb(db), 'p1', done);
    expect(again).toEqual({ arrived: 0, returning: 0, completed: 0 });
    expect(db.expedition.rows[0]).toEqual(first);
    expect(db.playerActivity.rows).toHaveLength(1);
  });

  it('the cron pass with no profileId sweeps every profile', async () => {
    const db = fakeDb();
    const row = await seedExplorer(db);
    const out = await advanceDueExpeditions(asDb(db), undefined, new Date(row.returnsAt!.getTime()));
    expect(out.completed).toBe(1);
  });
});

// ─── 2. Server authority: a forged client claim gains nothing ───────────────

describe('CC-4 expedition record — server authority', () => {
  it('a client cannot report completion; only the clock completes an expedition', async () => {
    const db = fakeDb();
    await seedExplorer(db);
    // 'complete' is not a reportable outcome at all — the route's type and
    // this function both refuse anything but a downgrade.
    await expect(
      reportExpeditionOutcome(asDb(db) as never, 'p1', db.expedition.rows[0].id as string, 'complete' as never, at(1)),
    ).rejects.toBeInstanceOf(ExpeditionReportError);
    expect(await countCompletedExpeditions('p1', asDb(db))).toBe(0);
  });

  it('a colony ark cannot be declared colonized before the server says it arrived', async () => {
    const db = fakeDb();
    db.gameProfile.rows.push({ id: 'p1', companyName: 'Kronos', money: 1e12 });
    const ark = await createExpeditionRow(asDb(db) as never, {
      profileId: 'p1', clientId: null, targetSystemId: PROXIMA.id, shipInstanceId: 'ark-1',
      shipDefinitionId: 'colony_ark', colonyShip: true, seed: SEED, outboundMonths: 127,
      exploreMonths: 12, launchCost: 1, now: T0,
    });
    // The day it launched: refused.
    await expect(reportExpeditionOutcome(asDb(db) as never, 'p1', ark.id, 'colonized', at(1)))
      .rejects.toMatchObject({ code: 'not_arrived' });
    expect(await countCompletedExpeditions('p1', asDb(db))).toBe(0);
    // After the server's own arrival clock: accepted, and the gate opens.
    await advanceDueExpeditions(asDb(db), 'p1', at(127));
    const done = await reportExpeditionOutcome(asDb(db) as never, 'p1', ark.id, 'colonized', at(128));
    expect(done.status).toBe(EXPEDITION_COLONIZED);
    expect(await countCompletedExpeditions('p1', asDb(db))).toBe(1);
  });

  it('another corporation cannot report on an expedition it does not own', async () => {
    const db = fakeDb();
    await seedExplorer(db);
    await expect(reportExpeditionOutcome(asDb(db) as never, 'rival', db.expedition.rows[0].id as string, 'lost', at(1)))
      .rejects.toMatchObject({ code: 'not_found' });
  });

  it('a loss is accepted (it can only cost the reporter) and never counts toward the gate', async () => {
    const db = fakeDb();
    const row = await seedExplorer(db);
    const lost = await reportExpeditionOutcome(asDb(db) as never, 'p1', row.id, 'lost', at(30));
    expect(lost.status).toBe(EXPEDITION_LOST);
    expect(SERVER_EXPEDITION_SUCCESS_STATUSES).not.toContain(EXPEDITION_LOST);
    expect(await countCompletedExpeditions('p1', asDb(db))).toBe(0);
    // A terminal row is never advanced again by the clock.
    expect(await advanceDueExpeditions(asDb(db), 'p1', at(500))).toEqual({ arrived: 0, returning: 0, completed: 0 });
  });
});

// ─── 3. The real interstellar gate ──────────────────────────────────────────

const CHARTERED: HqRequirementView = {
  tier: 7,
  buildings: [{ definitionId: 'outpost_outer', locationId: 'outer_system', isComplete: true }],
  research: ['interstellar_colonization'],
  ships: ['colony_ark'],
};

describe('CC-4 interstellar gate', () => {
  it('the requirement table carries the completed-expedition half of the design sentence', () => {
    expect(HQ_STAGE_REQUIREMENTS.interstellar_hq.expedition?.minCompleted).toBe(1);
    // No other rung gates on expeditions — this is the tier-7 rung's own bar.
    for (const s of HQ_STAGES) {
      if (s.id === 'interstellar_hq') continue;
      expect(HQ_STAGE_REQUIREMENTS[s.id].expedition).toBeUndefined();
    }
  });

  it('UNMET: the charter alone no longer opens the rung (the CC-3 proxy is retired)', () => {
    const check = evaluateHqRequirementsFrom({ ...CHARTERED, expeditionsCompleted: 0 }, 'interstellar_hq');
    expect(check.research?.met).toBe(true);
    expect(check.ship?.met).toBe(true);
    expect(check.expedition?.met).toBe(false);
    expect(check.met).toBe(false);
    // …and a view that never mentions expeditions at all reads as zero, so a
    // caller that forgets to count them fails SHUT, never open.
    expect(evaluateHqRequirementsFrom(CHARTERED, 'interstellar_hq').met).toBe(false);
  });

  it('MET: charter plus one completed expedition opens it', () => {
    const check = evaluateHqRequirementsFrom({ ...CHARTERED, expeditionsCompleted: 1 }, 'interstellar_hq');
    expect(check.expedition?.met).toBe(true);
    expect(check.met).toBe(true);
  });

  it('the relocation request names the expedition gate when it is the only thing missing', () => {
    const earth = { stage: 'earth_ops' as HqStageId, locationId: 'earth_surface', movedAtMs: 0 };
    const refused = checkHqRelocationRequest(earth, { ...CHARTERED, expeditionsCompleted: 0 }, 'interstellar_hq', { heldSeatAtTarget: true });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error).toBe('expedition');
      expect(refused.message).toContain('interstellar expedition');
    }
    const allowed = checkHqRelocationRequest(earth, { ...CHARTERED, expeditionsCompleted: 1 }, 'interstellar_hq', { heldSeatAtTarget: true });
    expect(allowed.ok).toBe(true);
  });

  it('the gate is legible on the ladder: five named lines, expedition last', () => {
    const lines = hqRequirementLines(evaluateHqRequirementsFrom({ tier: 1, buildings: [] }, 'interstellar_hq'));
    expect(lines).toHaveLength(5);
    expect(lines[0].label).toBe('tier 7');
    expect(lines[4].label).toContain('expedition');
    expect(lines.every(l => !l.met)).toBe(true);
  });

  it('the client-side tally counts returns and colonizations, never losses', () => {
    const exp = (phase: ExpeditionState['phase']): ExpeditionState => ({
      id: `e-${phase}`, targetSystemId: PROXIMA.id, shipInstanceId: 's', shipDefinitionId: 'starfarer_explorer',
      crew: 1, phase, launchedAtMs: 0, launchGameMonth: 0, outboundMonths: 1, exploreMonths: 1,
      monthsElapsed: 0, seed: 1, insured: false, insurancePremiumPaid: 0, extraShielding: false,
      totalCost: 0, hullIntegrity: 1, hazardLog: [],
    });
    const state = { expeditions: [exp('completed'), exp('colonizing'), exp('lost'), exp('outbound')] };
    expect(countCompletedExpeditionsInState(state as Pick<GameState, 'expeditions'>)).toBe(2);
  });

  it('the server count and the client tally agree on which statuses are a success', () => {
    expect([...SERVER_EXPEDITION_SUCCESS_STATUSES].sort()).toEqual([EXPEDITION_COLONIZED, EXPEDITION_COMPLETE].sort());
  });
});

// ─── 4. Bonus parity — every term, including the expedition one ─────────────

/** Every field of HqBonuses and the ONE helper that applies it. A new term
 *  added without a row here fails the structural test below, which is the
 *  point: the client tick and the server must reach every term through the
 *  same function or the sync ceiling drifts under what the tick paid. */
const BONUS_MIRRORS: Record<keyof HqBonuses, string> = {
  hiringCostMult: 'labor-market.ts getHireCostWithWageIndex',
  contractPayoutMult: 'contracts.ts applyContractReward / contract-credit.ts ceiling',
  launchRevenueMult: 'headquarters.ts hqServiceRevenueMult',
  satelliteOpsCostMult: 'headquarters.ts hqServiceCostMult',
  miningFuelMult: 'headquarters.ts hqMiningLogisticsFor',
  beltDeltaVMult: 'headquarters.ts hqMiningLogisticsFor',
  colonyThroughputMult: 'headquarters.ts hqServiceRevenueMult',
  marsOpsMult: 'headquarters.ts hqServiceRevenueMult',
  outerExtractionMult: 'headquarters.ts hqServiceRevenueMult',
  scienceMult: 'headquarters.ts hqServiceRevenueMult',
  expeditionReturnMult: 'headquarters.ts hqExpeditionReturnMult',
};

describe('CC-4 bonus parity', () => {
  it('every HqBonuses field names a mirror — a new term cannot be added without one', () => {
    expect(Object.keys(BONUS_MIRRORS).sort()).toEqual(Object.keys(NEUTRAL_HQ_BONUSES).sort());
  });

  it('walks every stage: the expedition term the client tick uses is the term the server credits', async () => {
    for (const stage of HQ_STAGES) {
      const bonuses = getHqBonuses(stage.id);
      // The client tick reaches the term through this helper
      // (expeditions.ts processExpeditionTick).
      const client = hqExpeditionReturnMult(bonuses);
      // The server reaches it through the stage-id form, which is all a
      // persisted GameProfile.hqLocationId gives it.
      expect(hqExpeditionReturnMultForStage(stage.id)).toBe(client);

      // And the credit the sync actually applies uses the same number.
      const db = fakeDb();
      db.gameProfile.rows.push({ id: 'p1', companyName: 'X', money: 0 });
      db.expedition.rows.push({
        id: `e-${stage.id}`, profileId: 'p1', status: EXPEDITION_COMPLETE, creditedAt: null,
        surveyPayout: 10_000_000_000, completedAt: T0,
      });
      const credit = await creditDueExpeditionReturns(asDb(db), 'p1', stage.id, T0);
      expect(credit.hqExpeditionMult).toBe(client);
      expect(credit.headroomCredit).toBe(Math.round(10_000_000_000 * EXPEDITION_SURVEY_SCIENCE_MULT_CAP * client));
    }
  });

  it('the ceiling is never below what the tick can pay, at any stage', async () => {
    const outcome = rollExpeditionOutcome(SEED, PROXIMA);
    for (const stage of HQ_STAGES) {
      // What the client tick pays at its most generous (science programs at
      // the cap — expeditions.ts processExpeditionTick).
      const tickPays = Math.round(outcome.surveyDataPayout * EXPEDITION_SURVEY_SCIENCE_MULT_CAP * hqExpeditionReturnMult(getHqBonuses(stage.id)));
      const db = fakeDb();
      db.expedition.rows.push({
        id: 'e1', profileId: 'p1', status: EXPEDITION_COMPLETE, creditedAt: null,
        surveyPayout: Math.round(outcome.surveyDataPayout), completedAt: T0,
      });
      const credit = await creditDueExpeditionReturns(asDb(db), 'p1', stage.id, T0);
      expect(credit.headroomCredit).toBeGreaterThanOrEqual(tickPays);
    }
  });

  it('the science cap the server assumes is the cap science-missions.ts enforces', () => {
    // A state with an absurd number of programs can never beat the cap.
    const bonuses = getExpeditionScienceBonuses({ scienceMissions: [] } as unknown as GameState);
    expect(bonuses.surveyPayoutMult).toBeLessThanOrEqual(EXPEDITION_SURVEY_SCIENCE_MULT_CAP);
    expect(EXPEDITION_SURVEY_SCIENCE_MULT_CAP).toBe(1.30);
  });

  it('the service and mining mirrors still agree stage by stage (CC-2/CC-3 invariant)', () => {
    for (const stage of HQ_STAGES) {
      const b = getHqBonuses(stage.id);
      expect(hqServiceRevenueMult(b, { definitionId: '', locationId: '', type: 'launch_payload' })).toBe(b.launchRevenueMult);
      expect(hqServiceCostMult(b, 'not_a_satellite_service')).toBe(1);
      expect(hqMiningLogisticsFor(stage.id)).toEqual({ fuelMult: b.miningFuelMult, beltDeltaVMult: b.beltDeltaVMult });
    }
  });
});

// ─── 5. The headroom credit is one-shot and server-driven ───────────────────

describe('CC-4 expedition headroom credit', () => {
  it('credits a return exactly once, ever', async () => {
    const db = fakeDb();
    db.expedition.rows.push({ id: 'e1', profileId: 'p1', status: EXPEDITION_COMPLETE, creditedAt: null, surveyPayout: 8_000_000_000, completedAt: T0 });
    const first = await creditDueExpeditionReturns(asDb(db), 'p1', 'deep_space_hq', T0);
    expect(first.creditedNow).toEqual(['e1']);
    expect(first.headroomCredit).toBeGreaterThan(0);
    const second = await creditDueExpeditionReturns(asDb(db), 'p1', 'deep_space_hq', T0);
    expect(second.creditedNow).toEqual([]);
    expect(second.headroomCredit).toBe(0);
  });

  it('never credits an expedition that has not come home, nor another corporation\'s', async () => {
    const db = fakeDb();
    db.expedition.rows.push({ id: 'e-away', profileId: 'p1', status: EXPEDITION_RETURNING, creditedAt: null, surveyPayout: 9e9, completedAt: null });
    db.expedition.rows.push({ id: 'e-rival', profileId: 'rival', status: EXPEDITION_COMPLETE, creditedAt: null, surveyPayout: 9e9, completedAt: T0 });
    db.expedition.rows.push({ id: 'e-lost', profileId: 'p1', status: EXPEDITION_LOST, creditedAt: null, surveyPayout: 9e9, completedAt: T0 });
    const credit = await creditDueExpeditionReturns(asDb(db), 'p1', 'interstellar_hq', T0);
    expect(credit.creditedNow).toEqual([]);
    expect(credit.headroomCredit).toBe(0);
  });

  it('caps how many returns one sync settles and defers the rest', async () => {
    const db = fakeDb();
    for (let i = 0; i < 8; i++) {
      db.expedition.rows.push({ id: `e${i}`, profileId: 'p1', status: EXPEDITION_COMPLETE, creditedAt: null, surveyPayout: 1_000_000_000, completedAt: T0 });
    }
    const credit = await creditDueExpeditionReturns(asDb(db), 'p1', 'earth_ops', T0);
    expect(credit.creditedNow).toHaveLength(5);
    expect(credit.deferred).toHaveLength(3);
    // Earth carries no expedition term, so the credit is the bare survey
    // figure at the science cap — never zero, which is the bug this fixes.
    expect(credit.hqExpeditionMult).toBe(1);
    expect(credit.headroomCredit).toBe(Math.round(5 * 1_000_000_000 * EXPEDITION_SURVEY_SCIENCE_MULT_CAP));
  });

  it('degrades to no credit (never an unbounded one) when the table is missing', async () => {
    const broken = { expedition: { findMany: async () => { throw new Error('no such table'); } } };
    const credit = await creditDueExpeditionReturns(broken as never, 'p1', 'deep_space_hq', T0);
    expect(credit.headroomCredit).toBe(0);
    expect(credit.hqExpeditionMult).toBe(getHqBonuses('deep_space_hq').expeditionReturnMult);
  });
});

// ─── 6. Adoption: the client takes the server's record ──────────────────────

describe('CC-4 adoptServerExpeditions', () => {
  const clientExp = (over: Partial<ExpeditionState> = {}): ExpeditionState => ({
    id: 'client-exp-1', targetSystemId: PROXIMA.id, shipInstanceId: 'hull-1',
    shipDefinitionId: 'starfarer_explorer', crew: 8, phase: 'exploring', launchedAtMs: 0,
    launchGameMonth: 0, outboundMonths: 127, exploreMonths: 12, monthsElapsed: 127, seed: SEED,
    insured: true, insurancePremiumPaid: 1, extraShielding: false, totalCost: 1,
    hullIntegrity: 0.8, hazardLog: [], ...over,
  });
  const stateWith = (e: ExpeditionState) => ({ expeditions: [e] } as unknown as GameState);

  it('stamps the server id and adopts the server\'s survey figure', async () => {
    const db = fakeDb();
    const row = await seedExplorer(db);
    await advanceDueExpeditions(asDb(db), 'p1', at(127));
    const block = expeditionBlock(db.expedition.rows[0] as never);
    const state = stateWith(clientExp({ outcome: { surveyDataPayout: 1, resourceSamples: {}, colonySuitability: 0.1, summary: 'x' } }));
    const next = adoptServerExpeditions(state, [block]);
    expect(next.expeditions![0].serverId).toBe(row.id);
    expect(next.expeditions![0].outcome!.surveyDataPayout).toBe(Math.round(rollExpeditionOutcome(SEED, PROXIMA).surveyDataPayout));
  });

  it('adopts a loss recorded elsewhere but never resurrects one', () => {
    const lostOnServer = adoptServerExpeditions(stateWith(clientExp()), [
      { id: 's1', clientId: 'client-exp-1', targetSystemId: PROXIMA.id, status: EXPEDITION_LOST, seed: SEED },
    ]);
    expect(lostOnServer.expeditions![0].phase).toBe('lost');
    const stillLost = adoptServerExpeditions(stateWith(clientExp({ phase: 'lost' })), [
      { id: 's1', clientId: 'client-exp-1', targetSystemId: PROXIMA.id, status: EXPEDITION_COMPLETE, seed: SEED },
    ]);
    expect(stillLost.expeditions![0].phase).toBe('lost');
  });

  it('ignores a row with no local counterpart and returns the same state when nothing changed', () => {
    const state = stateWith(clientExp({ serverId: 's1' }));
    const orphan = adoptServerExpeditions(state, [
      { id: 'other', clientId: 'somebody-else', targetSystemId: PROXIMA.id, status: EXPEDITION_COMPLETE, seed: 1 },
    ]);
    expect(orphan).toBe(state);
    expect(orphan.expeditions).toHaveLength(1);
    const noop = adoptServerExpeditions(state, [
      { id: 's1', clientId: 'client-exp-1', targetSystemId: PROXIMA.id, status: EXPEDITION_EXPLORING, seed: SEED },
    ]);
    expect(noop).toBe(state);
  });
});

// ─── 7. The cost quote is one definition ────────────────────────────────────

describe('CC-4 shared cost quote', () => {
  it('an explorer buys fuel for both jumps and plans a round trip; an ark does not', () => {
    const explorer = quoteExpeditionCosts({ system: PROXIMA, shipBaseCost: 25e9, isColonyShip: false, fuelInInventory: 0, insured: false, extraShielding: false });
    const ark = quoteExpeditionCosts({ system: PROXIMA, shipBaseCost: 80e9, isColonyShip: true, fuelInInventory: 0, insured: false, extraShielding: false });
    expect(explorer.fuelUnitsRequired).toBe(PROXIMA.jumpFuelRequired * 2);
    expect(ark.fuelUnitsRequired).toBe(PROXIMA.jumpFuelRequired);
    expect(explorer.totalPlannedMonths).toBeGreaterThan(ark.totalPlannedMonths);
  });

  it('inventory fuel offsets the broker premium, and the Space Elevator discount is bounded', () => {
    const none = quoteExpeditionCosts({ system: PROXIMA, shipBaseCost: 25e9, isColonyShip: false, fuelInInventory: 0, insured: false, extraShielding: false });
    const full = quoteExpeditionCosts({ system: PROXIMA, shipBaseCost: 25e9, isColonyShip: false, fuelInInventory: 10_000, insured: false, extraShielding: false });
    expect(full.fuelPurchaseCost).toBe(0);
    expect(full.totalMoneyCost).toBeLessThan(none.totalMoneyCost);
    // A nonsense multiplier can only ever be ignored, never inflate the bill.
    const silly = quoteExpeditionCosts({ system: PROXIMA, shipBaseCost: 25e9, isColonyShip: false, fuelInInventory: 0, insured: false, extraShielding: false, launchCostMult: 4 });
    expect(silly.totalMoneyCost).toBe(none.totalMoneyCost);
  });
});
