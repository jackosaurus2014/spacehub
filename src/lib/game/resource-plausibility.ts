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
import { getResearchBonuses, getResearchBucketCap, RESEARCH_CAP_MAX_TIER, RESEARCH_BUCKET_MAGNITUDE_SCALE } from './research-tree';
import { getWorkforceBonuses, getStaffingEfficiency, STAFFING_FLOOR } from './workforce';
// 2026-09-13 gross tightening (docs/SECURITY_AUDIT_2026-09.md "Monthly gross
// — verified terms"): the persisted row already knows the corporation's
// tier, its era eligibility, its commander roster, its legacy reach and
// which buildings are mothballed. Those terms stop being assumed at cap.
import { CORPORATION_TIERS, getTierBonuses, tierFromProfileScalars } from './corporation-tiers';
import { ERA_MIN_CORPORATION_TIER } from './corporate-eras';
import {
  COMMANDER_DEFS, RARITY_MAGNITUDE, MAX_LEVEL, LEVEL_MAGNITUDE_BONUS_PER_LEVEL, RETIREMENT_SERVICE_MS,
  type CommanderDefinition,
} from './commanders';
import { LEGACY_MILESTONES, STRETCH_LEGACIES, LEGACY_CATEGORY_CAPS } from './legacy-system';
import { isBuildingOperational, REACTIVATION_SPINUP_MONTHS } from './mothball';
import { getMiningRevenueScale } from './mining-pricing';
// 2026-09-14 mining valuation (docs/SECURITY_AUDIT_2026-09.md "C-2 follow-up
// 5"): the money path prices mined output at the anti-cornering BAND, and at
// the live spot when the caller can supply one. Same band helper the client
// snapshot is built with, so the two can never drift.
import { clampSpotToBand } from './spot-price';
import { SUBSIDIARY_DEFS } from './subsidiaries';
import { frontierRevenueMultiplierUpperBound } from './frontier';
// CC-2 (Pass 11): the seated HQ's launch-revenue term must be in the
// ceiling too, or a LEO deck's +12% would read as implausible on sync (the
// 2026-09-12 Frontier lesson). Same helper, same Frontier cap as the client.
import { getHqBonuses, hqServiceRevenueMult, maxHqBonusesForCeiling, DEFAULT_HQ_STAGE, type HqBonuses, type HqStageId } from './headquarters';

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

// ─── The MONEY path's mining constants (2026-09-14) ────────────────────────
// `MAX_BUILDING_MINING_CLIENT_MULT` above belongs to the RESOURCE clamp: it
// bounds how many UNITS the client could have accumulated, is multiplied by
// `RESOURCE_SLACK` (3) before it clamps anything, and rides the flow lens —
// which measures the freighter and survey-probe terms from the persisted ships
// and the live bonus list for real (resource-flow.ts:373-378). That clamp runs
// in shadow mode on its own evidence
// (docs/RESOURCE_CLAMP_FALSE_POSITIVE_AUDIT.md) and must not be re-tuned from
// the money path.
//
// The money path is a different measurement of the same chain. It values
// `MINING_PRODUCTION` NAMEPLATE units (not the flow lens), so the two terms the
// lens measures are invisible to it and have to be allowed for; and it carries
// no `RESOURCE_SLACK`, so a term left at an under-bound here rejects honest
// income instead of merely logging a shadow row. Hence a SEPARATE product
// below — changing one constant must never silently move the other.

/** resource-flow.ts `freighterLogisticsBonus` — +10% per idle transport /
 *  tanker parked at the rig's location, capped at +50%. The flow lens reads
 *  the real ships; the nameplate valuation cannot, so it allows the cap.
 *  (Absent from `MAX_BUILDING_MINING_CLIENT_MULT` for exactly that reason.) */
export const MAX_FREIGHTER_LOGISTICS_MINING_MULT = 1.5;

/** exploration.ts — survey-probe mining bonuses SUM per (location, resource)
 *  and the largest single anomaly is +50% ("Kuiper Belt Deposit", 60 months),
 *  so `MAX_SURVEY_PROBE_MULT` (1.35, sized for one *average* probe and
 *  backstopped by RESOURCE_SLACK on the resource path) is not an upper bound
 *  on the money path. Two concurrent probes at the registry maximum is the
 *  documented allowance here. */
export const MAX_MONEY_PATH_SURVEY_PROBE_MULT = 2.0;

/** The money path's own product of the §0c building-mining chain's
 *  client-only terms. Identical to `MAX_BUILDING_MINING_CLIENT_MULT` except
 *  for the two terms above — spelled out rather than derived from it so a
 *  future edit to either constant is a deliberate, visible choice. */
export const MAX_MONEY_PATH_MINING_CLIENT_MULT =
  MAX_WORKFORCE_MINING_MULT
  * MAX_RESEARCH_MINING_MULT
  * MAX_LEGACY_MINING_MULT
  * MAX_ERA_MINING_MULT
  * MAX_TIER_MINING_MULT
  * MAX_MEGASTRUCTURE_MINING_MULT
  * MAX_REPUTATION_MINING_MULT
  * MAX_COMMANDER_MINING_MULT
  * MAX_WAVE_B_MINING_MULT
  * MAX_MONEY_PATH_SURVEY_PROBE_MULT
  * MAX_FREIGHTER_LOGISTICS_MINING_MULT;

/**
 * Headroom over the live spot price when the caller supplies one.
 *
 * WHY 1.5 AND NOT MORE. The engine prices mined output at the client's last
 * `marketSnapshot` (mining-pricing.ts `priceLinkedMiningRevenue`), which is the
 * shared `MarketResource` rows as of the PREVIOUS sync — so the spot this
 * function reads at sync N and the spot the tick charged during [N-1, N] are
 * not the same number, and the ceiling must cover the gap. Every spot in the
 * game is band-clamped to `[base × 0.3, base × 3.0]` (price-band.ts, enforced
 * by `buildMarketSnapshot` before the snapshot is sent and by `clampSpotToBand`
 * everywhere it is read), so the widest possible gap is bounded by the band.
 *
 * The clamp that consumes this number multiplies it by `MONEY_HEADROOM_MULT`
 * = 2.0 (ledger-reconcile.ts). 2.0 × 1.5 = 3.0 = `PRICE_BAND_HIGH`: for any
 * resource whose live spot sits at or above its base price, the ceiling's
 * effective per-unit price allowance is therefore at least the band MAXIMUM —
 * no price move the game permits can make the money ceiling reject honest
 * mining income. Raising this constant buys nothing; lowering it breaks that
 * identity.
 */
