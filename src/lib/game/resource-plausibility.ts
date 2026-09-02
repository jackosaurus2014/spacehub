// ─── Space Tycoon: per-resource plausibility clamp (server side) ─────────────
// docs/SECURITY_AUDIT_2026-08.md P1 / docs/SECURITY_AUDIT_2026-09.md
// "Server-authoritative inventory — phase 1".
//
// The sync route persists `GameProfile.resources` from the request body. The
// money figure has had an upward-only plausibility ceiling since Wave E1
// (`clampPlausibleMoney`, ledger-reconcile.ts); resources had nothing, so a
// forged `{"resources":{"antimatter_precursors":10}}` was believed and every
// server route that "verifies holdings" (contract claims, order-book sells,
// bounty fills) verified a client-authored number.
//
// This module is the resource half of that stopgap. It bounds how much of
// each resource the client could plausibly have ACCUMULATED since the
// profile's last sync:
//
//   ceiling_r = prev_r
//             + max(0, ledgerDelta_r)                      (server-granted)
//             + RESOURCE_SLACK × prodMax_r × elapsedMonths (client-simulated)
//             + max(FLAT_FLOOR_MIN, FLAT_FLOOR_FRACTION × prev_r)
//
// where prodMax_r is the engine's own per-month production for this profile
// (`computeResourceFlows`, the same lens the ResourceBar shows) evaluated
// with every server-known term at its real value and every CLIENT-ONLY
// multiplier at its documented maximum (see MAX_* below). Downward movement
// (spending, hazards, contract deliveries) is never restricted — the clamp
// is upward-only, exactly like the money clamp.
//
// It is NOT the full server-authoritative inventory program: it makes the
// forged-inventory class expensive and detectable, and it makes an honest
// `prev + production` claim pass every time. Buildings, ships and research
// remain client-reported (phase 2).
//
// Pure: no DB, no DOM. Unit-tested in __tests__/resource-plausibility.test.ts.

import type { GameState } from './types';
import { computeResourceFlows, type FlowKind } from './resource-flow';
import { TICK_INTERVALS, TICKS_PER_GAME_MONTH } from './constants';
import { MIN_PLAUSIBILITY_ELAPSED_MS, MAX_PLAUSIBILITY_ELAPSED_MS } from './ledger-reconcile';
import { MEGASTRUCTURES } from './personal-megastructures';
import { SHIP_MAP, getShipDerivedStats } from './ships';
import { MINING_LASER_RATE_BONUS } from './modules';

// ─── Tunables ────────────────────────────────────────────────────────────────

/** Multiplier on the engine's theoretical-max monthly production. Generous on
 *  purpose: the ceiling must never clip an honest player whose client ran
 *  faster than our wall-clock estimate (tab throttling catch-up, offline
 *  progress, a burst of ticks after a laptop wakes). */
export const RESOURCE_SLACK = 3;
/** Absolute per-resource allowance per sync regardless of production, so
 *  one-off transfers the flow lens does not model (contract deliveries,
 *  refining jobs, survey discoveries, freight arrivals — see
 *  resource-flow.ts OMITTED_CONTRIBUTIONS) do not false-positive. */
export const FLAT_FLOOR_MIN = 100;
/** Proportional part of the same allowance (25% of the previous stock). */
export const FLAT_FLOOR_FRACTION = 0.25;

/** Wall-clock milliseconds per game month at 1× speed — derived from the
 *  engine constants (30 ticks × 2 000 ms = 60 000 ms), never hardcoded. */
export const GAME_MONTH_WALL_MS = TICKS_PER_GAME_MONTH * TICK_INTERVALS[1];

/** Elapsed-time clamp, shared with the money clamp: 5 s floor (rapid
 *  re-syncs) and 30-day cap (a dormant profile does not accrue a month of
 *  headroom per month away — offline progress is itself capped client-side). */
export const MIN_ELAPSED_MS = MIN_PLAUSIBILITY_ELAPSED_MS;
export const MAX_ELAPSED_MS = MAX_PLAUSIBILITY_ELAPSED_MS;

