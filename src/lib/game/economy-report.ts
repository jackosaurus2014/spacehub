// ─── Space Tycoon: Economy Report ────────────────────────────────────────────
// Pure-function economic breakdown that mirrors the game-engine tick exactly.
// Drives the Dashboard's detailed P&L / balance-sheet / multiplier views.
//
// Read by UI components to surface every line item of economic activity to
// the player. EVE Online-level detail: nothing about the economy is hidden.

import type { GameState } from './types';
import { BUILDING_MAP, getPowerByLocation } from './buildings';
import { SERVICE_MAP } from './services';
import { LOCATION_MAP } from './solar-system';
import { RESOURCE_MAP } from './resources';
import { SHIP_MAP } from './ships';
import { getWorkforceBonuses } from './workforce';
// Wave E5 (docs/ECONOMY_PVP_2026-08.md §2.6/§E5, [BAL] "wages... shown in
// the P&L panel with their inputs"): the report must reflect the SAME
// wage-index-adjusted payroll the live tick actually charges, not the flat
// base-salary figure.
import { getMonthlyPayrollWithWageIndex, getWageIndex } from './labor-market';
import { WORKER_TYPES } from './workforce';
// LS6 (Programs Queue): same effective-workforce + program-bonus merge as
// game-engine.ts's live tick, so the P&L report never disagrees with actual
// tick behavior while a crew cohort is enrolled/completed.
import { getEffectiveWorkforceForBonuses, mergeProgramWorkforceBonuses } from './programs';
import { getResearchBonuses } from './research-tree';
import { DEFAULT_LEGACY, getLegacyBonuses } from './legacy-system';
import { getActiveEraModifiers } from './corporate-eras';
import { getTierBonuses } from './corporation-tiers';
import { getMegastructureBonuses } from './personal-megastructures';
import { getReputationBonuses } from './reputation';
import { getActiveMultipliers } from './random-events';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from './upgrades';
import { computeCommanderBonuses } from './commanders';
import { serviceSaturationMultiplier, corporateOverheadMonthly, executiveCompensationMonthly } from './formulas';
import { isInFrontier, FRONTIER_CONTRACT_PAYOUT_MULTIPLIER, computeBookNetWorth } from './frontier';
import { getTotalSubsidiaryIncome } from './subsidiaries';
import { getGovernorBenefits, getMultiZonePenalty } from './zone-influence';
import { getMonthlyInsurancePremium } from './economic-sinks';
import { calculateRushRepairCost } from './hazards';
// Wave E4 (Finite Demand Pools): the P&L reads THE tick's multiplier source.
import { getServiceDemandMultiplier } from './service-pricing';
import { gameDateToMonthIndex } from './demand-pools';
// Balance Pass 6 (H4): the P&L shows the SAME duty-cycle-scaled mining opex
// the live tick charges (mining-pricing.ts miningDutyCycleOpexMult over the
// synced extraction-pressure snapshot) — never the flat nameplate figure.
import { miningDutyCycleOpexMult } from './mining-pricing';
import { getExtractionPressureMultiplier } from './extraction-pressure';
import { MINING_PRODUCTION } from './resources';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceRevenueLine {
  serviceId: string;
  serviceName: string;
  locationId: string;
  locationName: string;
  instanceCount: number;
  baseRevenuePerMonth: number;       // def.revenuePerMonth × all bonuses EXCEPT saturation
  saturatedRevenuePerMonth: number;  // the final realized revenue
  avgSaturation: number;             // 0-1, avg of per-instance saturationMult
  operatingCost: number;
  netRevenue: number;
}

export interface RevenueMultiplierBreakdown {
  /** (1 + wfBonuses.serviceRevenue) */
  workforce: number;
  /** (1 + resBonuses.serviceRevenueBonus) */
  research: number;
  /** legacyRevMult */
  legacy: number;
  /** LS4: active chartered era's revenue focus term (1.0 = no era / neutral). */
  era: number;
  /** (1 + tierBonuses.revenueBonus) */
  corporationTier: number;
  /** megaBonuses.revenueMultiplier */
  megastructure: number;
  /** repBonuses.revenueMultiplier */
  reputation: number;
  /** commanderBonuses.revenueMultiplier */
  commander: number;
  /** multipliers.revenueMultiplier (random events) */
  event: number;
  /** Combined product of all the above */
  combined: number;
}

