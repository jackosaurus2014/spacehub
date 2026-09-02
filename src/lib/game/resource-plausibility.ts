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
import { REAL_MS_PER_GAME_MONTH } from './server-time';
import { MIN_PLAUSIBILITY_ELAPSED_MS, MAX_PLAUSIBILITY_ELAPSED_MS } from './ledger-reconcile';
import { MEGASTRUCTURES } from './personal-megastructures';
import { SHIP_MAP, getShipDerivedStats } from './ships';
import { MINING_LASER_RATE_BONUS } from './modules';
import { BUILDING_MAP, getCraftingSpeedMultiplier } from './buildings';
import { RESEARCH } from './research-tree';
import { PRODUCTION_CHAINS, canFabricate } from './production-chains';
import { SERVICE_MAP } from './services';
import { MINING_PRODUCTION, RESOURCE_MAP } from './resources';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier } from './upgrades';
import { getMarkRevenueMultiplier } from './mark-upgrades'; // D4: persisted markLevel on the buildings row
import { getResearchBonuses } from './research-tree';
import { getWorkforceBonuses } from './workforce';
import { getMiningRevenueScale } from './mining-pricing';
import { SUBSIDIARY_DEFS } from './subsidiaries';

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

/** Wall-clock milliseconds per game month — the world calendar's 6 real
 *  hours (server-time.ts), the one game clock since the 2026-09-02 clock
 *  unification. Never hardcoded. */
export const GAME_MONTH_WALL_MS = REAL_MS_PER_GAME_MONTH;

/** Elapsed-time clamp, shared with the money clamp. Game exploit batch
 *  2026-09-02 (C-2): MIN is no longer a floor — below it the window counts
 *  as ZERO elapsed (no growth headroom at all); above it the window is
 *  linear up to the 30-day cap (a dormant profile does not accrue a month of
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

// ─── Money half: server-derived monthly gross ceiling ───────────────────────
// Clock unification (2026-09-02, docs/GAME_DESIGN_REVIEW_2026-09.md D1). The
// money plausibility ceiling (ledger-reconcile.ts clampPlausibleMoney) used to
// be a flat $2M/s. It is now `serverMonthlyGross x 2 x elapsedMonths` (with a
// $500K/s backstop), where serverMonthlyGross is computed HERE from the
// persisted row with the same posture as the resource ceiling above: every
// server-known term evaluated for real, every client-only multiplier at its
// documented cap. Only POSITIVE terms count (costs are never subtracted —
// a ceiling that nets costs could clip an honest player whose client had not
// run the sinks yet).
//
// Server-known, evaluated for real: service definitions, the linked
// building's upgrade level, station-bonus buildings at the location,
// completed research (serviceRevenueBonus), workforce head-counts
// (serviceRevenue), the service instance's own multiplier (capped), and
// mining rigs' nameplate output valued at the resource's band-maximum price.
// Client-only, capped: legacy, tier, reputation, eras, doctrine, commanders,
// random events, morale, wave-B stack, demand scarcity, returning-commander
// boost, megastructure revenue multiplier.
//
// Allowances for income that is not a service at all are GATED on persisted
// totalEarned so a fresh profile cannot claim them: megastructure passive
// income (each definition's `minMoney` gate) and subsidiary net income
// (tier inferred from totalEarned, subsidiaries.ts inferCorpTier's money
// thresholds). Governor tax (zone-influence, server-computed) is deliberately
// NOT allowed for yet — it is bounded by taxCap and a governor's persisted
// figure simply lags until headroom absorbs it.

/** workforce.ts:172 — `serviceRevenue` capped at +50%. */
export const MAX_WORKFORCE_SERVICE_REVENUE_MULT = 1.5;
/** research-tree.ts:951 — `serviceRevenueBonus` capped at +50%. */
export const MAX_RESEARCH_SERVICE_REVENUE_MULT = 1.5;
/** legacy-system.ts:550 — revenue category cap 5.0 => x6. */
export const MAX_LEGACY_REVENUE_MULT = 6.0;
/** corporation-tiers.ts:170 — top tier `revenueBonus: 0.20`. */
export const MAX_TIER_REVENUE_MULT = 1.20;
/** reputation.ts:126 — top standing `revenueMultiplier: 1.40`. */
export const MAX_REPUTATION_REVENUE_MULT = 1.40;
/** corporate-eras.ts:105 — largest era revenue bonus +10%. */
export const MAX_ERA_REVENUE_MULT = 1.10;
/** corporate-doctrine.ts:245 — Proprietary disclosure +3%. */
export const MAX_DOCTRINE_REVENUE_MULT = 1.03;
/** commanders.ts — class sums stack with diminishing returns and traits are
 *  clamped; no single documented cap, so 2.0 is an ASSUMED bound (same
 *  posture as MAX_COMMANDER_MINING_MULT). */
