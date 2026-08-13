// ─── Space Tycoon: Game Engine (Tick Processor) ─────────────────────────────
// 200-cycle polish pass: integrates workforce, prestige, market events,
// achievements, ship cargo, bankruptcy protection, and revenue caps.

import type { GameState, GameEvent, GameReport } from './types';
import { BUILDING_MAP, getPowerByLocation, getCraftingSpeedMultiplier } from './buildings';
import { SERVICE_MAP } from './services';
import { RESEARCH_MAP, getResearchBonuses } from './research-tree';
import { MINING_PRODUCTION, RESOURCE_MAP } from './resources';
import { advanceDate, generateId, revenueMultiplier, serviceSaturationMultiplier, corporateOverheadMonthly, executiveCompensationMonthly } from './formulas';
import { LOCATION_MAP } from './solar-system';
import { MAX_EVENT_LOG, TICKS_PER_GAME_MONTH, DEV_FAST_MULTIPLIER, DEV_REVENUE_MULTIPLIER } from './constants';
import { getGlobalGameDate, GAME_START_YEAR } from './server-time';
import { processNPCTick, applyNPCMarketActions } from './npc-engine';
import { rollRandomEvent, applyEventEffect, getActiveMultipliers, cleanupExpiredEffects } from './random-events';
import { checkMilestones } from './milestones';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from './upgrades';
import { SHIP_MAP } from './ships';
import { getWorkforceBonuses, getMonthlyPayroll } from './workforce';
import { getActiveBoostMultiplier, cleanupExpiredBoosts } from './speed-boosts';
import type { ActiveBoost } from './speed-boosts';
import { rollMarketEvent } from './market-events';
import type { ActiveMarketEvent } from './market-events';
import { checkAchievements } from './achievements';
import { rollTimedEvent, calculateEventReward, EVENT_TEMPLATES } from './timed-events';
import { DEFAULT_LEGACY, getLegacyBonuses, checkLegacyMilestones, checkStretchProgress, getLegacyPower, getLegacyDisplayTier, LEGACY_MILESTONE_MAP } from './legacy-system';
import { checkCorporationTier, getTierBonuses } from './corporation-tiers';
import { getMegastructureBonuses, checkMegastructureCompletion } from './personal-megastructures';
import { getReputationBonuses, addReputation } from './reputation';
import { computeCommanderBonuses } from './commanders';
import { ensureFreshDeliveryPool, processContractDeadlines } from './delivery-contracts';
import { shouldAutoGraduate, graduateFrontier, isInFrontier } from './frontier';
import { rollMonthlyHazards, applyHazards } from './hazards';
import { processExpeditionTick } from './expeditions';
import { consumeServerReconciliation, applyReconciliationToState } from './ledger-reconcile';
// Audit Wave B (Change #2 "dead-multiplier pack" + Change #6 + A10) imports:
import { getSpecializationBonuses } from './specializations';
import { getVictoryBonuses } from './victory-conditions';
import { getTotalSubsidiaryIncome, getSubsidiaryServiceBonus } from './subsidiaries';
import { getGovernorBenefits, getStakeholderServiceBonus, getMultiZonePenalty, LOCATION_TO_ZONE } from './zone-influence';
import { consumeServerEffects, applyServerEffectsToState, clampAllianceBonuses } from './server-effects';
import { getShipMiningRateMultiplier, getShipTransitSpeedMultiplier } from './modules';
import { updateCrewWellbeing, getTotalCrew, getCrewCapacity } from './workforce';
import type { ServiceType } from './types';
import type { ResourceId } from './resources';

/** Get or create today's daily metrics tracker */
function getDailyMetrics(state: GameState): NonNullable<GameState['dailyMetrics']> {
  const today = new Date().toISOString().slice(0, 10);
  if (state.dailyMetrics?.date === today) return { ...state.dailyMetrics };
  return {
    date: today, units_mined: 0, research_completed: 0, revenue_earned: 0,
    buildings_built: 0, contracts_completed: 0, research_started: 0,
    rockets_launched: 0, market_orders_filled: 0, trade_volume: 0,
    buildings_upgraded: 0, satellites_deployed: 0, cargo_delivered: 0,
    iron_mined: 0, titanium_mined: 0, platinum_group_mined: 0,
  };
}

/**
 * Process a single game tick (1 in-game month).
 * Pure function: takes state, returns new state. Never mutates input.
 */
