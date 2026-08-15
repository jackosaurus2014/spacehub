// ─── Space Tycoon: Away Operations (Live-Service Wave LS1 "Night Shift") ────
// docs/LIVE_SERVICE_2026-08.md §LS1 items 3+4. Replaces offline-income.ts's
// dishonest MAX_OFFLINE_HOURS=8 wall and its Math.max(0, netPerTick) clamp
// (appendix defect #1 — costs could never exceed revenue while away). Away
// time is now UNCAPPED in duration but CAPPED in rate via a tiered
// efficiency curve, raised by automation investment, never reaching 100%
// (logging in always beats staying away — CLAUDE.md MMO invariant).
//
// Three independent pieces run in this fixed order:
//   1. Base revenue/costs/mining — efficiency-weighted over the away window
//      (tick-rate axis: real hours away -> tier -> % of live-tick yield).
//      Costs (maintenance/payroll) accrue at FULL rate regardless of
//      efficiency — the honesty fix appendix defect #1 asks for.
//   2. Standing directives + forecast-only hazards — evaluated per elapsed
//      CALENDAR month (docs/LIVE_SERVICE_2026-08.md's "deterministic
//      per-game-month grid expeditions.ts uses"), for months STRICTLY
//      BEFORE the current world month. The transition INTO the current
//      month is deliberately left to the normal live-tick isMonthEnd hook in
//      game-engine.ts — nothing here touches state.gameDate, so hazards/
//      senate/quarterly-reports for the return month fire exactly once, via
//      the existing single-shot mechanism, with unforecast hazards for that
//      month still deferring to that first live tick per the spec.
//   3. Command queue — discrete-event chaining (command-queue.ts) across the
//      away window, using the balance AFTER step 1+2's income already
//      accrued (an optimistic-forward approximation: exact interleaved
//      timing would need full tick-by-tick replay — documented deviation).
//
// Determinism: every input is either the current state or real elapsed time;
// there is no Math.random anywhere in this module (hazard rolls reuse
// hazards.ts's existing seeded functions unchanged).

import type {
  GameState, GameEvent, AwayLedger, AwayLedgerHazardEntry,
} from './types';
import { SERVICE_MAP } from './services';
import { BUILDING_MAP } from './buildings';
import { MINING_PRODUCTION } from './resources';
import { getActiveMultipliers } from './random-events';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from './upgrades';
import { formatMoney } from './formulas';
import { getMonthlyPayroll, getWorkforceBonuses } from './workforce';
import { getResearchBonuses } from './research-tree';
import {
  TICKS_PER_GAME_MONTH, TICK_INTERVALS, MAX_EVENT_LOG,
  AWAY_EFFICIENCY_TIERS, AWAY_EFFICIENCY_INVESTMENT_CAP,
} from './constants';
import { DEFAULT_LEGACY, getLegacyBonuses } from './legacy-system';
import { getActiveEraModifiers } from './corporate-eras';
import { getGlobalGameDate } from './server-time';
import { getTotalGameMonths } from './expeditions';
import { simulateCommandQueueCatchUp } from './command-queue';
import { processDirectivesForMonth } from './standing-directives';
import { rollMonthlyHazards, applyHazards } from './hazards';
// Economic PvP Wave E3 (docs/ECONOMY_PVP_2026-08.md §E3): building
// consumption is a world-month-grid system like directives/hazards, so the
// away catch-up loop advances it per elapsed month using the SAME
// advanceConsumptionToMonth the live tick's isMonthEnd hook calls — the
// lastProcessedMonth cursor guarantees live play and away catch-up can never
// double-consume, and identical elapsed time always consumes identically.
import { advanceConsumptionToMonth } from './consumption';
// Live-Service Wave LS6 (docs/LIVE_SERVICE_2026-08.md §LS6): programs.ts's
// advancePrograms is the SAME function the live tick calls — a pure
// wall-clock discrete-event chain, so calling it here with `now` correctly
// completes/chains multiple programs across a long absence (the "training
// continues while away" requirement) with no separate catch-up code path to
// keep in sync. processLeaderRetirements is likewise a pure wall-clock
// check, safe to call here so a retirement that happened while away
// surfaces in this ledger's message instead of silently on the next tick.
import { advanceProgramsDetailed, getEffectiveWorkforceForBonuses, mergeProgramWorkforceBonuses } from './programs';
import { processLeaderRetirements } from './commanders';