export const MINING_SPOT_HEADROOM_MULT = 1.5;

/**
 * The per-unit price the ceiling values one unit of mined `resourceId` at.
 *
 * `livePrice` is `MarketResource.currentPrice` for that slug (the sync route
 * reads the table — see `ServerMonthlyGrossInputs.marketPrices`). Resolution:
 *
 *   no live price → the BAND maximum, `min(maxPrice, base × 3)`. This is the
 *                   hardest ceiling any surface in the game can pay, and it
 *                   replaces the old `max(maxPrice, baseMarketPrice)`:
 *                   `maxPrice` is authored at ~10× base (resources.ts), i.e.
 *                   3.3× above a price the engine can never charge.
 *   live price    → `max(live, min(bandMax, max(base, live) × HEADROOM))`.
 *                   Floored at `base` because a Frontier save's spot floor and
 *                   the post-graduation glide (mining-pricing.ts) price a
 *                   below-base spot back up toward base; floored at `live`
 *                   itself so a DB row whose own band is wider than the static
 *                   registry's can never under-report.
 */
export function miningCeilingUnitPrice(resourceId: string, livePrice?: number | null): number {
  const rd = RESOURCE_MAP.get(resourceId as never) as
    { baseMarketPrice?: number; minPrice?: number; maxPrice?: number } | undefined;
  const base = Math.max(0, rd?.baseMarketPrice || 0);
  const minPrice = Math.max(0, rd?.minPrice || 0);
  const maxPrice = Math.max(base, rd?.maxPrice || 0);
  // clampSpotToBand(+huge) IS the band's upper bound — one definition site.
  const bandMax = clampSpotToBand(Number.MAX_SAFE_INTEGER, base, minPrice, maxPrice);
  const live = typeof livePrice === 'number' && Number.isFinite(livePrice) && livePrice > 0 ? livePrice : 0;
  if (live <= 0) return bandMax;
  return Math.max(live, Math.min(bandMax, Math.max(base, live) * MINING_SPOT_HEADROOM_MULT));
}

/** Nameplate $/game-month for one `mining_output` service before any
 *  multiplier: Σ(MINING_PRODUCTION units × `miningCeilingUnitPrice`) × the
 *  service's authored revenue/base-value scale (mining-pricing.ts). */
export function miningOutputNameplateValue(
  definitionId: string,
  marketPrices?: Record<string, number> | null,
): number {
  let valued = 0;
  for (const { resource, amountPerMonth } of MINING_PRODUCTION[definitionId] || []) {
    valued += amountPerMonth * miningCeilingUnitPrice(resource, marketPrices?.[resource]);
  }
  let scale = 1;
  try { scale = getMiningRevenueScale(definitionId); } catch { scale = 1; }
  return valued * scale;
}

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
// ─── 2026-09-13: the gross reads the row, not the cap table ─────────────────
// The allowance rail in ledger-reconcile.ts is derived from this number, so
// "every multiplier at its cap" (~1,821x nameplate) was handing every profile
// ~3.4x more allowance than the flat rail it replaced. Each of the terms
// below now reads what the persisted GameProfile actually proves; only the
// ones the row genuinely cannot answer stay at a documented maximum.
//
// SERVER-VERIFIED (evaluated from the row):
//   * service definitions, the linked building's upgrade + Mark level,
//     station-bonus buildings at the location  (as before)
//   * completed research (serviceRevenueBonus) — now at the row's OWN
//     corporation tier, because Row 8 grows the aggregate bucket cap
//     +15%/tier (the old flat 0.50 clamp UNDER-reported a tier-2+ corp)
//   * workforce head-counts (serviceRevenue) — with trainingLevel/fatigue at
//     their most generous values, since neither is persisted
//   * corporation tier — `tierFromProfileScalars` on the ledger-backed
//     totalEarned, +TIER_CEILING_SLACK rungs
//   * corporate era — gated: an era cannot be chartered below tier 3
//   * commanders — the sanitized roster in `workforceData._commanders`, each
//     at MAX_LEVEL, with the engine's own per-class 0.88^i stacking
//   * megastructure revenue multiplier — only the definitions whose
//     `minMoney` gate totalEarned has cleared (this was the single largest
//     term in the all-caps product, ~10.7x)
//   * legacy revenue — the soft cap evaluated against totalEarned
//     (`stretch_revenue`) and profile age (`stretch_leader_legacy`)
//   * mothball status — a service whose own building is mothballed earns
//     nothing until a REACTIVATION_SPINUP_MONTHS spin-up completes
//   * headquarters seat (CC-2/CC-3) and the Frontier doubling (Pass 10)
//   * mining_output rigs: tier / research / megastructure / era /
//     logistician-commander / crew terms of the §0c mining chain
//   * mining_output PRICE (2026-09-14): the live `MarketResource.currentPrice`
//     the caller supplies, plus MINING_SPOT_HEADROOM_MULT and bounded by the
//     anti-cornering band. Was the resource's authored `maxPrice` (~10x base),
//     a price no surface in the game can pay.
//
// STILL AN ALLOWANCE (no server-side evidence exists — see
// `multiplierTerms.allowance` on the report):
//   reputation (1.40), corporate doctrine (1.03), random-event effects
//   (2.00), crew morale (1.15), the engine-capped wave-B stack (2.00),
//   demand scarcity (1.25), the returning-commander boost (1.30), the
//   megastructure PASSIVE income and subsidiary income allowances (gated on
//   totalEarned but not otherwise checkable), and the mining chain's
//   reputation / wave-B / stacked-survey-probe / freighter-logistics terms
//   (MAX_MONEY_PATH_MINING_CLIENT_MULT), plus the mining price headroom.
// World-event bonuses (server-delivered, clampWorldEventBonuses) touch only
// research speed and contract payouts, never service revenue, so they are
// deliberately absent from this chain.
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
/** research-tree.ts getResearchBucketCap('revenue', tier) — the aggregate
 *  research revenue bucket is 0.50 at tier 1 and GROWS +15% of base per tier
 *  (Row 8), so the real ceiling at tier 7 is +95%, not +50%. Before
 *  2026-09-13 this constant was 1.5 and the gross clamped the term there —
 *  an UNDER-bound for any tier-2+ corporation, i.e. a latent "reject honest
 *  income" bug of exactly the class this module exists to avoid. It is now
 *  the top-of-ladder value and only used as the fallback; the live term is
 *  `serverResearchServiceRevenueMult`, evaluated at the row's own tier. */
