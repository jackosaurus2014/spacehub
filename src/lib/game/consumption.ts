// ─── Space Tycoon: The Consumption Engine (Economic PvP Wave E3) ─────────────
// docs/ECONOMY_PVP_2026-08.md §2.2 + §E3 — "the founder directive's heart".
// Buildings finally CONSUME: each game-month, every completed building with a
// `consumesPerMonth` recipe draws its inputs from its LOCATION inventory
// (cargo-logistics.ts pool rules) and — when short — browns out to a 0.5
// efficiency soft floor instead of hard-stopping (the powerRatio precedent).
// Producer buildings (`producesPerMonth`) credit their outputs to the same
// location pool, scaled by supply efficiency.
//
// Sourcing choice (the founder's vertical-integration-vs-market pillar):
// consumption ALWAYS draws local stock first. What happens to the remainder
// is the per-building `supplyPolicy`:
//   'local'  (default) — run degraded; zero cash cost, full logistics burden.
//   'market' — the month's shortfall accrues into pendingProcurement; the
//              next sync sends it as `procurementRequests` and the SERVER
//              places bounded, band-limited standing BUY orders on the shared
//              order book (real MarketLimitOrder rows, source 'standing').
//              Escrow and fills flow through the same One-Wallet ledger every
//              MarketPanel trade uses; goods land in the HOME pool via ledger
//              reconciliation — remote sites still need freight (Δv is never
//              free). Standing orders are visible demand other players can
//              see, front-run, and supply — §E3's biggest PvP-surface unlock.
//
// Determinism & the world-month grid: processing is keyed to the SERVER
// world-month index (server-time.ts totalMonths). advanceConsumptionToMonth
// is the single entry point used by BOTH the live tick (game-engine.ts
// isMonthEnd) and away catch-up (away-operations.ts month loop) — it
// processes exactly the months in (lastProcessedMonth, targetMonth], so the
// same elapsed time consumes identically on either path and can never
// double-consume. No RNG anywhere in this module.
//
// Migration safety (§E3 [SAVE] / §7): existing saves get a one-time
// 6-game-month input stockpile credited per affected building
// (applyGrandfatherGrace, save-load.ts V32) and recipes phase in 25%→100%
// over 3 game-months from migration. Protected Frontier corporations are
// fully exempt (the same on-ramp shield insurance/hazards use).

