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
import { WORKER_TYPES, WORKER_MAP } from './workforce';
import { BUILDING_MAP, getBuildingDerivedStats } from './buildings';

export const WAGE_INDEX_MIN = 0.8;
export const WAGE_INDEX_MAX = 1.6;
export const WAGE_INDEX_NEUTRAL = 1.0;

/** Global (server-wide) headcount slots per crew type before any housing is
 *  built. Sized so a small/early population (dozens of active corporations,
 *  each running a handful of crew) sits comfortably below saturation — wages
 *  only climb once a real hiring boom is underway. */
export const LABOR_SUPPLY_BASE: Record<WorkerType, number> = {
  engineer: 600, scientist: 500, miner: 700, operator: 550,
  pilot: 400, negotiator: 300, security: 400, medic: 350,
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
 *  defaulting to neutral 1.0 — the deterministic client fallback. */
export function getWageIndex(
  snapshot: { index: LaborMarketSnapshot; asOf: number } | null | undefined,
  type: WorkerType,
  nowMs: number = Date.now(),
): number {
  if (!snapshot || !snapshot.index) return WAGE_INDEX_NEUTRAL;
  if (nowMs - snapshot.asOf > LABOR_MARKET_STALE_MS) return WAGE_INDEX_NEUTRAL;
  const v = snapshot.index[type];
  if (typeof v !== 'number' || !Number.isFinite(v)) return WAGE_INDEX_NEUTRAL;
  return Math.max(WAGE_INDEX_MIN, Math.min(WAGE_INDEX_MAX, v));
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