export const MAX_COMMANDER_REVENUE_MULT = 2.0;
/** random-events.ts — active effects MULTIPLY (1.3 x 1.2 x 1.15 ≈ 1.8 if
 *  every positive event overlaps); 2.0 is the documented allowance. */
export const MAX_EVENT_REVENUE_MULT = 2.0;
/** game-engine.ts §1 stationBonus — capped at +50% (evaluated for real from
 *  the persisted buildings; this is the ceiling of that evaluation). */
export const MAX_STATION_BONUS = 0.5;
/** workforce.ts:180 — morale band 0.8–1.15. */
export const MAX_MORALE_MULT = 1.15;
/** game-engine.ts:490 — waveBRevenueMult capped at 2.0 by the engine. */
export const MAX_WAVE_B_REVENUE_MULT = 2.0;
/** service-pricing.ts — undersupply scarcity premium ≤ +25%. */
export const MAX_DEMAND_SCARCITY_MULT = 1.25;
/** returning-commander.ts — 1.3x decaying to 1.0 over 14 days. */
export const MAX_RETURNING_COMMANDER_MULT = 1.3;
/** A service instance's own `revenueMultiplier` is client-reported (persisted
 *  activeServicesData). Services start at 1.0; 2.0 is the allowance. */
export const MAX_SERVICE_INSTANCE_MULT = 2.0;
/** personal-megastructures.ts — revenueMultiplier terms multiply across
 *  owned megastructures; product of each definition's largest term. */
export const MAX_MEGASTRUCTURE_REVENUE_MULT: number = MEGASTRUCTURES.reduce((prod, def) => {
  let best = 1;
  for (const ph of def.phases || []) best = Math.max(best, ph.interimBonuses?.revenueMultiplier || 1);
  best = Math.max(best, def.completionBonus?.revenueMultiplier || 1);
  return prod * best;
}, 1);

/** Product of every client-only term in the §1 service revenue chain. */
export const MAX_SERVICE_REVENUE_CLIENT_MULT =
  MAX_LEGACY_REVENUE_MULT
  * MAX_TIER_REVENUE_MULT
  * MAX_REPUTATION_REVENUE_MULT
  * MAX_ERA_REVENUE_MULT
  * MAX_DOCTRINE_REVENUE_MULT
  * MAX_COMMANDER_REVENUE_MULT
  * MAX_EVENT_REVENUE_MULT
  * MAX_MORALE_MULT
  * MAX_WAVE_B_REVENUE_MULT
  * MAX_DEMAND_SCARCITY_MULT
  * MAX_RETURNING_COMMANDER_MULT
  * MAX_MEGASTRUCTURE_REVENUE_MULT;

/** subsidiaries.ts OPERATIONS_MULT[5] — the top operations level x9. */
export const MAX_SUBSIDIARY_OPERATIONS_MULT = 9;
/** subsidiaries.ts inferCorpTier money thresholds → max slots per tier
 *  (MAX_SLOTS_BY_TIER). Only totalEarned is server-known, so the building/
 *  research/location legs are treated as satisfied (most generous case). */
const SUBSIDIARY_SLOTS_BY_TOTAL_EARNED: { minTotalEarned: number; slots: number }[] = [
  { minTotalEarned: 500_000_000_000, slots: 6 }, // tier 5
  { minTotalEarned: 100_000_000_000, slots: 6 }, // tier 4
  { minTotalEarned: 10_000_000_000, slots: 4 },  // tier 3
  { minTotalEarned: 1_000_000_000, slots: 2 },   // tier 2
  { minTotalEarned: 0, slots: 1 },               // tier 1
];
const MAX_SUBSIDIARY_BASE_INCOME: number = SUBSIDIARY_DEFS.reduce((m, d) => Math.max(m, d.baseIncome || 0), 0);

export interface ServerMonthlyGrossInputs {
  /** `GameProfile.workforceData` (client workforce counts + stash keys). */
  workforceData?: unknown;
  /** `GameProfile.totalEarned` — gates the megastructure/subsidiary allowances. */
  totalEarned?: number;
}