// ─── Client-only multiplier caps ─────────────────────────────────────────────
// `computeResourceFlows` reproduces the tick's multiplier chains
// (resource-flow.ts:98-160). The server can evaluate the terms that come from
// definitions or from server-delivered snapshots, but the rest live only in
// client GameState (workforce, legacy, eras, tier, personal megastructures,
// reputation, commanders, specialization, victories, boosts, survey probes,
// fitted modules). We build the server-side state with those at NEUTRAL and
// multiply the result by the product of their documented maxima below. Each
// value cites the cap in the source it comes from.

/** workforce.ts:172 / programs.ts:620 — `miningOutput` capped at +100%. */
export const MAX_WORKFORCE_MINING_MULT = 2.0;
/** research-tree.ts:950 — `miningOutputBonus` capped at +100%. */
export const MAX_RESEARCH_MINING_MULT = 2.0;
/** legacy-system.ts:553 — `miningOutput: 3.0` "Max 300% -> 4x mining". */
export const MAX_LEGACY_MINING_MULT = 4.0;
/** corporate-eras.ts:144 — one active era; largest mining term is +15%. */
export const MAX_ERA_MINING_MULT = 1.15;
/** corporation-tiers.ts:170 — top tier `miningBonus: 0.25`. */
export const MAX_TIER_MINING_MULT = 1.25;
/** reputation.ts:126 — top standing `miningMultiplier: 1.30`. */
export const MAX_REPUTATION_MINING_MULT = 1.30;
/** commanders.ts: logistician class bonuses stack with diminishing
 *  `stackingContribution` and traits are clamped at TRAIT_BONUS_CAP (0.15);
 *  there is no single documented cap on the class sum, so 2.0 is an ASSUMED
 *  bound (a full logistician roster at max level is well under it). */
export const MAX_COMMANDER_MINING_MULT = 2.0;
/** resource-flow.ts waveBMiningMultiplier — spec/victory/alliance/mentorship/
 *  coop-mega/boost sub-product is capped at 2.0 by the engine itself. */
export const MAX_WAVE_B_MINING_MULT = 2.0;
/** exploration.ts — largest survey-probe `bonusPct` is 35 (per location ×
 *  resource, one probe bonus at a time in the flow lens' sum is the
 *  common case; stacked probes are covered by RESOURCE_SLACK). */
export const MAX_SURVEY_PROBE_MULT = 1.35;
/** specializations.ts:111-183 — `mining_output` tiers sum to +55%
 *  (0.10 + 0.15 + 0.20 + 0.10). Ships apply this OUTSIDE the wave-B cap. */
export const MAX_SPECIALIZATION_MINING_MULT = 1.55;
/** victory-conditions.ts:186 — the only mining victory reward is ×1.05. */
export const MAX_VICTORY_MINING_MULT = 1.05;
/** server-effects.ts:284 — ALLIANCE_MINING_BONUS_CAP 0.50. */
export const MAX_ALLIANCE_MINING_MULT = 1.5;

/** personal-megastructures.ts — miningMultiplier terms MULTIPLY across
 *  owned megastructures (combineBonuses), so the cap is the product of each
 *  definition's largest term. Derived from the definitions at load. */
export const MAX_MEGASTRUCTURE_MINING_MULT: number = MEGASTRUCTURES.reduce((prod, def) => {
  let best = 1;
  for (const ph of def.phases || []) {
    best = Math.max(best, ph.interimBonuses?.miningMultiplier || 1);
  }
  best = Math.max(best, def.completionBonus?.miningMultiplier || 1);
  return prod * best;
}, 1);

/** personal-megastructures.ts — passive resources/month ADD across owned
 *  megastructures. Per resource: sum over definitions of that definition's
 *  largest passive figure (a player may own one of each). Megastructures are
 *  client-only state (not synced), so this is an allowance, not a measurement. */
export const MEGASTRUCTURE_PASSIVE_CEILING: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const def of MEGASTRUCTURES) {
    const perDef: Record<string, number> = {};
    const take = (map?: Partial<Record<string, number>>) => {
      for (const [res, amt] of Object.entries(map || {})) {
        if (typeof amt === 'number' && amt > 0) perDef[res] = Math.max(perDef[res] || 0, amt);
      }
    };
    for (const ph of def.phases || []) take(ph.interimBonuses?.passiveResources);
    take(def.completionBonus?.passiveResources);
    for (const [res, amt] of Object.entries(perDef)) out[res] = (out[res] || 0) + amt;
  }
  return out;
})();