export function processTick(state: GameState): GameState {
  // Global server time: all players share the same game date.
  // The calendar is derived from real wall-clock time (server epoch),
  // NOT from tick counting. Revenue/costs apply fractionally each tick.
  const globalDate = getGlobalGameDate();
  // Audit Wave B fix: prevTotalMonths was anchored at 2025 while
  // getGlobalGameDate anchors at GAME_START_YEAR (2026) — an off-by-12 that
  // made isMonthEnd fire only when the save's date was 13+ game-months
  // stale. Every monthly system (random events, hazards, mining floor, and
  // the new A10 crew-wellbeing pass) gates on this flag; it now fires once
  // per game-month as all of that code intends.
  const prevTotalMonths = (state.gameDate.year - GAME_START_YEAR) * 12 + (state.gameDate.month - 1);
  const isMonthEnd = globalDate.totalMonths > prevTotalMonths;
  const newDate = { year: globalDate.year, month: globalDate.month };
  const tickCount = isMonthEnd ? 0 : (state.tickCount || 0) + 1;
  const fraction = 1 / TICKS_PER_GAME_MONTH; // Fraction of monthly revenue/cost per tick

  const events: GameEvent[] = [];
  let money = state.money;
  let totalEarned = state.totalEarned;
  let totalSpent = state.totalSpent;
  const stats = { ...state.stats };

  // Get active effect multipliers (from random events)
  const multipliers = getActiveMultipliers(state);

  // Get workforce bonuses (build speed, research speed, mining output, revenue)
  const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
  const wfBonuses = getWorkforceBonuses(workforce);

  // Get research bonuses (category-specific bonuses from completed research)
  const resBonuses = getResearchBonuses(state.completedResearch);

  // Get legacy bonuses (replaces prestige)
  const legacy = state.legacy || DEFAULT_LEGACY;
  const legacyBonuses = getLegacyBonuses(legacy);
  const legacyRevMult = legacyBonuses.revenueMultiplier;
  const legacyMiningMult = legacyBonuses.miningMultiplier;
  const legacyBuildSpeedMult = legacyBonuses.buildSpeedMultiplier;
  const legacyCostMult = legacyBonuses.costMultiplier;

  // Get corporation tier bonuses
  const corpTier = state.corporationTier || 1;
  const tierBonuses = getTierBonuses(corpTier);

  // Get megastructure bonuses
  const megaBonuses = getMegastructureBonuses(state.megastructures || []);

  // Get reputation bonuses
  const repBonuses = getReputationBonuses(state.reputation || 0);

  // Get commander bonuses (passive stacked bonuses from hired commanders)
  const commanderBonuses = computeCommanderBonuses(state.hiredCommanders);

  // ─── Audit Wave B: formerly-dead multiplier packs (Change #2 / A3) ────
  // Specializations (§1b): the 10 purchased bonus keys finally apply.
  const specBonuses = getSpecializationBonuses(
    state.specialization || { primary: null, secondary: null, respecCount: 0 },
  );
  // Victory conditions (§1b): permanent bonuses from earned victories.
  const victoryBonuses = getVictoryBonuses(state.earnedVictories || []);
  // Alliance bonuses (Change #6 / A2): server-aggregated, delivered via
  // sync → server-effects → state.allianceBonuses. Re-clamped defensively.
  const allianceB = clampAllianceBonuses(state.allianceBonuses) || {
    revenueBonus: 0, miningBonus: 0, researchBonus: 0, buildSpeedBonus: 0,
  };
  // Territory (A7): zone standings (governor / stakeholder) by location.
  const zoneStandingByLocation = new Map<string, { sharePct: number; isGovernor: boolean }>();
  if ((state.zoneStandings || []).length > 0) {
    const standingByZone = new Map((state.zoneStandings || []).map(z => [z.zoneSlug, z]));
    LOCATION_TO_ZONE.forEach((slug, locId) => {
      const zs = standingByZone.get(slug);
      if (zs) zoneStandingByLocation.set(locId, { sharePct: zs.sharePct, isGovernor: zs.isGovernor });
    });
  }
  // Subsidiaries (§1b): synergy service bonus per service type, precomputed.
  const subsidiaries = state.subsidiaries || [];
  const subsidiaryBonusByType = new Map<ServiceType, number>();
  // Specialization revenue bonus per service type.
  const specServiceBonus = (svcType: ServiceType): number => {
    switch (svcType) {
      case 'launch_payload': return specBonuses.launchRevenue;
      case 'ai_datacenter': return specBonuses.dataRevenue;
      case 'tourism': return specBonuses.tourismRevenue;
      case 'fabrication_output': return specBonuses.fabricationOutput;
      default: return 0;
    }
  };

  // ─── 0. Workforce payroll (fractional per tick) ──────────────────
  const payroll = Math.round(getMonthlyPayroll(workforce) * fraction);
  if (payroll > 0) {
    money -= payroll;
    totalSpent += payroll;
  }

  // ─── 0b. Power balance per location ─────────────────────────────
  // Buildings at space locations need power. Underpowered locations reduce revenue.
  const powerByLocation = getPowerByLocation(state.buildings);

  // ─── 1. Revenue collection from active services ───────────────────
  // Applies: event multipliers, upgrade boost, workforce bonus, prestige bonus,
  //          power ratio, station bonus, market saturation (see Wave 1 balance).
  let monthlyRevenue = 0;
  let monthlyCosts = 0;

  // Market saturation counters — one per (definitionId, locationId) bucket.
  // Each iteration increments the bucket so the Nth duplicate earns less than
  // the (N-1)th. See serviceSaturationMultiplier for the curve.
  const saturationCounts = new Map<string, number>();

  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const bucketKey = `${svc.definitionId}@${svc.locationId}`;
    const saturationPosition = saturationCounts.get(bucketKey) || 0;
    saturationCounts.set(bucketKey, saturationPosition + 1);
    const saturationMult = serviceSaturationMultiplier(saturationPosition);
    const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
    const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
    // Dynamic service pricing: server-reported multiplier based on global supply
    const supplyMult = (state.servicePriceMultipliers || {})[svc.definitionId] ?? 1.0;
    // Power factor: underpowered locations reduce revenue proportionally
    const locPower = powerByLocation[svc.locationId];
    const powerRatio = locPower ? locPower.ratio : 1; // Earth/unlisted = full power
    // Station presence bonus — stations/habitats at a location boost all service revenue there
    const stationBonus = (() => {
      let bonus = 0;
      for (const bld of state.buildings) {
        if (!bld.isComplete || bld.locationId !== svc.locationId) continue;
        const bDef = BUILDING_MAP.get(bld.definitionId);
        if (!bDef) continue;
        if (bDef.category === 'space_station') bonus += 0.15; // +15% per station/habitat
      }
      return Math.min(bonus, 0.50); // Cap at +50%
    })();
    // Audit Wave B (Change #2 + #6 + A7): the formerly display-only bonus
    // pack — specializations (§1b), victory rewards (§1b), alliance
    // aggregate (A2), subsidiary synergy (§1b), zone stakeholder/governor
    // standing (A7) — now multiplies service revenue. The combined product
    // of these NEW sources is capped at 2.0x per BALANCE.md's "cap the
    // combined product" invariant (A3), so the wiring cannot compound the
    // existing ~14-multiplier stack into runaway inflation.
    if (!subsidiaryBonusByType.has(def.type)) {
      subsidiaryBonusByType.set(def.type, getSubsidiaryServiceBonus(subsidiaries, def.type));
    }
    const zoneStanding = zoneStandingByLocation.get(svc.locationId);
    const zoneBonusPct = zoneStanding
      ? getStakeholderServiceBonus(zoneStanding.sharePct, zoneStanding.isGovernor)
      : 0;
    const waveBRevenueMult = Math.min(2.0,
      (1 + specServiceBonus(def.type) + specBonuses.allRevenue)
      * victoryBonuses.revenueMultiplier
      * (1 + allianceB.revenueBonus)
      * (1 + (subsidiaryBonusByType.get(def.type) || 0))
      * (1 + zoneBonusPct / 100)
    );
    const revenue = Math.round(
      def.revenuePerMonth * fraction
      * svc.revenueMultiplier
      * multipliers.revenueMultiplier
      * upgradeBoost
      * (1 + wfBonuses.serviceRevenue)
      * (1 + resBonuses.serviceRevenueBonus)
      * legacyRevMult
      * (1 + tierBonuses.revenueBonus)
      * supplyMult
      * (megaBonuses.revenueMultiplier || 1)
      * repBonuses.revenueMultiplier
      * commanderBonuses.revenueMultiplier
      * powerRatio
      * (1 + stationBonus)
      * saturationMult
      * wfBonuses.moraleMultiplier
      * waveBRevenueMult
      * DEV_REVENUE_MULTIPLIER
    );
    // Specialization maintenance_reduction (§1b) applies to operating costs.
    const cost = Math.round(def.operatingCostPerMonth * fraction * multipliers.costMultiplier * legacyCostMult * (1 - tierBonuses.maintenanceReduction) * (megaBonuses.maintenanceMultiplier || 1) * repBonuses.maintenanceMultiplier * (1 - specBonuses.maintenanceReduction));
    money += revenue - cost;
    totalEarned += revenue;
    totalSpent += cost;
    monthlyRevenue += revenue;
    monthlyCosts += cost;
  }

  // ─── 1b. Corporate overhead (Wave 2 balance: scaling tax on fleet size) ──
  // Administrative, HR, compliance, and audit costs that grow superlinearly with
  // building count. Money sink that keeps mega-empires from infinite scaling.
  // Tier-scale maintenance reductions apply (larger corps get economies of scale).
  {
    const completedBuildings = state.buildings.filter(b => b.isComplete).length;
    const monthlyOverhead = corporateOverheadMonthly(completedBuildings);
    const overhead = Math.round(
      monthlyOverhead * fraction
      * multipliers.costMultiplier
      * legacyCostMult
      * (1 - tierBonuses.maintenanceReduction)
      * (megaBonuses.maintenanceMultiplier || 1)
      * repBonuses.maintenanceMultiplier
      * (1 - specBonuses.maintenanceReduction) // audit Wave B §1b (specializations)
    );
    if (overhead > 0) {
      money -= overhead;
      totalSpent += overhead;
      monthlyCosts += overhead;
    }
  }

  // ─── 1c. Executive compensation (Wave 3 balance: wealth-scaled tax) ──
  // CEO, CFO, board, legal. Scales with net worth above a $100M threshold so
  // early players aren't affected; wealthy corps pay continuously.
  {
    // Net worth here reads the *current* money; totalEarned / totalSpent came
    // in with state, so this is an up-to-date running estimate.
    const netWorth = money + totalEarned - totalSpent;
    const monthlyExecComp = executiveCompensationMonthly(netWorth);
    const execComp = Math.round(
      monthlyExecComp * fraction
      * multipliers.costMultiplier
      * (1 - tierBonuses.maintenanceReduction)
    );
    if (execComp > 0) {
      money -= execComp;
      totalSpent += execComp;
      monthlyCosts += execComp;
    }
  }

  // ─── 2. Maintenance costs for completed buildings ─────────────────
  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
    const maint = Math.round(def.maintenanceCostPerMonth * fraction * multipliers.costMultiplier * maintMult * (1 - resBonuses.maintenanceReduction) * legacyCostMult * (1 - tierBonuses.maintenanceReduction) * (megaBonuses.maintenanceMultiplier || 1) * repBonuses.maintenanceMultiplier * (1 - specBonuses.maintenanceReduction) /* audit Wave B §1b */);
    money -= maint;
    totalSpent += maint;
    monthlyCosts += maint;
  }

  // ─── 3. Construction completion check (real wall-clock time) ──────
  const now = Date.now();
  const activeBoosts: ActiveBoost[] = (state.activeBoosts || []) as ActiveBoost[];
  const buildBoostMult = getActiveBoostMultiplier(activeBoosts, 'construction');
  const buildings = state.buildings.map((bld) => {
    if (bld.isComplete) return bld;
    const elapsed = (now - (bld.startedAtMs || 0)) / 1000;
    // Speed boosts reduce effective duration
    // Audit Wave B additions to build speed: workforce buildSpeed (§1c —
    // "engineers' headline bonus!"), research buildSpeedBonus (§1c),
    // specialization build_speed (§1b), victory buildSpeed (§1b), alliance
    // buildSpeedBonus (A2). Combined new factor capped at 2x.
    const waveBBuildSpeedMult = Math.min(2.0,
      (1 + wfBonuses.buildSpeed + resBonuses.buildSpeedBonus + specBonuses.buildSpeed)
      * victoryBonuses.buildSpeedMultiplier
      * (1 + allianceB.buildSpeedBonus)
    );
    const effectiveDuration = (bld.realDurationSeconds || 0) / (buildBoostMult * legacyBuildSpeedMult * (megaBonuses.buildSpeedMultiplier || 1) * repBonuses.buildSpeedMultiplier * commanderBonuses.buildSpeedMultiplier * waveBBuildSpeedMult * DEV_FAST_MULTIPLIER);
    if (elapsed >= effectiveDuration) {
      const def = BUILDING_MAP.get(bld.definitionId);
      events.push({
        id: generateId(), date: newDate, type: 'build_complete',
        title: `${def?.name || 'Building'} Complete`,
        description: 'Construction finished. Ready for operation.',
      });
      if (def?.category === 'satellite') stats.satellitesDeployed++;
      if (def?.category === 'space_station') stats.stationsBuilt++;
      return { ...bld, isComplete: true };
    }
    return bld;
  });

  // ─── 4. Research progress (real wall-clock time) ──────────────────
  let activeResearch = state.activeResearch;
  const completedResearch = [...state.completedResearch];

  if (activeResearch) {
    const researchElapsed = (now - (activeResearch.startedAtMs || 0)) / 1000;
    const researchBoostMult = getActiveBoostMultiplier(activeBoosts, 'research');
    // Audit Wave B: + specialization research_speed (§1b), victory research
    // bonus (§1b), alliance researchBonus (A2). Combined new factor cap 2x.
    const waveBResearchMult = Math.min(2.0, (1 + specBonuses.researchSpeed) * victoryBonuses.researchSpeedMultiplier * (1 + allianceB.researchBonus));
    const researchSpeedMult = (1 + wfBonuses.researchSpeed) * (1 + resBonuses.researchSpeedBonus) * legacyBonuses.researchSpeedMultiplier * researchBoostMult * (megaBonuses.researchSpeedMultiplier || 1) * repBonuses.researchSpeedMultiplier * commanderBonuses.researchSpeedMultiplier * waveBResearchMult * DEV_FAST_MULTIPLIER;
    const effectiveDuration = (activeResearch.realDurationSeconds || 0) / researchSpeedMult;
    if (researchElapsed >= effectiveDuration) {
      completedResearch.push(activeResearch.definitionId);
      stats.researchCompleted++;
      const def = RESEARCH_MAP.get(activeResearch.definitionId);
      events.push({
        id: generateId(), date: newDate, type: 'research_complete',
        title: `Research Complete: ${def?.name || 'Unknown'}`,
        description: def?.effect || 'New capabilities unlocked.',
      });
      activeResearch = null;
    } else {
      const totalMonths = activeResearch.totalMonths || 1;
      const pctDone = researchElapsed / effectiveDuration;
      activeResearch = { ...activeResearch, progressMonths: Math.round(pctDone * totalMonths) };
    }
  }

  // ─── 4b. Second research queue (unlocked via 'parallel_research') ──
  let activeResearch2 = state.activeResearch2 || null;
  if (activeResearch2 && completedResearch.includes('parallel_research')) {
    const r2Elapsed = (now - (activeResearch2.startedAtMs || 0)) / 1000;
    const researchBoostMult2 = getActiveBoostMultiplier(activeBoosts, 'research');
    const waveBResearchMult2 = Math.min(2.0, (1 + specBonuses.researchSpeed) * victoryBonuses.researchSpeedMultiplier * (1 + allianceB.researchBonus)); // audit Wave B (same pack as queue 1)
    const researchSpeedMult2 = (1 + wfBonuses.researchSpeed) * (1 + resBonuses.researchSpeedBonus) * legacyBonuses.researchSpeedMultiplier * researchBoostMult2 * (megaBonuses.researchSpeedMultiplier || 1) * repBonuses.researchSpeedMultiplier * commanderBonuses.researchSpeedMultiplier * waveBResearchMult2 * DEV_FAST_MULTIPLIER;
    const effectiveDuration2 = (activeResearch2.realDurationSeconds || 0) / researchSpeedMult2;
    if (r2Elapsed >= effectiveDuration2) {
      completedResearch.push(activeResearch2.definitionId);
      stats.researchCompleted++;
      const def2 = RESEARCH_MAP.get(activeResearch2.definitionId);
      events.push({
        id: generateId(), date: newDate, type: 'research_complete',
        title: `Research Complete (Q2): ${def2?.name || 'Unknown'}`,
        description: def2?.effect || 'New capabilities unlocked.',
      });
      activeResearch2 = null;
    } else {
      const totalMonths2 = activeResearch2.totalMonths || 1;
      const pctDone2 = r2Elapsed / effectiveDuration2;
      activeResearch2 = { ...activeResearch2, progressMonths: Math.round(pctDone2 * totalMonths2) };
    }
  }

  // ─── 5. Automatically activate services for newly completed buildings ─
  // Each completed building gets its own service instance. Multiple satellites
  // of the same type = multiple service instances = more revenue (constellation).
  const activeServices = [...state.activeServices];
  for (const bld of buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    for (const svcId of def.enabledServices) {
      // Check if THIS SPECIFIC BUILDING already has a linked service
      const alreadyLinked = activeServices.some(s =>
        s.definitionId === svcId && s.linkedBuildingIds.includes(bld.instanceId)
      );
      if (alreadyLinked) continue;
      const svcDef = SERVICE_MAP.get(svcId);
      if (!svcDef) continue;
      const hasResearch = svcDef.requiredResearch.every(r => completedResearch.includes(r));
      if (!hasResearch) continue;

      // Revenue multiplier: count ALL completed research (broader benefit)
      const totalResearchCount = completedResearch.length;
      activeServices.push({
        definitionId: svcId,
        locationId: bld.locationId,
        linkedBuildingIds: [bld.instanceId],
        startDate: newDate,
        revenueMultiplier: revenueMultiplier(Math.min(totalResearchCount, 10)),
      });
      events.push({
        id: generateId(), date: newDate, type: 'service_started',
        title: `Service Online: ${svcDef.name}`,
        description: `Generating ${formatRevenue(svcDef.revenuePerMonth)}/month revenue.`,
      });
    }
  }

  // ─── 6. Resource production (fractional per tick, with bonuses) ───
  const resources = { ...(state.resources || {}) };
  // Audit Wave B: + specialization mining_output (§1b), victory mining
  // bonus (§1b), alliance miningBonus (A2), and timed 'mining' boosts from
  // mini-activities (§1c — mining_boost was silently dropped before).
  // Combined new factor capped at 2x (BALANCE.md invariant).
  const waveBMiningMult = Math.min(2.0,
    (1 + specBonuses.miningOutput)
    * victoryBonuses.miningMultiplier
    * (1 + allianceB.miningBonus)
    * getActiveBoostMultiplier(activeBoosts, 'mining')
  );
  const miningMult = (1 + wfBonuses.miningOutput) * (1 + resBonuses.miningOutputBonus) * legacyMiningMult * (1 + tierBonuses.miningBonus) * (megaBonuses.miningMultiplier || 1) * repBonuses.miningMultiplier * commanderBonuses.miningMultiplier * waveBMiningMult;
  const currentTotalMonths = newDate.year * 12 + newDate.month;
  const miningBonuses = state.miningBonuses || [];
  for (const svc of activeServices) {
    const production = MINING_PRODUCTION[svc.definitionId];
    if (!production) continue;
    // Logistics bonus from freighters/transports at this mining location
    const freighterBonus = (() => {
      let count = 0;
      for (const ship of (state.ships || [])) {
        if (!ship.isBuilt || ship.status !== 'idle') continue;
        if (ship.currentLocation !== svc.locationId) continue;
        const sDef = SHIP_MAP.get(ship.definitionId);
        if (sDef?.role === 'transport' || sDef?.role === 'tanker') count++;
      }
      return Math.min(count * 0.10, 0.50); // +10% per freighter/tanker, cap +50%
    })();
    for (const { resource, amountPerMonth } of production) {
      // Survey probe mining bonus: location + resource specific, time-limited
      const locationBonus = miningBonuses
        .filter(b => b.locationId === svc.locationId && b.resourceId === resource && b.expiresAtMonth > currentTotalMonths)
        .reduce((sum, b) => sum + b.bonusPct / 100, 0);
      // Accumulate fractional amounts — only add whole units
      const fractionalAmount = amountPerMonth * fraction * miningMult * (1 + freighterBonus) * (1 + locationBonus);
      if (fractionalAmount >= 1) {
        resources[resource] = (resources[resource] || 0) + Math.round(fractionalAmount);
      } else if (isMonthEnd) {
        // On month boundary, add at least the monthly total
        resources[resource] = (resources[resource] || 0) + Math.round(amountPerMonth * miningMult * (1 + freighterBonus) * (1 + locationBonus));
      }
    }
  }

  // ─── 6b. Megastructure passive income & resource production ─────────
  if (megaBonuses.passiveIncome && megaBonuses.passiveIncome > 0) {
    const passiveInc = Math.round(megaBonuses.passiveIncome * fraction);
    money += passiveInc;
    totalEarned += passiveInc;
    monthlyRevenue += passiveInc;
  }
  if (megaBonuses.passiveResources) {
    for (const [resId, amt] of Object.entries(megaBonuses.passiveResources)) {
      if (!amt || amt <= 0) continue;
      const fractionalAmt = amt * fraction;
      if (fractionalAmt >= 1) {
        resources[resId] = (resources[resId] || 0) + Math.round(fractionalAmt);
      } else if (isMonthEnd) {
        resources[resId] = (resources[resId] || 0) + Math.round(amt);
      }
    }
  }

  // ─── 6c. Subsidiary net income (audit Wave B, §1b "Subsidiaries") ────────
  // The audit called subsidiaries "a $66B purchase of a fake readout":
  // getTotalSubsidiaryIncome / getSubsidiaryServiceBonus were read only by
  // SubsidiaryPanel for display. The readout is now real — the same
  // net-income figure the panel shows is credited fractionally per tick.
  // Net can be negative (overhead-heavy portfolios) — that's a real cost.
  {
    const subsidiaryNetMonthly = getTotalSubsidiaryIncome(state);
    if (subsidiaryNetMonthly !== 0) {
      const subDelta = Math.round(subsidiaryNetMonthly * fraction);
      money += subDelta;
      if (subDelta > 0) {
        totalEarned += subDelta;
        monthlyRevenue += subDelta;
      } else if (subDelta < 0) {
        totalSpent += -subDelta;
        monthlyCosts += -subDelta;
      }
    }
  }

  // ─── 6d. Governor tax (audit Wave B, A7 "Territory pays") ────────────────
  // getGovernorBenefits was "defined, never called anywhere" (§1b) while
  // TerritoryPanel rendered "Governor Benefits (Active)" for benefits that
  // didn't exist. Governors now collect taxRate × zone-wide service
  // activity (server-computed taxBaseMonthly via sync → server-effects),
  // capped per zone, scaled by the multi-zone governance penalty.
  {
    const standings = state.zoneStandings || [];
    const governed = standings.filter(z => z.isGovernor);
    if (governed.length > 0) {
      const penalty = getMultiZonePenalty(governed.length);
      let taxMonthly = 0;
      for (const z of governed) {
        const gb = getGovernorBenefits(z.zoneSlug);
        taxMonthly += Math.min(gb.taxCap, gb.taxRate * Math.max(0, z.taxBaseMonthly || 0));
      }
      const tax = Math.round(taxMonthly * penalty * fraction);
      if (tax > 0) {
        money += tax;
        totalEarned += tax;
        monthlyRevenue += tax;
      }
    }
  }

  // ─── 7. Random events (8% chance per MONTH, only on month boundary) ───
  let pendingChoice = state.pendingChoice || null;
  if (isMonthEnd && !pendingChoice && Math.random() < 0.08) {
    const event = rollRandomEvent(state);
    if (event) {
      if (event.category === 'choice' && event.choices) {
        pendingChoice = {
          eventId: event.id,
          eventName: event.name,
          eventIcon: event.icon,
          eventDescription: event.description,
          choices: event.choices.map(c => ({ label: c.label, description: c.description })),
        };
        events.push({
          id: generateId(), date: newDate, type: 'random_event',
          title: `${event.icon} ${event.name}`,
          description: 'Decision required — check your alerts.',
        });
      } else if (event.effect) {
        const effectResult = applyEventEffect(
          { ...state, money, totalEarned, totalSpent, resources, gameDate: newDate },
          event.effect, event.name,
        );
        money = effectResult.money;
        totalEarned = effectResult.totalEarned;
        totalSpent = effectResult.totalSpent;
        Object.assign(resources, effectResult.resources);
        events.push({
          id: generateId(), date: newDate, type: 'random_event',
          title: `${event.icon} ${event.name}`,
          description: event.description,
        });
      }
    }
  }

  // ─── 8. Market events (5% chance per MONTH, only on month boundary) ──
  let activeMarketEvents: ActiveMarketEvent[] = [...(state.activeMarketEvents || [])];
  try {
    const marketEventDef = isMonthEnd ? rollMarketEvent() : null;
    if (marketEventDef) {
      const now = Date.now();
      const activeEvent: ActiveMarketEvent = {
        eventId: marketEventDef.id,
        name: marketEventDef.name,
        icon: marketEventDef.icon,
        affectedResources: marketEventDef.affectedResources,
        priceMultiplier: marketEventDef.priceMultiplier,
        startedAtMs: now,
        expiresAtMs: now + marketEventDef.durationHours * 3600000,
      };
      activeMarketEvents.push(activeEvent);
      events.push({
        id: generateId(), date: newDate, type: 'random_event',
        title: `📈 ${marketEventDef.name}`,
        description: `${marketEventDef.description} (${marketEventDef.durationHours}h)`,
      });
    }
    // Cleanup expired market events
    activeMarketEvents = activeMarketEvents.filter(e => Date.now() < e.expiresAtMs);
  } catch { /* market events non-critical */ }

  // ─── 9. Clean up expired effects, boosts, and mining bonuses ────
  const activeEffects = cleanupExpiredEffects({ ...state, gameDate: newDate });
  const cleanedBoosts = cleanupExpiredBoosts(activeBoosts);
  const cleanedMiningBonuses = miningBonuses.filter(b => b.expiresAtMonth > currentTotalMonths);
  // Audit Wave B (A8): expire consumed-by-time espionage perks.
  const cleanedIntelPerks = (state.activeIntelPerks || []).filter(p => p.expiresAtMs > now);

  // ─── 9b. Crew wellbeing writer + training budget sink (audit A10) ────────
  // Runs once per game-month. Training budget is charged as a real payroll
  // add-on (a new recurring sink); morale/fatigue/training then update via
  // the pure updateCrewWellbeing model in workforce.ts. Deterministic.
  let workforceOut = state.workforce;
  if (isMonthEnd && state.workforce) {
    const totalCrew = getTotalCrew(state.workforce);
    // Training budget charge (only when crew exists and budget is set)
    const budgetPerCrew = Math.max(0, state.workforce.trainingBudgetPerCrew ?? 0);
    if (totalCrew > 0 && budgetPerCrew > 0) {
      const trainingCharge = Math.round(totalCrew * budgetPerCrew);
      money -= trainingCharge;
      totalSpent += trainingCharge;
      monthlyCosts += trainingCharge;
    }
    // Utilization: crew headcount vs infrastructure capacity
    const completedCount = buildings.filter(b => b.isComplete).length;
    const capacity = getCrewCapacity(completedCount, state.unlockedLocations.length, completedResearch.length).total;
    const utilization = capacity > 0 ? totalCrew / capacity : 0;
    // Hazards that struck within the last game-month (6 real hours)
    const oneGameMonthMs = 6 * 60 * 60 * 1000;
    const recentHazardCount = (state.recentHazards || []).filter(h => now - h.occurredAtMs < oneGameMonthMs).length;
    const prevMorale = state.workforce.morale ?? 1.0;
    workforceOut = updateCrewWellbeing(state.workforce, {
      utilization,
      recentHazardCount,
      cashNegative: money < 0,
    });
    // Surface meaningful morale drops so the stat is discoverable/manageable
    if ((workforceOut.morale ?? 1.0) <= prevMorale - 0.05) {
      events.push({
        id: generateId(), date: newDate, type: 'random_event',
        title: '📉 Crew morale falling',
        description: 'Hazards, fatigue, or cash trouble are wearing on your crew. Morale reduces all service revenue — consider training budget, medics, or lighter crew utilization.',
      });
    }
  }

  // ─── 10. Track income history (last 24 months) ────────────────────
  const netIncome = Math.round(monthlyRevenue - monthlyCosts - payroll);
  const incomeHistory = [...(state.incomeHistory || []), netIncome].slice(-24);

  // ─── 11. Bankruptcy protection ────────────────────────────────────
  // Don't let money go below -$50M (prevents death spiral)
  if (money < -50_000_000) money = -50_000_000;

  // ─── 12. Trim event log ──────────────────────────────────────────
  const eventLog = [...events, ...state.eventLog].slice(0, MAX_EVENT_LOG);

  // ─── 13. Track daily metrics for corporation daily tasks ────────
  const dm = getDailyMetrics(state);
  // Count newly completed buildings this tick
  const prevCompleteCount = state.buildings.filter(b => b.isComplete).length;
  const newCompleteCount = buildings.filter(b => b.isComplete).length;
  if (newCompleteCount > prevCompleteCount) {
    dm.buildings_built += (newCompleteCount - prevCompleteCount);
    // Track satellite deployments
    for (const bld of buildings) {
      if (bld.isComplete && !state.buildings.find(b => b.instanceId === bld.instanceId && b.isComplete)) {
        const def = BUILDING_MAP.get(bld.definitionId);
        if (def?.category === 'satellite') dm.satellites_deployed++;
      }
    }
  }
  // Track research completions
  if (completedResearch.length > state.completedResearch.length) {
    dm.research_completed += (completedResearch.length - state.completedResearch.length);
  }
  // Track revenue earned this tick
  if (monthlyRevenue > 0) {
    dm.revenue_earned += Math.round(monthlyRevenue * fraction);
  }
  // Track mining output
  for (const [resId, qty] of Object.entries(resources)) {
    const prevQty = state.resources?.[resId] || 0;
    const mined = qty - prevQty;
    if (mined > 0) {
      dm.units_mined += mined;
      if (resId === 'iron') dm.iron_mined += mined;
      if (resId === 'titanium') dm.titanium_mined += mined;
      if (resId === 'platinum_group') dm.platinum_group_mined += mined;
    }
  }

  let out: GameState = {
    ...state,
    gameDate: newDate,
    tickCount: isMonthEnd ? 0 : tickCount,
    money,
    totalEarned,
    totalSpent,
    buildings,
    completedResearch,
    activeResearch,
    activeResearch2,
    activeServices,
    resources,
    activeEffects,
    activeMarketEvents,
    activeBoosts: cleanedBoosts,
    miningBonuses: cleanedMiningBonuses,
    activeIntelPerks: cleanedIntelPerks,   // audit Wave B (A8)
    workforce: workforceOut,               // audit Wave B (A10 morale writer)
    pendingChoice,
    incomeHistory,
    eventLog,
    stats,
    dailyMetrics: dm,
    lastTickAt: Date.now(),
  };

  // Delivery contracts: refresh pool if due, then process overdue contracts.
  out = ensureFreshDeliveryPool(out);
  out = processContractDeadlines(out);

  // Hazards (Phase II): roll once per game-month. Frontier players are
  // shielded from all hostile hazards per the onramp policy.
  if (isMonthEnd && !isInFrontier(out)) {
    const hazards = rollMonthlyHazards(out, Date.now());
    if (hazards.length > 0) {
      const applied = applyHazards(out, hazards);
      out = {
        ...applied.state,
        eventLog: [...applied.events, ...(applied.state.eventLog || [])].slice(0, MAX_EVENT_LOG),
      };
    }
  }

  // Frontier: auto-graduate when time + net worth conditions are met.
  if (out.frontierStatus === 'active' && shouldAutoGraduate(out)) {
    out = graduateFrontier(out);
    events.push({
      id: generateId(),
      date: newDate,
      type: 'milestone',
      title: 'Frontier Graduated',
      description: 'Your Protected Frontier period has ended. The full competitive economy is now open to you — and you to it.',
    });
  }

  return out;
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