export interface ServerMonthlyGrossReport {
  /** Theoretical-max gross revenue per game-month, all terms. */
  gross: number;
  services: number;
  megastructurePassive: number;
  subsidiaries: number;
}

const stationBonusAt = (state: GameState, locationId: string): number => {
  let bonus = 0;
  for (const b of state.buildings || []) {
    if (!b || !b.isComplete || b.locationId !== locationId) continue;
    if (BUILDING_MAP.get(b.definitionId)?.category === 'space_station') bonus += 0.15;
  }
  return Math.min(MAX_STATION_BONUS, bonus);
};

/**
 * Theoretical-max monthly gross for a profile from its PERSISTED state
 * (use buildServerFlowState to construct `state` from the row). Pure; a
 * malformed row yields 0 for the affected term rather than throwing.
 */
export function computeServerMonthlyGrossDetailed(state: GameState, inputs: ServerMonthlyGrossInputs = {}): ServerMonthlyGrossReport {
  const totalEarned = typeof inputs.totalEarned === 'number' && Number.isFinite(inputs.totalEarned) && inputs.totalEarned > 0
    ? inputs.totalEarned : 0;

  // Research (server-known list) — real.
  let researchMult = MAX_RESEARCH_SERVICE_REVENUE_MULT;
  try {
    researchMult = 1 + Math.min(0.5, Math.max(0, getResearchBonuses(state.completedResearch || [], undefined).serviceRevenueBonus || 0));
  } catch { researchMult = MAX_RESEARCH_SERVICE_REVENUE_MULT; }

  // Workforce head-counts (persisted workforceData) — real when the shape is
  // sane, the documented cap otherwise.
  let workforceMult = MAX_WORKFORCE_SERVICE_REVENUE_MULT;
  const wd = inputs.workforceData;
  if (wd && typeof wd === 'object' && !Array.isArray(wd)) {
    const w = wd as Record<string, unknown>;
    const num = (k: string) => (typeof w[k] === 'number' && Number.isFinite(w[k] as number) && (w[k] as number) > 0 ? (w[k] as number) : 0);
    try {
      const b = getWorkforceBonuses({
        engineers: num('engineers'), scientists: num('scientists'), miners: num('miners'), operators: num('operators'),
        pilots: num('pilots'), negotiators: num('negotiators'), securitys: num('securitys'), medics: num('medics'),
      } as NonNullable<GameState['workforce']>);
      workforceMult = 1 + Math.min(0.5, Math.max(0, b.serviceRevenue || 0));
    } catch { workforceMult = MAX_WORKFORCE_SERVICE_REVENUE_MULT; }
  }

  let services = 0;
  for (const svc of state.activeServices || []) {
    if (!svc || typeof svc.definitionId !== 'string') continue;
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    // Ceiling = the BEST-refitted eligible building at the location (D4:
    // markLevel is validated 1..3 by sync-validation.ts and persisted on the
    // buildings row, so the Mark multiplier here is real, not the neutral 1.0).
    let upgradeBoost = 1;
    let sawLinked = false;
    for (const b of state.buildings || []) {
      if (!b || !b.isComplete || b.locationId !== svc.locationId) continue;
      if (!BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId)) continue;
      sawLinked = true;
      const boost = getUpgradeRevenueMultiplier(b.upgradeLevel || 0) * getMarkRevenueMultiplier(b);
      if (boost > upgradeBoost) upgradeBoost = boost;
    }
    if (!sawLinked) upgradeBoost = getUpgradeRevenueMultiplier(0) * getMarkRevenueMultiplier(null);
    const rawInst = typeof svc.revenueMultiplier === 'number' && Number.isFinite(svc.revenueMultiplier) ? svc.revenueMultiplier : 1;
    const instMult = Math.min(MAX_SERVICE_INSTANCE_MULT, Math.max(0, rawInst));
    let base = def.revenuePerMonth || 0;
    if (def.type === 'mining_output') {
      // Price-linked mining (mining-pricing.ts): nameplate units x band-max
      // price x scale, with every client-only mining multiplier at its cap.
      let valued = 0;
      for (const { resource, amountPerMonth } of MINING_PRODUCTION[svc.definitionId] || []) {
        const rd = RESOURCE_MAP.get(resource as never) as { maxPrice?: number; baseMarketPrice?: number } | undefined;
        const price = Math.max(rd?.maxPrice || 0, rd?.baseMarketPrice || 0);
        valued += amountPerMonth * price;
      }
      let scale = 1;
      try { scale = getMiningRevenueScale(svc.definitionId); } catch { scale = 1; }
      base = Math.max(base, valued * scale * MAX_BUILDING_MINING_CLIENT_MULT);
    }
    services += base * instMult * upgradeBoost * researchMult * workforceMult
      * (1 + stationBonusAt(state, svc.locationId)) * MAX_SERVICE_REVENUE_CLIENT_MULT;
  }

  // Megastructure passive income — client-only; allowed per definition once
  // the profile has EARNED its minMoney gate.
  let megastructurePassive = 0;
  for (const def of MEGASTRUCTURES) {
    const gate = def.prerequisites?.minMoney || 0;
    if (totalEarned < gate) continue;
    let best = 0;
    for (const ph of def.phases || []) best = Math.max(best, ph.interimBonuses?.passiveIncome || 0);
    best = Math.max(best, def.completionBonus?.passiveIncome || 0);
    megastructurePassive += best;
  }

  // Subsidiaries — client-only; slots by the money leg of inferCorpTier.
  const slots = SUBSIDIARY_SLOTS_BY_TOTAL_EARNED.find(t => totalEarned >= t.minTotalEarned)?.slots || 0;
  const subsidiaries = slots * MAX_SUBSIDIARY_BASE_INCOME * MAX_SUBSIDIARY_OPERATIONS_MULT;

  const gross = services + megastructurePassive + subsidiaries;
  return {
    gross: Number.isFinite(gross) && gross > 0 ? Math.round(gross) : 0,
    services: Math.round(services), megastructurePassive: Math.round(megastructurePassive), subsidiaries: Math.round(subsidiaries),
  };
}