export interface CostBreakdown {
  serviceOperating: number;
  buildingMaintenance: number;
  corporateOverhead: number;
  executiveCompensation: number;
  workforcePayroll: number;
  /** Wave F (h): monthly hazard-insurance premium — economic-sinks.ts,
   *  same figure the tick actually charges. 0 when uninsured. */
  insurancePremium: number;
  total: number;
  /** Wave E5 (§2.6/§E5, [BAL] "wages... shown in the P&L panel with their
   *  inputs"): the server-wide wage index per crew type this payroll figure
   *  was computed from — 1.0 for every type when no labor-market snapshot
   *  has arrived yet (neutral, pre-E5 behavior). Transparency, not a new
   *  cost line — workforcePayroll above already has it baked in. */
  wageIndexByType: Partial<Record<string, number>>;
}

/** Wave F (h): P&L lines the audit flagged as real money flows the tick
 *  applies but no report ever showed — surfaced honestly, using the exact
 *  same functions/formulas game-engine.ts uses (A11 "one P&L truth"). */
export interface AdditionalPnLLines {
  /** Territory governor tax collected this month (zone-influence.ts,
   *  mirrors game-engine.ts "6d. Governor tax"). Always >= 0. */
  governorTaxMonthly: number;
  /** Net subsidiary income/loss this month (subsidiaries.ts, mirrors
   *  game-engine.ts "6c. Subsidiary net income"). Can be negative. */
  subsidiaryIncomeMonthly: number;
  /** Estimated cost to instantly rush-repair ALL currently damaged
   *  buildings/ships at today's damage levels (hazards.ts
   *  calculateRushRepairCost — the same 30%-per-full-damage-fraction rate
   *  the passive monthly auto-repair uses). This is a standing balance, not
   *  a monthly charge — the tick heals it down gradually unless rushed. */
  outstandingRepairCost: number;
}

export interface BalanceSheet {
  cash: number;
  resourceInventoryValue: number;
  infrastructureValue: number;  // sum of building base costs
  shipValue: number;
  netWorth: number;
}

export interface ContractStats {
  completed: number;
  defaulted: number;
  completedRevenue: number;
  defaultedRepLoss: number;
}

export interface EconomyReport {
  // ─── Headline numbers ──────────────────────────
  monthlyRevenue: number;
  monthlyCosts: number;
  monthlyNet: number;
  /** How many months of operation the cash reserve funds at current burn */
  cashRunwayMonths: number | null;
  profitMargin: number;  // net/revenue, or 0 if no revenue

  // ─── Breakdowns ────────────────────────────────
  revenueLines: ServiceRevenueLine[];
  revenueMultipliers: RevenueMultiplierBreakdown;
  costs: CostBreakdown;
  balance: BalanceSheet;

  // ─── Other multipliers (not revenue) ───────────
  buildSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  miningMultiplier: number;
  maintenanceCostMultiplier: number;   // 1.0 = normal; <1 = reduction

  // ─── Saturation stats ──────────────────────────
  /** Service instances running. Used to compute avg saturation. */
  serviceInstanceCount: number;
  /** Number of distinct (service_id, location_id) buckets with > 1 instance (= actively saturating). */
  saturatingBucketCount: number;

  // ─── Flags & context ───────────────────────────
  hasPowerDeficit: boolean;
  hasSupplyPenalty: boolean;
  avgSupplyMultiplier: number;
  inFrontier: boolean;
  frontierContractBoost: number;   // 1.0 or FRONTIER_CONTRACT_PAYOUT_MULTIPLIER

  // ─── Historical contract performance ───────────
  contractStats: ContractStats;

  // ─── Wave F (h): previously-invisible P&L lines ─
  pnlLines: AdditionalPnLLines;
}

// ─── Compute ─────────────────────────────────────────────────────────────────

