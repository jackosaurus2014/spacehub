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
import { advanceNarrativeChains } from './narrative-events';
import { advanceAccordSenate } from './accord-senate';
import { advanceStoryChapters } from './chapters';
import { checkMilestones } from './milestones';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from './upgrades';
import { SHIP_MAP } from './ships';
import { getWorkforceBonuses } from './workforce';
import { getActiveBoostMultiplier, cleanupExpiredBoosts } from './speed-boosts';
import type { ActiveBoost } from './speed-boosts';
import { getGlobalActiveMarketEvents } from './market-events';
import type { ActiveMarketEvent } from './market-events';
import { checkAchievements } from './achievements';
import { rollTimedEvent, calculateEventReward, EVENT_TEMPLATES } from './timed-events';
import { DEFAULT_LEGACY, getLegacyBonuses, checkLegacyMilestones, checkStretchProgress, getLegacyPower, getLegacyDisplayTier, LEGACY_MILESTONE_MAP } from './legacy-system';
import { checkCorporationTier, getTierBonuses } from './corporation-tiers';
import { getMegastructureBonuses, checkMegastructureCompletion } from './personal-megastructures';
import { getReputationBonuses, addReputation } from './reputation';
import { computeCommanderBonuses, processCommanderMonthTick, processLeaderRetirements } from './commanders';
// Live-Service Wave LS6 (docs/LIVE_SERVICE_2026-08.md §LS6): programs.ts
// merges crew-cohort completion bonuses into the SAME wfBonuses shape
// workforce.ts already produces (mergeProgramWorkforceBonuses), and
// getEffectiveWorkforceForBonuses subtracts any actively-enrolled cohort's
// reserved headcount before that computation — both applied at the single
// existing getWorkforceBonuses(workforce) call site below (and its sibling
// at the ship-processing block further down), rather than a new multiplier
// threaded through every revenue/research/mining site.
import { advancePrograms, getEffectiveWorkforceForBonuses, mergeProgramWorkforceBonuses } from './programs';
import { ensureFreshDeliveryPool, processContractDeadlines } from './delivery-contracts';
// Live-Service Wave LS9 (docs/LIVE_SERVICE_2026-08.md §LS9): quarterly
// Realignment — epoch clock, NPC faction-bias lookup, Epoch Address assembly.
// Pure/DB-free (see realignment.ts's header) — computed fresh every tick,
// nothing here is persisted beyond the one-shot "already announced" flag.
import { getCurrentRealignmentEpoch, getNpcFactionBiasMultiplier, assembleEpochAddress } from './realignment';
import { NPC_SEEDS } from './npc-companies';
import { shouldAutoGraduate, graduateFrontier, isInFrontier } from './frontier';
import { rollMonthlyHazards, applyHazards, forecastSevereHazards } from './hazards';
// Audit Wave D+E (Change #4 hazards/insurance, Change #5 markets, Change #9
// sinks — see docs/GAME_SYSTEMS_AUDIT_2026-08.md A4/A5/C5) imports:
import {
  getMonthlyInsurancePremium,
  applyResourceDecay,
  rollMonthlyDisaster,
  calculateRequiredReserve,
  getReserveStatus,
  RESERVE_REQUIREMENT_MIN_TIER,
} from './economic-sinks';
import { accumulateMinedFlows, accumulateNpcFlows, accumulateShockFlows, consumeMarketFlowFlush, applyMarketFlowFlush } from './market-pressure';
import { processExpeditionTick } from './expeditions';
// 4X Wave W6 (science-missions.ts): flagship science programs — tick beside
// expeditions; Sentinel constellation extends the hazard forecast horizon and
// (with the deflection demo) trims hazard damage post-roll (the W1 pattern).
import {
  processScienceMissionTick,
  getForecastHorizonMonths,
  getScienceHazardDamageMultipliers,
} from './science-missions';
import { consumeServerReconciliation, applyReconciliationToState } from './ledger-reconcile';
// Audit Wave B (Change #2 "dead-multiplier pack" + Change #6 + A10) imports:
import { getSpecializationBonuses } from './specializations';
import { getVictoryBonuses } from './victory-conditions';
import { getTotalSubsidiaryIncome, getSubsidiaryServiceBonus } from './subsidiaries';
import { getGovernorBenefits, getStakeholderServiceBonus, getMultiZonePenalty, LOCATION_TO_ZONE } from './zone-influence';
import { consumeServerEffects, applyServerEffectsToState, clampAllianceBonuses, clampWorldEventBonuses, clampMentorshipBonuses, clampMegaProjectBonuses } from './server-effects';
import { getReturningCommanderMultiplier } from './returning-commander';
import { getShipMiningRateMultiplier, getShipTransitSpeedMultiplier } from './modules';
// 4X Wave W14 (cargo-logistics.ts, audit C1): per-location inventory routing
// — production at a remote location accrues into that location's local
// stockpile once logistics is unlocked; arriving freight credits its
// destination. The credit half of the dup-proof debit/credit pair (the debit
// lives in dispatchShipWithCargo).
import { routeProductionCredit, creditArrivalCargo, hasFreightCapability } from './cargo-logistics';
import { updateCrewWellbeing, getTotalCrew, getCrewCapacity } from './workforce';
// Economic PvP Wave E5 "Depletion, Labor & Lanes" (docs/ECONOMY_PVP_2026-08.md
// §2.4/§2.6/§E5): deposit extraction pressure brakes mining output per
// (location, resource); the wage index multiplies payroll per crew type;
// hazard-driven inventory loss posts a market supply shock. Lane-usage
// (§2.8) is wired in cargo-logistics.ts / trade-lanes.ts instead — dispatch
// happens outside the tick loop.
import { getExtractionPressureMultiplier } from './extraction-pressure';
import { getMonthlyPayrollWithWageIndex } from './labor-market';
import { rollLocationInventoryShocks, applyInventoryShocks } from './hazards';
import { consumeLaneUsageFlush, subtractTransmittedLaneUsage } from './trade-lanes';
import type { ServiceType } from './types';
// 4X Wave W13 (Corporate Doctrine & Board Politics, docs/4X_BASELINE_2026-08.md
// §1.7): doctrineBonuses is consumed at the SAME sites resBonuses/
// commanderBonuses already are (revenue/build/research/hazard/payroll);
// constituency approval feeds updateCrewWellbeing as one additive input.
import { getDoctrineBonuses, getConstituencyApprovals, getConstituencyMoraleModifier } from './corporate-doctrine';
import type { ResourceId } from './resources';
// Live-Service Wave LS1 "Night Shift" (docs/LIVE_SERVICE_2026-08.md §LS1):
// command-queue pop-on-slot-free (every tick) + standing-directive monthly
// ops fee/automation (same isMonthEnd hook hazards/senate already use — the
// away-catchup path in away-operations.ts shares processDirectivesForMonth
// so live and away evaluation can never drift).
import { popCommandQueue } from './command-queue';
import { processDirectivesForMonth } from './standing-directives';
// Live-Service Wave LS4 "Corporate Eras" (docs/LIVE_SERVICE_2026-08.md §LS4):
// active-era focus bonus/malus applied at the same sites as legacy/mega/rep
// bonuses below; era completion is a wall-clock check (`now >= endsAtMs`),
// safe to run unconditionally every tick — see corporate-eras.ts's header.
import { getActiveEraModifiers, completeCurrentEra } from './corporate-eras';
// Economic PvP Wave E3 "The Consumption Engine" (docs/ECONOMY_PVP_2026-08.md
// §2.2/§E3): buildings draw recipe inputs each world-month on the same
// deterministic month grid hazards/directives use. advanceConsumptionToMonth
// is shared with away-operations.ts's catch-up loop (identical elapsed time ⇒
// identical consumption); per-building supply efficiency (0.5 soft floor)
// multiplies that building's service revenue and mining output below.
import { advanceConsumptionToMonth, consumeConsumptionFlush, applyConsumptionFlush } from './consumption';
// Economic PvP Wave E4 "Finite Demand Pools" (docs/ECONOMY_PVP_2026-08.md
// §2.1/§E4): service revenue is now gated by finite per-(location, category)
// demand pools — suppliers split the pool by capacity share, so saturation
// means competitors take customers and undersupply pays a scarcity premium
// (≤ +25%). Replaces the retired global log10 instance-count decay
// (state.servicePriceMultipliers). Same helper serves away-operations.ts —
// identical state ⇒ identical multiplier on either path.
import { getServiceDemandMultiplier } from './service-pricing';

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
  // LS6: payroll below still reads the FULL `workforce` (a cohort's crew are
  // off-shift, not off-payroll) — only the BONUS calculation subtracts the
  // reserved headcount, then adds back any completed-cohort bonus.
  const wfBonuses = mergeProgramWorkforceBonuses(getWorkforceBonuses(getEffectiveWorkforceForBonuses(state)), state);

  // Get research bonuses (category-specific bonuses from completed research).
  // W3 (4X Op5 repeatables): also sums levels from state.repeatableResearchLevels.
  const resBonuses = getResearchBonuses(state.completedResearch, state.repeatableResearchLevels);

  // Get legacy bonuses (replaces prestige)
  const legacy = state.legacy || DEFAULT_LEGACY;
  const legacyBonuses = getLegacyBonuses(legacy);
  const legacyRevMult = legacyBonuses.revenueMultiplier;
  const legacyMiningMult = legacyBonuses.miningMultiplier;
  const legacyBuildSpeedMult = legacyBonuses.buildSpeedMultiplier;
  const legacyCostMult = legacyBonuses.costMultiplier;

  // Live-Service Wave LS4: active chartered era's bonus/malus pair (a real
  // trade-off — e.g. Expansion Era's +10% revenue pairs with +8% overhead).
  // Neutral 1.0 set when no era is chartered.
  const eraModifiers = getActiveEraModifiers(state);

  // Get corporation tier bonuses
  const corpTier = state.corporationTier || 1;
  const tierBonuses = getTierBonuses(corpTier);

  // W13 (Corporate Doctrine & Board Politics): active policy stances turned
  // into the same small additive/multiplicative terms resBonuses/
  // commanderBonuses already contribute at the revenue/build/research/
  // hazard/payroll sites below.
  const doctrineBonuses = getDoctrineBonuses(state.corporateDoctrine);

  // Get megastructure bonuses
  const megaBonuses = getMegastructureBonuses(state.megastructures || []);

  // Get reputation bonuses
  const repBonuses = getReputationBonuses(state.reputation || 0);

  // Get commander bonuses (passive stacked bonuses from hired commanders).
  // W8 (Leaders 2.0): pass `state` so trait bonuses can check whether each
  // assigned commander's post is currently productive.
  const commanderBonuses = computeCommanderBonuses(state.hiredCommanders, state);

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
  // Sol Events (real-world feed): modest, time-bounded research-speed bonus
  // while a real Artemis/Starship program milestone is <7 days old. Applied
  // at the same waveBResearchMult site as the alliance researchBonus just
  // above (research queues 1 and 2, further down). Contract-payout half of
  // this snapshot is consumed separately in contracts.ts applyContractReward.
  const worldEventB = clampWorldEventBonuses(state.worldEventBonuses) || {
    contractPayoutBonus: 0, researchSpeedBonus: 0, expiresAtMs: 0,
  };
  // Live-Service Wave LS2 (§LS2 mechanic 3): mentorship bonuses — server-
  // aggregated via the same sync → server-effects hop as allianceBonuses. A
  // mentor's snapshot carries only revenueBonus (+5% cap); a mentee's
  // carries all three (+20% cap each) — see server-effects.ts's
  // clampMentorshipBonuses for why one clamp function covers both roles.
  const mentorshipB = clampMentorshipBonuses(state.mentorshipBonuses) || {
    revenueBonus: 0, miningBonus: 0, researchBonus: 0,
  };
  // Wave E7 (§5 item 6, audit §1d): cooperative mega-project permanentBonus,
  // finally applied — server-aggregated (every completed project is
  // global/shared, see mega-projects.ts getMegaProjectBonuses), delivered
  // via the same sync -> server-effects hop as allianceB/mentorshipB above.
  const coopMegaB = clampMegaProjectBonuses(state.megaProjectBonuses) || {
    revenueBonus: 0, miningBonus: 0, researchBonus: 0, launchCostReduction: 0,
  };
  // Live-Service Wave LS2 (§LS2 mechanic 2): Returning Commander re-entry
  // boost — 1.3x decaying linearly to 1.0x over 14 real days. Purely a
  // function of wall-clock time since the track started in
  // returningCommanderTrack.startedAtMs; never stored as a number, so it
  // can't drift regardless of tick cadence.
  const returningCommanderRevMult = getReturningCommanderMultiplier(state);
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
  // W13: compensation-philosophy policy multiplies payroll (Generous ×1.15 /
  // Lean ×0.90 / neutral ×1.0). Wave E5 (§2.6): salary is base × the
  // server-wide wage index per crew type (getMonthlyPayrollWithWageIndex
  // falls back to plain getMonthlyPayroll behavior — index 1.0 — when no
  // labor-market snapshot has arrived yet).
  const payroll = Math.round(getMonthlyPayrollWithWageIndex(workforce, state.laborMarket) * fraction * doctrineBonuses.payrollMultiplier);
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

  // Wave E3: per-building supply efficiency from the latest consumption pass
  // (0.5..1; absent instance = fully supplied). Read once — multiplied into
  // service revenue and mining output at their existing sites.
  const consumptionEff = state.consumptionState?.efficiency || {};

  // Market saturation counters — one per (definitionId, locationId) bucket.
  // Each iteration increments the bucket so the Nth duplicate earns less than
  // the (N-1)th. See serviceSaturationMultiplier for the curve.
  const saturationCounts = new Map<string, number>();

  // Audit Wave E (C5 §7 reserve requirement): T5+ corporations below a
  // 3-month expense runway run services at reduced efficiency (status set at
  // month-end below). BALANCE.md invariants: ongoing pressure that scales
  // with empire size ✓, transparent (status + event) ✓, mitigation path =
  // hold cash / trim costs ✓, exempt below T5 (new-player exemption) ✓.
  const reserveEfficiencyMult =
    corpTier >= RESERVE_REQUIREMENT_MIN_TIER && state.reserveStatus
      ? Math.max(0.6, Math.min(1, state.reserveStatus.efficiencyMultiplier))
      : 1.0;

  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const bucketKey = `${svc.definitionId}@${svc.locationId}`;
    const saturationPosition = saturationCounts.get(bucketKey) || 0;
    saturationCounts.set(bucketKey, saturationPosition + 1);
    const saturationMult = serviceSaturationMultiplier(saturationPosition);
    const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
    const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
    // Wave E4: finite demand pool multiplier for this service's
    // (location, category) market — server snapshot when fresh, else the
    // deterministic local pool. Includes phase-in + Frontier shield.
    const supplyMult = getServiceDemandMultiplier(state, svc.definitionId, svc.locationId, globalDate.totalMonths);
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
      * (1 + mentorshipB.revenueBonus) // LS2: mentor/mentee revenue share
      * (1 + coopMegaB.revenueBonus) // E7: completed cooperative mega-projects
    );
    // Audit Wave D (A4): hazard damage on the enabling building penalizes
    // service revenue until auto-repair (month-end money sink below) works
    // it off — "building revenue penalty until repaired". 50% damage ≈ -37%
    // revenue; floor 0.25 so a crippled facility still limps.
    const hazardDamageFactor = Math.max(0.25, 1 - 0.75 * (linkedBld?.damagePct || 0));
    // Wave E3 (§2.2): supply shortfall browns the building out — linear down
    // to the 0.5 soft floor, never a hard stop (the powerRatio precedent).
    const supplyEfficiency = linkedBld ? (consumptionEff[linkedBld.instanceId] ?? 1) : 1;
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
      * doctrineBonuses.revenueMultiplier  // W13: disclosure policy (Open Science -3% / Proprietary +3%)
      * eraModifiers.revenueMultiplier     // LS4: active era focus bonus/malus
      * powerRatio
      * (1 + stationBonus)
      * saturationMult
      * wfBonuses.moraleMultiplier
      * waveBRevenueMult
      * hazardDamageFactor        // audit Wave D (A4)
      * supplyEfficiency          // Wave E3 (§2.2 consumption soft floor)
      * reserveEfficiencyMult     // audit Wave E (C5 §7)
      * returningCommanderRevMult // LS2: decaying re-entry boost, 1.3x -> 1.0x over 14 days
      * DEV_REVENUE_MULTIPLIER
    );
    // Specialization maintenance_reduction (§1b) applies to operating costs.
    const cost = Math.round(def.operatingCostPerMonth * fraction * multipliers.costMultiplier * legacyCostMult * eraModifiers.costMultiplier * (1 - tierBonuses.maintenanceReduction) * (megaBonuses.maintenanceMultiplier || 1) * repBonuses.maintenanceMultiplier * (1 - specBonuses.maintenanceReduction));
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
      * eraModifiers.costMultiplier // LS4: era focus overhead trade-off
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
    const maint = Math.round(def.maintenanceCostPerMonth * fraction * multipliers.costMultiplier * maintMult * (1 - resBonuses.maintenanceReduction) * legacyCostMult * eraModifiers.costMultiplier * (1 - tierBonuses.maintenanceReduction) * (megaBonuses.maintenanceMultiplier || 1) * repBonuses.maintenanceMultiplier * (1 - specBonuses.maintenanceReduction) /* audit Wave B §1b */);
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
    const effectiveDuration = (bld.realDurationSeconds || 0) / (buildBoostMult * legacyBuildSpeedMult * eraModifiers.buildSpeedMultiplier * (megaBonuses.buildSpeedMultiplier || 1) * repBonuses.buildSpeedMultiplier * commanderBonuses.buildSpeedMultiplier * doctrineBonuses.buildSpeedMultiplier * waveBBuildSpeedMult * DEV_FAST_MULTIPLIER);
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
  // W3+W10 (4X Op4/Op5): repeatable-program levels and doctrine-choice
  // history. Mutated in place by completeResearchDef below, then threaded
  // into `out` at the bottom of this function (both are additive-only V20
  // state — see save-load.ts / types.ts GameState comments).
  const repeatableResearchLevels: Record<string, number> = { ...(state.repeatableResearchLevels || {}) };
  const doctrineChoices: Record<string, string> = { ...(state.doctrineChoices || {}) };

  /** Shared completion handler for both research queues. Repeatable
   *  programs (Op5) never enter `completedResearch` — completing one just
   *  increments its level and lets it re-arm at the next (escalated) cost,
   *  which handleStartResearch computes via getResearchDisplayState. Every
   *  other research pushes to completedResearch as before; if it's one side
   *  of a doctrine pair (Op4) and no choice has been recorded yet for that
   *  group, this is the corporation's doctrine — recorded once, never
   *  overwritten (so a later override-unlock of the locked sibling doesn't
   *  erase which side was chosen first). */
  const completeResearchDef = (id: string) => {
    const def = RESEARCH_MAP.get(id);
    if (def?.repeatable) {
      const next = (repeatableResearchLevels[id] || 0) + 1;
      repeatableResearchLevels[id] = Math.min(next, def.repeatable.maxLevel);
      return;
    }
    completedResearch.push(id);
    if (def?.doctrineGroup && !doctrineChoices[def.doctrineGroup]) {
      doctrineChoices[def.doctrineGroup] = id;
    }
  };

  if (activeResearch) {
    const researchElapsed = (now - (activeResearch.startedAtMs || 0)) / 1000;
    const researchBoostMult = getActiveBoostMultiplier(activeBoosts, 'research');
    // Audit Wave B: + specialization research_speed (§1b), victory research
    // bonus (§1b), alliance researchBonus (A2). Combined new factor cap 2x.
    // Sol Events (real-world feed): + worldEventB.researchSpeedBonus while a
    // real program milestone is fresh (<7 days old, +10% flat).
    const waveBResearchMult = Math.min(2.0, (1 + specBonuses.researchSpeed) * victoryBonuses.researchSpeedMultiplier * (1 + allianceB.researchBonus) * (1 + worldEventB.researchSpeedBonus) * (1 + mentorshipB.researchBonus) * (1 + coopMegaB.researchBonus)); // LS2: mentee research share; E7: mega-project
    // narrativeResearchMult (V17 / Wave W4): chain-event research boosts
    // ("Radio Science Windfall", "Fusion Ignition Milestone"...) ride the
    // same expiring activeEffects list random events use, aggregated by
    // getActiveMultipliers into `multipliers.researchSpeedMultiplier`.
    const researchSpeedMult = (1 + wfBonuses.researchSpeed) * (1 + resBonuses.researchSpeedBonus) * legacyBonuses.researchSpeedMultiplier * eraModifiers.researchSpeedMultiplier * researchBoostMult * (megaBonuses.researchSpeedMultiplier || 1) * repBonuses.researchSpeedMultiplier * commanderBonuses.researchSpeedMultiplier * doctrineBonuses.researchSpeedMultiplier * waveBResearchMult * multipliers.researchSpeedMultiplier * DEV_FAST_MULTIPLIER;
    const effectiveDuration = (activeResearch.realDurationSeconds || 0) / researchSpeedMult;
    if (researchElapsed >= effectiveDuration) {
      completeResearchDef(activeResearch.definitionId);
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
    const waveBResearchMult2 = Math.min(2.0, (1 + specBonuses.researchSpeed) * victoryBonuses.researchSpeedMultiplier * (1 + allianceB.researchBonus) * (1 + worldEventB.researchSpeedBonus) * (1 + mentorshipB.researchBonus) * (1 + coopMegaB.researchBonus)); // audit Wave B (same pack as queue 1) + Sol Events + LS2 mentee share; E7: mega-project
    const researchSpeedMult2 = (1 + wfBonuses.researchSpeed) * (1 + resBonuses.researchSpeedBonus) * legacyBonuses.researchSpeedMultiplier * eraModifiers.researchSpeedMultiplier * researchBoostMult2 * (megaBonuses.researchSpeedMultiplier || 1) * repBonuses.researchSpeedMultiplier * commanderBonuses.researchSpeedMultiplier * doctrineBonuses.researchSpeedMultiplier * waveBResearchMult2 * multipliers.researchSpeedMultiplier * DEV_FAST_MULTIPLIER;
    const effectiveDuration2 = (activeResearch2.realDurationSeconds || 0) / researchSpeedMult2;
    if (r2Elapsed >= effectiveDuration2) {
      completeResearchDef(activeResearch2.definitionId);
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
  // W14 (cargo-logistics.ts): shallow copy of the per-location stockpile map;
  // routeProductionCredit copy-on-writes the nested per-location objects.
  // While the grace ratchet (logisticsUnlocked) is false, every credit still
  // lands in the global pool — pre-W14 behavior exactly.
  const locationInventories: Record<string, Record<string, number>> = { ...(state.locationInventories || {}) };
  const routeLocally = state.logisticsUnlocked === true;
  // Audit Wave B: + specialization mining_output (§1b), victory mining
  // bonus (§1b), alliance miningBonus (A2), and timed 'mining' boosts from
  // mini-activities (§1c — mining_boost was silently dropped before).
  // Combined new factor capped at 2x (BALANCE.md invariant).
  const waveBMiningMult = Math.min(2.0,
    (1 + specBonuses.miningOutput)
    * victoryBonuses.miningMultiplier
    * (1 + allianceB.miningBonus)
    * (1 + mentorshipB.miningBonus) // LS2: mentee mining share
    * (1 + coopMegaB.miningBonus) // E7: completed cooperative mega-projects
    * getActiveBoostMultiplier(activeBoosts, 'mining')
  );
  const miningMult = (1 + wfBonuses.miningOutput) * (1 + resBonuses.miningOutputBonus) * legacyMiningMult * eraModifiers.miningMultiplier * (1 + tierBonuses.miningBonus) * (megaBonuses.miningMultiplier || 1) * repBonuses.miningMultiplier * commanderBonuses.miningMultiplier * waveBMiningMult;
  const currentTotalMonths = newDate.year * 12 + newDate.month;
  const miningBonuses = state.miningBonuses || [];
  // Audit Wave E (A5-i / §1d-5 "Mining never moves prices"): track units
  // mined this tick so useGameSync can send them as minedThisTick supply
  // pressure — the sync payload field the audit identifies as missing.
  const minedFlowsThisTick: Record<string, number> = {};
  // Wave E5 (§2.4): the SAME units, broken out per producing location — feeds
  // the server's LocationExtraction depletion accumulator via
  // minedByLocationThisTick.
  const minedFlowsByLocationThisTick: Record<string, Record<string, number>> = {};
  const addLocationMined = (locationId: string, resource: string, added: number) => {
    const loc = minedFlowsByLocationThisTick[locationId] || (minedFlowsByLocationThisTick[locationId] = {});
    loc[resource] = (loc[resource] || 0) + added;
  };
  for (const svc of activeServices) {
    const production = MINING_PRODUCTION[svc.definitionId];
    if (!production) continue;
    // Wave E3: hauler-fuel shortfall on the linked mining building scales
    // output down to the 0.5 soft floor (same factor as its service revenue).
    const svcSupplyEff = svc.linkedBuildingIds?.length
      ? (consumptionEff[svc.linkedBuildingIds[0]] ?? 1)
      : 1;
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
      // Accumulate fractional amounts — only add whole units.
      // W14: credit routes by the PRODUCING location — mining at Ceres fills
      // Ceres storage (local stockpile) once logistics is unlocked; home-
      // cluster and pre-ratchet production still credit the global pool.
      // Mined-flow market pressure stays global either way (supply is supply).
      // Wave E5 (§2.4): deposit extraction pressure — everyone strip-mining
      // the SAME (location, resource) thins the seam for everyone. Read from
      // the last server snapshot; neutral 1.0 (no penalty) when absent/stale.
      const extractionPressure = getExtractionPressureMultiplier(state.extractionPressure, svc.locationId, resource);
      const fractionalAmount = amountPerMonth * fraction * miningMult * extractionPressure * (1 + freighterBonus) * (1 + locationBonus) * svcSupplyEff;
      if (fractionalAmount >= 1) {
        const added = Math.round(fractionalAmount);
        routeProductionCredit(resources, locationInventories, svc.locationId, resource, added, routeLocally);
        minedFlowsThisTick[resource] = (minedFlowsThisTick[resource] || 0) + added;
        addLocationMined(svc.locationId, resource, added);
      } else if (isMonthEnd) {
        // On month boundary, add at least the monthly total
        const added = Math.round(amountPerMonth * miningMult * extractionPressure * (1 + freighterBonus) * (1 + locationBonus) * svcSupplyEff);
        routeProductionCredit(resources, locationInventories, svc.locationId, resource, added, routeLocally);
        minedFlowsThisTick[resource] = (minedFlowsThisTick[resource] || 0) + added;
        addLocationMined(svc.locationId, resource, added);
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
  // W14 note: megastructure passive resources deliberately stay in the
  // global pool — they're corporate-scale infrastructure output delivered to
  // HQ, not site production at a mappable location.
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

  // ─── 8. Market events — world-shared deterministic schedule ─────────
  // Audit Wave E (Change #5 / A5-iii, §1d-6): events were per-player
  // Math.random flavor text — "'Helium-3 ×2.0' never touches a price". The
  // state now mirrors getGlobalActiveMarketEvents — the SAME schedule the
  // server market routes price against — so what the player reads is what
  // the shared market is doing, for the event's stated duration.
  let activeMarketEvents: ActiveMarketEvent[] = [...(state.activeMarketEvents || [])];
  try {
    const globalEvents = getGlobalActiveMarketEvents(Date.now());
    const known = new Set(activeMarketEvents.map(e => `${e.eventId}:${e.startedAtMs}`));
    for (const evt of globalEvents) {
      if (known.has(`${evt.eventId}:${evt.startedAtMs}`)) continue;
      const hoursLeft = Math.max(1, Math.round((evt.expiresAtMs - Date.now()) / 3600_000));
      events.push({
        id: generateId(), date: newDate, type: 'random_event',
        title: `📈 ${evt.name}`,
        description: `Market event: affected prices ×${evt.priceMultiplier} for ~${hoursLeft}h. Trade around it.`,
      });
    }
    activeMarketEvents = globalEvents;
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
    // W13: board politics feeds the writer as one additive input, per
    // docs/4X_BASELINE_2026-08.md §1.7 ("constituencies... whose approval
    // feeds the existing morale writer instead of a new stat"). Approval is
    // recomputed here (pure, never persisted) from current doctrine + state.
    const constituencyApprovals = getConstituencyApprovals(state, now);
    const constituencyMoraleDelta = getConstituencyMoraleModifier(constituencyApprovals);
    workforceOut = updateCrewWellbeing(state.workforce, {
      utilization,
      recentHazardCount,
      cashNegative: money < 0,
      constituencyMoraleDelta,
    });
    // W1 (research effect-authoring pass, 4X_BASELINE_2026-08.md Part 2a):
    // crewMoraleBonus is an additive post-hoc adjustment on top of the pure
    // updateCrewWellbeing model above, rather than a new input threaded
    // through workforce.ts (out of this wave's file scope). Capped in
    // getResearchBonuses at 0.30 on the 0-1 morale scale.
    // W8 (Leaders 2.0): commanderBonuses.crewMoraleBonus is a sibling
    // additive term from an assigned commander's traits (Radiation
    // Physiologist / Union Favorite / Workaholic...) — same site, same cap
    // philosophy, no new engine wiring.
    // W13: doctrineBonuses.crewMoraleBonus (compensation policy) joins the
    // same additive stack.
    if (resBonuses.crewMoraleBonus > 0 || commanderBonuses.crewMoraleBonus !== 0 || doctrineBonuses.crewMoraleBonus !== 0) {
      workforceOut = { ...workforceOut, morale: Math.min(1, Math.max(0, (workforceOut.morale ?? 1.0) + resBonuses.crewMoraleBonus + commanderBonuses.crewMoraleBonus + doctrineBonuses.crewMoraleBonus)) };
    }
    // Surface meaningful morale drops so the stat is discoverable/manageable
    if ((workforceOut.morale ?? 1.0) <= prevMorale - 0.05) {
      events.push({
        id: generateId(), date: newDate, type: 'random_event',
        title: '📉 Crew morale falling',
        description: 'Hazards, fatigue, or cash trouble are wearing on your crew. Morale reduces all service revenue — consider training budget, medics, or lighter crew utilization.',
      });
    }
  }

  // ─── 9c. Month-end economics (audit Waves D+E) ───────────────────────────
  // Change #4 (A4): insurance premium sink + hazard auto-repair sink.
  // Change #9 (C5): resource decay, seeded economic disasters, T5+ cash
  // reserve requirement. All fire once per game-month (6 real hours), all
  // deterministic, all Frontier-exempt where hostile (gentle on-ramp).
  let buildingsFinal = buildings;
  let reserveStatusOut = state.reserveStatus;
  if (isMonthEnd) {
    const inFrontier = isInFrontier(state);
    // Recurring per-tick cost slice BEFORE this block's month-end lumps —
    // the basis for the reserve requirement's monthly expense run-rate.
    const recurringCostSliceThisTick = monthlyCosts + payroll;

    // (D-2) Insurance premium — economic-sinks.calculateInsurancePremium
    // (audit A4: "wire calculateInsurancePremium as an opt-in recurring
    // sink"). 0.5%/mo of insured asset value + 0.2% per hazardous location.
    // Waived inside the Frontier (no hazards there → nothing to insure
    // against; keeps the on-ramp free of sinks per the wave constraints).
    // BALANCE.md invariants: ongoing sink ✓, scales with empire size ✓,
    // mitigation via opting out / avoiding hazardous locations ✓.
    if (!inFrontier && state.insuranceActive === true) {
      // W1 (research effect-authoring pass): insuranceDiscountBonus applied
      // here rather than threaded into economic-sinks.ts's calculateInsurancePremium
      // (out of this wave's file scope) — same math, one multiply. Capped at
      // 0.40 in getResearchBonuses. W8 (Leaders 2.0): commanderBonuses.insuranceDiscountBonus
      // (Underwriting Analyst / Penny Pincher traits) stacks the same way,
      // floored so the combined discount can never invert the premium.
      const totalInsuranceDiscount = Math.max(0, Math.min(0.9, resBonuses.insuranceDiscountBonus + commanderBonuses.insuranceDiscountBonus));
      const premium = Math.round(getMonthlyInsurancePremium({ ...state, buildings: buildingsFinal }) * (1 - totalInsuranceDiscount));
      if (premium > 0) {
        money -= premium;
        totalSpent += premium;
        monthlyCosts += premium;
      }
    }

    // (E-5a) Resource decay (audit C5 §3 "resource decay on volatiles", at
    // the file's own rates: water 1%/mo, hydrocarbons 0.5%/mo — metals and
    // exotics never decay). Prevents infinite hoarding; makes stockpile
    // logistics a real decision. BALANCE.md: sink that scales with the
    // player's stockpile ✓.
    const decayed = applyResourceDecay(resources);
    for (const k of Object.keys(decayed)) resources[k] = decayed[k];
    // W14: remote stockpiles decay by the same rules — otherwise freighting
    // volatiles OUT of Earth would become a decay-proof hoarding exploit.
    for (const locId of Object.keys(locationInventories)) {
      const locDecayed = applyResourceDecay(locationInventories[locId]);
      if (Object.keys(locDecayed).length > 0) {
        locationInventories[locId] = { ...locationInventories[locId], ...locDecayed };
      }
    }

    // (D-3) Hazard auto-repair — the audit A4 "repair-cost money sink".
    // Damaged buildings repair 10 damage-points per month at 30% of
    // baseCost per point-fraction repaired; revenue penalty (applied in §1)
    // shrinks as damage heals. Runs headless now; the UI wave adds a
    // pay-to-rush repair button on the same fields.
    let repairSpend = 0;
    let stillDamaged = 0;
    buildingsFinal = buildingsFinal.map(b => {
      if (!b.isComplete || !b.damagePct || b.damagePct <= 0) return b;
      const def = BUILDING_MAP.get(b.definitionId);
      if (!def) return b;
      const step = Math.min(b.damagePct, 0.10);
      repairSpend += Math.round(step * def.baseCost * 0.30);
      const remaining = Math.round((b.damagePct - step) * 1000) / 1000;
      if (remaining > 0.001) stillDamaged++;
      return { ...b, damagePct: remaining > 0.001 ? remaining : undefined };
    });
    if (repairSpend > 0) {
      money -= repairSpend;
      totalSpent += repairSpend;
      monthlyCosts += repairSpend;
      events.push({
        id: generateId(), date: newDate, type: 'random_event',
        title: '🔧 Hazard repairs underway',
        description: `Repair crews billed ${(repairSpend / 1_000_000).toFixed(1)}M this month restoring damaged infrastructure.${stillDamaged > 0 ? ` ${stillDamaged} structure(s) still operating at reduced output.` : ' All structures back to full output.'}`,
      });
    }

    // (E-5b) Economic disasters (audit C5 §4, seeded per world month —
    // "economic disasters (choice-modal driven)" gets its choice modal in
    // the UI wave; costs and insurance interplay land now). Insurance
    // covers 75% of covered disasters — carrying a policy is a real
    // decision, not flavor. minBuildings gates + Frontier exemption keep
    // small operations safe. BALANCE.md: forces cash reserves ✓.
    if (!inFrontier) {
      const disasterRoll = rollMonthlyDisaster({ ...state, money, buildings: buildingsFinal }, globalDate.totalMonths);
      if (disasterRoll && disasterRoll.netCost > 0) {
        money -= disasterRoll.netCost;
        totalSpent += disasterRoll.netCost;
        monthlyCosts += disasterRoll.netCost;
        events.push({
          id: generateId(), date: newDate, type: 'random_event',
          title: `🚨 ${disasterRoll.disaster.name}`,
          description: `${disasterRoll.disaster.description} Cost: ${(disasterRoll.grossCost / 1_000_000).toFixed(1)}M${disasterRoll.insuranceCovered > 0 ? ` — insurance covered ${(disasterRoll.insuranceCovered / 1_000_000).toFixed(1)}M (75%)` : disasterRoll.disaster.requiresInsurance ? ' — UNINSURED, full cost borne' : ''}.`,
        });
      }
    }

    // (E-6) Cash reserve requirement for T5+ corporations (audit C5 §7:
    // "reserve requirements for T5+ — efficiency penalty below 3-month
    // runway"). Status computed here, efficiency multiplier applied to
    // service revenue in §1 on subsequent ticks.
    if (corpTier >= RESERVE_REQUIREMENT_MIN_TIER) {
      const monthlyExpenseRunRate = Math.round(recurringCostSliceThisTick * TICKS_PER_GAME_MONTH);
      const requiredReserve = calculateRequiredReserve(0, monthlyExpenseRunRate);
      const rs = getReserveStatus(money, requiredReserve);
      const prevStatus = state.reserveStatus?.status || 'healthy';
      reserveStatusOut = { status: rs.status, efficiencyMultiplier: rs.efficiencyMultiplier, requiredReserve };
      if (rs.status !== prevStatus) {
        events.push({
          id: generateId(), date: newDate, type: 'random_event',
          title: rs.status === 'healthy' ? '🏦 Cash reserves restored' : rs.status === 'warning' ? '🏦 Cash reserves low' : '🏦 Cash reserves CRITICAL',
          description: rs.status === 'healthy'
            ? 'Reserves cover the required 3-month runway. Services at full efficiency.'
            : `Board policy requires a 3-month expense reserve (${(requiredReserve / 1_000_000).toFixed(0)}M). Services operating at ${(rs.efficiencyMultiplier * 100).toFixed(0)}% efficiency until reserves recover.`,
        });
      }
    } else if (reserveStatusOut) {
      reserveStatusOut = undefined; // dropped below the tier — requirement lifts
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
  // W14: production that accrued into remote local stockpiles this tick is
  // mined output too — the daily-metric diff must not lose it just because
  // it no longer lands in the global pool.
  for (const [locId, inv] of Object.entries(locationInventories)) {
    const prevInv = (state.locationInventories || {})[locId] || {};
    for (const [resId, qty] of Object.entries(inv)) {
      const mined = qty - (prevInv[resId] || 0);
      if (mined > 0) {
        dm.units_mined += mined;
        if (resId === 'iron') dm.iron_mined += mined;
        if (resId === 'titanium') dm.titanium_mined += mined;
        if (resId === 'platinum_group') dm.platinum_group_mined += mined;
      }
    }
  }

  let out: GameState = {
    ...state,
    gameDate: newDate,
    tickCount: isMonthEnd ? 0 : tickCount,
    money,
    totalEarned,
    totalSpent,
    buildings: buildingsFinal,      // audit Wave D (A4 auto-repair)
    completedResearch,
    activeResearch,
    activeResearch2,
    repeatableResearchLevels,       // W3 (4X Op5)
    doctrineChoices,                // W3 (4X Op4)
    activeServices,
    resources,
    locationInventories,            // W14 (cargo-logistics per-location inventory)
    activeEffects,
    activeMarketEvents,
    activeBoosts: cleanedBoosts,
    miningBonuses: cleanedMiningBonuses,
    activeIntelPerks: cleanedIntelPerks,   // audit Wave B (A8)
    workforce: workforceOut,               // audit Wave B (A10 morale writer)
    reserveStatus: reserveStatusOut,       // audit Wave E (C5 §7)
    // Audit Wave E (A5-i): building-mining output joins the pending market
    // flows; ship mining + NPC flows are added in processFullTick. Wave E5:
    // + per-location attribution feeding LocationExtraction.
    pendingMarketFlows: accumulateMinedFlows(state.pendingMarketFlows, minedFlowsThisTick, minedFlowsByLocationThisTick),
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

  // ─── Narrative event chains (4X Wave W4, narrative-events.ts) ──────
  // docs/4X_BASELINE_2026-08.md Part 2c: 12 chains / 44 stages. Additive,
  // try/catch like every other post-audit subsystem — runs once per
  // game-month, right beside (and after) the legacy random-events roll
  // above so it inherits this tick's money/resources/pendingChoice state.
  // Only claims the single pendingChoice slot when random-events (step 7)
  // didn't already fill it this tick; deterministic scheduling still
  // advances non-choice stages regardless, so a full slot delays
  // presentation by a month rather than skipping the chain outright. Runs
  // BEFORE hazards below so a chain's "emergency shielding" choice can
  // protect against a hazard landing later this same tick.
  try {
    if (isMonthEnd) {
      const monthIndex = globalDate.totalMonths;
      const chainResult = advanceNarrativeChains(out, monthIndex, Date.now(), !out.pendingChoice);
      out = {
        ...chainResult.state,
        pendingChoice: chainResult.pendingChoice || chainResult.state.pendingChoice,
        eventLog: chainResult.events.length > 0
          ? [...chainResult.events, ...chainResult.state.eventLog].slice(0, MAX_EVENT_LOG)
          : chainResult.state.eventLog,
      };
    }
  } catch { /* narrative chains non-critical — never block the tick */ }

  // ─── Accord Council Senate (4X Wave W11, accord-senate.ts) ──────────────
  // docs/4X_BASELINE_2026-08.md W11: the quarterly vote engine. Independent
  // of the narrative chains above (no pendingChoice slot contention — the
  // senate is a passive docket/lobbying panel, never a blocking modal) and
  // of hazards below. Publishes a new docket at each quarter boundary and
  // resolves the previous one, applying pass/fail measure effects via
  // narrative-events.ts's applyChainConsequence (same wired hooks: money,
  // faction rep, activeEffects multipliers, hazard mitigation, morale).
  try {
    if (isMonthEnd) {
      const monthIndex = globalDate.totalMonths;
      const senateResult = advanceAccordSenate(out, monthIndex);
      out = {
        ...senateResult.state,
        eventLog: senateResult.events.length > 0
          ? [...senateResult.events, ...senateResult.state.eventLog].slice(0, MAX_EVENT_LOG)
          : senateResult.state.eventLog,
      };
    }
  } catch { /* accord senate non-critical — never block the tick */ }

  // Live-Service Wave LS1 "Night Shift" (docs/LIVE_SERVICE_2026-08.md §LS1
  // item 2): standing-directive ops fee + auto-sell/auto-restock/auto-renew,
  // evaluated once per game-month — the SAME processDirectivesForMonth call
  // away-operations.ts's catch-up loop uses, so live play and away catch-up
  // can never compute different numbers for the same elapsed month.
  try {
    if (isMonthEnd) {
      const monthIndex = globalDate.totalMonths;
      const dResult = processDirectivesForMonth(out, monthIndex, now);
      out = dResult.state;
    }
  } catch { /* standing directives non-critical — never block the tick */ }

  // Economic PvP Wave E3 (docs/ECONOMY_PVP_2026-08.md §E3): monthly building
  // consumption on the world-month grid. advanceConsumptionToMonth processes
  // every unprocessed month up to the current one (dedupe via
  // consumptionState.lastProcessedMonth — the same cursor the away-operations
  // catch-up loop advances, so live play and away catch-up can never
  // double-consume or diverge). Runs AFTER standing directives (auto-restock
  // buys land before this month's draw) and BEFORE hazards (a hazard that
  // destroys stock this tick shouldn't retroactively starve a pass that
  // already ran on this month's grid).
  try {
    if (isMonthEnd) {
      out = advanceConsumptionToMonth(out, globalDate.totalMonths);
    }
  } catch { /* consumption non-critical — never block the tick */ }

  // Hazards v2 (audit Wave D / Change #4 "hazards hurt, insurance pays"):
  // roll once per game-month, seeded per (world month, location, type) —
  // deterministic, shared weather, no save-scumming. Severe events can
  // destroy genuinely exposed assets (tiered thresholds); shielding modules,
  // security crew, and structural tier mitigate; insurance pays per its
  // terms. Frontier players remain FULLY shielded per the onramp policy
  // (stronger than the audit's "NPC piracy capped" minimum — verified in
  // frontier gating tests).
  if (isMonthEnd && !isInFrontier(out)) {
    const monthIndex = globalDate.totalMonths;
    let hazards = rollMonthlyHazards(out, Date.now(), monthIndex);
    // W1 (research effect-authoring pass): hazardResistanceBonus is a
    // research-driven layer on top of the ship/building mitigation already
    // rolled into each record's damagePct (hazards.ts getShipHazardMitigation
    // / getBuildingHazardMitigation). Applied here — post-roll, pre-apply —
    // rather than threaded into hazards.ts (out of this wave's file scope).
    // Deliberately capped low (0.30 in getResearchBonuses) to preserve
    // CLAUDE.md's "real risk" invariant; hazards.ts's own MITIGATION_CAP is
    // 0.90 and even that is documented as a "don't delete the risk pillar"
    // compromise.
    // W8 (Leaders 2.0): commanderBonuses.hazardResistanceBonus (Risk Officer
    // / Flight Director traits, or a Risk Taker quirk's negative) stacks
    // with the research bonus at the same site, same 0-0.9 safety floor.
    // W13: operations-doctrine policy joins the stack (Safety Culture +0.10 /
    // Aggressive Schedule -0.10) — can cancel out other resist sources but
    // (per the Math.max(0, ...) floor) never pushes damage above the roll.
    const totalHazardResist = Math.max(0, Math.min(0.9, resBonuses.hazardResistanceBonus + commanderBonuses.hazardResistanceBonus + doctrineBonuses.hazardResistanceBonus));
    if (totalHazardResist > 0) {
      hazards = hazards.map(h => ({ ...h, damagePct: Math.max(0, h.damagePct * (1 - totalHazardResist)) }));
    }
    // W6 (science-missions.ts): standing science-mission benefits trim
    // damage post-roll the same way — Heliophysics Sentinels reduce
    // solar-storm damage while operational; the Kinetic Deflection Demo
    // permanently reduces impact-class damage once demonstrated. Reductions
    // are capped in getScienceHazardDamageMultipliers (risk pillar stays real).
    {
      const sciMults = getScienceHazardDamageMultipliers(out);
      if (sciMults.solar_storm < 1 || sciMults.micrometeorite < 1) {
        hazards = hazards.map(h =>
          h.type === 'solar_storm' || h.type === 'micrometeorite'
            ? { ...h, damagePct: Math.max(0, h.damagePct * sciMults[h.type]) }
            : h,
        );
      }
    }
    if (hazards.length > 0) {
      const applied = applyHazards(out, hazards);
      out = {
        ...applied.state,
        eventLog: [...applied.events, ...(applied.state.eventLog || [])].slice(0, MAX_EVENT_LOG),
      };
    }
    // Wave E5 hazard coupling (§2.4): severe/major solar storms and pirate
    // raids also destroy a bounded % of location inventory (insurance-
    // coverable) and post the loss as a negative supply-shock flow to the
    // shared market — "disasters move prices" (CLAUDE.md). Separate roll
    // from the asset-hit rolls above (own RNG salt), same shared-weather
    // determinism.
    try {
      const shockRecords = rollLocationInventoryShocks(out, monthIndex, Date.now());
      if (shockRecords.length > 0) {
        const shockApplied = applyInventoryShocks(out, shockRecords);
        out = {
          ...shockApplied.state,
          eventLog: [...shockApplied.events, ...(shockApplied.state.eventLog || [])].slice(0, MAX_EVENT_LOG),
          pendingMarketFlows: accumulateShockFlows(shockApplied.state.pendingMarketFlows, shockApplied.lostUnits),
        };
      }
    } catch { /* inventory shocks non-critical — never block the tick */ }
    // Warning cadence (A4 / task spec): severe hazards are telegraphed one
    // full game-month (6 real hours) ahead — the player can shield, insure,
    // staff security, or relocate BEFORE the hit lands (CLAUDE.md: "players
    // must invest in insurance, redundancy, shielding").
    // W6 (science-missions.ts): an operational Heliophysics Sentinel
    // constellation extends the deterministic forecast horizon from 1 to 2
    // game-months — additive hook only: forecastSevereHazards itself is
    // unchanged, we simply ask it about additional future months (honest by
    // construction: the same seeded draws the real rolls will use).
    const forecastHorizon = getForecastHorizonMonths(out);
    const warnings = Array.from({ length: forecastHorizon }, (_, i) =>
      forecastSevereHazards(out, monthIndex + 1 + i, Date.now()),
    ).flat();
    const previousWarningIds = new Set((out.hazardWarnings || []).map(w => w.id));
    const warningEvents: GameEvent[] = warnings
      .filter(w => !previousWarningIds.has(w.id))
      .map(w => ({
        id: generateId(),
        date: newDate,
        type: 'random_event' as const,
        title: `🛰 ${w.type === 'solar_storm' ? 'Solar storm watch' : w.type === 'pirate_raid' ? 'Pirate activity warning' : w.type === 'micrometeorite' ? 'Debris field warning' : 'Systems strain warning'}`,
        description: w.summary,
      }));
    out = {
      ...out,
      hazardWarnings: warnings,
      eventLog: warningEvents.length > 0
        ? [...warningEvents, ...out.eventLog].slice(0, MAX_EVENT_LOG)
        : out.eventLog,
    };
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

  // Live-Service Wave LS1 "Night Shift" (docs/LIVE_SERVICE_2026-08.md §LS1
  // item 1): pop the command queue every tick — starts the next queued
  // research/build the instant its channel frees (builds/research above
  // already self-complete on wall-clock time; this just chains what's next).
  // Cheap no-op when the queue is empty or nothing is ready.
  try {
    if ((out.commandQueue || []).length > 0) {
      out = popCommandQueue(out, now).state;
    }
  } catch { /* command queue non-critical — never block the tick */ }

  // Live-Service Wave LS6 "Programs Queue" (docs/LIVE_SERVICE_2026-08.md
  // §LS6): advance every program track every tick — starts the next queued
  // crew cohort / leader posting the instant its track frees, completes
  // whatever's due. Cheap no-op when every track is empty.
  try {
    const ps = out.programs;
    if (ps && (ps.queues.crew_cohort.length > 0 || ps.queues.leader_development.length > 0 || ps.queues.rd_residency.length > 0)) {
      out = advancePrograms(out, now);
    }
  } catch { /* programs queue non-critical — never block the tick */ }

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

  // 0c. Audit Wave E (A5-i / A5-iv): drain market flows a successful sync
  // just transmitted to the shared market (mining supply pressure + NPC
  // trade flow). Same hand-off pattern as the ledger/effects queues above.
  try {
    const flush = consumeMarketFlowFlush();
    if (flush) {
      workingState = applyMarketFlowFlush(workingState, flush);
    }
  } catch (err) {
    console.error('Market flow flush error (non-fatal):', err);
  }

  // 0c2. Wave E5 (§2.8): drain the lane-usage flush a successful sync just
  // transmitted (trade-lanes.ts's own single-slot queue — kept separate from
  // market flows since it's keyed by lane, not resource).
  try {
    const laneFlush = consumeLaneUsageFlush();
    if (laneFlush) {
      workingState = {
        ...workingState,
        pendingLaneUsage: subtractTransmittedLaneUsage(workingState.pendingLaneUsage, laneFlush),
      };
    }
  } catch (err) {
    console.error('Lane usage flush error (non-fatal):', err);
  }

  // 0d. Wave E3: drain the consumption sync flush (demand telemetry +
  // procurement requests a successful sync just transmitted) — same
  // single-slot hand-off pattern as the market flows above.
  try {
    const cFlush = consumeConsumptionFlush();
    if (cFlush) {
      workingState = applyConsumptionFlush(workingState, cFlush);
    }
  } catch (err) {
    console.error('Consumption flush error (non-fatal):', err);
  }

  // 1. Process player tick
  let newState: GameState;
  try {
    newState = processTick(workingState);
  } catch (err) {
    console.error('processTick error:', err);
    return { ...workingState, lastTickAt: Date.now() };
  }

  // W8 (Leaders 2.0): month-boundary flag for commander XP accrual, taken
  // from the calendar change processTick just applied. Assignment-
  // productivity checks run later (after ships/expeditions/science-missions
  // are ticked) so they read the freshest state for the month.
  const commanderMonthAdvanced = newState.gameDate.month !== workingState.gameDate.month
    || newState.gameDate.year !== workingState.gameDate.year;

  // 1b. Live-Service Wave LS9 "The Realignment" (docs/LIVE_SERVICE_2026-08.md
  // §LS9): real-world-clock-driven, so it's checked every tick (not gated on
  // isMonthEnd like the game-month-cadenced systems inside processTick) —
  // cheap (one integer comparison) except on the rare tick that actually
  // crosses a real quarter boundary. computeFactionPostures/assembleEpochAddress
  // are pure/DB-free (realignment.ts header); npcBias is also computed here
  // (every tick, not just on the boundary) so NPC market activity reflects
  // the LIVE epoch's postures continuously, not just at the announcement
  // moment.
  let npcBias: Record<string, number> = {};
  try {
    const epochIndex = getCurrentRealignmentEpoch(Date.now());
    npcBias = Object.fromEntries(
      NPC_SEEDS.map(seed => [seed.id, getNpcFactionBiasMultiplier(seed.factionId, epochIndex)]),
    );

    if (newState.lastSeenRealignmentEpoch == null || epochIndex > newState.lastSeenRealignmentEpoch) {
      const address = assembleEpochAddress(epochIndex);
      newState = {
        ...newState,
        lastSeenRealignmentEpoch: epochIndex,
        eventLog: [{
          id: generateId(), date: newState.gameDate, type: 'random_event' as const,
          title: `🌐 ${address.title}`,
          description: address.lines[0],
        }, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
      };
    }
  } catch (err) {
    console.error('Realignment epoch check error (non-fatal):', err);
  }

  // 1c. Live-Service Wave LS8 "Story Chapters" (docs/LIVE_SERVICE_2026-08.md
  // §LS8): calendar-dated, world-synchronized narrative arcs — real-world-
  // clock-driven like the Realignment check above, so it's checked every
  // tick rather than gated on isMonthEnd (chapter act reveals/finale windows
  // are fixed real-world timestamps, not game-month-cadenced). Only claims
  // the single pendingChoice slot when nothing upstream (processTick's
  // narrative-events chains) already filled it this tick — the SAME
  // contention discipline advanceNarrativeChains uses, just resolved a tick
  // later here since chapters run after processTick rather than inside it.
  try {
    const chapterResult = advanceStoryChapters(newState, Date.now(), !newState.pendingChoice);
    newState = {
      ...chapterResult.state,
      pendingChoice: chapterResult.pendingChoice || chapterResult.state.pendingChoice,
      eventLog: chapterResult.events.length > 0
        ? [...chapterResult.events, ...chapterResult.state.eventLog].slice(0, MAX_EVENT_LOG)
        : chapterResult.state.eventLog,
    };
  } catch (err) {
    console.error('Story Chapters advance error (non-fatal):', err);
  }

  // 2. Process NPC companies (can fail safely)
  try {
    if (newState.npcCompanies && newState.npcCompanies.length > 0) {
      const npcResult = processNPCTick(newState.npcCompanies, newState.gameDate, npcBias, newState.marketSnapshot?.prices || {});
      newState = {
        ...newState,
        npcCompanies: npcResult.npcs,
        eventLog: [...npcResult.events, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
        npcMarketPressure: applyNPCMarketActions(
          newState.npcMarketPressure || {},
          npcResult.marketActions,
        ),
        // Audit Wave E (A5-iv / §1d-4): the accumulator above was write-only
        // — "the entire NPC buy/sell tuning ('gentle nudges, not crashes')
        // is inert". NPC trade flow now also joins pendingMarketFlows and
        // reaches the SHARED market via sync (server applies it at 1/3
        // trade impact, clamped) — NPC activity finally moves prices.
        pendingMarketFlows: accumulateNpcFlows(newState.pendingMarketFlows, npcResult.marketActions),
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
      // W14 (cargo-logistics): per-location stockpiles for ship-mining
      // accrual + freight arrival credits. Same copy-on-write pattern as
      // processTick's production block.
      const shipLocationInventories: Record<string, Record<string, number>> = { ...(newState.locationInventories || {}) };
      const shipRouteLocally = newState.logisticsUnlocked === true;
      let cargoDeliveredUnits = 0;
      let shipMoney = newState.money;
      let shipTotalSpent = newState.totalSpent;
      // LS6: same effective-workforce + program-bonus merge as processTick's
      // own wfBonuses above — ships shouldn't see a different crew picture.
      const wfBonuses = mergeProgramWorkforceBonuses(getWorkforceBonuses(getEffectiveWorkforceForBonuses(newState)), newState);
      const shipLegacyBonuses = getLegacyBonuses(newState.legacy || DEFAULT_LEGACY);
      const shipTierBonuses = getTierBonuses(newState.corporationTier || 1);
      // W1 (research effect-authoring pass): this ship-processing pass lives
      // in processFullTick, a different function/scope than processTick's
      // own `resBonuses` (line ~107) — recomputed here (cheap, pure) so
      // transitSpeedMult below can read travelSpeedBonus.
      const resBonuses = getResearchBonuses(newState.completedResearch, newState.repeatableResearchLevels);
      // W8 (Leaders 2.0): same reasoning — recompute commanderBonuses in
      // this scope so transitSpeedMult can read the Propulsion
      // Specialist/Cryogenics Engineer/Risk Taker trait contributions.
      const commanderBonuses = computeCommanderBonuses(newState.hiredCommanders, newState);
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
      // Audit Wave E (A5-i): ship-mined units join the market flows too.
      const shipMinedFlows: Record<string, number> = {};
      // Wave E5 (§2.4): same units, per producing location.
      const shipMinedFlowsByLocation: Record<string, Record<string, number>> = {};
      // Audit Wave D (A4): month-end hull auto-repair sink (tickCount resets
      // to 0 exactly on the month boundary inside processTick).
      const isShipMonthEnd = newState.tickCount === 0;
      let hullRepairSpend = 0;

      // Audit Wave D (A4): month-end hull auto-repair. Damaged ships repair
      // 10 hull-points/month at 30% of baseCost per point-fraction — the
      // fleet half of the repair-cost money sink. Mining penalty (below)
      // shrinks as the hull heals.
      const shipsAfterRepair = !isShipMonthEnd ? newState.ships : newState.ships.map(s => {
        if (!s.isBuilt || !s.hullDamagePct || s.hullDamagePct <= 0) return s;
        const sDef = SHIP_MAP.get(s.definitionId);
        if (!sDef) return s;
        const step = Math.min(s.hullDamagePct, 0.10);
        hullRepairSpend += Math.round(step * sDef.baseCost * 0.30);
        const remaining = Math.round((s.hullDamagePct - step) * 1000) / 1000;
        return { ...s, hullDamagePct: remaining > 0.001 ? remaining : undefined };
      });
      if (hullRepairSpend > 0) {
        shipMoney -= hullRepairSpend;
        shipTotalSpent += hullRepairSpend;
        shipEvents.push({
          id: generateId(), date: newState.gameDate, type: 'random_event',
          title: '🔧 Fleet hull repairs',
          description: `Drydock crews billed ${(hullRepairSpend / 1_000_000).toFixed(1)}M restoring hazard-damaged hulls.`,
        });
      }

      const updatedShips = shipsAfterRepair.map(ship => {
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
            // Audit Wave D (A4): persistent hull damage penalizes mining
            // rate until repaired — "ship mining-rate penalty" verbatim.
            const hullDamageFactor = Math.max(0.25, 1 - 0.75 * (ship.hullDamagePct || 0));
            // Wave E5 (§2.4): the same deposit extraction-pressure brake
            // building-based mining uses.
            const shipMiningLocationId = ship.miningOperation.locationId || ship.currentLocation;
            const shipExtractionPressure = getExtractionPressureMultiplier(newState.extractionPressure, shipMiningLocationId, resId);
            const mined = Math.round(shipDef.miningRate * 0.5 * shipMiningMult * moduleMiningMult * locationMult * hullDamageFactor * shipExtractionPressure * shipFraction);
            if (mined >= 1) {
              // W14: ship-mined output accrues at the MINING location's
              // stockpile once logistics is unlocked (Ceres ore fills Ceres
              // storage); grace/home routing matches building production.
              routeProductionCredit(
                resources, shipLocationInventories,
                shipMiningLocationId,
                resId, mined, shipRouteLocally,
              );
              // Audit Wave E (A5-i): mined units → shared-market pressure.
              shipMinedFlows[resId] = (shipMinedFlows[resId] || 0) + mined;
              const shipLoc = shipMinedFlowsByLocation[shipMiningLocationId] || (shipMinedFlowsByLocation[shipMiningLocationId] = {});
              shipLoc[resId] = (shipLoc[resId] || 0) + mined;
            }
          }
        }

        // Transit arrival
        // SECURITY (audit hotlist #5 → resolved by W14): arrival credit was
        // disabled in wave A because nothing debited cargo at departure — a
        // duplication landmine. Real cargo logistics now exists: the ONLY
        // path that puts cargo on a route is cargo-logistics.ts
        // dispatchShipWithCargo, which debits the origin inventory and the
        // Δv-priced fuel bill atomically at departure. The matching credit
        // below fires exactly once — route.cargo is the sole carrier of the
        // goods, and the same map-return that credits it also clears the
        // route, so a second tick can never re-credit (dup-proof
        // debit/credit ledger pair).
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
            // W1 (research effect-authoring pass): travelSpeedBonus folds into
            // the same additive-multiplier chain as fleetSpeed/shipEfficiency
            // above. Capped at 0.50 in getResearchBonuses.
            * (1 + resBonuses.travelSpeedBonus)
            // W8 (Leaders 2.0): commander trait travelSpeedBonus stacks the
            // same way (small, separately capped in computeCommanderBonuses).
            * (1 + commanderBonuses.travelSpeedBonus)
          );
          const plannedDuration = Math.max(0, ship.route.arrivalAtMs - ship.route.departedAtMs);
          const effectiveArrivalAtMs = ship.route.departedAtMs + plannedDuration / transitSpeedMult;
          if (now >= effectiveArrivalAtMs) {
            // W14: deliver the manifest into the DESTINATION inventory
            // (home cluster → global pool; anywhere else → local stockpile).
            const delivered = creditArrivalCargo(
              resources, shipLocationInventories, ship.route.to, ship.route.cargo || {},
            );
            if (delivered > 0) {
              cargoDeliveredUnits += delivered;
              const destName = LOCATION_MAP.get(ship.route.to)?.name || ship.route.to;
              shipEvents.push({
                id: generateId(), date: newState.gameDate, type: 'milestone',
                title: `📦 Cargo delivered: ${ship.name}`,
                description: `${delivered} units unloaded at ${destName}.`,
              });
            }
            return { ...ship, status: 'idle' as const, currentLocation: ship.route.to, route: undefined };
          }
        }

        // Survey expedition completion — probe is consumed, discovery applied.
        // 4X Wave W3 (docs/4X_BASELINE_2026-08.md): one deterministic roll
        // (seeded off ship + location + expedition start — mulberry32, no
        // Math.random) now drives BOTH content tables that used to be two
        // separate, unmerged systems: the guaranteed location-flavored find
        // (unchanged behavior, moved from ships.ts) and a claimable anomaly
        // (unchanged 30% kind-weighted gate — previously only reachable via
        // the AnomaliesPanel "Dev tools" manual-roll button, now a real
        // outcome of survey expeditions).
        if (ship.isBuilt && ship.status === 'surveying' && ship.surveyExpedition) {
          const elapsed = (now - ship.surveyExpedition.startedAtMs) / 1000;
          if (elapsed >= ship.surveyExpedition.durationSeconds) {
            const { rollDiscovery, recordDiscovery } = require('./exploration');
            const { survey: discovery, anomaly } = rollDiscovery(
              ship.surveyExpedition.targetLocation,
              ship.instanceId,
              ship.surveyExpedition.startedAtMs,
              now,
            );
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
            if (anomaly) {
              // Adds to the Discoveries tab's unclaimed list; the player
              // stakes a claim there within 30 days (exploration.ts
              // stakeClaim) to lock in the reward.
              newState = recordDiscovery(newState, anomaly);
              shipEvents.push({
                id: generateId(),
                date: newState.gameDate,
                type: 'random_event',
                title: `🔭 Anomaly Detected: ${anomaly.title}`,
                description: `${anomaly.summary} Stake a claim within 30 days from the Discoveries tab to lock in the reward.`,
              });
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
        locationInventories: shipLocationInventories,  // W14
        // W14: freight deliveries feed the existing cargo_delivered daily
        // metric (defined since the metrics system shipped, fed by nothing
        // until now).
        dailyMetrics: newState.dailyMetrics && cargoDeliveredUnits > 0
          ? { ...newState.dailyMetrics, cargo_delivered: newState.dailyMetrics.cargo_delivered + cargoDeliveredUnits }
          : newState.dailyMetrics,
        // Audit Wave E (A5-i): ship-mined units join the pending flows.
        pendingMarketFlows: accumulateMinedFlows(newState.pendingMarketFlows, shipMinedFlows, shipMinedFlowsByLocation),
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

  // 6a-bis. W14 grace ratchet: the first time the corporation owns a BUILT
  // transport/tanker hull, local production accrual switches on — one-way,
  // persisted, announced. Until then production credits the global pool
  // exactly as before W14 (the migration grace default).
  try {
    if (!newState.logisticsUnlocked && hasFreightCapability(newState)) {
      newState = {
        ...newState,
        logisticsUnlocked: true,
        eventLog: [{
          id: generateId(), date: newState.gameDate, type: 'milestone' as const,
          title: '🚚 Logistics network online',
          description: 'Your first freight hull is in service. From now on, production at remote locations accrues into LOCAL stockpiles (see the map location panel) — dispatch cargo ships to haul goods to Earth, where the market clears. Freight burns fuel priced by route Δv.',
        }, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
      };
    }
  } catch (err) {
    console.error('Logistics ratchet error (non-fatal):', err);
  }

  // 6b. Interstellar expeditions, colonies, and trade routes (Wave 10).
  // Campaign-loop subsystem — advances by game-months, no-ops (same state
  // reference) when the player has no interstellar activity.
  try {
    newState = processExpeditionTick(newState, Date.now());
  } catch (err) {
    console.error('Expedition tick error (non-fatal):', err);
  }

  // 6c. Flagship scientific missions (4X Wave W6, science-missions.ts).
  // Monthly/quarterly-loop subsystem on the expeditions template — advances
  // by game-months with catch-up, no-ops (same state reference) when the
  // player has no programs or unsettled NPC co-funding stakes.
  try {
    newState = processScienceMissionTick(newState, Date.now());
  } catch (err) {
    console.error('Science mission tick error (non-fatal):', err);
  }

  // 6d. Leaders 2.0 (4X Wave W8, commanders.ts): monthly XP accrual for
  // assigned commanders. Runs after ships/expeditions/science-missions so
  // isAssignmentProductive reads this month's freshest real state. Gated on
  // the month boundary (XP is a monthly-loop system per the doc: "assigned
  // leaders earn XP monthly; unassigned earn none").
  try {
    if (commanderMonthAdvanced) {
      newState = processCommanderMonthTick(newState);
    }
  } catch (err) {
    console.error('Commander XP tick error (non-fatal):', err);
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

  // 7b2. Live-Service Wave LS4: complete the active chartered era once its
  // 90-real-day wall-clock window has elapsed. Cheap unconditional check
  // (single Date.now() compare) — no cadence gate needed, unlike the legacy
  // block above which reads several array-scan checks. completeCurrentEra is
  // a no-op (same state reference) unless an era is both active and expired.
  try {
    newState = completeCurrentEra(newState);
  } catch (err) {
    console.error('Corporate era completion error (non-fatal):', err);
  }

  // 7b3. Live-Service Wave LS6: retire any commander whose current
  // assignment has run RETIREMENT_SERVICE_MS+ (a pure wall-clock check —
  // same reasoning as 7b2 above, no cadence gate). Also runs from
  // away-operations.ts's catch-up pass so a retirement that happened while
  // the player was away surfaces in the debrief, not silently on next tick.
  try {
    newState = processLeaderRetirements(newState, Date.now());
  } catch (err) {
    console.error('Leader retirement error (non-fatal):', err);
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