/** modules.ts:198 — each fitted mining laser adds +30%; the slot count is
 *  bounded by the largest `moduleSlots` of any hull (a DERIVED stat —
 *  ships.ts getShipDerivedStats — not a definition field). Derived at load. */
export const MAX_SHIP_MODULE_MINING_MULT: number = (() => {
  let slots = 0;
  for (const def of Array.from(SHIP_MAP.values())) {
    let s = 0;
    try { s = getShipDerivedStats(def).moduleSlots; } catch { s = 0; }
    if (typeof s === 'number' && Number.isFinite(s) && s > slots) slots = s;
  }
  return 1 + MINING_LASER_RATE_BONUS * slots;
})();

/** Product of every client-only term in `buildingMiningMultiplier` plus the
 *  per-(location, resource) survey-probe term. */
export const MAX_BUILDING_MINING_CLIENT_MULT =
  MAX_WORKFORCE_MINING_MULT
  * MAX_RESEARCH_MINING_MULT
  * MAX_LEGACY_MINING_MULT
  * MAX_ERA_MINING_MULT
  * MAX_TIER_MINING_MULT
  * MAX_MEGASTRUCTURE_MINING_MULT
  * MAX_REPUTATION_MINING_MULT
  * MAX_COMMANDER_MINING_MULT
  * MAX_WAVE_B_MINING_MULT
  * MAX_SURVEY_PROBE_MULT;

/** Product of every client-only term in `shipMiningMultiplier` plus fitted
 *  mining-laser modules. Location multiplier, hull damage and extraction
 *  pressure are evaluated for real from the ship rows / server snapshot. */
export const MAX_SHIP_MINING_CLIENT_MULT =
  MAX_WORKFORCE_MINING_MULT
  * MAX_LEGACY_MINING_MULT
  * MAX_TIER_MINING_MULT
  * MAX_SPECIALIZATION_MINING_MULT
  * MAX_VICTORY_MINING_MULT
  * MAX_ALLIANCE_MINING_MULT
  * MAX_SHIP_MODULE_MINING_MULT;

/** Industry output is `base × phaseIn × efficiency` with both factors ≤ 1 —
 *  no client-only multiplier; the neutral state already yields the maximum. */
export const MAX_PRODUCTION_CLIENT_MULT = 1.0;

const CLIENT_MULT_BY_KIND: Partial<Record<FlowKind, number>> = {
  mining: MAX_BUILDING_MINING_CLIENT_MULT,
  ship_mining: MAX_SHIP_MINING_CLIENT_MULT,
  production: MAX_PRODUCTION_CLIENT_MULT,
  // megastructure passive output is client-only state; handled via
  // MEGASTRUCTURE_PASSIVE_CEILING instead of the flow lens.
  megastructure: 0,
};

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface ResourceCeilingInputs {
  /** `GameProfile.resources` as last written by the server. */
  prevResources: Record<string, number> | null | undefined;
  prevBuildingsData: unknown;
  prevShipsData: unknown;
  prevActiveServices: unknown;
  prevResearch: string[] | null | undefined;
  /** `GameProfile.workforceData` (client workforce + server stash keys). Not
   *  used for multipliers — the workforce term is capped, not measured — but
   *  accepted so a later phase can tighten without changing the signature. */
  prevWorkforce?: unknown;
  /** Net pending ledger deltas (seq > client ack) by resource slug, signed. */
  ledgerDeltas: Record<string, number> | null | undefined;
  /** Wall-clock ms since the profile's last sync. */
  elapsedMs: number;
  /** Optional live prices; reserved for a later value-weighted floor. */
  marketPrices?: Record<string, number> | null;
  /** Server world-month index for the consumption phase-in; optional. */
  monthIndex?: number;
}

export interface ResourceCeilingReport {
  ceilings: Record<string, number>;
  /** Theoretical-max production per game month by resource (post caps). */
  prodPerMonth: Record<string, number>;
  elapsedMonths: number;
}

