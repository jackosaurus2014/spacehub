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

import type { GameState, BuildingDefinition, BuildingInstance } from './types';
import { getPowerByLocation, BUILDING_MAP } from './buildings';
import { getEffectiveMaintenancePerMonth } from './flagship-economics';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from './upgrades';
import {
  canStartMarkUpgrade, getMarkLevel, getMarkRevenueMultiplier, getMarkMaintenanceMultiplier,
  getMarkUpgradeCost, getMarkUpgradeSeconds, getMarkUpgradeResourceCost,
  type MarkLevel, type MarkUpgradeCheck,
} from './mark-upgrades';
import { getCongestionMaintenanceMultiplier } from './spatial-strategy';
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

  // Early-fab wave: mirror the tick's congestion pricing so the card's
  // projection is honest at crowded slot-pool locations.
  // D5: flagship upkeep floor (>= $20B buildings) so the card never promises
  // the authored sticker maintenance a flagship no longer pays.
  const maintenance = getEffectiveMaintenancePerMonth(def) * getCongestionMaintenanceMultiplier(state, locationId);
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

// ─── D4: Mark refit cost/benefit preview ─────────────────────────────────────
// The "should I refit THIS building" card. Same pools-and-recipe posture as
// computeBuildPreview above (structural stack only — pool, saturation
// position, power, hazard damage, the Advanced/Elite ladder — no private
// multipliers), applied to the instance's CURRENT run-rate, then scaled by
// the Mark revenue / maintenance ratios. Because the Mark multipliers are
// pure ratios on this building's own line, the Δ figures are exact relative
// to whatever the excluded multipliers actually are: Δrevenue scales with
// them, Δmaintenance does not, so the payback shown is a conservative
// (upper) bound on months whenever the player has revenue bonuses.

export interface MarkUpgradePreview {
  instanceId: string;
  definitionId: string;
  currentLevel: MarkLevel;
  target: MarkLevel | null;
  check: MarkUpgradeCheck;
  cost: number;
  seconds: number;
  resourceCost: Record<string, number>;
  currentRevenueMonthly: number;
  nextRevenueMonthly: number;
  deltaRevenueMonthly: number;
  currentMaintenanceMonthly: number;
  nextMaintenanceMonthly: number;
  deltaMaintenanceMonthly: number;
  deltaNetMonthly: number;
  /** Months to recover `cost` from deltaNetMonthly, or null when the refit
   *  would LOSE money at the current run-rate (the honest answer for a thin-
   *  margin service — the button still renders, the preview says "never"). */
  paybackMonths: number | null;
}

/** Structural-stack monthly revenue for one built instance (helper shared
 *  by the Mark preview; mirrors the tick's per-service factors that are pure
 *  functions of state). */
function instanceRevenueMonthly(state: GameState, inst: BuildingInstance, def: BuildingDefinition): number {
  const monthIndex = gameDateToMonthIndex(state.gameDate);
  const powerByLocation = getPowerByLocation(state.buildings || []);
  const powerRatio = def.powerRequired && powerByLocation[inst.locationId]
    ? powerByLocation[inst.locationId].ratio
    : 1;
  // Saturation position = this instance's index among same-definition
  // buildings at the location (the tick counts per (service, location)
  // bucket in activeServices order, which follows build order).
  const siblings = (state.buildings || []).filter(b => b.isComplete && b.definitionId === def.id && b.locationId === inst.locationId);
  const pos = Math.max(0, siblings.findIndex(b => b.instanceId === inst.instanceId));
  const hazardDamageFactor = Math.max(0.25, 1 - 0.75 * (inst.damagePct || 0));
  let revenue = 0;
  for (const svcId of def.enabledServices || []) {
    const sDef = SERVICE_MAP.get(svcId);
    if (!sDef) continue;
    const mult = getServiceDemandMultiplier(state, svcId, inst.locationId, monthIndex);
    revenue += sDef.revenuePerMonth * serviceSaturationMultiplier(pos) * mult * powerRatio * hazardDamageFactor;
  }
  return revenue * getUpgradeRevenueMultiplier(inst.upgradeLevel || 0);
}

/**
 * Cost/benefit preview for refitting `instanceId` to its next Mark. Pure;
 * returns null for an unknown instance/definition. `check.allowed` tells the
 * UI whether the button is live; the money/Δ figures are filled either way
 * so a gated card can still show what the refit WOULD do.
 */
export function computeMarkUpgradePreview(state: GameState, instanceId: string): MarkUpgradePreview | null {
  const inst = (state.buildings || []).find(b => b.instanceId === instanceId);
  if (!inst) return null;
  const def = BUILDING_MAP.get(inst.definitionId);
  if (!def) return null;
  const currentLevel = getMarkLevel(inst);
  const check = canStartMarkUpgrade(inst, def, state.completedResearch || []);
  const target = check.target;
  const baseRevenue = instanceRevenueMonthly(state, inst, def);
  const baseMaint = getEffectiveMaintenancePerMonth(def)
    * getCongestionMaintenanceMultiplier(state, inst.locationId)
    * getMaintenanceMultiplier(inst.upgradeLevel || 0);
  const curRev = baseRevenue * getMarkRevenueMultiplier(currentLevel);
  const curMaint = baseMaint * getMarkMaintenanceMultiplier(currentLevel);
  const nextRev = target ? baseRevenue * getMarkRevenueMultiplier(target) : curRev;
  const nextMaint = target ? baseMaint * getMarkMaintenanceMultiplier(target) : curMaint;
  const cost = target ? getMarkUpgradeCost(def, target) : 0;
  const deltaRev = nextRev - curRev;
  const deltaMaint = nextMaint - curMaint;
  const deltaNet = deltaRev - deltaMaint;
  return {
    instanceId,
    definitionId: def.id,
    currentLevel,
    target,
    check,
    cost,
    seconds: target ? getMarkUpgradeSeconds(def, target) : 0,
    resourceCost: target ? getMarkUpgradeResourceCost(def, target) : {},
    currentRevenueMonthly: Math.round(curRev),
    nextRevenueMonthly: Math.round(nextRev),
    deltaRevenueMonthly: Math.round(deltaRev),
    currentMaintenanceMonthly: Math.round(curMaint),
    nextMaintenanceMonthly: Math.round(nextMaint),
    deltaMaintenanceMonthly: Math.round(deltaMaint),
    deltaNetMonthly: Math.round(deltaNet),
    paybackMonths: target && deltaNet > 0 ? Math.ceil(cost / deltaNet) : null,
  };
}