export const MAX_RESEARCH_SERVICE_REVENUE_MULT = 1 + getResearchBucketCap('revenue', RESEARCH_CAP_MAX_TIER);
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
// ─── Commanders: derived from the registry, then read from the row ──────────
// commanders.ts is fully deterministic here: a hired commander's class
// decides which multiplier it feeds, its rarity + level decide the magnitude
// (`effectiveMagnitude` = RARITY_MAGNITUDE + (level-1) x 0.01, level <= 5),
// the i-th commander of a class contributes x 0.88^i (`stackingContribution`)
// and the trait pack is clamped at TRAIT_BONUS_CAP. The roster itself is
// capped by `getHireCap` = 2 + corporationTier (<= 9) and duplicates are
// refused (`canHire`: "Already hired").
//
// The ROW carries the roster: sync/route.ts stashes the sanitized commander
// ids in `workforceData._commanders` (registry-checked, deduped, capped at
// SYNC_MAX_COMMANDERS = 30 — well above the in-game hire cap, so it never
// truncates an honest roster). So this term is now MEASURED, not assumed.

/** commanders.ts TRAIT_BONUS_CAP — not exported there; cited here. */
const COMMANDER_TRAIT_BONUS_CAP = 0.15;
/** commanders.ts stackingContribution — 0.88^i for the i-th of a class. */
const COMMANDER_STACKING_BASE = 0.88;
/** commanders.ts computeCommanderBonuses — the classes that feed
 *  `revenueMultiplier`. Every other class feeds build / research / mining. */
const COMMANDER_REVENUE_CLASSES = new Set(['diplomat', 'magnate', 'commander']);
/** commanders.ts computeCommanderBonuses — the class that feeds
 *  `miningMultiplier`. */
const COMMANDER_MINING_CLASSES = new Set(['logistician']);
/** The most a single commander of this definition can ever contribute:
 *  its rarity magnitude at MAX_LEVEL. */
const commanderMaxMagnitude = (def: CommanderDefinition): number =>
  (RARITY_MAGNITUDE[def.rarity] || 0) + (MAX_LEVEL - 1) * LEVEL_MAGNITUDE_BONUS_PER_LEVEL;
const magnitudesFor = (classes: Set<string>): number[] => COMMANDER_DEFS
  .filter(d => classes.has(d.class))
  .map(commanderMaxMagnitude)
  .sort((a, b) => b - a);
/** Revenue-class definitions, largest max-magnitude first. */
const COMMANDER_REVENUE_MAGNITUDES: number[] = magnitudesFor(COMMANDER_REVENUE_CLASSES);
const COMMANDER_MINING_MAGNITUDES: number[] = magnitudesFor(COMMANDER_MINING_CLASSES);
/** commanders.ts getHireCap — `2 + corporationTier`. */
const commanderHireCap = (tier: number): number => 2 + Math.max(1, Math.floor(tier || 1));

/**
 * Upper bound on `commanderBonuses.revenueMultiplier` for a roster the
 * server has NOT seen, at a given corporation tier: the `hireCap` largest
 * revenue-class magnitudes summed WITHOUT the 0.88^i stacking decay (so it
 * dominates every real class arrangement), plus the trait cap.
 */
function maxCommanderMultForTier(magnitudes: number[], tier: number): number {
  const slots = Math.max(0, Math.min(magnitudes.length, commanderHireCap(tier)));
  let sum = 0;
  for (let i = 0; i < slots; i++) sum += magnitudes[i];
  return 1 + sum + COMMANDER_TRAIT_BONUS_CAP;
}
export function maxCommanderRevenueMultForTier(tier: number): number {
  return maxCommanderMultForTier(COMMANDER_REVENUE_MAGNITUDES, tier);
}

/** The registry-wide bound (top tier, best roster). Before 2026-09-13 this
 *  was a flat ASSUMED 2.0, which the definitions do not actually support —
 *  six legendary `commander`-class hires alone reach +107% before traits. */
export const MAX_COMMANDER_REVENUE_MULT = maxCommanderRevenueMultForTier(
  CORPORATION_TIERS.reduce((m, t) => Math.max(m, t.tier), 1),
);

/**
 * The revenue multiplier a KNOWN roster can reach: each commander at
 * MAX_LEVEL, the engine's own per-class 0.88^i stacking, the trait cap, plus
 * one extra best-in-registry commander of head-room (the player may hire one
 * more between syncs — the roster is one sync stale by construction).
 * `null` ids (no stash on the row) fall back to the tier bound above.
 */
function serverCommanderMult(
  ids: string[] | null | undefined, tier: number, classes: Set<string>, magnitudes: number[],
): number {
  const tierBound = maxCommanderMultForTier(magnitudes, tier);
  if (!Array.isArray(ids)) return tierBound;
  const byClass = new Map<string, number[]>();
  for (const id of ids) {
    const def = COMMANDER_DEFS.find(d => d.id === id);
    if (!def || !classes.has(def.class)) continue;
    byClass.set(def.class, [...(byClass.get(def.class) || []), commanderMaxMagnitude(def)]);
  }
  let sum = 0;
  byClass.forEach(mags => {
    mags.sort((a, b) => b - a);
    for (let i = 0; i < mags.length; i++) sum += mags[i] * Math.pow(COMMANDER_STACKING_BASE, i);
  });
  // One un-synced hire of headroom, undiscounted.
  sum += magnitudes[0] || 0;
  return Math.min(tierBound, 1 + sum + COMMANDER_TRAIT_BONUS_CAP);
}