/** Bound and convert wall-clock elapsed ms into game months at 1×. */
export function elapsedGameMonths(elapsedMs: number): number {
  const raw = Number.isFinite(elapsedMs) ? elapsedMs : MIN_ELAPSED_MS;
  const safe = Math.min(MAX_ELAPSED_MS, Math.max(MIN_ELAPSED_MS, raw));
  return safe / GAME_MONTH_WALL_MS;
}

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * Build the partial GameState the flow lens needs from persisted profile
 * columns — the same shape speed-runs/check builds. Every client-only
 * multiplier input is left at its neutral default (the caps above account
 * for them); every server-known input is real.
 */
export function buildServerFlowState(inputs: Pick<ResourceCeilingInputs,
  'prevResources' | 'prevBuildingsData' | 'prevShipsData' | 'prevActiveServices' | 'prevResearch'>): GameState {
  const resources = inputs.prevResources && typeof inputs.prevResources === 'object'
    ? { ...inputs.prevResources }
    : {};
  return {
    version: 1,
    createdAt: Date.now(),
    lastTickAt: Date.now(),
    money: 0,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2126, month: 1 },
    tickSpeed: 1,
    buildings: asArray<GameState['buildings'][number]>(inputs.prevBuildingsData),
    completedResearch: Array.isArray(inputs.prevResearch) ? inputs.prevResearch.filter(r => typeof r === 'string') : [],
    activeResearch: null,
    activeServices: asArray<GameState['activeServices'][number]>(inputs.prevActiveServices),
    unlockedLocations: [],
    resources,
    ships: asArray<NonNullable<GameState['ships']>[number]>(inputs.prevShipsData),
    // Server-delivered snapshot omitted on purpose: `null` reads as the
    // 1.0 maximum (EXTRACTION_PRESSURE_MAX), i.e. the most generous case.
    extractionPressure: null,
    // No consumption state → phase-in 1 and efficiency 1: the maximum output.
    consumptionState: undefined,
    miningBonuses: [],
    locationInventories: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0,
      satellitesDeployed: 0,
      stationsBuilt: 0,
      researchCompleted: 0,
      missionsToMoon: 0,
      missionsToMars: 0,
      missionsToOuterPlanets: 0,
    },
  } as unknown as GameState;
}

/**
 * Theoretical-max production per game month for every resource this profile
 * can produce, from the engine's own flow lens with client-only multipliers
 * at their caps. Only INFLOWS count — consumption, decay and boil-off are
 * ignored because a ceiling that subtracts them could clip an honest player
 * whose client happened not to run those sinks yet.
 */
export function computeMaxProductionPerMonth(state: GameState, monthIndex?: number): Record<string, number> {
  const out: Record<string, number> = {};
  let report: ReturnType<typeof computeResourceFlows>;
  try {
    report = computeResourceFlows(state, monthIndex ?? 0);
  } catch {
    // A malformed persisted row must never break the sync — fall back to
    // "no production", which leaves only the flat floor (strictest case,
    // and only reachable with corrupt data; the shadow week will surface it).
    return out;
  }
  for (const flow of report.flows) {
    let total = 0;
    for (const c of flow.contributions) {
      if (c.perMonth <= 0) continue;
      const mult = CLIENT_MULT_BY_KIND[c.kind];
      if (!mult) continue;
      total += c.perMonth * mult;
    }
    if (total > 0) out[flow.resourceId] = total;
  }
  for (const [res, amt] of Object.entries(MEGASTRUCTURE_PASSIVE_CEILING)) {
    out[res] = (out[res] || 0) + amt;
  }
  return out;
}

/** The flat per-sync allowance for one resource. */
export function flatFloor(prev: number): number {
  const safePrev = Number.isFinite(prev) && prev > 0 ? prev : 0;
  return Math.max(FLAT_FLOOR_MIN, FLAT_FLOOR_FRACTION * safePrev);
}

/**
 * Per-resource plausibility ceilings for the RECONCILED inventory (client
 * claim + pending ledger deltas). Every resource in `prevResources`, in
 * `ledgerDeltas` or producible by the profile gets a ceiling; any other slug
 * the client sends is bounded by `ceilingFor(...)` with prev = 0 (i.e. the
 * flat floor) — see clampResources.
 *
 * Ledger sign convention: server writers both update GameProfile.resources
 * directly AND ledger the delta, so `prev` normally already contains a
 * pending delta. A positive delta is added anyway (a ledger-only writer, or
 * a client that failed to ack, would otherwise be clipped — the cost is
 * headroom of at most |delta|, once). A negative delta (escrow) is never
 * subtracted: the clamp is upward-only and escrow is already out of `prev`.
 */