/** Generate a detailed probe report for a survey discovery */
function generateProbeReport(
  ship: NonNullable<GameState['ships']>[number],
  discovery: { type: string; title: string; description: string; rewards: { money?: number; resources?: Record<string, number>; miningBonus?: { locationId: string; resourceId: string; bonusPct: number; durationMonths: number } } },
  locationId: string,
): string {
  const locName = LOCATION_MAP.get(locationId)?.name || locationId;
  let body = `Survey probe "${ship.name}" completed exploration of ${locName}.\n\n`;
  body += `== Discovery: ${discovery.title} ==\n${discovery.description}\n`;

  if (discovery.rewards.money) {
    const millions = discovery.rewards.money / 1_000_000;
    body += `\nCredits recovered: $${millions >= 1000 ? (millions / 1000).toFixed(1) + 'B' : millions.toFixed(0) + 'M'}`;
  }

  if (discovery.rewards.resources) {
    body += '\n\nResources found:';
    for (const [resId, qty] of Object.entries(discovery.rewards.resources)) {
      const resName = RESOURCE_MAP.get(resId as ResourceId)?.name || resId;
      body += `\n  - ${qty} ${resName}`;
    }
  }

  if (discovery.rewards.miningBonus) {
    const mb = discovery.rewards.miningBonus;
    const bonusLocName = LOCATION_MAP.get(mb.locationId)?.name || mb.locationId;
    const bonusResName = RESOURCE_MAP.get(mb.resourceId as ResourceId)?.name || mb.resourceId;
    body += `\n\n** Mining Bonus Activated **\n+${mb.bonusPct}% ${bonusResName} production at ${bonusLocName} for ${mb.durationMonths} months.`;
    body += `\n\nRecommendation: Build additional mining operations at ${bonusLocName} to capitalize on this bonus.`;
  }

  if (!discovery.rewards.miningBonus && discovery.rewards.resources) {
    const firstRes = Object.keys(discovery.rewards.resources)[0];
    const resName = RESOURCE_MAP.get(firstRes as ResourceId)?.name || firstRes;
    body += `\n\nRecommendation: Consider selling ${resName} on the Market or using it for Crafting.`;
  }

  body += '\n\nSend more probes to discover additional resources and anomalies.';
  return body;
}

