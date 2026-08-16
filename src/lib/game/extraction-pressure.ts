// ─── Space Tycoon: Deposit Depletion — Extraction Pressure (Economic PvP ────
// Wave E5, docs/ECONOMY_PVP_2026-08.md §2.4/§E5). Wires the previously
// display-only `getScarcityMultiplier` (economic-systems.ts) into a REAL,
// server-aggregated, per-(location, resource) mining-output brake:
//
//   extractionPressure(loc, res) ∈ [0.4, 1.0]
//
// Everyone mining the SAME deposit thins it for everyone — a genuine reason
// to expand outward rather than camp one rich rock (CLAUDE.md "scarcity is
// real"). This module is pure and client-safe (no prisma): the sync route's
// server aggregation, the deterministic client tick, and tests all share the
// exact same math — the same discipline demand-pools.ts and market-pressure.ts
// already established for this wave family.
//
// MECHANIC:
//   accumulated(loc,res) — a decaying "pressure score" fed by mined units
//   (weighted by resource rarity — a rare platinum vein depletes faster per
//   unit than a common iron seam). Stored server-side in LocationExtraction,
//   decayed 10%/day ("deposits recharge via new surveys" — canon flavor for
//   what is mechanically continuous exponential decay applied lazily at each
//   write, so no cron drift and no wasted cron slot).
//
//   pressure = MAX − (MAX − MIN) × saturate(accumulated / SATURATION_UNITS)
//
// Steady-state intuition (documented since there's no live playtest data
// yet): at accumulated = R units/day × sensitivity, decaying 10%/day, the
// steady-state accumulator is 10× the daily contribution. A single casual
// miner (e.g. ~0.3 platinum-equivalent pressure-units/day) steady-states
// around accumulated≈3 — negligible pressure. It takes real SERVER-WIDE
// concurrent extraction (dozens of active corporations working the same
// site) to approach the floor — exactly the "shared seam" dynamic the spec
// asks for, not a single-player mining-speed penalty.
//
// NPC FLOOR (§2.9 invariant, "NPC extraction... never push the index below
// 0.8 on its own"): satisfied by construction — there is no NPC mining tick
// in this codebase that feeds LocationExtraction (NPC companies trade
// through the shared order book at spot, they don't extract deposits), so
// the accumulator is 100% player-mining-sourced. If a future wave adds
// simulated NPC extraction, it MUST clamp its own contribution so the
// NPC-only steady-state pressure never drops the floor below 0.8 — tested
// below as a standing invariant on the default (zero-accumulated) case.

import { RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';

export const EXTRACTION_PRESSURE_MIN = 0.4;
export const EXTRACTION_PRESSURE_MAX = 1.0;

/** Accumulated pressure-units at which output bottoms out at the floor. */
export const EXTRACTION_SATURATION_UNITS = 300;

/** Daily decay factor — deposits "recharge" 10%/day via new surveys. */
export const EXTRACTION_DECAY_PER_DAY = 0.9;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Per-category rarity weight: rarer resources deplete their LOCAL deposit
 *  faster per unit mined than bulk commodities (§2.4 "richer deposits
 *  scarce/contested"). Categories that are never MINED_ONLY raw output
 *  (refined/component/product) never reach this — MINING_PRODUCTION only
 *  emits raw resource ids. */
const CATEGORY_SENSITIVITY: Record<string, number> = {
  precious: 1.0,       // platinum_group, gold
  exotic: 1.2,          // exotic_materials, helium3, deuterium, bio_samples, antimatter_precursors
  rare_earth: 0.9,       // rare_earth
  energy: 0.6,           // solar_concentrate
  hydrocarbon: 0.5,       // methane, ethane
  water: 0.4,             // lunar_water, mars_water
  industrial: 0.4,        // ammonia, sulfur, organic_compounds
  metal: 0.25,            // iron, aluminum, titanium
};

const DEFAULT_SENSITIVITY = 0.3;

/** Rarity weight for a mined resource — higher = its local deposit thins
 *  faster per unit extracted. */
export function getExtractionSensitivity(resourceId: string): number {
  const cat = RESOURCE_MAP.get(resourceId as ResourceId)?.category;
  if (!cat) return DEFAULT_SENSITIVITY;
  return CATEGORY_SENSITIVITY[cat] ?? DEFAULT_SENSITIVITY;
}

/** Canonical (location, resource) key — matches the demand-pools key style. */
export function extractionKey(locationId: string, resourceId: string): string {
  return `${locationId}:${resourceId}`;
}

/** Decay an accumulated pressure score by elapsed real time (10%/day,
 *  continuous — no cron drift). Pure. */
export function decayAccumulated(accumulated: number, elapsedMs: number): number {
  if (!Number.isFinite(accumulated) || accumulated <= 0) return 0;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return accumulated;
  const days = elapsedMs / DAY_MS;
  return accumulated * Math.pow(EXTRACTION_DECAY_PER_DAY, days);
}

/** Deposit extraction-pressure multiplier from an accumulated score.
 *  1.0 = untouched deposit; 0.4 = heavily strip-mined floor. Mining output
 *  at a (location, resource) multiplies by this. */
export function computeExtractionPressure(accumulated: number): number {
  const a = Math.max(0, accumulated);
  const saturation = Math.min(1, a / EXTRACTION_SATURATION_UNITS);
  const pressure = EXTRACTION_PRESSURE_MAX - (EXTRACTION_PRESSURE_MAX - EXTRACTION_PRESSURE_MIN) * saturation;
  return Math.max(EXTRACTION_PRESSURE_MIN, Math.min(EXTRACTION_PRESSURE_MAX, pressure));
}

/** Apply a fresh mining event to a (decayed) accumulator. Pure — the caller
 *  (server route) supplies the previous accumulated value + its timestamp;
 *  this decays it to `nowMs` first, then adds the new pressure contribution. */
export function applyExtractionEvent(
  prevAccumulated: number,
  prevUpdatedAtMs: number,
  minedUnits: number,
  resourceId: string,
  nowMs: number,
): { accumulated: number; updatedAtMs: number } {
  const decayed = decayAccumulated(prevAccumulated, Math.max(0, nowMs - prevUpdatedAtMs));
  const contribution = Math.max(0, minedUnits) * getExtractionSensitivity(resourceId);
  return { accumulated: decayed + contribution, updatedAtMs: nowMs };
}

/** Read-time decay (no new mining, just time passing since last write) —
 *  used when SERVING a snapshot to a client, so a long-idle deposit reads as
 *  "recharged" without requiring a wasted write. */
export function readAccumulated(storedAccumulated: number, storedUpdatedAtMs: number, nowMs: number): number {
  return decayAccumulated(storedAccumulated, Math.max(0, nowMs - storedUpdatedAtMs));
}

// ─── UI grade labels (mining panel / Situation Log) ─────────────────────────

export interface DepositGrade {
  label: string;
  tier: 'abundant' | 'healthy' | 'strained' | 'thinning' | 'critical';
  accent: 'green' | 'cyan' | 'amber' | 'orange' | 'red';
}

/** Human-readable grade for a pressure multiplier, evenly spanning
 *  [MIN, MAX]. Colorblind-safe: every tier also carries a distinct text
 *  label, never color alone. */
export function getDepositGrade(pressure: number): DepositGrade {
  if (pressure >= 0.94) return { label: 'Abundant', tier: 'abundant', accent: 'green' };
  if (pressure >= 0.8) return { label: 'Healthy', tier: 'healthy', accent: 'cyan' };
  if (pressure >= 0.65) return { label: 'Strained', tier: 'strained', accent: 'amber' };
  if (pressure >= 0.5) return { label: 'Thinning', tier: 'thinning', accent: 'orange' };
  return { label: 'Critical', tier: 'critical', accent: 'red' };
}

// ─── Sync-down snapshot shape (delivered like demandPools) ─────────────────

export interface ExtractionPressureEntry {
  locationId: string;
  resourceId: string;
  /** Clamped [0.4, 1.0] mining-output multiplier. */
  pressure: number;
}

export interface ExtractionPressureSnapshot {
  entries: Record<string, ExtractionPressureEntry>;
  asOf: number;
}

/** Snapshot older than this degrades to neutral (1.0) pressure — offline
 *  players never get penalized by a stale read; the next sync refreshes it. */
export const EXTRACTION_PRESSURE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** Read the pressure multiplier for a (location, resource) from a snapshot,
 *  defaulting to 1.0 (untouched) when absent or stale — the deterministic
 *  client fallback (mirrors demand-pools' "own activity only" posture: an
 *  unsynced player never sees cross-player depletion). */
export function getExtractionPressureMultiplier(
  snapshot: ExtractionPressureSnapshot | null | undefined,
  locationId: string,
  resourceId: string,
  nowMs: number = Date.now(),
): number {
  if (!snapshot || !snapshot.entries) return 1.0;
  if (nowMs - snapshot.asOf > EXTRACTION_PRESSURE_STALE_MS) return 1.0;
  const entry = snapshot.entries[extractionKey(locationId, resourceId)];
  if (!entry) return 1.0;
  return Math.max(EXTRACTION_PRESSURE_MIN, Math.min(EXTRACTION_PRESSURE_MAX, entry.pressure));
}