/** The headline number the sync route feeds clampPlausibleMoney. */
export function computeServerMonthlyGross(state: GameState, inputs: ServerMonthlyGrossInputs = {}): number {
  return computeServerMonthlyGrossDetailed(state, inputs).gross;
}

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

/** Bound and convert wall-clock elapsed ms into game months at 1×. Below
 *  MIN_ELAPSED_MS the answer is 0 (no headroom for a rapid re-sync). */
export function elapsedGameMonths(elapsedMs: number): number {
  const raw = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const safe = Math.min(MAX_ELAPSED_MS, Math.max(0, raw));
  if (safe < MIN_ELAPSED_MS) return 0;
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

/** The flat allowance models one-off transfers PER SYNC (contract deliveries,
 *  refining, survey finds, freight arrivals), so its time scale is the client
 *  sync interval, not the game calendar. Clock unification (2026-09-02):
 *  when the game-month was 60 s the two coincided; now that a month is 6 h
 *  the allowance is pinned to this window explicitly so it keeps meaning
 *  "one allowance per normal sync" (C-2c: linear below it, capped at 1). */
export const FLAT_FLOOR_WINDOW_MS = 60_000;

/** Time-proportional scale on the flat allowance: a full allowance per
 *  FLAT_FLOOR_WINDOW_MS of wall clock (expressed here in game-months, the
 *  unit the ceiling math carries), linearly less for a shorter window,
 *  never more than 1× per sync. Game exploit batch 2026-09-02 (C-2c): the
 *  old per-sync floor compounded per request (+25 % of stock every sync). */
export function flatFloorScale(elapsedMonths: number): number {
  const m = Number.isFinite(elapsedMonths) && elapsedMonths > 0 ? elapsedMonths : 0;
  return Math.min(1, (m * GAME_MONTH_WALL_MS) / FLAT_FLOOR_WINDOW_MS);
}

/** The flat allowance for one resource over `elapsedMonths` of wall clock
 *  (default: one full month, i.e. the un-scaled allowance). */
export function flatFloor(prev: number, elapsedMonths: number = 1): number {
  const safePrev = Number.isFinite(prev) && prev > 0 ? prev : 0;
  return Math.max(FLAT_FLOOR_MIN, FLAT_FLOOR_FRACTION * safePrev) * flatFloorScale(elapsedMonths);
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
  return safePrev + safeDelta + RESOURCE_SLACK * safeProd * elapsedMonths + flatFloor(safePrev, elapsedMonths);
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
  /** Window for the unknown-slug floor (default: one full allowance). */
  elapsedMonths: number = 1,
): ClampResourcesResult {
  const clamped: Record<string, number> = {};
  const rejected: ResourceRejection[] = [];
  const src = client && typeof client === 'object' ? client : {};
  for (const [resource, raw] of Object.entries(src)) {
    const value = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
    const ceiling = typeof ceilings[resource] === 'number' && Number.isFinite(ceilings[resource])
      ? ceilings[resource]
      : ceilingFor(0, 0, 0, elapsedMonths);
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

// ─── Phase 2: the server-owned inventory (GameProfile.serverResources) ──────
// docs/SECURITY_AUDIT_2026-09.md "Server-authoritative inventory — phase 2".
//
// `GameProfile.resources` stays the CLIENT VIEW (client claim + pending
// ledger rows, clamped in enforce). `GameProfile.serverResources` is the
// SERVER TRUTH: null until adopted, then advanced by the sync ONLY through
//
//   truth_r = prevServer_r + folded_r + accepted_r
//
//   folded_r    = Σ resourceDelta of GameLedgerEntry rows for the profile
//                 with foldedAt IS NULL (every server-side move — escrow,
//                 fill, refund, delivery, contribution — is a ledger row; the
//                 sync stamps them folded as it absorbs them)
//   clientΔ_r   = clientView_r − prevClientRow_r − folded_r
//                 (the client's OWN movement since the last sync: what it
//                 says it produced or spent, with server-side moves removed)
//   accepted_r  = clientΔ_r                            when clientΔ_r ≤ 0
//                 min(clientΔ_r, growthCap_r + craft_r) when clientΔ_r > 0
//   growthCap_r = RESOURCE_SLACK × prodMax_r × elapsedMonths
//               + max(FLAT_FLOOR_MIN, FLAT_FLOOR_FRACTION × prevServer_r)
//                 (the phase-1 ceiling formula's growth terms, evaluated
//                 against the SERVER stock — ceilingFor(prevServer, 0, …) −
//                 prevServer)
//   craft_r     = the client's craftedThisTick attestation, capped by
//                 computeCraftAttestationCaps
//
// and finally truth_r ≤ clientView_r (the server never believes it holds
// more than the client does) and truth_r ≥ 0. A decrease is accepted as-is
// because spending your own stock is never an exploit; an increase is
// accepted only up to what the engine math allows for this profile.
//
// Between syncs the escrow-backed gates read `stored + Σ unfolded rows`
// (server-inventory.ts), which is exactly the truth the next sync will
// store — so an escrow written one millisecond ago is already debited from
// what the next gate sees, without the gate and the sync ever racing on the
// JSON column (the ledger row is the single atomic record; the stored map is
// a fold cursor over it).

/** Client-vs-server divergence above this fraction of the server figure is
 *  audited (and, in enforce, corrected downward). */
export const SERVER_RESOURCE_DIVERGENCE_TOLERANCE = 0.05;
/** One `client_server_resource_divergence` audit row per profile per hour. */
export const DIVERGENCE_AUDIT_THROTTLE_MS = 3600_000;
/** Stash key (workforceData): ISO time of the last divergence audit row. */
export const RESOURCE_DIVERGENCE_LOGGED_KEY = '_resourceDivergenceLoggedAt';

/** Sanitize a persisted `serverResources` column. null = not baselined. */
export function readServerResources(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}

const finiteNonNeg = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** `stored + Σ unfolded` for one slug, floored at zero. */
export function serverHeldQuantity(
  server: Record<string, number>,
  unfolded: Record<string, number> | null | undefined,
  slug: string,
): number {
  const base = finiteNonNeg(server[slug]);
  const pending = unfolded && typeof unfolded[slug] === 'number' && Number.isFinite(unfolded[slug]) ? unfolded[slug] : 0;
  return Math.max(0, Math.floor(base + pending));
}

/** The whole map, `stored + Σ unfolded`, floored at zero, zero entries dropped. */
export function applyUnfoldedDeltas(
  server: Record<string, number>,
  unfolded: Record<string, number> | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  const ids = new Set<string>([...Object.keys(server), ...Object.keys(unfolded || {})]);
  for (const id of Array.from(ids)) {
    const q = serverHeldQuantity(server, unfolded, id);
    if (q > 0) out[id] = q;
  }
  return out;
}

export interface AdvanceServerResourcesInputs {
  /** `GameProfile.serverResources` as stored at the last sync. */
  prevServer: Record<string, number>;
  /** `GameProfile.resources` as written by the last sync (client view then). */
  prevClientRow: Record<string, number> | null | undefined;
  /** The client view this sync will write (claim + pending rows, clamped). */
  clientView: Record<string, number>;
  /** Net resourceDelta of the ledger rows being folded this sync. */
  folded: Record<string, number> | null | undefined;
  /** Theoretical-max production per game month (computeResourceCeilings). */
  prodPerMonth: Record<string, number>;
  elapsedMonths: number;
  /** Capped craft attestation (computeCraftAttestationCaps applied). */
  craftAccepted?: Record<string, number> | null;
}

export interface CappedGrowth {
  resource: string;
  /** What the client's own movement claimed (after removing server moves). */
  claimed: number;
  /** What the engine math allowed for the window. */
  allowed: number;
}

export interface AdvanceServerResourcesResult {
  next: Record<string, number>;
  /** Client-movement growth accepted per resource (> 0 only). */
  acceptedGrowth: Record<string, number>;
  /** Client-movement decreases accepted per resource (magnitude > 0 only). */
  acceptedDecrease: Record<string, number>;
  /** Resources whose claimed growth exceeded the allowance. */
  capped: CappedGrowth[];
}

/** Advance the server-owned map by one sync (pure; formula in the header). */
export function advanceServerResources(inputs: AdvanceServerResourcesInputs): AdvanceServerResourcesResult {
  const prevServer = inputs.prevServer || {};
  const prevRow = inputs.prevClientRow && typeof inputs.prevClientRow === 'object' ? inputs.prevClientRow : {};
  const client = inputs.clientView || {};
  const folded = inputs.folded && typeof inputs.folded === 'object' ? inputs.folded : {};
  const craft = inputs.craftAccepted && typeof inputs.craftAccepted === 'object' ? inputs.craftAccepted : {};
  const prod = inputs.prodPerMonth || {};
  const months = Number.isFinite(inputs.elapsedMonths) && inputs.elapsedMonths > 0 ? inputs.elapsedMonths : 0;

  const ids = new Set<string>([
    ...Object.keys(prevServer), ...Object.keys(client), ...Object.keys(folded), ...Object.keys(craft),
  ]);
  const next: Record<string, number> = {};
  const acceptedGrowth: Record<string, number> = {};
  const acceptedDecrease: Record<string, number> = {};
  const capped: CappedGrowth[] = [];
  for (const id of Array.from(ids)) {
    const prevS = finiteNonNeg(prevServer[id]);
    const prevC = finiteNonNeg(prevRow[id]);
    const c = finiteNonNeg(client[id]);
    const f = typeof folded[id] === 'number' && Number.isFinite(folded[id]) ? folded[id] : 0;
    const clientDelta = c - prevC - f;
    let accepted: number;
    if (clientDelta > 0) {
      const growthCap = ceilingFor(prevS, 0, prod[id], months) - prevS;
      const allowed = growthCap + finiteNonNeg(craft[id]);
      accepted = Math.min(clientDelta, allowed);
      if (clientDelta > allowed) capped.push({ resource: id, claimed: clientDelta, allowed });
      if (accepted > 0) acceptedGrowth[id] = accepted;
    } else {
      accepted = clientDelta;
      if (accepted < 0) acceptedDecrease[id] = -accepted;
    }
    let value = prevS + f + accepted;
    // The server never believes it holds more than the client says it does.
    value = Math.min(value, c);
    value = Math.max(0, Math.floor(value));
    if (value > 0) next[id] = value;
  }
  return { next, acceptedGrowth, acceptedDecrease, capped };
}

export interface ResourceDivergence {
  resource: string;
  client: number;
  server: number;
  /** |client − server| / max(server, 1). */
  ratio: number;
}

/** Resources where the client view differs from server truth by more than
 *  `tolerance` of the server figure (and by at least one unit). */
export function computeResourceDivergence(
  clientView: Record<string, number>,
  server: Record<string, number>,
  tolerance: number = SERVER_RESOURCE_DIVERGENCE_TOLERANCE,
): ResourceDivergence[] {
  const out: ResourceDivergence[] = [];
  const ids = new Set<string>([...Object.keys(clientView || {}), ...Object.keys(server || {})]);
  for (const id of Array.from(ids)) {
    const c = finiteNonNeg(clientView[id]);
    const s = finiteNonNeg(server[id]);
    const diff = Math.abs(c - s);
    if (diff < 1) continue;
    const ratio = diff / Math.max(s, 1);
    if (ratio > tolerance) out.push({ resource: id, client: c, server: s, ratio });
  }
  return out.sort((a, b) => b.ratio - a.ratio);
}

/** The DOWNWARD deltas that walk a drifted client map back to server truth
 *  (client − server > tolerance). Never positive: the server never hands
 *  out resources the client does not already claim. */
export function computeClientCorrections(
  clientView: Record<string, number>,
  server: Record<string, number>,
  tolerance: number = SERVER_RESOURCE_DIVERGENCE_TOLERANCE,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of computeResourceDivergence(clientView, server, tolerance)) {
    if (d.client > d.server) out[d.resource] = -Math.round(d.client - d.server);
  }
  return out;
}

// ─── Phase 2 attestation caps (craftedThisTick / builtThisTick) ─────────────

/** Craft attestations are windowed like the phase-1 ceiling: a 5 s floor and
 *  the 30-day elapsed cap (crafting is tick-driven; only one recipe runs at a
 *  time — activeRefining is a single slot — so the +1 below covers the one
 *  in-flight completion). */
export function clampAttestationWindowMs(elapsedMs: number): number {
  const raw = Number.isFinite(elapsedMs) ? elapsedMs : MIN_ELAPSED_MS;
  return Math.min(MAX_ELAPSED_MS, Math.max(MIN_ELAPSED_MS, raw));
}

/**
 * Per-output-resource cap on `craftedThisTick` for one sync. For every
 * recipe this profile can run (a completed fabrication facility of the
 * required tier in the persisted buildings AND all requiredResearch in the
 * persisted research list):
 *
 *   crafts_max = floor(window_s × speedMult / timeSeconds) + 1
 *   cap[outputId] = max(cap[outputId], crafts_max × outputQuantity)
 *
 * speedMult is `getCraftingSpeedMultiplier` over the persisted buildings —
 * the engine's own fabrication-throughput term, evaluated for real (not
 * capped) because the building roster is server-known. A recipe the profile
 * cannot run contributes nothing, so a "found" product with no path to it
 * is capped at 0 here (and rides only on the flat floor).
 */
export function computeCraftAttestationCaps(inputs: {
  prevBuildingsData: unknown;
  prevResearch: string[] | null | undefined;
  elapsedMs: number;
}): Record<string, number> {
  const buildings = asArray<{ definitionId: string; isComplete: boolean }>(inputs.prevBuildingsData)
    .filter(b => b && typeof b.definitionId === 'string');
  const research = new Set(Array.isArray(inputs.prevResearch) ? inputs.prevResearch : []);
  const windowSec = clampAttestationWindowMs(inputs.elapsedMs) / 1000;
  let speedMult = 1;
  try { speedMult = getCraftingSpeedMultiplier(buildings); } catch { speedMult = 1; }
  const caps: Record<string, number> = {};
  for (const recipe of PRODUCTION_CHAINS) {
    if (!recipe.timeSeconds || recipe.timeSeconds <= 0 || !recipe.outputQuantity) continue;
    if (!canFabricate(recipe, buildings, BUILDING_MAP)) continue;
    if ((recipe.requiredResearch || []).some(r => !research.has(r))) continue;
    const craftsMax = Math.floor((windowSec * speedMult) / recipe.timeSeconds) + 1;
    const cap = craftsMax * recipe.outputQuantity;
    if (cap > (caps[recipe.outputId] || 0)) caps[recipe.outputId] = cap;
  }
  return caps;
}

export interface AttestationRejection { resource: string; claimed: number; cap: number }

/** Apply craft caps to a client attestation map (non-finite / negative → 0,
 *  unknown outputs → 0). Returns the accepted map and the rejected excess. */
export function capCraftAttestation(
  crafted: unknown,
  caps: Record<string, number>,
): { accepted: Record<string, number>; rejected: AttestationRejection[] } {
  const accepted: Record<string, number> = {};
  const rejected: AttestationRejection[] = [];
  if (!crafted || typeof crafted !== 'object') return { accepted, rejected };
  for (const [slug, raw] of Object.entries(crafted as Record<string, unknown>).slice(0, 50)) {
    const claimed = Math.floor(finiteNonNeg(raw));
    if (claimed <= 0) continue;
    const cap = Math.floor(finiteNonNeg(caps[slug]));
    const take = Math.min(claimed, cap);
    if (take > 0) accepted[slug] = take;
    if (claimed > cap) rejected.push({ resource: slug, claimed, cap });
  }
  return { accepted, rejected };
}

/** How many build/ship/research orders one sync may attest spend for. The
 *  client caps its own accumulator too; this is the server-side bound. */
export const BUILD_ATTEST_MAX_ORDERS_PER_SYNC = 25;

/** Largest single-definition resource cost per resource across buildings,
 *  ships and research — derived from the definitions at load. */
export const MAX_DEFINITION_RESOURCE_COST: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  const take = (cost?: Partial<Record<string, number>> | null) => {
    for (const [res, qty] of Object.entries(cost || {})) {
      if (typeof qty === 'number' && Number.isFinite(qty) && qty > (out[res] || 0)) out[res] = qty;
    }
  };
  for (const def of Array.from(BUILDING_MAP.values())) take((def as { resourceCost?: Partial<Record<string, number>> }).resourceCost);
  for (const def of Array.from(SHIP_MAP.values())) take((def as { resourceCost?: Partial<Record<string, number>> }).resourceCost);
  for (const def of RESEARCH) take((def as { resourceCost?: Partial<Record<string, number>> }).resourceCost);
  return out;
})();