export function computeResourceCeilings(inputs: ResourceCeilingInputs): ResourceCeilingReport {
  const prev = inputs.prevResources && typeof inputs.prevResources === 'object' ? inputs.prevResources : {};
  const deltas = inputs.ledgerDeltas && typeof inputs.ledgerDeltas === 'object' ? inputs.ledgerDeltas : {};
  const elapsedMonths = elapsedGameMonths(inputs.elapsedMs);
  const state = buildServerFlowState(inputs);
  const prodPerMonth = computeMaxProductionPerMonth(state, inputs.monthIndex);

  const ids = new Set<string>([
    ...Object.keys(prev),
    ...Object.keys(deltas),
    ...Object.keys(prodPerMonth),
  ]);
  const ceilings: Record<string, number> = {};
  for (const id of Array.from(ids)) {
    ceilings[id] = ceilingFor(prev[id], deltas[id], prodPerMonth[id], elapsedMonths);
  }
  return { ceilings, prodPerMonth, elapsedMonths };
}

/** The ceiling formula for one resource (exported for tests and for the
 *  "unknown slug" path in clampResources). */
export function ceilingFor(
  prev: number | undefined,
  ledgerDelta: number | undefined,
  prodPerMonth: number | undefined,
  elapsedMonths: number,
): number {
  const safePrev = typeof prev === 'number' && Number.isFinite(prev) && prev > 0 ? prev : 0;
  const safeDelta = typeof ledgerDelta === 'number' && Number.isFinite(ledgerDelta) ? Math.max(0, ledgerDelta) : 0;
  const safeProd = typeof prodPerMonth === 'number' && Number.isFinite(prodPerMonth) && prodPerMonth > 0 ? prodPerMonth : 0;
  return safePrev + safeDelta + RESOURCE_SLACK * safeProd * elapsedMonths + flatFloor(safePrev);
}

export interface ResourceRejection {
  resource: string;
  client: number;
  ceiling: number;
}

export interface ClampResourcesResult {
  clamped: Record<string, number>;
  rejected: ResourceRejection[];
}

/**
 * Upward-only clamp of a client inventory map against ceilings. Values at or
 * below their ceiling pass through untouched (including decreases — spending
 * is never questioned). Slugs with no ceiling entry get the flat-floor
 * ceiling for a zero previous stock, so an entirely new resource the client
 * "found" is bounded at FLAT_FLOOR_MIN per sync. Non-finite or negative
 * client values are normalised to 0.
 */
export function clampResources(
  client: Record<string, number> | null | undefined,
  ceilings: Record<string, number>,
): ClampResourcesResult {
  const clamped: Record<string, number> = {};
  const rejected: ResourceRejection[] = [];
  const src = client && typeof client === 'object' ? client : {};
  for (const [resource, raw] of Object.entries(src)) {
    const value = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
    const ceiling = typeof ceilings[resource] === 'number' && Number.isFinite(ceilings[resource])
      ? ceilings[resource]
      : ceilingFor(0, 0, 0, 0);
    if (value > ceiling) {
      rejected.push({ resource, client: value, ceiling });
      clamped[resource] = Math.floor(ceiling);
    } else {
      clamped[resource] = value;
    }
  }
  return { clamped, rejected };
}

// ─── Stash keys (GameProfile.workforceData) ──────────────────────────────────
// Same no-schema-change pattern as `_commanders` / `_factionRep`.

/** ISO timestamp of the first sync that computed ceilings for this profile.
 *  Absent = never baselined; the sync sets it and does NOT clamp that time,
 *  so a save that predates this feature is adopted, then enforced. */
export const RESOURCE_BASELINE_KEY = '_resourceBaselineAt';
/** The ceilings map computed on the last sync (≤ RESOURCE_CEILINGS_MAX_KEYS
 *  entries, the client's largest holdings first). Read by the escrow-backed
 *  sell paths (order book, bounties) — see serverSellableQuantity. */
export const RESOURCE_CEILINGS_KEY = '_resourceCeilings';
export const RESOURCE_CEILINGS_MAX_KEYS = 35;

export type ResourceClampMode = 'off' | 'shadow' | 'enforce';

