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
//   - the location's power ratio (getPowerByLocation) WITH THIS BUILD'S OWN
//     draw counted (see the power-visibility note below) — what the tick will
//     actually apply the month after this thing finishes, not the emptier
//     balance that exists while it is still on the pad.
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
import { getPowerByLocation, BUILDING_MAP, isUnlimitedPowerLocation } from './buildings';
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

// ─── Power visibility (2026-09-13, founder report) ─────────────────────
// "Energy needs should be more obvious. In the build section for the various
// satellites it doesn't show any energy needs that I can see. We should warn
// players about that up front."
//
// Two things were wrong, both fixed here:
//
//  1. The preview COMPUTED a power ratio and then threw the facts away —
//     nothing came back for the UI to render, so no build card in the game
//     ever mentioned power. BuildPower (below) is the whole balance sheet.
//
//  2. It used the ratio as it stands BEFORE the build, and only when the
//     definition itself carried powerRequired. Both diverged from the tick:
//     game-engine.ts §1 multiplies EVERY service at a location by that
//     location's ratio (`locPower ? locPower.ratio : 1`), whatever the owning
//     building's own power fields say — and by the time revenue is earned,
//     this building's draw is part of the location's `required`. So the first
//     8 MW station at an empty orbit previewed at full revenue and then
//     earned nothing. The preview now scales by the AFTER ratio, for every
//     service, exactly as the tick will.

export interface PowerBalance {
  generated: number;
  required: number;
  /** min(1, generated/required); 1 when nothing here draws power. */
  ratio: number;
}

export interface BuildPower {
  /** This definition's own draw, MW. 0 when it needs none. */
  powerRequired: number;
  /** What this definition ADDS to local supply, MW (generators only). */
  powerGenerated: number;
  /** Earth surface: grid power, never metered. Everything below reads as
   *  fully powered and the UI should say "unlimited" rather than a ratio. */
  unlimited: boolean;
  /** The location's balance right now, this build not counted. */
  before: PowerBalance;
  /** The balance once this build completes — its draw AND its generation
   *  included. This is the ratio the tick will use. */
  after: PowerBalance;
  /** The fraction of authored service revenue this build will actually earn
   *  at this location once complete (=== after.ratio). 1 = full. */
  revenueScale: number;
  /** MW of additional generation needed at this location to reach ratio 1
   *  after this build. 0 when the site is covered. */
  shortfallMW: number;
}

/** Why a projection is negative, when the cause is STRUCTURAL rather than
 *  "this building is just expensive". Empty when the build projects a profit
 *  or when nothing structural is dragging it down. */
export interface BuildLossReason {
  kind: 'power' | 'demand_pool' | 'saturation' | 'congestion';
  /** One sentence, written for the card. */
  text: string;
}

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
  /** Everything the card needs to talk about energy BEFORE the money is
   *  spent. Always present, including for buildings that draw nothing — the
   *  location's ratio is location-wide, so it still governs their revenue. */
  power: BuildPower;
  /** Structural explanations for a negative projection. Populated only when
   *  projectedNetMonthly <= 0. */
  lossReasons: BuildLossReason[];
}

/** The location's power balance before/after adding one copy of `def`. Pure.
 *  Exported so the Outliner can describe a starved location with the exact
 *  same arithmetic (pass a zero draw — nothing in flight). */
export function computeBuildPower(
  powerByLocation: Record<string, PowerBalance>,
  def: Pick<BuildingDefinition, 'powerRequired' | 'powerGenerated'>,
  locationId: string,
): BuildPower {
  const unlimited = isUnlimitedPowerLocation(locationId);
  const current = powerByLocation[locationId];
  const before: PowerBalance = current
    ? { generated: current.generated, required: current.required, ratio: current.ratio }
    : { generated: 0, required: 0, ratio: 1 };
  const powerRequired = def.powerRequired || 0;
  const powerGenerated = def.powerGenerated || 0;
  const generated = before.generated + powerGenerated;
  const required = before.required + powerRequired;
  const ratio = unlimited || required <= 0 ? 1 : Math.min(1, generated / required);
  return {
    powerRequired,
    powerGenerated,
    unlimited,
    before: unlimited ? { generated: 0, required: 0, ratio: 1 } : before,
    after: unlimited ? { generated: 0, required: 0, ratio: 1 } : { generated, required, ratio },
    revenueScale: ratio,
    shortfallMW: unlimited ? 0 : Math.max(0, required - generated),
  };
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
  const power = computeBuildPower(powerByLocation, def, locationId);
  // Location-wide, exactly like game-engine.ts §1 — NOT gated on this
  // definition carrying powerRequired, and counting this build's own draw.
  const powerRatio = power.revenueScale;

  const saturation = serviceSaturationMultiplier(existingCountAtLocation);
  let revenue = 0;
  let operating = 0;
  let poolMultiplier: number | null = null;
  for (const svcId of def.enabledServices || []) {
    const sDef = SERVICE_MAP.get(svcId);
    if (!sDef) continue;
    operating += sDef.operatingCostPerMonth;
    const mult = getServiceDemandMultiplier(state, svcId, locationId, monthIndex);
    if (poolMultiplier === null) poolMultiplier = mult;
    revenue += sDef.revenuePerMonth * saturation * mult * powerRatio;
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
  const congestionMult = getCongestionMaintenanceMultiplier(state, locationId);
  const maintenance = getEffectiveMaintenancePerMonth(def) * congestionMult;
  const completedCount = (state.buildings || []).filter(b => b.isComplete).length;
  const overheadDelta = corporateOverheadMonthly(completedCount + 1) - corporateOverheadMonthly(completedCount);

  const scaledCost = scaledBuildingCost(def.baseCost, existingCountAtLocation);
  const net = revenue - operating - inputCost - maintenance - overheadDelta;

  // Why is it negative? A number alone teaches nothing — name the structural
  // cause when there is one. The founder's Lunar Gateway projected
  // -$20,049,763/mo and the card said only "LOSS-MAKING".
  const lossReasons: BuildLossReason[] = [];
  if (net <= 0) {
    const earnsRevenue = (def.enabledServices || []).length > 0;
    if (earnsRevenue && power.revenueScale < 1) {
      lossReasons.push({
        kind: 'power',
        text: power.after.generated === 0
          ? `Nothing generates power at this location — service revenue scales to 0% while ${power.after.required} MW goes unmet.`
          : `Power shortfall: ${power.after.generated} of ${power.after.required} MW generated here, so service revenue scales to ${Math.round(power.revenueScale * 100)}%.`,
      });
    }
    if (earnsRevenue && poolMultiplier !== null && poolMultiplier < 1) {
      lossReasons.push({
        kind: 'demand_pool',
        text: `The demand pool for this service here is saturated (${poolMultiplier.toFixed(2)}x) — the customers are already being served.`,
      });
    }
    if (earnsRevenue && existingCountAtLocation > 0 && saturation < 1) {
      lossReasons.push({
        kind: 'saturation',
        text: `Copy #${existingCountAtLocation + 1} here earns ${Math.round(saturation * 100)}% of what the first copy earns (duplicate saturation).`,
      });
    }
    if (congestionMult > 1) {
      lossReasons.push({
        kind: 'congestion',
        text: `This location is congested — maintenance runs at ${congestionMult.toFixed(2)}x the sticker rate.`,
      });
    }
  }

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
    power,
    lossReasons,
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
  // Location-wide ratio, like the tick (game-engine.ts §1). This instance is
  // already built, so the location's `required` already counts its own draw.
  const powerRatio = powerByLocation[inst.locationId]?.ratio ?? 1;
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