const TICK_INTERVAL_MS = TICK_INTERVALS[1]; // 2000ms — 1x speed (same as offline-income.ts)
const MIN_AWAY_MS = 30_000; // same "don't bother" threshold offline-income.ts used
/** Safety valve on the per-game-month directive/hazard catch-up loop —
 *  matches expeditions.ts's MAX_CATCHUP_MONTHS (20,000 game-months is far
 *  beyond any realistic absence; kept local to avoid a cross-module coupling
 *  for a single shared constant). */
const MAX_CATCHUP_MONTHS = 20_000;

// ─── Away-efficiency curve ───────────────────────────────────────────────────

/** Investment bonus that raises tiers 2-4 of the away-efficiency curve.
 *  docs/LIVE_SERVICE_2026-08.md §LS1 calls for a new `autonomous_ops_center`
 *  building to drive this — deferred this wave (new building content
 *  authoring, balancing, and art are out of scope for an engine pass; see
 *  the LS1 report). Instead this reads EXISTING automation signals already
 *  in the codebase: predictive_maintenance + digital_twin research (both
 *  "AI predicts/simulates operations" flavored), the ops_automation_program
 *  repeatable's completed level, and operator workforce share — the same
 *  compounding-investment shape the spec asks for, without new content risk. */
export function getAwayEfficiencyInvestmentBonus(state: GameState): number {
  let bonus = 0;
  if (state.completedResearch.includes('predictive_maintenance')) bonus += 0.05;
  if (state.completedResearch.includes('digital_twin')) bonus += 0.05;
  const opsLevel = Math.min(5, state.repeatableResearchLevels?.ops_automation_program || 0);
  bonus += opsLevel * 0.03; // up to +0.15 at max level 5
  const wf = state.workforce;
  if (wf) {
    const total = (wf.pilots || 0) + (wf.negotiators || 0) + (wf.securitys || 0) + (wf.medics || 0)
      + wf.engineers + wf.scientists + wf.miners + wf.operators;
    if (total > 0) bonus += Math.min(1, wf.operators / total) * 0.10; // up to +0.10
  }
  return bonus;
}

const TIER_LABELS = ['Fresh shift (0-12h)', 'Extended shift (12-48h)', 'Skeleton crew (2-7d)', 'Dark ops (7d+)'];

/** Efficiency + label for a single point-in-time "how many hours away is
 *  this" query (used for UI display: "if you log off now, what tier are you
 *  entering"). Tier 1 is always the presence ceiling (1.0, never raised);
 *  tiers 2-4 are raised by investment, capped at AWAY_EFFICIENCY_INVESTMENT_CAP
 *  so being logged in is always strictly better. */
export function getAwayEfficiencyTierForHours(
  hoursAway: number,
  investmentBonus: number,
): { efficiency: number; label: string; tierIndex: number } {
  for (let i = 0; i < AWAY_EFFICIENCY_TIERS.length; i++) {
    const tier = AWAY_EFFICIENCY_TIERS[i];
    if (hoursAway <= tier.maxHours) {
      const efficiency = i === 0 ? tier.baseEfficiency : Math.min(AWAY_EFFICIENCY_INVESTMENT_CAP, tier.baseEfficiency + investmentBonus);
      return { efficiency, label: TIER_LABELS[i], tierIndex: i };
    }
  }
  const last = AWAY_EFFICIENCY_TIERS.length - 1;
  return {
    efficiency: Math.min(AWAY_EFFICIENCY_INVESTMENT_CAP, AWAY_EFFICIENCY_TIERS[last].baseEfficiency + investmentBonus),
    label: TIER_LABELS[last],
    tierIndex: last,
  };
}

/** Effective (efficiency-weighted) tick count across the WHOLE away window,
 *  integrating across tier boundaries — a player away 50 hours gets 12h @
 *  100%, 36h @ 70% (or its raised value), not one blended rate. Pure
 *  function of elapsed time + investment bonus: same inputs -> same output,
 *  unit-tested for determinism. At the tier-1 boundary this degenerates to
 *  exactly the old offline-income.ts behavior (100% of ticks), so short
 *  absences are numerically unchanged. */
