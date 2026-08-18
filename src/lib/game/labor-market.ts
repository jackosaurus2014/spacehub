// ─── Space Tycoon: Labor Market — a real wage index (Economic PvP Wave E5, ──
// docs/ECONOMY_PVP_2026-08.md §2.6/§E5). Today workforce.ts's WORKER_TYPES
// salaries are constants — hiring 5,000 engineers server-wide costs the same
// per head as hiring 5. This module replaces that with a server-shared,
// per-crew-type wage index:
//
//   wageIndex(type) = clamp(0.8, 1.6, employed(type) / laborSupply(type))
//
//   employed(type)   — total headcount of that crew type across every
//                       recently-synced profile (server-aggregated, same
//                       "sum across synced profiles" posture as demand-pools'
//                       dDerived).
//   laborSupply(type) — LABOR_SUPPLY_BASE[type] + crewQuartersServerWide ×
//                       LABOR_SUPPLY_PER_QUARTERS. Building housing literally
//                       grows the labor force server-wide — a cooperative-
//                       competitive infrastructure play (§2.6 verbatim).
//
// Salary = base salary × wageIndex. Everyone mass-hiring the same crew type
// raises pay for everyone — expansion booms have real wage pressure, exactly
// the "scaling recurring sink keyed to expansion" class BALANCE.md asks for
// (§E5 [BAL]).
//
// MITIGATION (BALANCE.md requires real counterplay for every scaling sink):
// a profile's OWN trainingLevel discounts that profile's contribution to the
// GLOBAL employed-headcount pressure by up to 30% — a well-trained crew
// needs fewer bodies to do the same work, so it leans less on the shared
// labor pool. Cheap, real, and doesn't touch the shared pool's fairness (it
// only ever reduces pressure, never inflates another player's).
//
// BOUNDARY: server-shared (weekly job → LaborIndex rows, delivered through
// the sync/server-effects hand-off exactly like alliance bonuses and demand
// pools) — never computed cross-player on the deterministic client tick.
// Session-design fit (SESSION_DESIGN.md): wage index is explicitly a WEEKLY
// loop item (§7), not daily — the cron/job cadence below matches.

import type { WorkerType, WorkforceState } from './workforce';
import { WORKER_TYPES, WORKER_MAP, getHireCost } from './workforce';
import { BUILDING_MAP, getBuildingDerivedStats } from './buildings';
import { isInFrontier } from './frontier';
import type { GameState } from './types';

export const WAGE_INDEX_MIN = 0.8;
export const WAGE_INDEX_MAX = 1.6;
export const WAGE_INDEX_NEUTRAL = 1.0;

/** Global (server-wide) headcount slots per crew type before any housing is
 *  built.
 *
 *  Balance Pass 9 (docs/BALANCE.md "Pass 9", implementing Pass 8's H2
 *  prescription — sim-validated, `npx tsx scripts/sim-tools.ts`): the
 *  original bases (600/500/700/550/400/300/400/350) kept the wage index
 *  pinned at the 0.80 floor for 96 straight game-months at BOTH tested eras
 *  (26-36 corps employing 244-353 engineers) — the labor market was dead
 *  content at any realistic population. ÷4 (the Pass-8 recommended center of
 *  the ÷3-÷5 passing band, keyed to a 15-30-corp relaunch expectation)
 *  brings it alive: the index leaves the floor at 15 corps, crosses neutral
 *  at 18, and pins 1.6 only at 29+. LABOR_SUPPLY_PER_QUARTERS is
 *  deliberately NOT divided — housing counterplay is relatively 4× stronger,
 *  the intended cooperative loop. REQUIRED PAIRING (shipped together): the
 *  Frontier payroll shield below (getPayrollWageIndex) — with ÷4 a
 *  relaunch-week hiring boom genuinely reaches 1.3-1.6, and Frontier corps
 *  must not pay it. */
export const LABOR_SUPPLY_BASE: Record<WorkerType, number> = {
  engineer: 150, scientist: 125, miner: 175, operator: 138,
  pilot: 100, negotiator: 75, security: 100, medic: 88,
};

/** Additional labor-supply slots per crewQuarters unit built server-wide
 *  (summed across every completed, crew-housing-bearing building on every
 *  synced profile). Housing is generic — it grows supply for every crew
 *  type equally (a berth doesn't care what its occupant does for a living). */
export const LABOR_SUPPLY_PER_QUARTERS = 2;

