// ─── Space Tycoon: Price-Linked Mining Revenue (Meaningful Decisions Wave M3) ─
// docs/MEANINGFUL_2026-08.md §M3 — finding F3 ("mining's cash revenue is
// market-blind"). `mining_output` services (svc_mining_*) used to earn a
// flat authored `revenuePerMonth` with zero connection to the shared market
// price — extraction pressure braked only the minor "sell your leftover ore"
// resource stream (the audit measured that stream at ~15% of a rig's total
// income). A commodity crash could not touch a miner's dominant cash flow,
// and dumping (M5's O2) had no teeth against mining income specifically.
//
// Design (no re-authoring of MINING_PRODUCTION's per-resource amounts, which
// were never meant to carry revenue-scale meaning — they're an inventory
// mix, not a dollar figure; re-deriving a scale from them keeps this wave
// additive to M1's tier-ladder tuning instead of reopening it):
//
//   revenue = Σ_resource( unitsThisTick_resource × spot_resource ) × scale
//   scale   = revenuePerMonth / Σ_resource( amountPerMonth_resource × basePrice_resource )
//
// `scale` is a pure function of static authored data (service revenue +
// MINING_PRODUCTION + resource base prices), so at NEUTRAL conditions (spot
// === base price, extraction pressure 1.0, no mining-output bonuses) the new
// formula reproduces the EXACT old flat number — M1's first-copy-ROI sweep
// and the tier ladder it fixed are untouched on day one. From there the
// formula is fully reactive: a spot-price crash, a depleted deposit
// (extraction pressure), or a mining-output bonus (specialization/alliance/
// commander/etc.) now moves CASH revenue directly — none of those touched
// the flat number before this wave.
//
// `unitsThisTick` is supplied BY THE CALLER (game-engine.ts §1, away-
// operations.ts) rather than computed here: this module stays a pure
// price/scale calculator with no knowledge of freighters, extraction
// pressure, or per-tick fractions, so the two engines can fold in their own
// (already-different, pre-existing) bonus stacks without this file drifting
// out of sync with either.

import { MINING_PRODUCTION, RESOURCE_MAP, type ResourceId } from './resources';
import { SERVICE_MAP } from './services';
import { getSpotPrice, type MarketSnapshot } from './spot-price';

// ─── Revenue scale (memoized — pure function of static authored data) ───────

const scaleCache = new Map<string, number>();

/** revenuePerMonth ÷ Σ(amountPerMonth × basePrice) for a mining_output
 *  service — the constant that makes the price-linked formula reproduce the
 *  old flat number under neutral conditions. Returns 1 for anything that
 *  isn't an authored mining service (defensive; callers only invoke this for
 *  `mining_output` definitionIds). */
export function getMiningRevenueScale(definitionId: string): number {
  const cached = scaleCache.get(definitionId);
  if (cached !== undefined) return cached;
  const def = SERVICE_MAP.get(definitionId);
  const production = MINING_PRODUCTION[definitionId];
  let scale = 1;
  if (def && production && production.length > 0) {
    let baseTotal = 0;
    for (const { resource, amountPerMonth } of production) {
      baseTotal += amountPerMonth * (RESOURCE_MAP.get(resource)?.baseMarketPrice || 0);
    }
    scale = baseTotal > 0 ? def.revenuePerMonth / baseTotal : 1;
  }
  scaleCache.set(definitionId, scale);
  return scale;
}

// ─── Live spot lookup (band-clamped snapshot, base-price fallback) ──────────

/** Live spot for a mined resource: the synced `marketSnapshot` price (already
 *  band-clamped server-side, per spot-price.ts's `buildMarketSnapshot`) when
 *  available, else the authored base price — the spec's "band-clamped,
 *  base-price fallback" resolution order, same posture solo/offline players
 *  get everywhere else spot is read. */
export function getMiningSpotPrice(
  snapshot: MarketSnapshot | null | undefined,
  resourceId: string,
): number {
  const base = RESOURCE_MAP.get(resourceId as ResourceId)?.baseMarketPrice || 0;
  return getSpotPrice(snapshot, resourceId, base) ?? base;
}

// ─── The revenue calculator ──────────────────────────────────────────────────

/**
 * Σ(unitsThisTick_resource × spot_resource) × scale — the price-linked
 * replacement for `def.revenuePerMonth × fraction` for ONE mining_output
 * service instance this tick. `unitsPerResource` is the continuous (not
 * rounded/threshold-gated) units-mined-this-tick figure the caller computes
 * with its own bonus stack; this function only prices and scales it.
 *
 * Balance Pass 3 (docs/BALANCE.md "Pass 3", [FRONTIER] gap fix): pass
 * `opts.frontierSpotFloor: true` for a save currently inside the Protected
 * Frontier — each resource's spot is then floored at its base price, so a
 * market crash (organic or a declared M5 price campaign) can never push a
 * Frontier miner's cash revenue BELOW the authored neutral number, while
 * spot premiums still pay in full. This mirrors service-pricing.ts's
 * demand-pool shield exactly ("premiums still pay, penalties don't bite
 * until graduation") — before this fix, the price-linked mining channel was
 * the one offense-reachable revenue path with NO Frontier shield: a rival's
 * price campaign crashed spot to base×0.3 and flowed straight into a
 * Frontier miner's income. Default off — every existing caller/test is
 * byte-identical.
 */
export interface MiningRevenueOpts {
  frontierSpotFloor?: boolean;
}