import type { GameState, GameEvent, BuildingDefinition, BuildingInstance } from './types';
import { BUILDING_MAP } from './buildings';
import { RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';
import { LOCATION_MAP } from './solar-system';
import { isHomeLocation } from './cargo-logistics';
import { getResearchBonuses } from './research-tree';
import { isInFrontier } from './frontier';
import { accumulateMinedFlows } from './market-pressure';
import { generateId } from './formulas';
import { MAX_EVENT_LOG } from './constants';
import { GAME_START_YEAR } from './server-time';
// Meaningful Decisions Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5):
// a mothballed/reactivating/decommissioning building draws AND produces
// nothing — it exits the recipe economy the same way it exits revenue and
// demand-pool capacity. isBuildingOperational is the single predicate every
// M2-aware call site shares.
import { isBuildingOperational } from './mothball';

// ─── Constants (§2.2 / §E3) ─────────────────────────────────────────────────

/** Soft failure floor: a fully unsupplied building still runs at 50% — it
 *  browns out, it never dies (spec: "the station browns out, it doesn't
 *  die"). Recipe outputs/costs are tuned so operating AT the floor is
 *  maintenance-negative — the floor is survival, not a strategy. */
export const CONSUMPTION_EFFICIENCY_FLOOR = 0.5;

/** §E3 grandfather grace: recipes ramp 25% → 100% over 3 game-months from
 *  migration (month 0 = 25%, 1 = 50%, 2 = 75%, 3+ = 100%). */
export const PHASE_IN_MONTHS = 3;
export const PHASE_IN_START_FRACTION = 0.25;

/** §E3 grandfather grace: months of inputs credited per affected building
 *  when an existing save migrates in. */
export const GRACE_STOCKPILE_MONTHS = 6;

/** Life-support shortfall additionally hits crew morale (§2.2): up to this
 *  much morale lost per fully-unsupplied month, scaled by shortfall. */
export const LIFE_SUPPORT_MORALE_PENALTY = 0.05;

/** Client-side accumulation caps (bounded state for never-syncing players;
 *  the server clamps again — client data is client-claimed, POLICY.md). */
export const DEMAND_FLOW_CAP = 2_000;
export const PROCUREMENT_QTY_CAP = 250;
export const PROCUREMENT_RESOURCE_CAP = 8;

/** Catch-up safety valve — matches away-operations.ts MAX_CATCHUP_MONTHS. */
const MAX_CONSUMPTION_CATCHUP_MONTHS = 20_000;

export type ConsumptionState = NonNullable<GameState['consumptionState']>;

export const DEFAULT_CONSUMPTION_STATE: ConsumptionState = {
  phaseInStartMonth: null,
  graceCredited: true,
  lastProcessedMonth: null,
  efficiency: {},
  shortfallResources: {},
  pendingDemandFlows: {},
  pendingProcurement: {},
};

// ─── Recipe readers ─────────────────────────────────────────────────────────

/** True when a definition participates in the consumption engine at all. */
export function hasRecipe(def: BuildingDefinition | undefined): boolean {
  return !!def && (!!def.consumesPerMonth || !!def.producesPerMonth);
}

/** Recipe phase-in fraction for a world month (25% → 100% over 3 months from
 *  the migration anchor; null anchor = full rate — fresh games). */
export function getConsumptionPhaseInFraction(
  consumptionState: GameState['consumptionState'],
  monthIndex: number,
): number {
  const start = consumptionState?.phaseInStartMonth;
  if (start === null || start === undefined) return 1;
  const monthsIn = monthIndex - start;
  if (monthsIn >= PHASE_IN_MONTHS) return 1;
  if (monthsIn < 0) return PHASE_IN_START_FRACTION;
  const step = (1 - PHASE_IN_START_FRACTION) / PHASE_IN_MONTHS;
  return Math.min(1, PHASE_IN_START_FRACTION + step * monthsIn);
}

/** Latest supply efficiency for a building instance (1 = fully supplied /
 *  no recipe). Multiplies that building's service revenue + mining output. */
export function getBuildingConsumptionEfficiency(state: GameState, instanceId: string): number {
  const eff = state.consumptionState?.efficiency?.[instanceId];
  return typeof eff === 'number' && Number.isFinite(eff) ? Math.max(CONSUMPTION_EFFICIENCY_FLOOR, Math.min(1, eff)) : 1;
}

// ─── Inventory pool helpers (mutating tick-owned copies) ─────────────────────
// Draw rules mirror cargo-logistics routing: home cluster ⇒ the global pool;
// remote ⇒ that location's stockpile — EXCEPT while the logistics grace
// ratchet is off (logisticsUnlocked false), when everything still lives in
// the global pool, so remote buildings draw from it too (exact mirror of
// routeProductionCredit's grace behavior — no starved remote stations on
// saves that predate freight).

function readPool(
  resources: Record<string, number>,
  locationInventories: Record<string, Record<string, number>>,
  locationId: string,
  routeLocally: boolean,
): Record<string, number> {
  if (!routeLocally || isHomeLocation(locationId)) return resources;
  return locationInventories[locationId] || {};
}

function drawFromPool(
  resources: Record<string, number>,
  locationInventories: Record<string, Record<string, number>>,
  locationId: string,
  routeLocally: boolean,
  resourceId: string,
  amount: number,
): void {
  if (amount <= 0) return;
  if (!routeLocally || isHomeLocation(locationId)) {
    resources[resourceId] = Math.max(0, (resources[resourceId] || 0) - amount);
    return;
  }
  const loc = { ...(locationInventories[locationId] || {}) };
  loc[resourceId] = Math.max(0, (loc[resourceId] || 0) - amount);
  if (loc[resourceId] === 0) delete loc[resourceId];
  locationInventories[locationId] = loc;
}

function creditToPool(
  resources: Record<string, number>,
  locationInventories: Record<string, Record<string, number>>,
  locationId: string,
  routeLocally: boolean,
  resourceId: string,
  amount: number,
): void {
  if (amount <= 0) return;
  if (!routeLocally || isHomeLocation(locationId)) {
    resources[resourceId] = (resources[resourceId] || 0) + amount;
    return;
  }
  const loc = { ...(locationInventories[locationId] || {}) };
  loc[resourceId] = (loc[resourceId] || 0) + amount;
  locationInventories[locationId] = loc;
}

// ─── The monthly pass ───────────────────────────────────────────────────────

interface MonthPassResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * Process ONE world-month of building consumption/production. Pure and
 * deterministic — same input state ⇒ same output state. Internal to
 * advanceConsumptionToMonth (exported for tests).
 *
 * Per building with a recipe:
 *   effRequired_i = consumesPerMonth_i × phaseIn × (1 − consumptionReduction)
 *   supplied      = min_i(available_i / effRequired_i), clamped 0..1
 *   draw_i        = effRequired_i × supplied      (consume what we ran on)
 *   efficiency    = FLOOR + (1 − FLOOR) × supplied
 *   output_o      = producesPerMonth_o × phaseIn × efficiency
 */
export function processConsumptionForMonth(state: GameState, monthIndex: number): MonthPassResult {
  const events: GameEvent[] = [];

  const completed = state.buildings.filter(
    b => b.isComplete && hasRecipe(BUILDING_MAP.get(b.definitionId)) && isBuildingOperational(b),
  );
  if (completed.length === 0) {
    return {
      state: {
        ...state,
        consumptionState: {
          ...(state.consumptionState || DEFAULT_CONSUMPTION_STATE),
          lastProcessedMonth: monthIndex,
          efficiency: {},
          shortfallResources: {},
        },
      },
      events,
    };
  }

  const cs = state.consumptionState || DEFAULT_CONSUMPTION_STATE;
  const phaseIn = getConsumptionPhaseInFraction(cs, monthIndex);
  const resBonuses = getResearchBonuses(state.completedResearch, state.repeatableResearchLevels);
  const reductionMult = Math.max(0.6, 1 - resBonuses.consumptionReductionBonus); // §4.1 cap 0.40

  const resources = { ...(state.resources || {}) };
  const locationInventories: Record<string, Record<string, number>> = { ...(state.locationInventories || {}) };
  const routeLocally = state.logisticsUnlocked === true;

  const efficiency: Record<string, number> = {};
  const shortfallResources: Record<string, string[]> = {};
  const demandFlows: Record<string, number> = {}; // consumed units → §2.2 aggregate demand telemetry
  const producedFlows: Record<string, number> = {}; // produced units → mined-flow supply pressure
  const procurement: Record<string, number> = {}; // market-policy shortfall units
  let lifeSupportShortWeighted = 0;
  let lifeSupportRequiredTotal = 0;
  const degradedNames: string[] = [];

  for (const bld of completed) {
    const def = BUILDING_MAP.get(bld.definitionId)!;
    const consumes = def.consumesPerMonth;
    let supplied = 1;

    if (consumes && Object.keys(consumes).length > 0) {
      const pool = readPool(resources, locationInventories, bld.locationId, routeLocally);
      // Weakest-link supply fraction across effective required inputs.
      const required: [string, number][] = [];
      for (const [resId, base] of Object.entries(consumes)) {
        const eff = base * phaseIn * reductionMult;
        if (eff <= 0) continue;
        required.push([resId, eff]);
        const ratio = Math.min(1, (pool[resId] || 0) / eff);
        supplied = Math.min(supplied, ratio);
      }
      supplied = Math.max(0, Math.min(1, supplied));

      // Draw proportionally to actual operation level; record telemetry,
      // shortfalls, and market-policy procurement requests.
      const missing: string[] = [];
      for (const [resId, eff] of required) {
        const draw = eff * supplied;
        drawFromPool(resources, locationInventories, bld.locationId, routeLocally, resId, draw);
        if (draw > 0) demandFlows[resId] = (demandFlows[resId] || 0) + draw;
        const short = eff - draw;
        if (short > 1e-9) {
          missing.push(resId);
          if ((bld.supplyPolicy || 'local') === 'market') {
            procurement[resId] = (procurement[resId] || 0) + short;
          }
          if (resId === 'life_support_pack') {
            lifeSupportShortWeighted += short;
          }
        }
        if (resId === 'life_support_pack') lifeSupportRequiredTotal += eff;
      }
      if (missing.length > 0) {
        shortfallResources[bld.instanceId] = missing;
        degradedNames.push(def.name);
      }
    }

    const eff = CONSUMPTION_EFFICIENCY_FLOOR + (1 - CONSUMPTION_EFFICIENCY_FLOOR) * supplied;
    efficiency[bld.instanceId] = Math.round(eff * 1000) / 1000;

    // Direct production (propellant plants, agri domes, refineries…)
    if (def.producesPerMonth) {
      for (const [resId, base] of Object.entries(def.producesPerMonth)) {
        const out = base * phaseIn * eff;
        if (out <= 0) continue;
        creditToPool(resources, locationInventories, bld.locationId, routeLocally, resId, out);
        producedFlows[resId] = (producedFlows[resId] || 0) + Math.round(out);
      }
    }
  }

  // ── Life-support ⇒ morale coupling (§2.2 "Life-support shortfall
  //    additionally hits morale") — deterministic additive writer on the
  //    existing morale field, same post-hoc pattern as research crewMorale.
  let workforce = state.workforce;
  const lsShortFraction = lifeSupportRequiredTotal > 0
    ? Math.min(1, lifeSupportShortWeighted / lifeSupportRequiredTotal)
    : 0;
  if (workforce && lsShortFraction > 0) {
    const prevMorale = workforce.morale ?? 1.0;
    workforce = { ...workforce, morale: Math.max(0, prevMorale - LIFE_SUPPORT_MORALE_PENALTY * lsShortFraction) };
  }

  // ── Events (Situation Log carries the persistent per-building record;
  //    the event log gets one bounded monthly summary). ──────────────────
  const gameDate = { year: GAME_START_YEAR + Math.floor(monthIndex / 12), month: (monthIndex % 12) + 1 };
  if (degradedNames.length > 0) {
    const names = Array.from(new Set(degradedNames)).slice(0, 3).join(', ');
    const extra = degradedNames.length > 3 ? ` +${degradedNames.length - 3} more` : '';
    events.push({
      id: generateId(), date: gameDate, type: 'random_event',
      title: '⚠ Supply shortfall — facilities running degraded',
      description: `${names}${extra} could not draw full recipe inputs this month and are operating at reduced efficiency (never below 50%). Stock local inventories, freight supplies in, or switch the building to a standing market order.${lsShortFraction > 0 ? ' Life-support shortages are also wearing on crew morale.' : ''}`,
    });
  }
  const procurementResources = Object.keys(procurement);
  if (procurementResources.length > 0) {
    events.push({
      id: generateId(), date: gameDate, type: 'random_event',
      title: '🛒 Standing procurement queued',
      description: `Auto-procurement will place standing buy orders for ${procurementResources.map(r => RESOURCE_MAP.get(r as ResourceId)?.name || r).slice(0, 4).join(', ')} on the shared market at live spot (+2% fee). Your bids are visible demand on the order book.`,
    });
  }

  // Merge accumulators (bounded).
  const pendingDemandFlows = { ...cs.pendingDemandFlows };
  for (const [resId, q] of Object.entries(demandFlows)) {
    pendingDemandFlows[resId] = Math.min(DEMAND_FLOW_CAP, (pendingDemandFlows[resId] || 0) + Math.round(q * 100) / 100);
  }
  const pendingProcurement = { ...cs.pendingProcurement };
  for (const [resId, q] of Object.entries(procurement)) {
    pendingProcurement[resId] = Math.min(PROCUREMENT_QTY_CAP, (pendingProcurement[resId] || 0) + Math.ceil(q));
  }

  const newState: GameState = {
    ...state,
    resources,
    locationInventories,
    workforce,
    // Produced units are real supply — join the same mined-flow pressure pipe
    // (§2.2: "the existing mining-pressure pipe"); consumed units travel the
    // sign-flipped demand channel via pendingDemandFlows at sync.
    pendingMarketFlows: accumulateMinedFlows(state.pendingMarketFlows, producedFlows),
    consumptionState: {
      ...cs,
      lastProcessedMonth: monthIndex,
      efficiency,
      shortfallResources,
      pendingDemandFlows,
      pendingProcurement,
    },
    eventLog: events.length > 0 ? [...events, ...state.eventLog].slice(0, MAX_EVENT_LOG) : state.eventLog,
  };

  return { state: newState, events };
}

/**
 * THE single entry point for both the live tick and away catch-up: process
 * every unprocessed world-month up to and including `targetMonthIndex`.
 *
 * - First call ever (lastProcessedMonth null): anchors at targetMonthIndex
 *   WITHOUT consuming — no retro-billing for months before the feature
 *   existed (or before this save was created).
 * - Protected Frontier: fully exempt (anchor advances, nothing consumed) —
 *   the same on-ramp shield hazards/insurance use.
 * - Idempotent per month: calling twice with the same target is a no-op the
 *   second time. Away catch-up (months strictly before "now") and the live
 *   isMonthEnd tick can therefore share this without double-consuming.
 */
export function advanceConsumptionToMonth(state: GameState, targetMonthIndex: number): GameState {
  const cs = state.consumptionState;
  if (!cs || cs.lastProcessedMonth === null || cs.lastProcessedMonth === undefined) {
    return {
      ...state,
      consumptionState: {
        ...(cs || DEFAULT_CONSUMPTION_STATE),
        lastProcessedMonth: targetMonthIndex,
      },
    };
  }
  if (targetMonthIndex <= cs.lastProcessedMonth) return state;

  if (isInFrontier(state)) {
    // Frontier corps are consumption-exempt; keep the anchor moving so
    // graduation doesn't trigger a months-deep catch-up bill.
    return {
      ...state,
      consumptionState: { ...cs, lastProcessedMonth: targetMonthIndex },
    };
  }

  const from = Math.max(cs.lastProcessedMonth + 1, targetMonthIndex - MAX_CONSUMPTION_CATCHUP_MONTHS);
  let working = state;
  for (let m = from; m <= targetMonthIndex; m++) {
    working = processConsumptionForMonth(working, m).state;
  }
  return working;
}

// ─── §E3 grandfather grace (save-load.ts V32) ───────────────────────────────

/**
 * One-time migration credit: GRACE_STOCKPILE_MONTHS of full-rate recipe
 * inputs per affected COMPLETED building, credited into that building's own
 * draw pool (home cluster → global pool; remote → local stockpile when
 * logistics is unlocked) — so day-one consumption is fully covered wherever
 * the building sits. Mutates the passed state in place (loadGame's style)
 * and stamps the phase-in anchor + processed-month cursor.
 */
export function applyGrandfatherGrace(state: GameState, currentMonthIndex: number): void {
  const resources = { ...(state.resources || {}) };
  const locationInventories: Record<string, Record<string, number>> = { ...(state.locationInventories || {}) };
  const routeLocally = state.logisticsUnlocked === true;
  let creditedAny = false;

  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def?.consumesPerMonth) continue;
    for (const [resId, perMonth] of Object.entries(def.consumesPerMonth)) {
      const credit = perMonth * GRACE_STOCKPILE_MONTHS;
      if (credit <= 0) continue;
      creditToPool(resources, locationInventories, bld.locationId, routeLocally, resId, credit);
      creditedAny = true;
    }
  }

  state.resources = resources;
  state.locationInventories = locationInventories;
  state.consumptionState = {
    ...DEFAULT_CONSUMPTION_STATE,
    phaseInStartMonth: currentMonthIndex,
    graceCredited: true,
    lastProcessedMonth: currentMonthIndex,
  };

  if (creditedAny) {
    state.eventLog = [{
      id: 'evt_v32_consumption',
      date: state.gameDate,
      type: 'random_event' as const,
      title: '⚙ Supply chains activated',
      description: `Buildings now consume real inputs every game month — propellant for launch pads, life support for crews, electronics spares for datacenters. Your facilities received a ${GRACE_STOCKPILE_MONTHS}-month input stockpile, and recipes phase in gradually over the next ${PHASE_IN_MONTHS} game months. Shortfalls degrade buildings toward a 50% floor (never a hard stop). Configure each building's sourcing — supply locally, or place standing market buys — from the Build tab.`,
    }, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG);
  }
}