/** Training mitigation cap — a profile's OWN trainingLevel can discount up to
 *  this fraction of ITS headcount's contribution to global wage pressure. */
export const TRAINING_HEADCOUNT_MITIGATION_CAP = 0.3;

export function laborSupply(type: WorkerType, crewQuartersServerWide: number): number {
  return LABOR_SUPPLY_BASE[type] + Math.max(0, crewQuartersServerWide) * LABOR_SUPPLY_PER_QUARTERS;
}

/** The wage-index formula itself — pure, reused by the weekly job, the
 *  deterministic client fallback, and tests. */
export function computeWageIndex(employed: number, supply: number): number {
  if (supply <= 0) return WAGE_INDEX_MAX;
  const ratio = Math.max(0, employed) / supply;
  return Math.max(WAGE_INDEX_MIN, Math.min(WAGE_INDEX_MAX, ratio));
}

// ─── Server aggregation (the weekly job's pure core) ────────────────────────

export interface LaborActivitySummary {
  id: string;
  /** Headcount per crew type (workforce.ts's `${type}s` fields, already
   *  destructured to bare WorkerType keys by the caller). */
  headcount: Partial<Record<WorkerType, number>>;
  /** This profile's crew trainingLevel (0-1), for the mitigation above. */
  trainingLevel?: number;
  /** Sum of getBuildingDerivedStats(def).crewQuarters across this profile's
   *  COMPLETED buildings. */
  crewQuarters: number;
}

export interface LaborAggregate {
  type: WorkerType;
  /** Raw (unmitigated) headcount across all summaries — the honest
   *  "how many of this type are employed server-wide" figure shown in UI. */
  employedRaw: number;
  /** Training-mitigated headcount — the figure the wage index is actually
   *  computed from. */
  employedEffective: number;
  supply: number;
  index: number;
}

/**
 * Aggregate every profile's workforce + crew housing into one wage index per
 * crew type. Pure and deterministic — same summaries in, same aggregates out
 * (tested). The weekly cron feeds real GameProfile rows; tests feed fixtures.
 */
export function computeLaborAggregates(summaries: LaborActivitySummary[]): Map<WorkerType, LaborAggregate> {
  let crewQuartersServerWide = 0;
  const rawByType = new Map<WorkerType, number>();
  const effectiveByType = new Map<WorkerType, number>();

  for (const s of summaries) {
    crewQuartersServerWide += Math.max(0, s.crewQuarters || 0);
    const training = Math.max(0, Math.min(1, s.trainingLevel ?? 0.5));
    const mitigation = training * TRAINING_HEADCOUNT_MITIGATION_CAP;
    for (const wDef of WORKER_TYPES) {
      const n = Math.max(0, s.headcount[wDef.type] || 0);
      if (n === 0) continue;
      rawByType.set(wDef.type, (rawByType.get(wDef.type) || 0) + n);
      effectiveByType.set(wDef.type, (effectiveByType.get(wDef.type) || 0) + n * (1 - mitigation));
    }
  }

  const out = new Map<WorkerType, LaborAggregate>();
  for (const wDef of WORKER_TYPES) {
    const supply = laborSupply(wDef.type, crewQuartersServerWide);
    const employedEffective = effectiveByType.get(wDef.type) || 0;
    out.set(wDef.type, {
      type: wDef.type,
      employedRaw: rawByType.get(wDef.type) || 0,
      employedEffective,
      supply,
      index: computeWageIndex(employedEffective, supply),
    });
  }
  return out;
}

/** Read a synced-profile's raw workforceData JSON into the bare
 *  WorkerType->count map computeLaborAggregates expects. Mirrors
 *  workforce.ts's `${type}s` field convention (including the 'security' ->
 *  'securitys' irregular pluralization). Shared by the weekly job and
 *  tests so the mapping is exercised exactly once. */