export function serverCommanderRevenueMult(ids: string[] | null | undefined, tier: number): number {
  return serverCommanderMult(ids, tier, COMMANDER_REVENUE_CLASSES, COMMANDER_REVENUE_MAGNITUDES);
}

/** The mining half — `logistician` hires feed `miningMultiplier`. */
export function serverCommanderMiningMult(ids: string[] | null | undefined, tier: number): number {
  return serverCommanderMult(ids, tier, COMMANDER_MINING_CLASSES, COMMANDER_MINING_MAGNITUDES);
}

/** Read the sanitized commander roster the sync stashed on the row
 *  (`workforceData._commanders`). `null` when the row does not carry one. */
export function readStashedCommanderIds(workforceData: unknown): string[] | null {
  if (!workforceData || typeof workforceData !== 'object' || Array.isArray(workforceData)) return null;
  const raw = (workforceData as Record<string, unknown>)._commanders;
  if (!Array.isArray(raw)) return null;
  return raw.filter((x): x is string => typeof x === 'string');
}
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

/** Product of every client-only term in the §1 service revenue chain, with
 *  EVERY term at its documented maximum. This is the "nothing known about
 *  this profile" bound — the fallback each verified term below degrades to,
 *  and the number the 2026-09-13 audit quotes as the theoretical ceiling. */
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

// ─── Verified terms (2026-09-13): read the row, don't assume the cap ────────
// docs/SECURITY_AUDIT_2026-09.md "Monthly gross — verified terms". The
// allowance rail in ledger-reconcile.ts is now derived from this gross, so a
// gross that assumes every multiplier is maxed hands every profile ~1,821x
// its nameplate of allowance. Each helper below replaces one such assumption
// with what the persisted GameProfile actually proves, and each degrades to
// its old cap when the row cannot answer. Every one of them is an UPPER
// bound on what the engine's own tick can pay for that state — that
// direction is the whole contract (see the conservatism test in
// __tests__/server-monthly-gross.test.ts).

/** corporation-tiers.ts — the top rung of the ladder. */
export const MAX_CORPORATION_TIER: number = CORPORATION_TIERS.reduce((m, t) => Math.max(m, t.tier), 1);

/** Extra tiers granted beyond the one the persisted `totalEarned` proves.
 *  The row is one sync stale, so a corporation can cross a tier gate inside
 *  the window; the gates are 10x apart in totalEarned, so one rung of slack
 *  covers any single window. Cheap insurance: adjacent tiers differ by <=5
 *  percentage points of revenue bonus. */
export const TIER_CEILING_SLACK = 1;

/**
 * The highest corporation tier this row could possibly be playing at.
 * `tierFromProfileScalars` with ONLY the money leg supplied is already an
 * upper bound (every count requirement reads as satisfied); +1 rung absorbs
 * a promotion since the last sync. Never below the real tier.
 */
export function serverCorporationTierBound(totalEarned: number): number {
  const earned = Number.isFinite(totalEarned) && totalEarned > 0 ? totalEarned : 0;
  let tier: number;
  try { tier = tierFromProfileScalars({ totalEarned: earned }); } catch { return MAX_CORPORATION_TIER; }
  return Math.max(1, Math.min(MAX_CORPORATION_TIER, tier + TIER_CEILING_SLACK));
}

/** corporation-tiers.ts `bonuses.revenueBonus` at the row's own tier —
 *  1.00 for a Startup, 1.20 only at the top rung (was: always 1.20). */
export function serverTierRevenueMult(tier: number): number {
  try { return 1 + Math.max(0, getTierBonuses(tier).revenueBonus || 0); }
  catch { return MAX_TIER_REVENUE_MULT; }
}

/** corporation-tiers.ts `bonuses.miningBonus` at the row's own tier. */
export function serverTierMiningMult(tier: number): number {
  try { return 1 + Math.max(0, getTierBonuses(tier).miningBonus || 0); }
  catch { return MAX_TIER_MINING_MULT; }
}

/** corporate-eras.ts canCharterEra — an era cannot be chartered below
 *  ERA_MIN_CORPORATION_TIER (3), so a Startup's era term is exactly 1.0. */
export function serverEraRevenueMult(tier: number): number {
  return tier < ERA_MIN_CORPORATION_TIER ? 1 : MAX_ERA_REVENUE_MULT;
}

/** research-tree.ts: how much the repeatable programs alone can add to the
 *  `revenue` bucket (maxLevel x per-level magnitude x the Row-8 bucket
 *  scale). Repeatable LEVELS are client-only state, so this is the one
 *  research term that stays an allowance — derived from the definitions, so
 *  it is 0 when no repeatable feeds the bucket and self-updates if one is
 *  added. Today: one program (deep_space_network_expansion), ~0.6 points. */
export const MAX_REPEATABLE_RESEARCH_BY_BUCKET: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const def of RESEARCH) {
    const rep = (def as { repeatable?: { maxLevel: number; effectPerLevel: { type: string; magnitude: number }[] } }).repeatable;
    if (!rep || !(rep.maxLevel > 0)) continue;
    for (const eff of rep.effectPerLevel || []) {
      const scale = (RESEARCH_BUCKET_MAGNITUDE_SCALE as Record<string, number>)[eff.type] ?? 1;
      out[eff.type] = (out[eff.type] || 0) + Math.max(0, eff.magnitude) * scale * rep.maxLevel;
    }
  }
  return out;
})();
/** @deprecated Use MAX_REPEATABLE_RESEARCH_BY_BUCKET.revenue. */
export const MAX_REPEATABLE_RESEARCH_REVENUE: number = MAX_REPEATABLE_RESEARCH_BY_BUCKET.revenue || 0;

/**
 * The research service-revenue term for THIS row: the engine's own
 * `getResearchBonuses` over the persisted completed-research list, evaluated
 * at the row's tier (Row 8 grows the bucket cap +15%/tier) plus the
 * repeatable allowance, re-clamped at that same bucket cap.
 */