// ─── Monthly demand summary (UI: SupplyStatusStrip, BuildPanel) ─────────────

export interface SupplyLineSummary {
  resourceId: string;
  /** Total effective units consumed per month across all completed buildings
   *  (phase-in + research reduction applied). */
  perMonth: number;
  /** Stock across ALL pools (home + remote) — the honest coverage numerator. */
  stock: number;
  /** Months of coverage at current burn (Infinity when perMonth is 0). */
  coverageMonths: number;
  /** Any building currently short on this resource? */
  short: boolean;
}

/** Pure lens: aggregate monthly recipe demand vs stock — powers the supply-
 *  status strip. Deterministic, cheap; memoize at the call site. */
export function deriveSupplySummary(state: GameState, monthIndex?: number): SupplyLineSummary[] {
  const cs = state.consumptionState;
  const phaseIn = getConsumptionPhaseInFraction(cs, monthIndex ?? (cs?.lastProcessedMonth ?? 0));
  const resBonuses = getResearchBonuses(state.completedResearch, state.repeatableResearchLevels);
  const reductionMult = Math.max(0.6, 1 - resBonuses.consumptionReductionBonus);

  const demand: Record<string, number> = {};
  for (const bld of state.buildings) {
    if (!bld.isComplete || !isBuildingOperational(bld)) continue;
    const consumes = BUILDING_MAP.get(bld.definitionId)?.consumesPerMonth;
    if (!consumes) continue;
    for (const [resId, base] of Object.entries(consumes)) {
      demand[resId] = (demand[resId] || 0) + base * phaseIn * reductionMult;
    }
  }

  const shortSet = new Set<string>();
  for (const list of Object.values(cs?.shortfallResources || {})) {
    for (const r of list) shortSet.add(r);
  }

  return Object.entries(demand)
    .map(([resourceId, perMonth]) => {
      let stock = (state.resources || {})[resourceId] || 0;
      for (const inv of Object.values(state.locationInventories || {})) {
        stock += inv?.[resourceId] || 0;
      }
      return {
        resourceId,
        perMonth: Math.round(perMonth * 100) / 100,
        stock: Math.round(stock * 100) / 100,
        coverageMonths: perMonth > 0 ? Math.round((stock / perMonth) * 10) / 10 : Infinity,
        short: shortSet.has(resourceId),
      };
    })
    .sort((a, b) => (a.coverageMonths - b.coverageMonths));
}