/**
 * Build a full economic report from current game state. Pure function —
 * does not mutate state. Mirrors the processTick formula so every number
 * surfaced to the player reflects actual tick behavior.
 */
export function computeEconomyReport(state: GameState, now: number = Date.now()): EconomyReport {
  // All the bonus sources, in the same order as game-engine.ts
  const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
  const wfBonuses = mergeProgramWorkforceBonuses(getWorkforceBonuses(getEffectiveWorkforceForBonuses(state)), state);
  const payroll = getMonthlyPayrollWithWageIndex(workforce, state.laborMarket, now);
  const resBonuses = getResearchBonuses(state.completedResearch, state.repeatableResearchLevels);

  const legacy = state.legacy || DEFAULT_LEGACY;
  const legacyBonuses = getLegacyBonuses(legacy);
  const legacyRevMult = legacyBonuses.revenueMultiplier;
  const legacyCostMult = legacyBonuses.costMultiplier;

  // LS4: active chartered era's bonus/malus pair — neutral 1.0 set if none.
  const eraModifiers = getActiveEraModifiers(state);
  const eraRevMult = eraModifiers.revenueMultiplier;
  const eraCostMult = eraModifiers.costMultiplier;

  const corpTier = state.corporationTier || 1;
  const tierBonuses = getTierBonuses(corpTier);

  const megaBonuses = getMegastructureBonuses(state.megastructures || []);
  const repBonuses = getReputationBonuses(state.reputation || 0);
  const commanderBonuses = computeCommanderBonuses(state.hiredCommanders, state);
  const eventMultipliers = getActiveMultipliers(state);

  const powerData = getPowerByLocation(state.buildings);
  // Wave E4 (Finite Demand Pools): per-service demand-pool multipliers —
  // same helper the live tick uses, so the P&L never disagrees with actual
  // tick behavior. Collected per instance for the supply-pressure summary.
  const demandMonthIndex = gameDateToMonthIndex(state.gameDate);
  const collectedDemandMults: number[] = [];

  // ─── Revenue multiplier breakdown (applies globally to every service) ──
  const revMult: RevenueMultiplierBreakdown = {
    workforce: 1 + wfBonuses.serviceRevenue,
    research:  1 + resBonuses.serviceRevenueBonus,
    legacy:    legacyRevMult,
    era:       eraRevMult,
    corporationTier: 1 + tierBonuses.revenueBonus,
    megastructure: megaBonuses.revenueMultiplier || 1,
    reputation:    repBonuses.revenueMultiplier,
    commander:     commanderBonuses.revenueMultiplier,
    event:         eventMultipliers.revenueMultiplier,
    combined: 1,
  };
  revMult.combined =
    revMult.workforce * revMult.research * revMult.legacy * revMult.era *
    revMult.corporationTier * revMult.megastructure * revMult.reputation *
    revMult.commander * revMult.event;

  // ─── Revenue breakdown, one row per (serviceId, locationId) ────────────
  const bucketMap = new Map<string, ServiceRevenueLine & { instances: number[]; saturationSum: number }>();
  let hasPowerDeficit = false;
  let serviceInstanceCount = 0;
  let totalOperatingCost = 0;

  // Count saturation position in same iteration order as game-engine
  const saturationCounts = new Map<string, number>();

  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    serviceInstanceCount++;
    const bucketKey = `${svc.definitionId}@${svc.locationId}`;
    const saturationPosition = saturationCounts.get(bucketKey) || 0;
    saturationCounts.set(bucketKey, saturationPosition + 1);
    const saturationMult = serviceSaturationMultiplier(saturationPosition);

    // Per-instance-specific multipliers (not globally applicable)
    const linkedBld = state.buildings.find(b =>
      b.isComplete && b.locationId === svc.locationId &&
      BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId),
    );
    const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
    const locPower = powerData[svc.locationId];
    const powerRatio = locPower ? locPower.ratio : 1;
    if (powerRatio < 1) hasPowerDeficit = true;

    const supplyMult = getServiceDemandMultiplier(state, svc.definitionId, svc.locationId, demandMonthIndex);
    collectedDemandMults.push(supplyMult);

    // Station bonus at this location (capped at +50%)
    let stationBonus = 0;
    for (const bld of state.buildings) {
      if (!bld.isComplete || bld.locationId !== svc.locationId) continue;
      const bDef = BUILDING_MAP.get(bld.definitionId);
      if (bDef?.category === 'space_station') stationBonus += 0.15;
    }
    stationBonus = Math.min(stationBonus, 0.5);

    const baseRevenue = Math.round(
      def.revenuePerMonth
      * svc.revenueMultiplier
      * upgradeBoost
      * revMult.combined
      * supplyMult
      * powerRatio
      * (1 + stationBonus),
    );
    const realized = Math.round(baseRevenue * saturationMult);
    // Balance Pass 6 (H4): duty-cycle opex scaling for mining_output —
    // mirrors game-engine.ts §1's miningOpexMult exactly (1.0 elsewhere).
    let miningOpexMult = 1;
    if (def.type === 'mining_output') {
      const pressureByResource: Record<string, number> = {};
      for (const { resource } of MINING_PRODUCTION[svc.definitionId] || []) {
        pressureByResource[resource] = getExtractionPressureMultiplier(state.extractionPressure, svc.locationId, resource);
      }
      miningOpexMult = miningDutyCycleOpexMult(svc.definitionId, pressureByResource);
    }
    const operatingCost = Math.round(
      def.operatingCostPerMonth
      * eventMultipliers.costMultiplier
      * legacyCostMult
      * eraCostMult
      * (1 - tierBonuses.maintenanceReduction)
      * (megaBonuses.maintenanceMultiplier || 1)
      * repBonuses.maintenanceMultiplier
      * miningOpexMult,
    );
    totalOperatingCost += operatingCost;

    const line = bucketMap.get(bucketKey);
    if (line) {
      line.instanceCount++;
      line.baseRevenuePerMonth += baseRevenue;
      line.saturatedRevenuePerMonth += realized;
      line.operatingCost += operatingCost;
      line.saturationSum += saturationMult;
      line.instances.push(saturationMult);
    } else {
      bucketMap.set(bucketKey, {
        serviceId: svc.definitionId,
        serviceName: def.name,
        locationId: svc.locationId,
        locationName: LOCATION_MAP.get(svc.locationId)?.name || svc.locationId,
        instanceCount: 1,
        baseRevenuePerMonth: baseRevenue,
        saturatedRevenuePerMonth: realized,
        operatingCost,
        netRevenue: 0, // filled in below
        avgSaturation: 0,
        saturationSum: saturationMult,
        instances: [saturationMult],
      });
    }
  }

  const revenueLines: ServiceRevenueLine[] = [];
  let monthlyRevenue = 0;
  let saturatingBucketCount = 0;
  bucketMap.forEach(line => {
    line.avgSaturation = line.saturationSum / line.instances.length;
    line.netRevenue = line.saturatedRevenuePerMonth - line.operatingCost;
    if (line.instances.length > 1) saturatingBucketCount++;
    monthlyRevenue += line.saturatedRevenuePerMonth;
    const { instances, saturationSum, ...out } = line;
    revenueLines.push(out);
  });
  revenueLines.sort((a, b) => b.saturatedRevenuePerMonth - a.saturatedRevenuePerMonth);

  // ─── Cost breakdown ────────────────────────────────────────────────────
  let buildingMaintenance = 0;
  let completedBuildingCount = 0;
  let infrastructureValue = 0;
  for (const bld of state.buildings) {
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    if (bld.isComplete) {
      completedBuildingCount++;
      const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
      buildingMaintenance += Math.round(
        def.maintenanceCostPerMonth
        * eventMultipliers.costMultiplier
        * maintMult
        * (1 - resBonuses.maintenanceReduction)
        * legacyCostMult
        * eraCostMult
        * (1 - tierBonuses.maintenanceReduction)
        * (megaBonuses.maintenanceMultiplier || 1)
        * repBonuses.maintenanceMultiplier,
      );
      infrastructureValue += def.baseCost;
    }
  }

  // M1/F4: exec comp reads book net worth here too — "one P&L truth" (A11)
  // means this display must charge the SAME figure game-engine.ts's live
  // tick actually charges, or the panel would show a stale/wrong number
  // (exactly the F9 tooltip-honesty problem, one level up).
  const runningNetWorth = computeBookNetWorth(state);

  const corporateOverhead = Math.round(
    corporateOverheadMonthly(completedBuildingCount)
    * eventMultipliers.costMultiplier
    * legacyCostMult
    * eraCostMult
    * (1 - tierBonuses.maintenanceReduction)
    * (megaBonuses.maintenanceMultiplier || 1)
    * repBonuses.maintenanceMultiplier,
  );
  const executiveCompensation = Math.round(
    executiveCompensationMonthly(runningNetWorth)
    * eventMultipliers.costMultiplier
    * (1 - tierBonuses.maintenanceReduction),
  );

  // ─── Wave F (h): previously-invisible P&L lines, using the exact same
  // functions/formulas game-engine.ts's tick applies (A11 "one P&L truth"):
  //   - subsidiaries.ts getTotalSubsidiaryIncome (§6c)
  //   - zone-influence.ts getGovernorBenefits/getMultiZonePenalty (§6d)
  //   - economic-sinks.ts getMonthlyInsurancePremium
  //   - hazards.ts calculateRushRepairCost, summed over currently-damaged assets
  const subsidiaryIncomeMonthly = getTotalSubsidiaryIncome(state);

  let governorTaxMonthly = 0;
  const governedZones = (state.zoneStandings || []).filter(z => z.isGovernor);
  if (governedZones.length > 0) {
    const penalty = getMultiZonePenalty(governedZones.length);
    let taxMonthly = 0;
    for (const z of governedZones) {
      const gb = getGovernorBenefits(z.zoneSlug);
      taxMonthly += Math.min(gb.taxCap, gb.taxRate * Math.max(0, z.taxBaseMonthly || 0));
    }
    governorTaxMonthly = Math.round(taxMonthly * penalty);
  }

  const insurancePremium = getMonthlyInsurancePremium(state);

  let outstandingRepairCost = 0;
  for (const bld of state.buildings) {
    if (!bld.isComplete || !bld.damagePct) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (def) outstandingRepairCost += calculateRushRepairCost(bld.damagePct, def.baseCost);
  }
  for (const ship of state.ships || []) {
    if (!ship.isBuilt || !ship.hullDamagePct) continue;
    const sDef = SHIP_MAP.get(ship.definitionId);
    if (sDef) outstandingRepairCost += calculateRushRepairCost(ship.hullDamagePct, sDef.baseCost);
  }

  const pnlLines: AdditionalPnLLines = {
    governorTaxMonthly,
    subsidiaryIncomeMonthly,
    outstandingRepairCost,
  };

  const wageIndexByType: Partial<Record<string, number>> = {};
  for (const wDef of WORKER_TYPES) {
    const count = (workforce[`${wDef.type}s` as keyof typeof workforce] as number | undefined) || 0;
    if (count > 0) wageIndexByType[wDef.type] = getWageIndex(state.laborMarket, wDef.type, now);
  }

  const costs: CostBreakdown = {
    serviceOperating: totalOperatingCost,
    buildingMaintenance,
    corporateOverhead,
    executiveCompensation,
    workforcePayroll: payroll,
    insurancePremium,
    total: totalOperatingCost + buildingMaintenance + corporateOverhead + executiveCompensation + payroll + insurancePremium
      + (subsidiaryIncomeMonthly < 0 ? -subsidiaryIncomeMonthly : 0),
    wageIndexByType,
  };

  monthlyRevenue += governorTaxMonthly + (subsidiaryIncomeMonthly > 0 ? subsidiaryIncomeMonthly : 0);

  const monthlyNet = monthlyRevenue - costs.total;

  // ─── Balance sheet ─────────────────────────────────────────────────────
  let resourceInventoryValue = 0;
  for (const [resId, qty] of Object.entries(state.resources || {})) {
    const def = RESOURCE_MAP.get(resId as never);
    if (def) resourceInventoryValue += (qty as number) * def.baseMarketPrice;
  }

  let shipValue = 0;
  for (const ship of state.ships || []) {
    const sDef = SHIP_MAP.get(ship.definitionId);
    if (sDef && ship.isBuilt) shipValue += sDef.baseCost;
  }

  const balance: BalanceSheet = {
    cash: state.money,
    resourceInventoryValue: Math.round(resourceInventoryValue),
    // infrastructureValue/shipValue below are shown at full (undepreciated)
    // replacement cost — "what you built" — deliberately NOT summed
    // arithmetically into netWorth below. M1/F4: netWorth is the same
    // computeBookNetWorth(state) the wealth tax/Frontier/leagues/espionage
    // brackets use (60% depreciated book), so this panel never shows a
    // richer number than what actually drives those systems.
    infrastructureValue,
    shipValue,
    netWorth: computeBookNetWorth(state),
  };

  // ─── Supply pressure ───────────────────────────────────────────────────
  const hasSupplyPenalty = collectedDemandMults.some(m => m < 0.99);
  const avgSupplyMultiplier = collectedDemandMults.length > 0
    ? collectedDemandMults.reduce((a, b) => a + b, 0) / collectedDemandMults.length
    : 1.0;

  // ─── Historical contract performance (last up-to-100) ──────────────────
  const completedDeliveries = state.completedDeliveries || [];
  let completed = 0, defaulted = 0, completedRevenue = 0, defaultedRepLoss = 0;
  for (const c of completedDeliveries) {
    if (c.status === 'completed') {
      completed++;
      completedRevenue += c.paymentMoney;
    } else if (c.status === 'defaulted') {
      defaulted++;
      defaultedRepLoss += c.reputationOnDefault; // negative
    }
  }

  // ─── Frontier context ──────────────────────────────────────────────────
  const inFrontier = isInFrontier(state, now);

  // ─── Runway ────────────────────────────────────────────────────────────
  let cashRunwayMonths: number | null = null;
  if (monthlyNet < 0) {
    cashRunwayMonths = state.money / Math.max(1, -monthlyNet);
  }

  return {
    monthlyRevenue,
    monthlyCosts: costs.total,
    monthlyNet,
    cashRunwayMonths,
    profitMargin: monthlyRevenue > 0 ? monthlyNet / monthlyRevenue : 0,

    revenueLines,
    revenueMultipliers: revMult,
    costs,
    balance,

    buildSpeedMultiplier: commanderBonuses.buildSpeedMultiplier * legacyBonuses.buildSpeedMultiplier * eraModifiers.buildSpeedMultiplier * (megaBonuses.buildSpeedMultiplier || 1) * repBonuses.buildSpeedMultiplier,
    researchSpeedMultiplier: commanderBonuses.researchSpeedMultiplier * legacyBonuses.researchSpeedMultiplier * eraModifiers.researchSpeedMultiplier * (megaBonuses.researchSpeedMultiplier || 1) * repBonuses.researchSpeedMultiplier,
    miningMultiplier: commanderBonuses.miningMultiplier * legacyBonuses.miningMultiplier * eraModifiers.miningMultiplier * (megaBonuses.miningMultiplier || 1) * repBonuses.miningMultiplier * (1 + tierBonuses.miningBonus) * (1 + resBonuses.miningOutputBonus) * (1 + wfBonuses.miningOutput),
    maintenanceCostMultiplier:
      eventMultipliers.costMultiplier
      * legacyCostMult
      * eraCostMult
      * (1 - tierBonuses.maintenanceReduction)
      * (megaBonuses.maintenanceMultiplier || 1)
      * repBonuses.maintenanceMultiplier,

    serviceInstanceCount,
    saturatingBucketCount,
    hasPowerDeficit,
    hasSupplyPenalty,
    avgSupplyMultiplier,
    inFrontier,
    frontierContractBoost: inFrontier ? FRONTIER_CONTRACT_PAYOUT_MULTIPLIER : 1,
    contractStats: { completed, defaulted, completedRevenue, defaultedRepLoss },

    pnlLines,
  };
}