export function serverResearchServiceRevenueMult(completedResearch: string[] | null | undefined, tier: number): number {
  const cap = getResearchBucketCap('revenue', tier);
  try {
    const base = getResearchBonuses(Array.isArray(completedResearch) ? completedResearch : [], undefined, tier).serviceRevenueBonus || 0;
    return 1 + Math.min(cap, Math.max(0, base) + (MAX_REPEATABLE_RESEARCH_BY_BUCKET.revenue || 0));
  } catch { return 1 + cap; }
}

/** Same, for the mining bucket (feeds the mining_output service valuation). */
export function serverResearchMiningMult(completedResearch: string[] | null | undefined, tier: number): number {
  const cap = getResearchBucketCap('mining', tier);
  try {
    const base = getResearchBonuses(Array.isArray(completedResearch) ? completedResearch : [], undefined, tier).miningOutputBonus || 0;
    return 1 + Math.min(cap, Math.max(0, base) + (MAX_REPEATABLE_RESEARCH_BY_BUCKET.mining || 0));
  } catch { return 1 + cap; }
}

/**
 * personal-megastructures.ts: every definition gates on
 * `prerequisites.minMoney` (>= $25B, up to $200B) and the bonus MULTIPLIES
 * across owned structures — which is why the all-caps product is ~10.7x, the
 * single largest term in MAX_SERVICE_REVENUE_CLIENT_MULT. `totalEarned` is
 * server-persisted and monotonic, and is >= any balance the profile ever
 * held, so a definition whose gate it has not reached CANNOT be owned. Same
 * posture the passive-income allowance in the gross has used since day one.
 */
export function serverMegastructureRevenueMult(totalEarned: number): number {
  const earned = Number.isFinite(totalEarned) && totalEarned > 0 ? totalEarned : 0;
  let prod = 1;
  for (const def of MEGASTRUCTURES) {
    if (earned < (def.prerequisites?.minMoney || 0)) continue;
    let best = 1;
    for (const ph of def.phases || []) best = Math.max(best, ph.interimBonuses?.revenueMultiplier || 1);
    best = Math.max(best, def.completionBonus?.revenueMultiplier || 1);
    prod *= best;
  }
  return prod;
}

/** Same gate, for the mining half. */
export function serverMegastructureMiningMult(totalEarned: number): number {
  const earned = Number.isFinite(totalEarned) && totalEarned > 0 ? totalEarned : 0;
  let prod = 1;
  for (const def of MEGASTRUCTURES) {
    if (earned < (def.prerequisites?.minMoney || 0)) continue;
    let best = 1;
    for (const ph of def.phases || []) best = Math.max(best, ph.interimBonuses?.miningMultiplier || 1);
    best = Math.max(best, def.completionBonus?.miningMultiplier || 1);
    prod *= best;
  }
  return prod;
}

// ─── Legacy: the soft cap, evaluated against what the row can reach ─────────
// legacy-system.ts: `revenueMultiplier = 1 + cap x (1 - e^(-raw/100/cap))`
// with cap 5.0, and `raw` is the sum of (a) the fixed milestones' revenue
// bonusValues and (b) the revenue STRETCH families' logarithmic levels.
// Taking the whole 5.0 (the old flat x6) ignores that both inputs are
// bounded by things the server persists:
//   * every fixed revenue milestone, all of them, is only ~55 points;
//   * `stretch_revenue` levels are a pure function of totalEarned
//     ($10B x 5^n) — server-persisted;
//   * `stretch_leader_legacy` levels are 3 retired leaders each, and a
//     retirement needs RETIREMENT_SERVICE_MS (60 REAL days) of continuous
//     assignment, with at most `getHireCap` = 2 + tier commanders on the
//     clock at once — so profile AGE (GameProfile.createdAt) bounds it.
// A profile whose age the server does not know falls back to the flat cap.

const LEGACY_REVENUE_CAP = LEGACY_CATEGORY_CAPS.revenue;

/** legacy-system.ts getCategoryBonus — the convergent soft cap. */
export function legacyRevenueMultFromPoints(points: number): number {
  const raw = Number.isFinite(points) && points > 0 ? points : 0;
  return 1 + LEGACY_REVENUE_CAP * (1 - Math.exp(-(raw / 100) / LEGACY_REVENUE_CAP));
}

/** legacy-system.ts getCategoryRaw — Σ basePercent x ln(1 + n/2), n = 1..level. */
function stretchPoints(basePercent: number, level: number): number {
  let total = 0;
  for (let n = 1; n <= level; n++) total += basePercent * Math.log(1 + n * 0.5);
  return total;
}

/** legacy-system.ts checkStretchProgress — the level a progress value buys. */
function stretchLevelFor(getRequirement: (n: number) => number, progress: number): number {
  let n = 0;
  while (n < 1000 && progress >= getRequirement(n + 1)) n++;
  return n;
}

/** Every fixed milestone in the revenue category, all assumed earned. */
export const MAX_LEGACY_FIXED_REVENUE_POINTS: number = LEGACY_MILESTONES
  .filter(m => m.bonusCategory === 'revenue')
  .reduce((sum, m) => sum + Math.max(0, m.bonusValue || 0), 0);

/**
 * The revenue-legacy multiplier this row can reach.
 * `profileAgeMs` is `now - GameProfile.createdAt`; omit it (or omit
 * totalEarned) and the answer is the flat MAX_LEGACY_REVENUE_MULT.
 */
export function serverLegacyRevenueMult(totalEarned: number, profileAgeMs?: number, tier: number = MAX_CORPORATION_TIER): number {
  if (!Number.isFinite(profileAgeMs as number) || (profileAgeMs as number) < 0) return MAX_LEGACY_REVENUE_MULT;
  const earned = Number.isFinite(totalEarned) && totalEarned > 0 ? totalEarned : 0;
  // Retirements the wall clock allows: hire-cap commanders can each finish a
  // 60-day term per 60-day wave, and a retired leader's seat can be refilled.
  const waves = Math.floor((profileAgeMs as number) / RETIREMENT_SERVICE_MS);
  const maxRetiredLeaders = waves * commanderHireCap(tier);
  let points = MAX_LEGACY_FIXED_REVENUE_POINTS;
  for (const s of STRETCH_LEGACIES) {
    if (s.bonusCategory !== 'revenue') continue;
    let level: number;
    if (s.id === 'stretch_revenue') level = stretchLevelFor(s.getRequirement, earned) + 1;
    else if (s.id === 'stretch_leader_legacy') level = stretchLevelFor(s.getRequirement, maxRetiredLeaders) + 1;
    // A revenue stretch family this function does not know how to bound must
    // never be silently assumed away — fall back to the flat cap.
    else return MAX_LEGACY_REVENUE_MULT;
    points += stretchPoints(s.basePercent, level);
  }
  return Math.min(MAX_LEGACY_REVENUE_MULT, legacyRevenueMultFromPoints(points));
}