/** Recipe display helper for building cards: name each consumed/produced
 *  resource at its effective monthly rate. */
export function describeRecipeLine(entries: Record<string, number> | undefined): { resourceId: string; name: string; perMonth: number }[] {
  if (!entries) return [];
  return Object.entries(entries).map(([resourceId, perMonth]) => ({
    resourceId,
    name: RESOURCE_MAP.get(resourceId as ResourceId)?.name || resourceId.replace(/_/g, ' '),
    perMonth,
  }));
}

/** Location name helper (Situation Log / strip details). */
export function consumptionLocationName(locationId: string): string {
  return LOCATION_MAP.get(locationId)?.name || locationId;
}

// ─── Sync hand-off queue (client only; single slot, merged) ─────────────────
// Same discipline as market-pressure.ts: React hooks can't mutate game state,
// so useGameSync queues what a successful sync transmitted and
// processFullTick drains it, subtracting exactly the transmitted amounts.

export interface ConsumptionFlush {
  demand: Record<string, number>;
  procurement: Record<string, number>;
}

let pendingConsumptionFlush: ConsumptionFlush | null = null;

export function queueConsumptionFlush(sent: ConsumptionFlush): void {
  if (!sent) return;
  if (!pendingConsumptionFlush) {
    pendingConsumptionFlush = { demand: { ...sent.demand }, procurement: { ...sent.procurement } };
    return;
  }
  for (const [res, q] of Object.entries(sent.demand)) {
    pendingConsumptionFlush.demand[res] = (pendingConsumptionFlush.demand[res] || 0) + q;
  }
  for (const [res, q] of Object.entries(sent.procurement)) {
    pendingConsumptionFlush.procurement[res] = (pendingConsumptionFlush.procurement[res] || 0) + q;
  }
}