/** Per-resource cap on `builtThisTick` for one sync: the largest definition
 *  cost × BUILD_ATTEST_MAX_ORDERS_PER_SYNC. A resource no definition costs
 *  is capped at 0 (nothing to build with it). */
export function buildSpendCap(slug: string): number {
  return Math.floor(finiteNonNeg(MAX_DEFINITION_RESOURCE_COST[slug]) * BUILD_ATTEST_MAX_ORDERS_PER_SYNC);
}

/** Apply build-spend caps to a client attestation map. */
export function capBuildAttestation(
  built: unknown,
): { accepted: Record<string, number>; rejected: AttestationRejection[] } {
  const accepted: Record<string, number> = {};
  const rejected: AttestationRejection[] = [];
  if (!built || typeof built !== 'object') return { accepted, rejected };
  for (const [slug, raw] of Object.entries(built as Record<string, unknown>).slice(0, 50)) {
    const claimed = Math.floor(finiteNonNeg(raw));
    if (claimed <= 0) continue;
    const cap = buildSpendCap(slug);
    const take = Math.min(claimed, cap);
    if (take > 0) accepted[slug] = take;
    if (claimed > cap) rejected.push({ resource: slug, claimed, cap });
  }
  return { accepted, rejected };
}

export type SellableSource = 'raw' | 'ceiling' | 'server';