/** The mining half of the same soft cap stays at its documented maximum —
 *  the mining milestones ride trackers (units mined, ships built) the server
 *  does not persist. Declared here so the mining bound below reads plainly. */
export const MAX_LEGACY_MINING_MULT_UNVERIFIED = MAX_LEGACY_MINING_MULT;

/**
 * mothball.ts: a service whose OWN linked building is not operational earns
 * exactly zero this tick (game-engine.ts §1 `if (ownerBld &&
 * !isBuildingOperational(ownerBld)) continue`). Reactivation is not instant
 * — `reactivateBuilding` flips a mothballed building to 'reactivating' and
 * the shared server clock only returns it to 'active' after
 * REACTIVATION_SPINUP_MONTHS. So over a window of `elapsedMonths` a
 * MOTHBALLED building can bill for at most (elapsedMonths - spin-up) of
 * them, and the rate bound is that fraction. 'reactivating' /
 * 'decommissioning' get no reduction (either can be operational again within
 * the window), and an unknown window gets none either.
 */
export function mothballedRevenueFraction(status: string | undefined, elapsedMonths: number | undefined): number {
  if (status !== 'mothballed') return 1;
  if (elapsedMonths === undefined || !Number.isFinite(elapsedMonths)) return 1;
  const m = Math.max(0, elapsedMonths);
  if (m <= REACTIVATION_SPINUP_MONTHS) return 0;
  return (m - REACTIVATION_SPINUP_MONTHS) / m;
}

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
  /** `GameProfile.createdAt` (ms). Pass 10: the Frontier service-revenue
   *  doubling is bounded server-side from this timestamp alone
   *  (frontier.ts frontierRevenueMultiplierUpperBound) — absent = 1.0. */
  createdAtMs?: number;
  /** Wall clock for the Frontier bound; defaults to Date.now(). */
  nowMs?: number;
  /** CC-2: the seated headquarters stage (GameProfile.hqLocationId →
   *  headquarters.ts). Absent = Earth (neutral launch term). Pass
   *  'unknown' to take the ladder's largest launch bonus as the bound. */
  hqStage?: HqStageId | 'unknown';
  /** 2026-09-13: wall clock since `GameProfile.lastSyncAt`. Used ONLY to
   *  bound the mothball term (a mothballed building needs a
   *  REACTIVATION_SPINUP_MONTHS spin-up before it can bill again). Absent =
   *  mothballed services are counted at their full rate. */
  elapsedMs?: number;
  /** 2026-09-14: live `MarketResource.currentPrice` by resource slug — the
   *  same rows `buildMarketSnapshot` prices the client's snapshot from. Used
   *  ONLY by the `mining_output` valuation (`miningCeilingUnitPrice`). Absent
   *  (or a slug missing from the map) falls back to that resource's BAND
   *  maximum, which is still 3.3x tighter than the pre-2026-09-14
   *  `max(maxPrice, baseMarketPrice)`. This function stays pure — the sync
   *  route does the read. */
  marketPrices?: Record<string, number> | null;
}

/** The per-term breakdown of the non-definition multiplier applied to
 *  service revenue. `verified` terms were read off the persisted row;
 *  `allowance` terms are the ones the server still cannot check. */
export interface GrossMultiplierTerms {
  verified: Record<string, number>;
  allowance: Record<string, number>;
}

export interface ServerMonthlyGrossReport {
  /** Theoretical-max gross revenue per game-month, all terms. */
  gross: number;
  services: number;
  megastructurePassive: number;
  subsidiaries: number;
  /** Pass 10: the Frontier multiplier bound applied to `services`. */
  frontierRevenueMult: number;
  /** CC-2: the HQ launch-revenue term applied to launch_payload services
   *  (after the Frontier stacking cap). Kept as the headline number the
   *  ceiling tests assert on; CC-3's colony / Mars / outer / science terms
   *  ride the same helper, per service. */
  hqLaunchRevenueMult: number;
  /** 2026-09-13: the corporation tier the row proves (+TIER_CEILING_SLACK). */
  serverTier: number;
  /** 2026-09-13: Σ of the services' own nameplate revenue per game-month
   *  (mining_output valued at band-max price), BEFORE any multiplier. The
   *  denominator of the "multiple over nameplate" the audit reports. */
  nameplate: number;
  /** 2026-09-13: the product of every non-definition multiplier applied to
   *  service revenue — `services / nameplate` for a single-service row. */
  clientMultiplierBound: number;
  /** 2026-09-13: what each of those terms was, and whether it was read off
   *  the row or left as a bounded allowance. */
  multiplierTerms: GrossMultiplierTerms;
  /** 2026-09-14: how `mining_output` nameplate was priced this call.
   *  `'live'` = `inputs.marketPrices` supplied a spot for at least one mined
   *  resource; `'band-max'` = none were available and every unit was valued
   *  at `min(maxPrice, base x 3)`; `'none'` = the row owns no mining rig. */
  miningPriceSource: 'live' | 'band-max' | 'none';
  /** 2026-09-14: the multiplier the mining chain was bounded by, after the
   *  row-verified terms were divided back out of
   *  `MAX_MONEY_PATH_MINING_CLIENT_MULT`. 0 when the row owns no mining rig. */
  miningClientMultiplierBound: number;
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
  const nowMs = inputs.nowMs ?? Date.now();