export function workforceDataToHeadcount(
  workforceData: Record<string, unknown> | null | undefined,
): Partial<Record<WorkerType, number>> {
  const out: Partial<Record<WorkerType, number>> = {};
  if (!workforceData) return out;
  for (const wDef of WORKER_TYPES) {
    const key = `${wDef.type}s`;
    const v = workforceData[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[wDef.type] = v;
  }
  return out;
}

/** Sum getBuildingDerivedStats(def).crewQuarters across a profile's completed
 *  buildings — shared by the weekly job (reading synced buildingsData) and
 *  tests. */
export function sumCrewQuarters(buildings: { definitionId: string; isComplete?: boolean }[]): number {
  let total = 0;
  for (const b of buildings) {
    if (b.isComplete === false) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    if (!def) continue;
    total += getBuildingDerivedStats(def).crewQuarters || 0;
  }
  return total;
}

// ─── The sync-down snapshot (delivered like demandPools / allianceBonuses) ──

export type LaborMarketSnapshot = Partial<Record<WorkerType, number>>; // type -> wageIndex

/** Snapshot older than this degrades to neutral (1.0) wages — offline
 *  players never get penalized by a stale read. */
export const LABOR_MARKET_STALE_MS = 14 * 24 * 60 * 60 * 1000; // weekly job, generous staleness window

/** Read a crew type's wage index from a (possibly stale/absent) snapshot,
 *  defaulting to neutral 1.0 — the deterministic client fallback.
 *
 *  Wave M4 (docs/MEANINGFUL_2026-08.md §M4, "1.4's soft spot"): a STALE
 *  snapshot used to collapse straight to neutral (1.0) regardless of what
 *  the last known index actually was — a mild sink-evasion for offline
 *  players (a wage boom that pinned at 1.6 was invisible to anyone who
 *  hadn't synced in 14 days, so their payroll silently got cheaper than the
 *  live market). It now degrades to the LAST KNOWN index, floored at neutral
 *  (1.0) — never a below-market discount from staleness alone, but a real
 *  boom is still felt instead of being erased. */
export function getWageIndex(
  snapshot: { index: LaborMarketSnapshot; asOf: number } | null | undefined,
  type: WorkerType,
  nowMs: number = Date.now(),
): number {
  if (!snapshot || !snapshot.index) return WAGE_INDEX_NEUTRAL;
  const v = snapshot.index[type];
  if (typeof v !== 'number' || !Number.isFinite(v)) return WAGE_INDEX_NEUTRAL;
  const clamped = Math.max(WAGE_INDEX_MIN, Math.min(WAGE_INDEX_MAX, v));
  if (nowMs - snapshot.asOf > LABOR_MARKET_STALE_MS) {
    return Math.max(WAGE_INDEX_NEUTRAL, clamped);
  }
  return clamped;
}

/** Belt Miners' Guild wage-strike threshold (§2.6 lore surface: "issues
 *  demands/strike events when the miner wage index pins at 1.6"). Exported
 *  so both the Situation Log and any future narrative-event hook share one
 *  threshold. */
export const GUILD_STRIKE_WAGE_THRESHOLD = 1.6;

// ─── Payroll integration (kept HERE, not in workforce.ts, to avoid a
// workforce.ts <-> labor-market.ts import cycle — this module already
// depends on workforce.ts for WORKER_TYPES/WorkforceState, so the dependency
// only runs one direction). Salary = base × wageIndex(type), replacing the
// flat-constant salary §2.6 identifies as the defect. ────────────────────

/** Monthly payroll with the wage index applied per crew type. Falls back to
 *  workforce.ts's plain getMonthlyPayroll behavior (index 1.0 for every
 *  type) when no snapshot is supplied — pre-E5 behavior exactly. */
export function getMonthlyPayrollWithWageIndex(
  workforce: WorkforceState,
  snapshot: { index: LaborMarketSnapshot; asOf: number } | null | undefined,
  nowMs: number = Date.now(),
): number {
  let total = 0;
  for (const wDef of WORKER_TYPES) {
    const count = (workforce[`${wDef.type}s` as keyof WorkforceState] as number | undefined) || 0;
    if (count === 0) continue;
    const index = getWageIndex(snapshot, wDef.type, nowMs);
    total += count * wDef.salary * index;
  }
  return Math.round(total);
}

/** Re-export so callers only need one import for "salary of this type at
 *  today's wage index" (used by hiring-cost UI / WorkforcePanel). */
export function getWageAdjustedSalary(
  type: WorkerType,
  snapshot: { index: LaborMarketSnapshot; asOf: number } | null | undefined,
  nowMs: number = Date.now(),
): number {
  const def = WORKER_MAP.get(type);
  if (!def) return 0;
  return Math.round(def.salary * getWageIndex(snapshot, type, nowMs));
}

// ─── Balance Pass 4: wage-indexed hiring (docs/BALANCE.md "Pass 4") ─────────
// Pass 3's S8 poaching audit found O4 (talent poaching) was dead content:
// getHireCost charged 6 months' BASE salary with no wage-index term while
// retention costs 0.75 × bonus × index — so rehiring replacement crew
// strictly dominated retention at every index level, and a poach attacker
// always overpaid relative to the victim's replacement cost. Fix (Pass 3
// proposal, verbatim numbers): hire cost = getHireCost × wageIndex. This
// also closes the E5 inconsistency where SALARIES tracked the shared labor
// market but the signing bonus ignored it.
//
// FRONTIER SHIELD (premiums-pay-penalties-wait, matching the other shields:
// service-pricing.ts floors the pool mult at 1, mining's frontierSpotFloor
// floors spot at base): for a COST the analogous posture is a CAP at
// neutral — a Frontier corp never pays an overheated index (>1.0) but still
// enjoys a slack labor market (<1.0). The shield ends at graduation.

/** The wage index actually applied to HIRING for this save: the live
 *  snapshot index, capped at neutral (1.0) while in the Protected Frontier. */
export function getHireWageIndex(
  state: GameState,
  type: WorkerType,
  nowMs: number = Date.now(),
): number {
  const idx = getWageIndex(state.laborMarket, type, nowMs);
  return isInFrontier(state, nowMs) ? Math.min(WAGE_INDEX_NEUTRAL, idx) : idx;
}

/** The REAL charged hire cost: workforce.ts's getHireCost (6-month signing
 *  bonus, espionage headhunt voucher applied) × the hire wage index above.
 *  Every UI surface that displays a hire price and every handler that
 *  charges one must use THIS — never raw getHireCost — so the shown and
 *  charged numbers can't diverge. Lives here (not workforce.ts) because
 *  labor-market already depends on workforce; the reverse import would
 *  cycle. */
export function getHireCostWithWageIndex(
  state: GameState,
  type: WorkerType,
  nowMs: number = Date.now(),
): number {
  return Math.round(getHireCost(type, state, nowMs) * getHireWageIndex(state, type, nowMs));
}

// ─── Balance Pass 9: Frontier PAYROLL shield (docs/BALANCE.md "Pass 9") ─────
// Pass 8's H2 prescription ships LABOR_SUPPLY_BASE ÷4 (above), which makes
// relaunch-week wage indexes of 1.3-1.6 genuinely reachable — so the Pass-4
// hire-cost shield posture is REQUIRED on payroll too (Pass-4 follow-up #3,
// closed here): while in the Protected Frontier, salaries pay
// min(wageIndex, 1.0) per crew type — a slack labor market (<1.0) still
// discounts, an overheated one (>1.0) waits for graduation. Mirrors
// getHireWageIndex exactly ("premiums pay, penalties wait"). Every REAL
// payroll surface — live tick (game-engine.ts §0), away catch-up
// (away-operations.ts), and every UI payroll/salary display — must route
// through these state-aware functions so shown and charged never diverge.

/** The wage index PAYROLL actually pays for this save: the live snapshot
 *  index, capped at neutral (1.0) while in the Protected Frontier. */
export function getPayrollWageIndex(
  state: GameState,
  type: WorkerType,
  nowMs: number = Date.now(),
): number {
  const idx = getWageIndex(state.laborMarket, type, nowMs);
  return isInFrontier(state, nowMs) ? Math.min(WAGE_INDEX_NEUTRAL, idx) : idx;
}

/** Monthly payroll at the Frontier-shielded payroll wage index — the REAL
 *  charged figure. Identical to getMonthlyPayrollWithWageIndex for any
 *  graduated/veteran save (the shield only ever caps >1.0 indexes for
 *  Frontier-active saves). `workforce` is passed explicitly (not read off
 *  state) because the tick paths carry a locally-normalized WorkforceState. */
export function getMonthlyPayrollForState(
  workforce: WorkforceState,
  state: GameState,
  nowMs: number = Date.now(),
): number {
  let total = 0;
  for (const wDef of WORKER_TYPES) {
    const count = (workforce[`${wDef.type}s` as keyof WorkforceState] as number | undefined) || 0;
    if (count === 0) continue;
    total += count * wDef.salary * getPayrollWageIndex(state, wDef.type, nowMs);
  }
  return Math.round(total);
}

/** Per-head monthly salary at the Frontier-shielded payroll index — the
 *  display counterpart of getMonthlyPayrollForState (WorkforcePanel salary
 *  rows must show what payroll actually charges). */
export function getPayrollAdjustedSalary(
  state: GameState,
  type: WorkerType,
  nowMs: number = Date.now(),
): number {
  const def = WORKER_MAP.get(type);
  if (!def) return 0;
  return Math.round(def.salary * getPayrollWageIndex(state, type, nowMs));
}
