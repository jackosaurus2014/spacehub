// ─── Space Tycoon: Build-card live P&L preview (M1/F9) ──────────────────────
// docs/MEANINGFUL_2026-08.md §5 M1.4. Pre-M1, build-menu tooltips carried
// hand-authored payback claims ("$35M/mo net", "payback ~23 months") written
// before demand pools (E4) and input consumption (E3) existed. The sim
// harness's build-menu sweep (scripts/sim-strategies.ts) showed real
// first-copy paybacks ranging from 7 months to "never" — nothing like the
// static prose promised. Per the spec: "Every tooltip's economics paragraph
// must be regenerated from the live formulas (or replaced by a live P&L
// preview — better)." This module IS that live preview: one pure function
// computing a build card's projected first-month net using the SAME
// functions the live tick actually calls —
//   - getServiceDemandMultiplier (service-pricing.ts) for the pool
//     multiplier at THIS location, from the player's real current demand-pool
//     snapshot (or the deterministic local fallback for solo/offline play —
//     identical resolution order the tick uses).
//   - serviceSaturationMultiplier (formulas.ts) for the within-location
//     duplicate curve, keyed off how many of this building the player already
//     has at this location (so the 5th satellite's preview differs correctly
//     from the 1st's).
//   - the location's CURRENT power ratio (getPowerByLocation) — honestly
//     reflects today's power balance, not a hypothetical fully-built-out one.
//   - RESOURCE_MAP base price for recipe input cost (consumesPerMonth) — the
//     floor cost of the 'market' supply policy, same anchor the sim harness
//     uses; NOT a live spot read (deliberately conservative/simple so the
//     number stays cheap to compute on every render).
//   - corporateOverheadMonthly's MARGINAL delta (formulas.ts) — what this
//     ONE additional building actually adds to the superlinear overhead
//     sink, not the fleet's total overhead.
//
// Deliberately excluded: the ~14 private multiplier stack (research,
// commanders, legacy, era, corporation tier, megastructures, reputation,
// workforce bonuses, random events). Those are real and do move the number,
// but are numerous and change independently of location — folding them in
// would make this module a second copy of game-engine.ts's entire tick with
// all the drift risk that implies. The preview is honestly labeled as a
// pools-and-recipe estimate (BuildPanel shows "at current pools, before
// research/commander bonuses") rather than silently overclaiming precision —
// exactly the F9 principle: "if a promise can't be computed honestly, show a
// range or drop it." This estimate is ALWAYS a lower bound in practice,
// since every excluded multiplier is >= 1.0 for revenue and <= 1.0 for costs
// (BALANCE.md's stacking-cap design keeps every bonus non-negative).

import type { GameState, BuildingDefinition } from './types';
import { getPowerByLocation } from './buildings';
import { SERVICE_MAP } from './services';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { serviceSaturationMultiplier, corporateOverheadMonthly, scaledBuildingCost } from './formulas';
import { getServiceDemandMultiplier } from './service-pricing';
import { gameDateToMonthIndex } from './demand-pools';

export interface BuildPreview {
  /** Scaled cost of THIS copy (accounts for existing-count cost scaling). */
  scaledCost: number;
  projectedRevenueMonthly: number;
  projectedOperatingCostMonthly: number;
  projectedInputCostMonthly: number;
  projectedMaintenanceMonthly: number;
  /** Marginal overhead this ONE building adds (fleet overhead is superlinear
   *  in building count — this is overhead(N+1) - overhead(N), not the total). */
  projectedOverheadDeltaMonthly: number;
  projectedNetMonthly: number;
  /** Pool multiplier for this building's primary service at this location,
   *  or null if the building enables no revenue service (pure infrastructure
   *  like a solar farm with no direct service, or a producer-only recipe). */
  poolMultiplier: number | null;
  /** Months to recover scaledCost from projectedNetMonthly, or null when net
   *  <= 0 ("never" — the honest F1-era answer for a trap purchase). */
  paybackMonths: number | null;
}

/**
 * Live "if I build this HERE, right now" preview. Pure given (state, def,
 * locationId) — same state in, same preview out, so it's safe to call on
 * every render (BuildPanel calls it once per visible card).
 */
export function computeBuildPreview(
  state: GameState,
  def: BuildingDefinition,
  locationId: string,
): BuildPreview {
  const existingCountAtLocation = (state.buildings || []).filter(
    b => b.definitionId === def.id && b.locationId === locationId,
  ).length;
  const monthIndex = gameDateToMonthIndex(state.gameDate);

  const powerByLocation = getPowerByLocation(state.buildings || []);
  const powerRatio = def.powerRequired && powerByLocation[locationId]
    ? powerByLocation[locationId].ratio
    : 1; // no power requirement, or an unlimited-power location (Earth)

  let revenue = 0;
  let operating = 0;
  let poolMultiplier: number | null = null;
  for (const svcId of def.enabledServices || []) {
    const sDef = SERVICE_MAP.get(svcId);
    if (!sDef) continue;
    operating += sDef.operatingCostPerMonth;
    const mult = getServiceDemandMultiplier(state, svcId, locationId, monthIndex);
    if (poolMultiplier === null) poolMultiplier = mult;
    revenue += sDef.revenuePerMonth * serviceSaturationMultiplier(existingCountAtLocation) * mult * powerRatio;
  }

  let inputCost = 0;
  if (def.consumesPerMonth) {
    for (const [resId, amt] of Object.entries(def.consumesPerMonth)) {
      const price = RESOURCE_MAP.get(resId as ResourceId)?.baseMarketPrice || 0;
      inputCost += amt * price;
    }
  }

  const maintenance = def.maintenanceCostPerMonth;
  const completedCount = (state.buildings || []).filter(b => b.isComplete).length;
  const overheadDelta = corporateOverheadMonthly(completedCount + 1) - corporateOverheadMonthly(completedCount);

  const scaledCost = scaledBuildingCost(def.baseCost, existingCountAtLocation);
  const net = revenue - operating - inputCost - maintenance - overheadDelta;

  return {
    scaledCost,
    projectedRevenueMonthly: Math.round(revenue),
    projectedOperatingCostMonthly: Math.round(operating),
    projectedInputCostMonthly: Math.round(inputCost),
    projectedMaintenanceMonthly: Math.round(maintenance),
    projectedOverheadDeltaMonthly: Math.round(overheadDelta),
    projectedNetMonthly: Math.round(net),
    poolMultiplier,
    paybackMonths: net > 0 ? Math.ceil(scaledCost / net) : null,
  };
}