export function consumeConsumptionFlush(): ConsumptionFlush | null {
  const f = pendingConsumptionFlush;
  pendingConsumptionFlush = null;
  return f;
}

/** Test helper — clears the queue. */
export function __clearConsumptionFlushQueue(): void {
  pendingConsumptionFlush = null;
}

/** Apply a consumed flush (pure): subtract transmitted amounts, floor 0. */
export function applyConsumptionFlush(state: GameState, flush: ConsumptionFlush): GameState {
  const cs = state.consumptionState;
  if (!cs) return state;
  const demand: Record<string, number> = {};
  for (const [res, q] of Object.entries(cs.pendingDemandFlows)) {
    const remaining = q - (flush.demand[res] || 0);
    if (remaining > 0.001) demand[res] = remaining;
  }
  const procurement: Record<string, number> = {};
  for (const [res, q] of Object.entries(cs.pendingProcurement)) {
    const remaining = q - (flush.procurement[res] || 0);
    if (remaining > 0.001) procurement[res] = remaining;
  }
  return {
    ...state,
    consumptionState: { ...cs, pendingDemandFlows: demand, pendingProcurement: procurement },
  };
}

// ─── Supply policy mutator (BuildPanel toggle) ──────────────────────────────

export function setBuildingSupplyPolicy(
  state: GameState,
  instanceId: string,
  policy: BuildingInstance['supplyPolicy'],
): GameState {
  let changed = false;
  const buildings = state.buildings.map(b => {
    if (b.instanceId !== instanceId) return b;
    changed = true;
    return { ...b, supplyPolicy: policy };
  });
  return changed ? { ...state, buildings } : state;
}