  // ── Terms the persisted row proves (2026-09-13) ───────────────────────────
  // Corporation tier: `tierFromProfileScalars` on the ledger-backed
  // totalEarned, plus one rung of slack for a promotion inside the window.
  const serverTier = serverCorporationTierBound(totalEarned);
  const tierMult = serverTierRevenueMult(serverTier);
  // Eras cannot be chartered below tier 3 (corporate-eras.ts).
  const eraMult = serverEraRevenueMult(serverTier);
  // Commanders: the roster the sync stashed, at MAX_LEVEL, with the engine's
  // own per-class stacking. No stash → the hire-cap bound for this tier.
  const commanderIds = readStashedCommanderIds(inputs.workforceData);
  const commanderMult = serverCommanderRevenueMult(commanderIds, serverTier);
  // Megastructures: only the definitions whose minMoney gate totalEarned has
  // actually cleared (the same gate the passive-income allowance uses).
  const megastructureMult = serverMegastructureRevenueMult(totalEarned);
  // Legacy: the soft cap evaluated against totalEarned (stretch_revenue) and
  // profile age (stretch_leader_legacy), not taken whole.
  const profileAgeMs = typeof inputs.createdAtMs === 'number' && Number.isFinite(inputs.createdAtMs)
    ? Math.max(0, nowMs - inputs.createdAtMs)
    : undefined;
  const legacyMult = serverLegacyRevenueMult(totalEarned, profileAgeMs, serverTier);

  /** Everything in the §1 chain the server still cannot check, each at its
   *  documented maximum. Listed rather than folded so the audit can read
   *  what remains unverified. */
  const allowanceTerms: Record<string, number> = {
    reputation: MAX_REPUTATION_REVENUE_MULT,     // state.reputation is client-only
    doctrine: MAX_DOCTRINE_REVENUE_MULT,         // corporateDoctrine is client-only
    randomEvents: MAX_EVENT_REVENUE_MULT,        // activeEffects are client-only
    morale: MAX_MORALE_MULT,                     // workforce.morale drifts between syncs
    waveB: MAX_WAVE_B_REVENUE_MULT,              // engine-capped 2.0 (spec/victory/alliance/...)
    demandScarcity: MAX_DEMAND_SCARCITY_MULT,    // engine-capped 1.25
    returningCommander: MAX_RETURNING_COMMANDER_MULT,
  };
  const verifiedTerms: Record<string, number> = {
    legacy: legacyMult, tier: tierMult, era: eraMult,
    commanders: commanderMult, megastructures: megastructureMult,
  };
  let clientMultiplierBound = 1;
  for (const v of Object.values(verifiedTerms)) clientMultiplierBound *= v;
  for (const v of Object.values(allowanceTerms)) clientMultiplierBound *= v;

  // Research (server-known list) — real, at the row's OWN tier (Row 8 grows
  // the aggregate revenue bucket +15%/tier, so clamping at the tier-1 0.50
  // under-reported a tier-2+ corporation's research bonus).
  const researchMult = serverResearchServiceRevenueMult(state.completedResearch || [], serverTier);

  // Workforce head-counts (persisted workforceData) — real when the shape is
  // sane, the documented cap otherwise. `trainingLevel`/`fatigue` are NOT
  // persisted and scale the per-head bonus (workforce.ts `bonusScale`), so
  // they are supplied at their most generous values: the ceiling must not
  // under-report a fully-trained, rested crew.
  let workforceMult = MAX_WORKFORCE_SERVICE_REVENUE_MULT;
  let workforceMiningMult = MAX_WORKFORCE_MINING_MULT;
  const wd = inputs.workforceData;
  if (wd && typeof wd === 'object' && !Array.isArray(wd)) {
    const w = wd as Record<string, unknown>;
    const num = (k: string) => (typeof w[k] === 'number' && Number.isFinite(w[k] as number) && (w[k] as number) > 0 ? (w[k] as number) : 0);
    try {
      const b = getWorkforceBonuses({
        engineers: num('engineers'), scientists: num('scientists'), miners: num('miners'), operators: num('operators'),
        pilots: num('pilots'), negotiators: num('negotiators'), securitys: num('securitys'), medics: num('medics'),
        trainingLevel: 1, fatigue: 0,
      } as unknown as NonNullable<GameState['workforce']>);
      workforceMult = 1 + Math.min(MAX_WORKFORCE_SERVICE_REVENUE_MULT - 1, Math.max(0, b.serviceRevenue || 0));
      workforceMiningMult = 1 + Math.min(MAX_WORKFORCE_MINING_MULT - 1, Math.max(0, b.miningOutput || 0));
    } catch { workforceMult = MAX_WORKFORCE_SERVICE_REVENUE_MULT; workforceMiningMult = MAX_WORKFORCE_MINING_MULT; }
  }

  // Mining_output services carry their own multiplier chain (the §0c mining
  // stack), so the same verified terms apply there too. The rest of that
  // chain stays at documented caps — but at the MONEY path's own caps
  // (MAX_MONEY_PATH_MINING_CLIENT_MULT, see its header): the resource
  // clamp's MAX_BUILDING_MINING_CLIENT_MULT runs in shadow mode on its own
  // evidence and is deliberately not re-tuned from here, and it is missing
  // the freighter/stacked-probe terms this path cannot measure.
  const miningClientMult = MAX_MONEY_PATH_MINING_CLIENT_MULT
    * (serverTierMiningMult(serverTier) / MAX_TIER_MINING_MULT)
    * (serverResearchMiningMult(state.completedResearch || [], serverTier) / MAX_RESEARCH_MINING_MULT)
    * (serverMegastructureMiningMult(totalEarned) / MAX_MEGASTRUCTURE_MINING_MULT)
    // An era cannot be chartered below tier 3 (same gate as the revenue half).
    * ((serverTier < ERA_MIN_CORPORATION_TIER ? 1 : MAX_ERA_MINING_MULT) / MAX_ERA_MINING_MULT)
    // The logistician half of the stashed roster.
    * (serverCommanderMiningMult(commanderIds, serverTier) / MAX_COMMANDER_MINING_MULT)
    // Crew: the same persisted head-counts, at the most generous training.
    * (workforceMiningMult / MAX_WORKFORCE_MINING_MULT);