export function priceLinkedMiningRevenue(
  definitionId: string,
  unitsPerResource: Partial<Record<string, number>>,
  snapshot: MarketSnapshot | null | undefined,
  opts?: MiningRevenueOpts,
): number {
  const scale = getMiningRevenueScale(definitionId);
  const floorAtBase = opts?.frontierSpotFloor === true;
  let total = 0;
  for (const [resource, units] of Object.entries(unitsPerResource)) {
    if (!units) continue;
    let spot = getMiningSpotPrice(snapshot, resource);
    if (floorAtBase) {
      const base = RESOURCE_MAP.get(resource as ResourceId)?.baseMarketPrice || 0;
      spot = Math.max(spot, base);
    }
    total += units * spot;
  }
  return total * scale;
}

// ─── Extraction duty-cycle opex scaling (Balance Pass 6 — H4, spec'd Pass 2) ─
// docs/BALANCE.md Pass 2 "extraction duty-cycle opex scaling", upgraded to
// ship-with-relaunch by Pass 5 finding H4: a rig on a depleted deposit
// (extraction pressure < 1.0) throttles its duty cycle — output already falls
// with pressure, and now its *operating* cost falls with it too, floored so
// fixed costs never vanish:
//
//   opexMult = clamp(pressure, 0.55, 1.0)   // mining_output
//                                           // operatingCostPerMonth ONLY;
//                                           // maintenance unchanged
//
// Rationale (Pass 2's worked numbers): the 0.4 pressure floor meant a rig
// earned ~40% of nameplate while paying 100% of nameplate opex — the pure
// mining specialist was a trap plateau at every deposit it touched. Scaling
// opex down with duty cycle makes GEOGRAPHIC diversification viable
// (distributed miner −$2.6M → ≈+$13–18M/mo) while single-deposit stacking
// stays punished (belt baron still ≈−$15M/mo) — exactly the "spread out,
// don't strip-mine one rock" gradient E5 wants. Cost-side only: sinks-first
// compatible (zero new generation, zero NPC money).
//
// Multi-resource rigs (most MINING_PRODUCTION entries) weight each deposit's
// pressure by that resource's authored base-value share (amountPerMonth ×
// basePrice — the SAME weights getMiningRevenueScale's denominator uses), so
// the duty cycle follows the rig's economic output mix. When every deposit
// sits at one pressure p this reduces to exactly clamp(p, 0.55, 1.0), the
// Pass-2 spec. First copies at fresh deposits price at pressure 1.0 →
// opexMult 1.0 → the M1 first-copy-ROI guard is structurally unaffected.

export const MINING_OPEX_PRESSURE_FLOOR = 0.55;

/**
 * Duty-cycle operating-cost multiplier for ONE mining_output service
 * instance, from its per-resource deposit pressures ([0.4, 1.0] each —
 * extraction-pressure.ts). `pressureByResource` maps resourceId → pressure;
 * missing resources read as 1.0 (untouched deposit — same default the
 * snapshot read path uses). Non-mining definitionIds (no MINING_PRODUCTION
 * entry) return 1 — defensive, callers only invoke this for mining_output.
 */
export function miningDutyCycleOpexMult(
  definitionId: string,
  pressureByResource: Partial<Record<string, number>>,
): number {
  const production = MINING_PRODUCTION[definitionId];
  if (!production || production.length === 0) return 1;
  let weightTotal = 0;
  let weighted = 0;
  for (const { resource, amountPerMonth } of production) {
    const weight = amountPerMonth * (RESOURCE_MAP.get(resource)?.baseMarketPrice || 0);
    if (weight <= 0) continue;
    const raw = pressureByResource[resource];
    const pressure = typeof raw === 'number' && Number.isFinite(raw)
      ? Math.max(0, Math.min(1, raw))
      : 1;
    weightTotal += weight;
    weighted += weight * pressure;
  }
  if (weightTotal <= 0) return 1;
  const meanPressure = weighted / weightTotal;
  return Math.max(MINING_OPEX_PRESSURE_FLOOR, Math.min(1, meanPressure));
}

// ─── Grandfather blend (§M3 [SAVE] V37) ─────────────────────────────────────
// Existing saves anchor a flat 50/50 blend of the old flat formula and the
// new spot-linked one for 3 game-months from migration, then switch fully to
// the new formula — spec's exact wording ("blend 50/50 for 3 game-months").
// This intentionally does NOT ramp like demand-pools.ts's 25%→100% phase-in:
// the new formula already reproduces the old number at neutral conditions
// (see file header), so the risk being grandfathered here is a sudden swing
// on migration if a save's local market/extraction state is already
// non-neutral — a flat 50% damper for a fixed window covers that without
// needing a multi-step ramp. Null anchor = full new-formula weight
// immediately (fresh games — not a migration penalty, same convention as
// getDemandPoolPhaseInFraction).

export const MINING_PRICE_LINK_PHASE_IN_MONTHS = 3;
export const MINING_PRICE_LINK_GRANDFATHER_BLEND = 0.5;

/** Fraction of the NEW (spot-linked) formula's weight at a world month. */
export function getMiningPriceLinkFraction(
  phaseInStartMonth: number | null | undefined,
  monthIndex: number,
): number {
  if (phaseInStartMonth === null || phaseInStartMonth === undefined) return 1;
  const monthsIn = monthIndex - phaseInStartMonth;
  if (monthsIn >= MINING_PRICE_LINK_PHASE_IN_MONTHS) return 1;
  return MINING_PRICE_LINK_GRANDFATHER_BLEND;
}

/** Blend the old flat base term and the new price-linked base term per the
 *  grandfather fraction above — shared by game-engine.ts §1 and
 *  away-operations.ts so the two engines' blend math can't drift. */
export function blendMiningBaseRevenue(
  oldFlatBase: number,
  newPriceLinkedBase: number,
  phaseInStartMonth: number | null | undefined,
  monthIndex: number,
): number {
  const frac = getMiningPriceLinkFraction(phaseInStartMonth, monthIndex);
  return oldFlatBase * (1 - frac) + newPriceLinkedBase * frac;
}
