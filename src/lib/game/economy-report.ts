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
import { getWorkforceBonuses, getMonthlyPayroll } from './workforce';
import { getResearchBonuses } from './research-tree';
import { DEFAULT_LEGACY, getLegacyBonuses } from './legacy-system';
import { getTierBonuses } from './corporation-tiers';
import { getMegastructureBonuses } from './personal-megastructures';
import { getReputationBonuses } from './reputation';
import { getActiveMultipliers } from './random-events';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from './upgrades';
import { computeCommanderBonuses } from './commanders';
import { serviceSaturationMultiplier, corporateOverheadMonthly, executiveCompensationMonthly } from './formulas';
import { isInFrontier, FRONTIER_CONTRACT_PAYOUT_MULTIPLIER } from './frontier';

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
  total: number;
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
  const wfBonuses = getWorkforceBonuses(workforce);
  const payroll = getMonthlyPayroll(workforce);
  const resBonuses = getResearchBonuses(state.completedResearch);

  const legacy = state.legacy || DEFAULT_LEGACY;
  const legacyBonuses = getLegacyBonuses(legacy);
  const legacyRevMult = legacyBonuses.revenueMultiplier;
  const legacyCostMult = legacyBonuses.costMultiplier;

  const corpTier = state.corporationTier || 1;
  const tierBonuses = getTierBonuses(corpTier);

  const megaBonuses = getMegastructureBonuses(state.megastructures || []);
  const repBonuses = getReputationBonuses(state.reputation || 0);
  const commanderBonuses = computeCommanderBonuses(state.hiredCommanders);
  const eventMultipliers = getActiveMultipliers(state);

  const powerData = getPowerByLocation(state.buildings);
  const priceMults = state.servicePriceMultipliers || {};

  // ─── Revenue multiplier breakdown (applies globally to every service) ──
  const revMult: RevenueMultiplierBreakdown = {
    workforce: 1 + wfBonuses.serviceRevenue,
    research:  1 + resBonuses.serviceRevenueBonus,
    legacy:    legacyRevMult,
    corporationTier: 1 + tierBonuses.revenueBonus,
    megastructure: megaBonuses.revenueMultiplier || 1,
    reputation:    repBonuses.revenueMultiplier,
    commander:     commanderBonuses.revenueMultiplier,
    event:         eventMultipliers.revenueMultiplier,
    combined: 1,
  };
  revMult.combined =
    revMult.workforce * revMult.research * revMult.legacy *
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

    const supplyMult = priceMults[svc.definitionId] ?? 1.0;

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
    const operatingCost = Math.round(
      def.operatingCostPerMonth
      * eventMultipliers.costMultiplier
      * legacyCostMult
      * (1 - tierBonuses.maintenanceReduction)
      * (megaBonuses.maintenanceMultiplier || 1)
      * repBonuses.maintenanceMultiplier,
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
        * (1 - tierBonuses.maintenanceReduction)
        * (megaBonuses.maintenanceMultiplier || 1)
        * repBonuses.maintenanceMultiplier,
      );
      infrastructureValue += def.baseCost;
    }
  }

  const runningNetWorth = state.money + state.totalEarned - state.totalSpent;

  const corporateOverhead = Math.round(
    corporateOverheadMonthly(completedBuildingCount)
    * eventMultipliers.costMultiplier
    * legacyCostMult
    * (1 - tierBonuses.maintenanceReduction)
    * (megaBonuses.maintenanceMultiplier || 1)
    * repBonuses.maintenanceMultiplier,
  );
  const executiveCompensation = Math.round(
    executiveCompensationMonthly(runningNetWorth)
    * eventMultipliers.costMultiplier
    * (1 - tierBonuses.maintenanceReduction),
  );

  const costs: CostBreakdown = {
    serviceOperating: totalOperatingCost,
    buildingMaintenance,
    corporateOverhead,
    executiveCompensation,
    workforcePayroll: payroll,
    total: totalOperatingCost + buildingMaintenance + corporateOverhead + executiveCompensation + payroll,
  };

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
    infrastructureValue,
    shipValue,
    netWorth: state.money + Math.round(resourceInventoryValue) + infrastructureValue + shipValue,
  };

  // ─── Supply pressure ───────────────────────────────────────────────────
  const hasSupplyPenalty = Object.values(priceMults).some(m => m < 0.99);
  const avgSupplyMultiplier = Object.keys(priceMults).length > 0
    ? Object.values(priceMults).reduce((a, b) => a + b, 0) / Object.values(priceMults).length
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

    buildSpeedMultiplier: commanderBonuses.buildSpeedMultiplier * legacyBonuses.buildSpeedMultiplier * (megaBonuses.buildSpeedMultiplier || 1) * repBonuses.buildSpeedMultiplier,
    researchSpeedMultiplier: commanderBonuses.researchSpeedMultiplier * legacyBonuses.researchSpeedMultiplier * (megaBonuses.researchSpeedMultiplier || 1) * repBonuses.researchSpeedMultiplier,
    miningMultiplier: commanderBonuses.miningMultiplier * legacyBonuses.miningMultiplier * (megaBonuses.miningMultiplier || 1) * repBonuses.miningMultiplier * (1 + tierBonuses.miningBonus) * (1 + resBonuses.miningOutputBonus) * (1 + wfBonuses.miningOutput),
    maintenanceCostMultiplier:
      eventMultipliers.costMultiplier
      * legacyCostMult
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
  };
}