  // The window the mothball term is measured against (see
  // mothballedRevenueFraction). Absent → mothballed services bill in full.
  const elapsedMonthsForMothball = typeof inputs.elapsedMs === 'number' && Number.isFinite(inputs.elapsedMs)
    ? elapsedGameMonths(inputs.elapsedMs)
    : undefined;

  // Pass 10: Frontier service-revenue doubling, bounded from createdAt (see
  // frontier.ts). Without this term every new corporation's doubled income
  // would be rejected as implausible on sync.
  const frontierRevenueMult = frontierRevenueMultiplierUpperBound(inputs.createdAtMs, inputs.nowMs ?? Date.now());
  // CC-2/CC-3: the seated HQ's service terms, from the SAME helper the tick
  // and the P&L call (headquarters.ts hqServiceRevenueMult — it applies the
  // Frontier stacking cap itself). `hqStage: 'unknown'` takes the ladder's
  // best value per term, so an unknown seat can only ever widen the ceiling.
  const hqBonuses: HqBonuses = inputs.hqStage === 'unknown'
    ? maxHqBonusesForCeiling()
    : getHqBonuses(inputs.hqStage ?? DEFAULT_HQ_STAGE);
  const hqLaunchRevenueMult = hqServiceRevenueMult(hqBonuses, { definitionId: '', locationId: '', type: 'launch_payload' }, frontierRevenueMult);

  let services = 0;
  let nameplate = 0;
  // 2026-09-14: how the mining half was priced, reported for the audit.
  let miningServiceCount = 0;
  const livePriceCount = inputs.marketPrices && typeof inputs.marketPrices === 'object'
    ? Object.values(inputs.marketPrices).filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0).length
    : 0;
  for (const svc of state.activeServices || []) {
    if (!svc || typeof svc.definitionId !== 'string') continue;
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    // Wave M2 / 2026-09-13: the engine pays this service NOTHING while its
    // own linked building is not operational (game-engine.ts §1). A
    // mothballed building needs REACTIVATION_SPINUP_MONTHS on the shared
    // server clock before it can bill again, so over a window shorter than
    // that the service is provably worth zero; over a longer one it is
    // pro-rated. Unknown window (or no owner building) → billed in full.
    const ownerBld = Array.isArray(svc.linkedBuildingIds) && svc.linkedBuildingIds.length > 0
      ? (state.buildings || []).find(b => b && svc.linkedBuildingIds.includes(b.instanceId))
      : undefined;
    const operabilityFraction = ownerBld && !isBuildingOperational(ownerBld)
      ? mothballedRevenueFraction((ownerBld as { status?: string }).status, elapsedMonthsForMothball)
      : 1;
    if (operabilityFraction <= 0) continue;
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
    // A service instance's own multiplier is not carried on the persisted
    // row (sync-validation.ts SyncService keeps definitionId / locationId /
    // linkedBuildingIds only), so it reads 1 — and is floored at 1 so a
    // future row that does carry it can never NARROW the ceiling.
    const rawInst = typeof svc.revenueMultiplier === 'number' && Number.isFinite(svc.revenueMultiplier) ? svc.revenueMultiplier : 1;
    const instMult = Math.min(MAX_SERVICE_INSTANCE_MULT, Math.max(1, rawInst));
    let base = def.revenuePerMonth || 0;
    if (def.type === 'mining_output') {
      // Price-linked mining (mining-pricing.ts): nameplate units x the
      // ceiling's per-unit price x the service's authored scale, with the
      // mining multiplier chain bounded by `miningClientMult` (tier /
      // research / megastructure / era / logistician / crew read off the row,
      // the rest at the money path's documented caps).
      //
      // 2026-09-14: the per-unit price was the resource's authored `maxPrice`
      // (~10x base), a figure NO surface in the game can ever pay — every
      // spot is band-clamped to base x 3. It is now the live spot plus
      // MINING_SPOT_HEADROOM_MULT where the caller supplied one, and the band
      // maximum where it did not. `Math.max(base, ...)` keeps the authored
      // flat `revenuePerMonth` as a floor, because a save still inside the
      // M3 grandfather window blends the two (blendMiningBaseRevenue).
      miningServiceCount++;
      base = Math.max(base, miningOutputNameplateValue(svc.definitionId, inputs.marketPrices) * miningClientMult);
    }
    nameplate += base;
    services += base * operabilityFraction * instMult * upgradeBoost * researchMult * workforceMult
      * (1 + stationBonusAt(state, svc.locationId)) * clientMultiplierBound
      // CC-2/CC-3: the identical per-service HQ term the tick applied.
      * hqServiceRevenueMult(hqBonuses, { definitionId: svc.definitionId, locationId: svc.locationId, type: def.type }, frontierRevenueMult);
  }
  services *= frontierRevenueMult;

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
    frontierRevenueMult,
    hqLaunchRevenueMult,
    serverTier,
    nameplate: Math.round(nameplate),
    clientMultiplierBound,
    multiplierTerms: { verified: verifiedTerms, allowance: allowanceTerms },
    miningPriceSource: miningServiceCount === 0 ? 'none' : (livePriceCount > 0 ? 'live' : 'band-max'),
    miningClientMultiplierBound: miningServiceCount === 0 ? 0 : miningClientMult,
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
  // Row 6 (docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 6): the flow lens now
  // multiplies mining by the crew-staffing efficiency (0.5–1.0). A CEILING
  // must not: the player can hire crew at any moment between syncs, so the
  // upper bound is the fully-crewed figure. Dividing the term straight back
  // out keeps the ceiling exactly as tight as it was before crew existed
  // (never looser — the quotient is 1 for a fully-staffed corporation).
  const staffingDivisor = Math.max(
    STAFFING_FLOOR,
    Math.min(1, getStaffingEfficiency(state, false) || 1),
  );
  for (const flow of report.flows) {
    let total = 0;
    for (const c of flow.contributions) {
      if (c.perMonth <= 0) continue;
      const mult = CLIENT_MULT_BY_KIND[c.kind];
      if (!mult) continue;
      const staffingNeutral = (c.kind === 'mining' || c.kind === 'ship_mining')
        ? c.perMonth / staffingDivisor
        : c.perMonth;
      total += staffingNeutral * mult;
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