export function getWeightedTicks(timeAwayMs: number, investmentBonus: number): number {
  const totalTicks = Math.floor(timeAwayMs / TICK_INTERVAL_MS);
  if (totalTicks <= 0) return 0;

  let weighted = 0;
  let ticksLeft = totalTicks;
  let cursorMs = 0;

  for (let i = 0; i < AWAY_EFFICIENCY_TIERS.length; i++) {
    if (ticksLeft <= 0) break;
    const tier = AWAY_EFFICIENCY_TIERS[i];
    const tierEndMs = tier.maxHours === Infinity ? Infinity : tier.maxHours * 3_600_000;
    const ticksInTier = tier.maxHours === Infinity
      ? ticksLeft
      : Math.max(0, Math.min(ticksLeft, Math.floor((tierEndMs - cursorMs) / TICK_INTERVAL_MS)));
    if (ticksInTier <= 0) { cursorMs = tierEndMs; continue; }
    const efficiency = i === 0 ? tier.baseEfficiency : Math.min(AWAY_EFFICIENCY_INVESTMENT_CAP, tier.baseEfficiency + investmentBonus);
    weighted += ticksInTier * efficiency;
    ticksLeft -= ticksInTier;
    cursorMs = tierEndMs;
  }
  return weighted;
}

// ─── Main entry point ────────────────────────────────────────────────────────

export interface AwayOperationsResult {
  ledger: AwayLedger;
  state: GameState;
}

/** Compute (but do not persist) everything that happened while the player
 *  was away. Pure aside from reading Date.now() default and the fixed `now`
 *  parameter — pass an explicit `now` in tests for full determinism. Returns
 *  null if the player wasn't away long enough to bother (same 30s floor
 *  offline-income.ts used). */