/** `RESOURCE_CLAMP_MODE` env: 'off' | 'shadow' (default) | 'enforce'. Read
 *  per call so a flag flip takes effect without a restart in tests. */
export function getResourceClampMode(env: Record<string, string | undefined> = process.env): ResourceClampMode {
  const raw = (env.RESOURCE_CLAMP_MODE || 'shadow').trim().toLowerCase();
  if (raw === 'off' || raw === 'enforce') return raw;
  return 'shadow';
}

/** Pick the ≤35 ceilings worth stashing: the resources the client actually
 *  holds, largest first, then the rest of the ceiling map. */
export function selectCeilingsToStash(
  ceilings: Record<string, number>,
  clientResources: Record<string, number>,
  maxKeys: number = RESOURCE_CEILINGS_MAX_KEYS,
): Record<string, number> {
  const held = Object.entries(clientResources)
    .filter(([, q]) => typeof q === 'number' && q > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const ordered = [...held, ...Object.keys(ceilings).filter(k => !held.includes(k))];
  const out: Record<string, number> = {};
  for (const k of ordered) {
    if (Object.keys(out).length >= maxKeys) break;
    const c = ceilings[k];
    if (typeof c === 'number' && Number.isFinite(c)) out[k] = Math.floor(c);
  }
  return out;
}

/** Read the stash back from a persisted workforceData column. */
export function readResourceStash(workforceData: unknown): {
  baselineAt: string | null;
  ceilings: Record<string, number> | null;
} {
  if (!workforceData || typeof workforceData !== 'object') return { baselineAt: null, ceilings: null };
  const wd = workforceData as Record<string, unknown>;
  const baselineAt = typeof wd[RESOURCE_BASELINE_KEY] === 'string' ? (wd[RESOURCE_BASELINE_KEY] as string) : null;
  const rawCeil = wd[RESOURCE_CEILINGS_KEY];
  let ceilings: Record<string, number> | null = null;
  if (rawCeil && typeof rawCeil === 'object') {
    ceilings = {};
    for (const [k, v] of Object.entries(rawCeil as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) ceilings[k] = v;
    }
  }
  return { baselineAt, ceilings };
}

/**
 * Phase B slice for the escrow-backed sell paths (market-orderbook.ts sell
 * gating, bounties/route.ts filler check). Returns the quantity of `slug`
 * the server is willing to treat as HELD for an outbound transfer.
 *
 * LIMITATION (documented on purpose): `GameProfile.resources` is still the
 * client's figure as of the last sync (raw in 'shadow' mode, clamped in
 * 'enforce'). Until the profile has a `_resourceBaselineAt` marker there is
 * no server-side opinion at all, so the raw figure is returned — identical
 * to the pre-phase-1 behaviour. Once the marker exists the sellable quantity
 * is capped at the last sync's ceiling for that slug, which bounds what a
 * forged inventory can push into real buy orders / bounties even while the
 * sync itself is only shadowing. The ceiling map is capped at 35 keys; a
 * slug outside it falls back to the raw figure. Ceilings are as of the last
 * sync (≈30 s old), so production since then is not sellable until the next
 * sync — a delay the client already lives with for server-side holdings.
 * `mode === 'off'` returns the raw figure unconditionally.
 */
export function serverSellableQuantity(
  profile: { resources: unknown; workforceData?: unknown },
  slug: string,
  mode: ResourceClampMode = getResourceClampMode(),
): { held: number; raw: number; cappedByCeiling: boolean; ceiling: number | null } {
  const resources = (profile.resources && typeof profile.resources === 'object')
    ? (profile.resources as Record<string, number>)
    : {};
  const rawVal = resources[slug];
  const raw = typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0 ? rawVal : 0;
  if (mode === 'off') return { held: raw, raw, cappedByCeiling: false, ceiling: null };
  const { baselineAt, ceilings } = readResourceStash(profile.workforceData);
  if (!baselineAt || !ceilings) return { held: raw, raw, cappedByCeiling: false, ceiling: null };
  const ceiling = ceilings[slug];
  if (typeof ceiling !== 'number') return { held: raw, raw, cappedByCeiling: false, ceiling: null };
  const held = Math.min(raw, Math.max(0, Math.floor(ceiling)));
  return { held, raw, cappedByCeiling: held < raw, ceiling };
}