/**
 * Full tick: processes player state + NPC companies + achievements in lockstep.
 */
export function processFullTick(state: GameState): GameState {
  // 0. One Wallet (audit A1): apply any queued server ledger reconciliation
  // BEFORE the tick. Server-side debits/credits (order fills, bid collateral,
  // bounty payouts, contributions…) arrive from the sync response as signed
  // deltas; applying them here moves money/resources and the ack cursor in
  // one atomic state update. Idempotent: applyReconciliationToState no-ops
  // unless the reconciliation covers seqs beyond state.serverLedgerAck.
  let workingState = state;
  try {
    const rec = consumeServerReconciliation();
    if (rec) {
      const applied = applyReconciliationToState(workingState, rec);
      if (applied !== workingState && rec.moneyDelta !== 0) {
        workingState = {
          ...applied,
          eventLog: [{
            id: generateId(), date: applied.gameDate, type: 'random_event' as const,
            title: `🏦 Multiplayer settlement: ${rec.moneyDelta > 0 ? '+' : '−'}$${(Math.abs(rec.moneyDelta) / 1_000_000).toFixed(1)}M`,
            description: 'Server-side trades, contracts, and contributions settled into your account.',
          }, ...applied.eventLog].slice(0, MAX_EVENT_LOG),
        };
      } else {
        workingState = applied;
      }
    }
  } catch (err) {
    console.error('Ledger reconciliation apply error (non-fatal):', err);
  }

  // 0b. Audit Wave B (Change #6 / A2, A7, A8, league boosts): apply any
  // queued server-effects snapshot (alliance bonuses, zone standings,
  // espionage perks, league promotion boosts) BEFORE the tick so this
  // tick's multipliers already include them. Same hand-off pattern as the
  // ledger above; idempotent (league boosts dedupe per season).
  try {
    const eff = consumeServerEffects();
    if (eff) {
      workingState = applyServerEffectsToState(workingState, eff);
    }
  } catch (err) {
    console.error('Server effects apply error (non-fatal):', err);
  }

  // 1. Process player tick
  let newState: GameState;
  try {
    newState = processTick(workingState);
  } catch (err) {
    console.error('processTick error:', err);
    return { ...workingState, lastTickAt: Date.now() };
  }

  // 2. Process NPC companies (can fail safely)
  try {
    if (newState.npcCompanies && newState.npcCompanies.length > 0) {
      const npcResult = processNPCTick(newState.npcCompanies, newState.gameDate);
      newState = {
        ...newState,
        npcCompanies: npcResult.npcs,
        eventLog: [...npcResult.events, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
        npcMarketPressure: applyNPCMarketActions(
          newState.npcMarketPressure || {},
          npcResult.marketActions,
        ),
      };
    }
  } catch (err) {
    console.error('NPC tick error (non-fatal):', err);
  }

  // 3. Check competitive milestones
  try {
    const claimedMilestones = { ...(newState.claimedMilestones || {}) };
    const newClaims = checkMilestones(newState, claimedMilestones);
    if (newClaims.length > 0) {
      let milestoneReward = 0;
      const milestoneEvents: typeof newState.eventLog = [];
      let milestoneRepAwards = 0;
      for (const claim of newClaims) {
        claimedMilestones[claim.id] = claim.claimedBy;
        if (claim.isPlayer) {
          milestoneReward += claim.reward;
          milestoneRepAwards++; // audit Wave B §1c: milestone_claimed rep was never awarded
          milestoneEvents.push({
            id: generateId(), date: newState.gameDate, type: 'milestone',
            title: `🏆 Milestone: ${claim.claimedBy} — First to achieve "${claim.id.replace(/_/g, ' ')}"!`,
            description: `Reward: +$${(claim.reward / 1_000_000).toFixed(0)}M`,
          });
        } else {
          milestoneEvents.push({
            id: generateId(), date: newState.gameDate, type: 'npc_activity',
            title: `🏆 ${claim.claimedBy} claimed "${claim.id.replace(/_/g, ' ')}"`,
            description: 'An NPC beat you to this milestone.',
          });
        }
      }
      newState = {
        ...newState,
        claimedMilestones,
        money: newState.money + milestoneReward,
        totalEarned: newState.totalEarned + milestoneReward,
        eventLog: [...milestoneEvents, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
      };
      // Audit Wave B (§1c): REPUTATION_POINTS.milestone_claimed was defined
      // but "never passed to addReputation" — award it per player claim.
      for (let i = 0; i < milestoneRepAwards; i++) {
        newState = addReputation(newState, 'milestone_claimed');
      }
    }
  } catch (err) {
    console.error('Milestone check error (non-fatal):', err);
  }

  // 4. Check refining completion and deliver outputs
  // Fabrication buildings give a crafting speed bonus (each extra fab = +15% speed)
  try {
    if (newState.activeRefining) {
      const craftingSpeedMult = getCraftingSpeedMultiplier(newState.buildings);
      const elapsed = (Date.now() - (newState.activeRefining.startedAtMs || 0)) / 1000;
      const effectiveDuration = (newState.activeRefining.durationSeconds || 0) / craftingSpeedMult;
      if (elapsed >= effectiveDuration) {
        // Look up recipe to find outputs
        const { CHAIN_MAP } = require('./production-chains');
        const recipe = CHAIN_MAP.get(newState.activeRefining.recipeId);
        const resources = { ...(newState.resources || {}) };
        if (recipe) {
          resources[recipe.outputId] = (resources[recipe.outputId] || 0) + recipe.outputQuantity;
        }
        newState = { ...newState, activeRefining: null, resources };
      }
    }
  } catch (err) {
    console.error('Refining check error (non-fatal):', err);
  }

  // 5. Check building upgrade completion
  try {
    const upgradedBuildings = newState.buildings.map(bld => {
      if (!bld.upgradeStartedAtMs || !bld.upgradeDurationSeconds) return bld;
      const elapsed = (Date.now() - bld.upgradeStartedAtMs) / 1000;
      if (elapsed >= bld.upgradeDurationSeconds) {
        return {
          ...bld,
          upgradeLevel: (bld.upgradeLevel || 0) + 1,
          upgradeStartedAtMs: undefined,
          upgradeDurationSeconds: undefined,
        };
      }
      return bld;
    });
    if (upgradedBuildings !== newState.buildings) {
      newState = { ...newState, buildings: upgradedBuildings };
    }
  } catch (err) {
    console.error('Upgrade check error (non-fatal):', err);
  }

  // 6. Process ships (build, mine, transit, survey expeditions, fleet maintenance)
  try {
    if (newState.ships && newState.ships.length > 0) {
      const now = Date.now();
      const shipFraction = 1 / TICKS_PER_GAME_MONTH; // Same fractional rate as revenue
      const resources = { ...(newState.resources || {}) };
      let shipMoney = newState.money;
      let shipTotalSpent = newState.totalSpent;
      const wfBonuses = getWorkforceBonuses(newState.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 });
      const shipLegacyBonuses = getLegacyBonuses(newState.legacy || DEFAULT_LEGACY);
      const shipTierBonuses = getTierBonuses(newState.corporationTier || 1);
      // Audit Wave B: specialization mining_output + fleet_speed (§1b),
      // victory mining bonus (§1b), and alliance miningBonus (A2) now reach
      // ship operations too — previously only building-based mining got any
      // bonuses and ships read raw definition stats.
      const shipSpecBonuses = getSpecializationBonuses(
        newState.specialization || { primary: null, secondary: null, respecCount: 0 },
      );
      const shipVictoryBonuses = getVictoryBonuses(newState.earnedVictories || []);
      const shipAllianceB = clampAllianceBonuses(newState.allianceBonuses);
      const shipMiningMult = (1 + wfBonuses.miningOutput) * shipLegacyBonuses.miningMultiplier * (1 + shipTierBonuses.miningBonus)
        * (1 + shipSpecBonuses.miningOutput) * shipVictoryBonuses.miningMultiplier * (1 + (shipAllianceB?.miningBonus || 0));
      const shipEvents: typeof newState.eventLog = [];
      const shipReports: GameReport[] = [];
      const shipsToRemove: string[] = []; // For consumed survey probes

      const updatedShips = newState.ships.map(ship => {
        // Build completion
        if (!ship.isBuilt && ship.buildStartedAtMs && ship.buildDurationSeconds) {
          const elapsed = (now - ship.buildStartedAtMs) / 1000;
          if (elapsed >= ship.buildDurationSeconds) {
            return { ...ship, isBuilt: true, status: 'idle' as const, buildStartedAtMs: undefined, buildDurationSeconds: undefined };
          }
        }

        // Fleet maintenance (per built ship, fractional per tick)
        if (ship.isBuilt) {
          const shipDef = SHIP_MAP.get(ship.definitionId);
          if (shipDef && shipDef.maintenancePerMonth > 0) {
            const maint = Math.round(shipDef.maintenancePerMonth * shipFraction);
            shipMoney -= maint;
            shipTotalSpent += maint;
          }
        }

        // Mining production (with workforce, prestige, and location bonuses, fractional per tick)
        if (ship.isBuilt && ship.status === 'mining' && ship.miningOperation) {
          const shipDef = SHIP_MAP.get(ship.definitionId);
          if (shipDef?.miningRate) {
            const resId = ship.miningOperation.resourceId;
            // Location multiplier: further/riskier locations yield more
            const { getMiningMultiplier: getLocMult } = require('./ships');
            const locationMult = getLocMult(ship.miningOperation.locationId || ship.currentLocation) || 1;
            // Audit Wave B (§1b "Modules"): fitted mining-laser clusters
            // (+30% each) finally modify the actual mining computation —
            // previously "the engine reads raw shipDef.miningRate".
            const moduleMiningMult = getShipMiningRateMultiplier(newState, ship.instanceId);
            const mined = Math.round(shipDef.miningRate * 0.5 * shipMiningMult * moduleMiningMult * locationMult * shipFraction);
            if (mined >= 1) {
              resources[resId] = (resources[resId] || 0) + mined;
            }
          }
        }

        // Transit arrival
        // SECURITY (audit hotlist #5): the old code credited route.cargo into
        // the resource pool on arrival, but NOTHING ever deducts cargo at
        // departure — a duplication exploit the moment any UI passes cargo.
        // Arrival credit is disabled until real cargo logistics (audit C1:
        // deduct-at-departure, capacity + fuel costs) ships. Both current
        // dispatch call sites pass empty cargo, so this is behavior-neutral.
        if (ship.status === 'in_transit' && ship.route) {
          // Audit Wave B (§1b Modules + Specializations fleet_speed, §1c
          // workforce shipEfficiency): transit-speed multipliers shorten the
          // effective journey. Dispatch ETAs are computed from base stats in
          // the UI (unchanged this wave), so boosted ships simply arrive
          // early — the engine treats the multiplier as dividing remaining
          // travel time. Clamped ≥1 so nothing ever arrives late.
          const transitSpeedMult = Math.max(1,
            (1 + shipSpecBonuses.fleetSpeed)
            * (1 + wfBonuses.shipEfficiency)
            * getShipTransitSpeedMultiplier(newState, ship.instanceId)
          );
          const plannedDuration = Math.max(0, ship.route.arrivalAtMs - ship.route.departedAtMs);
          const effectiveArrivalAtMs = ship.route.departedAtMs + plannedDuration / transitSpeedMult;
          if (now >= effectiveArrivalAtMs) {
            return { ...ship, status: 'idle' as const, currentLocation: ship.route.to, route: undefined };
          }
        }

        // Survey expedition completion — probe is consumed, discovery applied
        if (ship.isBuilt && ship.status === 'surveying' && ship.surveyExpedition) {
          const elapsed = (now - ship.surveyExpedition.startedAtMs) / 1000;
          if (elapsed >= ship.surveyExpedition.durationSeconds) {
            const { rollSurveyDiscovery } = require('./ships');
            const discovery = rollSurveyDiscovery(ship.surveyExpedition.targetLocation);
            if (discovery) {
              // Apply discovery rewards
              if (discovery.rewards.money) {
                shipMoney += discovery.rewards.money;
              }
              if (discovery.rewards.resources) {
                for (const [resId, qty] of Object.entries(discovery.rewards.resources)) {
                  resources[resId] = (resources[resId] || 0) + (qty as number);
                }
              }
              shipEvents.push({
                id: generateId(),
                date: newState.gameDate,
                type: 'random_event',
                title: `📡 Survey Discovery: ${discovery.title}`,
                description: discovery.description,
              });
              // Generate detailed probe report
              shipReports.push({
                id: generateId(),
                type: 'probe_discovery',
                title: `Probe Report: ${discovery.title}`,
                body: generateProbeReport(ship, discovery, ship.surveyExpedition!.targetLocation),
                createdAt: Date.now(),
                read: false,
                locationId: ship.surveyExpedition!.targetLocation,
                rewards: discovery.rewards,
              });
              // Apply miningBonus to location (store in game state for duration)
              if (discovery.rewards.miningBonus) {
                const mb = discovery.rewards.miningBonus;
                const currentTotalMonths = newState.gameDate.year * 12 + newState.gameDate.month;
                const miningBonuses = [...(newState.miningBonuses || [])];
                miningBonuses.push({
                  locationId: mb.locationId,
                  resourceId: mb.resourceId,
                  bonusPct: mb.bonusPct,
                  expiresAtMonth: currentTotalMonths + mb.durationMonths,
                });
                newState = { ...newState, miningBonuses };
              }
            }
            // Probe is consumed after expedition
            shipsToRemove.push(ship.instanceId);
            return ship; // Will be filtered out below
          }
        }

        return ship;
      });

      // Remove consumed probes
      const finalShips = shipsToRemove.length > 0
        ? updatedShips.filter(s => !shipsToRemove.includes(s.instanceId))
        : updatedShips;

      newState = {
        ...newState,
        ships: finalShips,
        resources,
        money: shipMoney,
        totalSpent: shipTotalSpent,
        eventLog: shipEvents.length > 0
          ? [...shipEvents, ...newState.eventLog].slice(0, MAX_EVENT_LOG)
          : newState.eventLog,
        reports: shipReports.length > 0
          ? [...(newState.reports || []), ...shipReports].slice(-50)
          : (newState.reports || []),
      };
    }
  } catch (err) {
    console.error('Ship processing error (non-fatal):', err);
  }

  // 6b. Interstellar expeditions, colonies, and trade routes (Wave 10).
  // Campaign-loop subsystem — advances by game-months, no-ops (same state
  // reference) when the player has no interstellar activity.
  try {
    newState = processExpeditionTick(newState, Date.now());
  } catch (err) {
    console.error('Expedition tick error (non-fatal):', err);
  }

  // 7. Check achievements (every 5 ticks to reduce overhead)
  try {
    const tickCount = Math.floor((newState.gameDate.year * 12 + newState.gameDate.month) % 5);
    if (tickCount === 0) {
      const earnedAchievements = newState.earnedAchievements || [];
      const newAchievements = checkAchievements(newState, earnedAchievements);
      if (newAchievements.length > 0) {
        const achievementEvents: typeof newState.eventLog = [];
        for (const ach of newAchievements) {
          achievementEvents.push({
            id: generateId(), date: newState.gameDate, type: 'milestone',
            title: `🎖️ Achievement: ${ach.name}`,
            description: ach.description,
          });
        }
        newState = {
          ...newState,
          earnedAchievements: [...earnedAchievements, ...newAchievements.map(a => a.id)],
          playerTitle: newAchievements.find(a => a.title)?.title || newState.playerTitle,
          eventLog: [...achievementEvents, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
        };
        // Audit Wave B (§1c): achievement_earned reputation was defined but
        // never awarded.
        for (let i = 0; i < newAchievements.length; i++) {
          newState = addReputation(newState, 'achievement_earned');
        }
      }
    }
  } catch (err) {
    console.error('Achievement check error (non-fatal):', err);
  }

  // 7b. Check legacy milestones & corporation tier (same cadence as achievements)
  try {
    const legacyTickCount = Math.floor((newState.gameDate.year * 12 + newState.gameDate.month) % 5);
    if (legacyTickCount === 0) {
      const currentLegacy = { ...(newState.legacy || DEFAULT_LEGACY) };
      currentLegacy.completedMilestones = [...currentLegacy.completedMilestones];
      currentLegacy.stretchLevels = { ...currentLegacy.stretchLevels };
      currentLegacy.trackers = { ...currentLegacy.trackers };

      const newMilestones = checkLegacyMilestones(newState);
      const newStretchLevels = checkStretchProgress(newState);

      if (newMilestones.length > 0 || Object.keys(newStretchLevels).length > 0) {
        const legacyEvents: typeof newState.eventLog = [];

        for (const milestoneId of newMilestones) {
          const def = LEGACY_MILESTONE_MAP.get(milestoneId);
          if (def) {
            currentLegacy.completedMilestones.push(milestoneId);
            const bonusLabel = def.bonusCategory === 'crewCapacity'
              ? `+${def.bonusValue} crew slots`
              : `+${def.bonusValue}% ${def.bonusCategory}`;
            legacyEvents.push({
              id: generateId(),
              date: newState.gameDate,
              type: 'milestone',
              title: `Legacy Milestone: ${def.name}`,
              description: `${def.description} (${bonusLabel})`,
            });
          }
        }

        for (const [stretchId, newLevel] of Object.entries(newStretchLevels)) {
          currentLegacy.stretchLevels[stretchId] = newLevel;
          if (newLevel % 5 === 0 || newLevel <= 3) {
            legacyEvents.push({
              id: generateId(),
              date: newState.gameDate,
              type: 'milestone',
              title: `Stretch Legacy Level ${newLevel}!`,
              description: 'Your dynasty grows stronger.',
            });
          }
        }

        currentLegacy.legacyPower = getLegacyPower(currentLegacy);
        currentLegacy.displayTier = getLegacyDisplayTier(currentLegacy);

        newState = {
          ...newState,
          legacy: currentLegacy,
          eventLog: [...legacyEvents, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
        };
      }

      // Check corporation tier advancement
      const newCorpTier = checkCorporationTier(newState);
      if (newCorpTier !== (newState.corporationTier || 1)) {
        const { getTierDef } = require('./corporation-tiers');
        const tierDef = getTierDef(newCorpTier);
        newState = {
          ...newState,
          corporationTier: newCorpTier,
          eventLog: [{
            id: generateId(),
            date: newState.gameDate,
            type: 'milestone' as const,
            title: `${tierDef.icon} Corporation Tier: ${tierDef.name}`,
            description: `Your company has evolved to ${tierDef.name} tier! New capabilities unlocked.`,
          }, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
        };
      }
    }
  } catch (err) {
    console.error('Legacy/tier check error (non-fatal):', err);
  }

  // 7c. Check megastructure phase completion
  try {
    newState = checkMegastructureCompletion(newState);
  } catch (err) {
    console.error('Megastructure check error (non-fatal):', err);
  }

  // 7d. Award reputation for completed events
  try {
    // Check for newly completed buildings
    const prevBuildings = state.buildings;
    for (const bld of newState.buildings) {
      if (bld.isComplete) {
        const wasPrevComplete = prevBuildings.find(b => b.instanceId === bld.instanceId)?.isComplete;
        if (!wasPrevComplete) {
          const def = BUILDING_MAP.get(bld.definitionId);
          const tier = def?.tier || 1;
          const source = `building_tier_${tier}` as 'building_tier_1' | 'building_tier_2' | 'building_tier_3' | 'building_tier_4' | 'building_tier_5';
          newState = addReputation(newState, source);
        }
      }
    }

    // Check for newly completed research
    if (newState.completedResearch.length > state.completedResearch.length) {
      for (const resId of newState.completedResearch) {
        if (!state.completedResearch.includes(resId)) {
          const def = RESEARCH_MAP.get(resId);
          const tier = def?.tier || 1;
          const source = `research_tier_${tier}` as 'research_tier_1' | 'research_tier_2' | 'research_tier_3' | 'research_tier_4' | 'research_tier_5';
          newState = addReputation(newState, source);
        }
      }
    }

    // Check for newly completed contracts
    const prevContracts = state.completedContracts || [];
    const newContracts = newState.completedContracts || [];
    if (newContracts.length > prevContracts.length) {
      const diff = newContracts.length - prevContracts.length;
      for (let i = 0; i < diff; i++) {
        newState = addReputation(newState, 'contract_complete');
      }
    }

    // Check for megastructure phase/completion reputation
    const prevMegas = state.megastructures || [];
    const newMegas = newState.megastructures || [];
    for (const newMega of newMegas) {
      const prevMega = prevMegas.find(m => m.definitionId === newMega.definitionId);
      if (prevMega) {
        if (newMega.completedPhases > prevMega.completedPhases) {
          if (newMega.status === 'complete' && prevMega.status !== 'complete') {
            newState = addReputation(newState, 'megastructure_complete');
          } else {
            newState = addReputation(newState, 'megastructure_phase');
          }
        }
      }
    }
  } catch (err) {
    console.error('Reputation award error (non-fatal):', err);
  }

  // 8. Timed competitive events — spawn, check completion, expire
  try {
    const now = Date.now();
    const activeTimedEvents = [...(newState.activeTimedEvents || [])];
    const timedEventLog: typeof newState.eventLog = [];
    let timedReward = 0;
    // Audit Wave B (§1c): timed-event boostReward was "copied into state,
    // never granted on completion" — completed events now also grant their
    // speed boost into availableBoosts (2x for 1h, matching the tier-2
    // contract boost magnitude). Deterministic id — no RNG in the tick.
    const timedBoostGrants: NonNullable<GameState['availableBoosts']> = [];

    // Check completion and expiration of active events
    for (let i = activeTimedEvents.length - 1; i >= 0; i--) {
      const evt = activeTimedEvents[i];
      if (evt.completed) continue;

      // Check expiration
      if (now >= evt.expiresAtMs) {
        activeTimedEvents.splice(i, 1);
        continue;
      }

      // Check completion
      const template = EVENT_TEMPLATES.find(t => t.id === evt.templateId);
      if (template) {
        const progress = template.getProgress(newState);
        if (progress >= evt.target) {
          activeTimedEvents[i] = { ...evt, completed: true, completedAtMs: now };
          timedReward += evt.rewardAmount;
          const boostNote = evt.boostReward ? ` +2x ${evt.boostReward} boost (1h)` : '';
          if (evt.boostReward) {
            timedBoostGrants.push({
              id: `boost_timed_${evt.templateId}_${evt.startedAtMs}`,
              type: evt.boostReward,
              multiplier: 2.0,
              durationSeconds: 3600,
              source: `timed_event_${evt.templateId}`,
              label: `${evt.name}: 2x ${evt.boostReward} (1h)`,
            });
          }
          timedEventLog.push({
            id: generateId(), date: newState.gameDate, type: 'milestone',
            title: `${evt.icon} Event Complete: ${evt.name}`,
            description: `Reward: +$${(evt.rewardAmount / 1_000_000).toFixed(1)}M${boostNote}`,
          });
        }
      }
    }

    // Spawn new event every 2-4 hours (if < 3 active)
    const SPAWN_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours minimum
    const lastSpawn = newState.lastTimedEventSpawnMs || 0;
    const nonCompletedEvents = activeTimedEvents.filter(e => !e.completed);
    if (nonCompletedEvents.length < 3 && (now - lastSpawn) >= SPAWN_INTERVAL_MS) {
      const template = rollTimedEvent();
      const reward = calculateEventReward(template, newState);
      activeTimedEvents.push({
        templateId: template.id,
        name: template.name,
        icon: template.icon,
        category: template.category,
        description: template.description,
        targetLabel: template.targetLabel,
        target: template.getTarget(newState),
        startedAtMs: now,
        expiresAtMs: now + template.durationHours * 60 * 60 * 1000,
        rewardAmount: reward,
        boostReward: template.boostReward,
      });
      newState = { ...newState, lastTimedEventSpawnMs: now };
    }

    // Remove completed events older than 1 hour (give player time to see result)
    const cleanedEvents = activeTimedEvents.filter(e => {
      if (e.completed && e.completedAtMs && (now - e.completedAtMs) > 3600000) return false;
      return true;
    });

    newState = {
      ...newState,
      activeTimedEvents: cleanedEvents,
      money: newState.money + timedReward,
      totalEarned: newState.totalEarned + timedReward,
      availableBoosts: timedBoostGrants.length > 0
        ? [...(newState.availableBoosts || []), ...timedBoostGrants]
        : newState.availableBoosts,
      eventLog: timedEventLog.length > 0
        ? [...timedEventLog, ...newState.eventLog].slice(0, MAX_EVENT_LOG)
        : newState.eventLog,
    };
  } catch (err) {
    console.error('Timed event error (non-fatal):', err);
  }

  return newState;
}