/**
 * The quantity of `slug` the server is willing to treat as HELD for an
 * outbound transfer (order-book sell escrow, bounty fill, bid delivery,
 * project contribution).
 *
 * Phase 2: once the profile carries `serverResources`, the answer is server
 * truth — `serverResources[slug] + Σ unfolded ledger rows for slug` (pass the
 * unfolded map from server-inventory.ts's readUnfoldedResourceDeltas; the
 * async wrapper `resolveSellableQuantity` does both) — and the client view is
 * ignored entirely. `raw` is still reported for the audit trail.
 *
 * Phase 1 fallback (un-baselined profile, or `serverResources` null): the
 * raw client figure capped at the last sync's stashed ceiling once the
 * profile has a `_resourceBaselineAt` marker — identical to the phase-1
 * behaviour documented in the audit. `mode === 'off'` returns the raw figure
 * unconditionally (the kill switch restores pre-phase-1 behaviour, and the
 * server map stops advancing in 'off', so it must not gate).
 */
export function serverSellableQuantity(
  profile: { resources: unknown; workforceData?: unknown; serverResources?: unknown },
  slug: string,
  mode: ResourceClampMode = getResourceClampMode(),
  unfolded?: Record<string, number> | null,
): { held: number; raw: number; cappedByCeiling: boolean; ceiling: number | null; source: SellableSource } {
  const resources = (profile.resources && typeof profile.resources === 'object')
    ? (profile.resources as Record<string, number>)
    : {};
  const rawVal = resources[slug];
  const raw = typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0 ? rawVal : 0;
  if (mode === 'off') return { held: raw, raw, cappedByCeiling: false, ceiling: null, source: 'raw' };
  const server = readServerResources(profile.serverResources);
  if (server) {
    const held = serverHeldQuantity(server, unfolded, slug);
    return { held, raw, cappedByCeiling: false, ceiling: null, source: 'server' };
  }
  const { baselineAt, ceilings } = readResourceStash(profile.workforceData);
  if (!baselineAt || !ceilings) return { held: raw, raw, cappedByCeiling: false, ceiling: null, source: 'raw' };
  const ceiling = ceilings[slug];
  if (typeof ceiling !== 'number') return { held: raw, raw, cappedByCeiling: false, ceiling: null, source: 'raw' };
  const held = Math.min(raw, Math.max(0, Math.floor(ceiling)));
  return { held, raw, cappedByCeiling: held < raw, ceiling, source: 'ceiling' };
}