export function calculateAwayOperations(state: GameState, now: number = Date.now()): AwayOperationsResult | null {
  const lastTick = state.lastTickAt || now;
  const timeAwayMs = now - lastTick;
  if (timeAwayMs < MIN_AWAY_MS) return null;

  const hoursAway = timeAwayMs / 3_600_000;
  const investmentBonus = getAwayEfficiencyInvestmentBonus(state);
  const { efficiency: blendedTierEfficiency, label: tierLabel } = getAwayEfficiencyTierForHours(hoursAway, investmentBonus);

  const moneyAtStart = state.money;
  let working: GameState = state;

  // ── 1. Base revenue/costs/mining — efficiency-weighted, uncapped time,
  //       net-clamp REMOVED (appendix defect #1: costs can now exceed
  //       revenue while away, exactly like a live tick). ───────────────────
  const multipliers = getActiveMultipliers(working);
  const workforce = working.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
  // LS6: effective workforce (reserved cohort headcount subtracted) +
  // completed-cohort bonuses merged in — same treatment as the live tick, so
  // an away window with an active/completed cohort projects honestly.
  const wfBonuses = mergeProgramWorkforceBonuses(getWorkforceBonuses(getEffectiveWorkforceForBonuses(working)), working);
  const resBonuses = getResearchBonuses(working.completedResearch, working.repeatableResearchLevels);
  const legacyBonuses = getLegacyBonuses(working.legacy || DEFAULT_LEGACY);
  // LS4: away catch-up must agree with the live tick's era focus bonus/malus
  // — otherwise chartering a heavy-revenue era would have no reason to
  // affect the away-income projection, undermining the trade-off while the
  // player is offline (the same "the two must agree" discipline this
  // module's header cites for the efficiency curve).
  const eraModifiers = getActiveEraModifiers(working);
  const fraction = 1 / TICKS_PER_GAME_MONTH;

  let revenuePerTick = 0;
  let costsPerTick = 0;
  for (const svc of working.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const linkedBld = working.buildings.find(b =>
      b.isComplete && b.locationId === svc.locationId
      && BUILDING_MAP.get(b.definitionId)?.enabledServices.includes(svc.definitionId)
    );
    const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
    const supplyMult = (working.servicePriceMultipliers || {})[svc.definitionId] ?? 1.0;
    revenuePerTick += Math.round(
      def.revenuePerMonth * fraction
      * svc.revenueMultiplier
      * multipliers.revenueMultiplier
      * upgradeBoost
      * (1 + wfBonuses.serviceRevenue)
      * (1 + resBonuses.serviceRevenueBonus)
      * legacyBonuses.revenueMultiplier
      * eraModifiers.revenueMultiplier
      * supplyMult
    );
    costsPerTick += Math.round(def.operatingCostPerMonth * fraction * multipliers.costMultiplier * eraModifiers.costMultiplier);
  }
  for (const bld of working.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
    costsPerTick += Math.round(def.maintenanceCostPerMonth * fraction * multipliers.costMultiplier * eraModifiers.costMultiplier * maintMult * (1 - resBonuses.maintenanceReduction));
  }
  const payrollPerTick = Math.round(getMonthlyPayroll(workforce) * fraction);
  costsPerTick += payrollPerTick;

  const weightedTicks = getWeightedTicks(timeAwayMs, investmentBonus);
  const totalTicks = Math.floor(timeAwayMs / TICK_INTERVAL_MS);
  const grossEarned = Math.round(revenuePerTick * weightedTicks);
  const grossSpent = Math.round(costsPerTick * totalTicks);

  const miningMult = (1 + wfBonuses.miningOutput) * (1 + resBonuses.miningOutputBonus) * legacyBonuses.miningMultiplier * eraModifiers.miningMultiplier;
  const resourcesEarned: Record<string, number> = {};
  for (const svc of working.activeServices) {
    const production = MINING_PRODUCTION[svc.definitionId];
    if (!production) continue;
    for (const { resource, amountPerMonth } of production) {
      const totalMined = amountPerMonth * fraction * miningMult * weightedTicks;
      if (totalMined >= 1) resourcesEarned[resource] = (resourcesEarned[resource] || 0) + Math.round(totalMined);
    }
  }

  const resources = { ...working.resources };
  for (const [id, qty] of Object.entries(resourcesEarned)) resources[id] = (resources[id] || 0) + qty;
  working = {
    ...working,
    money: working.money + grossEarned - grossSpent,
    totalEarned: working.totalEarned + grossEarned,
    totalSpent: working.totalSpent + grossSpent,
    resources,
  };

  // ── 2. Standing directives + forecast-only hazards, per elapsed calendar
  //       month strictly BEFORE the current world month (see file header). ─
  const lastMonthIndex = getTotalGameMonths(working.gameDate);
  const currentMonthIndex = getTotalGameMonths(getGlobalGameDate(now));
  const endMonthExclusive = Math.min(currentMonthIndex, lastMonthIndex + 1 + MAX_CATCHUP_MONTHS);

  let directiveFeesCharged = 0;
  const directiveActions: string[] = [];
  const hazardsApplied: AwayLedgerHazardEntry[] = [];
  const catchUpEvents: GameEvent[] = [];
  let gameMonthsProcessed = 0;

  const severeForecastKey = (monthIndex: number, locationId: string, type: string) => `${monthIndex}:${locationId}:${type}`;
  const forecastSet = new Set(
    (working.hazardWarnings || [])
      .filter(w => w.severity === 'severe')
      .map(w => severeForecastKey(w.forecastMonthIndex, w.locationId, w.type))
  );

  for (let m = lastMonthIndex + 1; m < endMonthExclusive; m++) {
    gameMonthsProcessed++;

    const dResult = processDirectivesForMonth(working, m, now);
    working = dResult.state; // already carries its own events merged into eventLog
    directiveFeesCharged += dResult.feeCharged;
    directiveActions.push(...dResult.actions);

    // Wave E3: consume this elapsed month's building recipes (after
    // directives — auto-restock buys land before the draw, matching the live
    // tick's ordering). Events/efficiency merge into `working` internally.
    working = advanceConsumptionToMonth(working, m);

    // Only hazards that were ALREADY forecast (severe, visible at logout)
    // may strike while away — everything else defers to the first live tick
    // (docs/LIVE_SERVICE_2026-08.md §LS1: "forecastable risk" invariant).
    if (forecastSet.size > 0) {
      const rolled = rollMonthlyHazards(working, now, m);
      const allowed = rolled.filter(r => r.severity === 'severe' && forecastSet.has(severeForecastKey(m, r.locationId, r.type)));
      if (allowed.length > 0) {
        const applied = applyHazards(working, allowed);
        working = applied.state;
        catchUpEvents.push(...applied.events);
        for (const a of allowed) hazardsApplied.push({ monthIndex: m, summary: a.summary });
      }
    }
  }

  // ── 3. Command queue — discrete-event chaining across the away window. ──
  const queueResult = simulateCommandQueueCatchUp(working, now);
  working = queueResult.state;

  // ── 3b. Programs Queue (LS6) — training/leader-posting chaining across
  //        the away window, same discrete-event pattern as the command
  //        queue just above (advancePrograms IS the catch-up path — see
  //        this file's LS6 import comment). ─────────────────────────────
  const programsResult = advanceProgramsDetailed(working, now);
  working = programsResult.state;
  const programsCompleted = programsResult.completedCount;

  // ── 3c. Leader retirement (LS6) — pure wall-clock check; surfaces here so
  //        a retirement that happened while away appears in THIS ledger
  //        rather than silently on the player's next live tick. ──────────
  const hiredBeforeRetirement = (working.hiredCommanders || []).length;
  working = processLeaderRetirements(working, now);
  const leadersRetired = hiredBeforeRetirement - (working.hiredCommanders || []).length;

  // ── Ledger ───────────────────────────────────────────────────────────
  const hours = Math.floor(timeAwayMs / 3_600_000);
  const minutes = Math.floor((timeAwayMs % 3_600_000) / 60_000);
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const totalResources = Object.values(resourcesEarned).reduce((a, b) => a + b, 0);
  const moneyDelta = working.money - moneyAtStart;

  const messageParts = [
    `You were away for ${timeStr} (${tierLabel}, ${(blendedTierEfficiency * 100).toFixed(0)}% efficiency).`,
    `Net ${moneyDelta >= 0 ? '+' : ''}${formatMoney(moneyDelta)}${totalResources > 0 ? ` and mined ${totalResources.toLocaleString()} resources` : ''}.`,
  ];
  if (queueResult.executed.length > 0) {
    messageParts.push(`${queueResult.executed.length} queued order${queueResult.executed.length === 1 ? '' : 's'} started automatically.`);
  }
  if (directiveFeesCharged > 0) {
    messageParts.push(`Standing directives cost ${formatMoney(directiveFeesCharged)} in ops overhead.`);
  }
  if (hazardsApplied.length > 0) {
    messageParts.push(`${hazardsApplied.length} forecasted hazard${hazardsApplied.length === 1 ? '' : 's'} struck while you were away.`);
  }
  if (programsCompleted > 0) {
    messageParts.push(`${programsCompleted} training program${programsCompleted === 1 ? '' : 's'} completed.`);
  }
  if (leadersRetired > 0) {
    messageParts.push(`${leadersRetired} leader${leadersRetired === 1 ? '' : 's'} retired while you were away.`);
  }

  const ledger: AwayLedger = {
    computedAtMs: now,
    timeAwayMs,
    efficiencyTierLabel: tierLabel,
    effectiveEfficiencyPct: blendedTierEfficiency,
    moneyDelta,
    resourcesDelta: resourcesEarned,
    gameMonthsProcessed,
    directiveFeesCharged,
    directiveActionsSummary: directiveActions,
    queueExecuted: queueResult.executed,
    queueSkipped: queueResult.skipped,
    hazardsApplied,
    message: messageParts.join(' '),
  };

  working = {
    ...working,
    awayLedger: ledger,
    // catchUpEvents accumulated oldest-month-first; eventLog convention is
    // newest-first, so reverse before prepending.
    eventLog: catchUpEvents.length > 0 ? [...catchUpEvents].reverse().concat(working.eventLog).slice(0, MAX_EVENT_LOG) : working.eventLog,
  };

  return { ledger, state: working };
}

/** Apply a computed away-operations result to a live GameState — resumes the
 *  standard tick loop cleanly from "now". */
export function applyAwayOperations(state: GameState, result: AwayOperationsResult): GameState {
  return { ...result.state, lastTickAt: result.ledger.computedAtMs };
}
