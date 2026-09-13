// ─── Space Tycoon: Mining Orders — planner + state machine (Phase A) ────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §4 "The mining loop". Founder
// rulings 2026-09-12 (design doc §9): ore is a real intermediate; unsurveyed
// rocks mine at UNSURVEYED_YIELD_MULT; claims expire after 3 game-months
// unworked (Phase B); probes are a purchasable consumable.
//
// Parity discipline (§2 goal 5): every number here is a pure function of its
// inputs, shared by
//   - the client (page.tsx handlers preview + local-only play),
//   - the server route (/api/space-tycoon/assets/mining) which QUOTES the
//     same schedule and is the only thing that credits ore for a synced
//     profile (server-mining.ts), and
//   - the sim harness (scripts/sim-mining.ts).
// The client tick (advanceMiningOrders) only READS the clock: phases are
// derived from the timestamps fixed at creation, exactly like construction.
//
// Split mirrored from construction: client simulates progress, server owns
// completion + inventory. A forged client order can never create ore on a
// synced profile — the reducer credits nothing when `serverAuthoritative`.

import {
  ASTEROID_FIELD_MAP,
  LOCAL_INTEL_SALT,
  ORE_LOAD_WEIGHT,
  UNSURVEYED_YIELD_MULT,
  getAsteroid,
  getFieldsForShipTier,
  oreForRock,
  rollAsteroidIntel,
  type AsteroidField,
  type AsteroidIntel,
  type AsteroidRock,
} from './asteroids';
import { FREIGHT_CARGO_FUEL_RATE, FREIGHT_MIN_FUEL_COST, creditArrivalCargo, getRouteDeltaV } from './cargo-logistics';
import { MAX_EVENT_LOG } from './constants';
import { generateId } from './formulas';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { LOCATION_MAP } from './solar-system';
import {
  SHIP_MAP,
  getTravelTime,
  type HeldOre,
  type MiningOrder,
  type MiningOrderMode,
  type MiningOrderPhase,
  type MiningThenAction,
  type ShipDefinition,
} from './ships';
import { getSpotPrice } from './spot-price';
import type { GameState } from './types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** $ per m/s per hull tier per leg. Mining hulls are slow, low-thrust
 *  bulk frames (ROLE_PROFILE 'mining' burns least per tier) — a quarter of
 *  the freight hull rate (cargo-logistics FREIGHT_HULL_FUEL_RATE = 100).
 *  Sized with scripts/sim-mining.ts so a Prospector Barge round trip to the
 *  Near-Earth Cluster (~5,200 m/s) costs ~$1.5M against a ~$2.7M C-ore hold
 *  — real friction, never a wash (2026-09-12 balance gate). */
export const MINING_HULL_FUEL_RATE = 20;

/** Broker's cut on a 'return & sell' completion (spot −3%, the same
 *  delivery-contract/broker path scripts/sim-harness.ts prices at 0.97). */
export const MINING_SALE_BROKER_FEE = 0.03;

/** Real seconds of extra transit per m/s of a rock's delta-v surcharge. */
export const TRANSIT_SECONDS_PER_DELTA_V = 0.1;

/** Hull damage penalty on extraction — the same curve the legacy ship-mining
 *  path applies (game-engine.ts: max(0.25, 1 − 0.75 × damage)). */
export function hullDamageFactor(hullDamagePct: number | undefined): number {
  return Math.max(0.25, 1 - 0.75 * (hullDamagePct || 0));
}

// ─── Extraction rate ─────────────────────────────────────────────────────────

/**
 * Effective ore units per real hour: ship class × rock grade × surveyed
 * multiplier × hull condition. An UNSURVEYED rock is priced at the field's
 * PUBLIC mean grade × UNSURVEYED_YIELD_MULT — never at its true grade, so
 * the quote leaks nothing the survey would sell.
 */
export function computeExtractionRate(
  def: Pick<ShipDefinition, 'oreExtractionPerHour'>,
  field: Pick<AsteroidField, 'meanGrade'>,
  intel: Pick<AsteroidIntel, 'grade'> | null | undefined,
  hullDamagePct?: number,
): number {
  const base = def.oreExtractionPerHour || 0;
  if (base <= 0) return 0;
  const gradeTerm = intel ? intel.grade : field.meanGrade * UNSURVEYED_YIELD_MULT;
  return Math.round(base * gradeTerm * hullDamageFactor(hullDamagePct) * 100) / 100;
}

// ─── Fuel + transit ──────────────────────────────────────────────────────────

export interface LegCost { deltaV: number; seconds: number; fuel: number }

/** One leg between a location and a rock. `loadedUnits` is the ore aboard. */
export function quoteLeg(
  fromLocationId: string,
  toLocationId: string,
  rockDeltaVExtra: number,
  hullTier: number,
  loadedUnits: number,
  fuelEfficiencyMult: number = 1,
): LegCost {
  const laneDv = getRouteDeltaV(fromLocationId, toLocationId);
  const deltaV = laneDv + Math.max(0, rockDeltaVExtra);
  const seconds = Math.round((fromLocationId === toLocationId ? 0 : getTravelTime(fromLocationId, toLocationId)) + rockDeltaVExtra * TRANSIT_SECONDS_PER_DELTA_V);
  const raw = deltaV * (MINING_HULL_FUEL_RATE * Math.max(1, hullTier) + FREIGHT_CARGO_FUEL_RATE * ORE_LOAD_WEIGHT * Math.max(0, loadedUnits));
  const fuel = Math.max(FREIGHT_MIN_FUEL_COST, Math.round(raw * Math.max(0.5, Math.min(1, fuelEfficiencyMult))));
  return { deltaV, seconds, fuel };
}

// ─── Planner ─────────────────────────────────────────────────────────────────

export type MiningPlanError =
  | 'unknown_ship'
  | 'ship_cannot_mine'
  | 'ship_cannot_survey'
  | 'unknown_rock'
  | 'field_out_of_reach'
  | 'nothing_held'
  | 'invalid_fill'
  | 'rock_exhausted';

export interface MiningPlanInput {
  def: ShipDefinition;
  /** Hull + module capacity (cargo-logistics getShipCargoCapacity). */
  cargoCapacity: number;
  mode: MiningOrderMode;
  /** Required for 'mine' and 'survey'. */
  rock?: AsteroidRock | null;
  /** The corporation's survey of the rock, if any. */
  intel?: AsteroidIntel | null;
  /** Requested units for 'mine' (clamped to the hold and the reserve). */
  fillUnits?: number;
  thenAction?: MiningThenAction;
  /** Where the ship is now. */
  originId: string;
  /** For 'return': where the held ore goes. Defaults to originId for mine. */
  destinationId?: string;
  /** For 'return': what the ship holds. */
  heldOre?: HeldOre | null;
  hullDamagePct?: number;
  fuelEfficiencyMult?: number;
  nowMs: number;
}

export interface MiningPlan {
  ok: true;
  order: Omit<MiningOrder, 'id' | 'serverAuthoritative'>;
  transitOutSeconds: number;
  extractionSeconds: number;
  transitBackSeconds: number;
  deltaVOut: number;
  /** Expected ore value at base price (a preview figure, not a promise). */
  expectedValue: number;
}

export type MiningPlanResult = MiningPlan | { ok: false; error: MiningPlanError; detail?: string };

export const MINING_PLAN_ERROR_TEXT: Readonly<Record<MiningPlanError, string>> = {
  unknown_ship: 'Unknown hull.',
  ship_cannot_mine: 'This hull has no extraction gear — it cannot take a mining order.',
  ship_cannot_survey: 'This hull has no survey sensor. Use a probe, or a survey-capable ship.',
  unknown_rock: 'That rock is not in the catalogue.',
  field_out_of_reach: 'This hull cannot work that field — a heavier hull is needed.',
  nothing_held: 'The ship holds no ore to bring back.',
  invalid_fill: 'Fill target must be at least one unit.',
  rock_exhausted: 'That rock is exhausted.',
};

/**
 * Quote a Mining Order. Pure. The server calls this with its own view of
 * the ship, the rock and the corporation's survey; the client with its
 * local view. Identical inputs → identical schedule and fuel bill.
 */
export function planMiningOrder(input: MiningPlanInput): MiningPlanResult {
  const { def, mode, originId, nowMs } = input;
  const eff = input.fuelEfficiencyMult ?? 1;
  const tier = def.tier;

  if (mode === 'return') {
    const held = input.heldOre;
    if (!held || held.units <= 0) return { ok: false, error: 'nothing_held' };
    const field = ASTEROID_FIELD_MAP.get(held.fieldId);
    const parent = field?.parentLocationId || originId;
    const destinationId = input.destinationId || 'earth_surface';
    const rock = held.asteroidId ? getAsteroid(held.asteroidId) : undefined;
    const back = quoteLeg(parent, destinationId, rock?.deltaVExtra ?? 0, tier, held.units, eff);
    const thenAction: MiningThenAction = input.thenAction === 'return_sell' ? 'return_sell' : 'return_store';
    const price = RESOURCE_MAP.get(held.oreId as ResourceId)?.baseMarketPrice ?? 0;
    return {
      ok: true,
      order: {
        mode: 'return', asteroidId: held.asteroidId, fieldId: held.fieldId, parentLocationId: parent,
        oreId: held.oreId, fillUnits: held.units, thenAction,
        originId: parent, destinationId,
        startedAtMs: nowMs, arrivesAtMs: nowMs, miningEndsAtMs: nowMs, completesAtMs: nowMs + back.seconds * 1000,
        fuelCost: back.fuel, ratePerHour: 0, surveyed: true,
      },
      transitOutSeconds: 0, extractionSeconds: 0, transitBackSeconds: back.seconds, deltaVOut: back.deltaV,
      expectedValue: Math.round(held.units * price),
    };
  }

  const rock = input.rock;
  if (!rock) return { ok: false, error: 'unknown_rock' };
  const field = ASTEROID_FIELD_MAP.get(rock.fieldId);
  if (!field) return { ok: false, error: 'unknown_rock' };
  if (!getFieldsForShipTier(tier).some(f => f.id === field.id)) return { ok: false, error: 'field_out_of_reach' };
  const parent = field.parentLocationId;
  const out = quoteLeg(originId, parent, rock.deltaVExtra, tier, 0, eff);
  const oreId = oreForRock(rock);

  if (mode === 'survey') {
    if (!def.survey) return { ok: false, error: 'ship_cannot_survey' };
    return {
      ok: true,
      order: {
        mode: 'survey', asteroidId: rock.id, fieldId: field.id, parentLocationId: parent,
        oreId, fillUnits: 0, thenAction: 'hold',
        originId, destinationId: parent,
        startedAtMs: nowMs, arrivesAtMs: nowMs + out.seconds * 1000, miningEndsAtMs: nowMs + out.seconds * 1000,
        completesAtMs: nowMs + out.seconds * 1000,
        fuelCost: out.fuel, ratePerHour: 0, surveyed: !!input.intel,
      },
      transitOutSeconds: out.seconds, extractionSeconds: 0, transitBackSeconds: 0, deltaVOut: out.deltaV,
      expectedValue: 0,
    };
  }

  // mode === 'mine'
  if (!def.oreExtractionPerHour) return { ok: false, error: 'ship_cannot_mine' };
  const intel = input.intel ?? null;
  if (intel && intel.reserve <= 0) return { ok: false, error: 'rock_exhausted' };
  const capacity = Math.max(0, Math.floor(input.cargoCapacity));
  let fill = Math.floor(input.fillUnits ?? capacity);
  fill = Math.min(fill, capacity);
  if (intel) fill = Math.min(fill, Math.floor(intel.reserve));
  if (!(fill >= 1)) return { ok: false, error: 'invalid_fill' };
  const rate = computeExtractionRate(def, field, intel, input.hullDamagePct);
  if (rate <= 0) return { ok: false, error: 'ship_cannot_mine' };
  const extractionSeconds = Math.ceil((fill / rate) * 3600);
  const thenAction: MiningThenAction = input.thenAction ?? 'return_store';
  const destinationId = thenAction === 'hold' ? parent : (input.destinationId || originId);
  const back = thenAction === 'hold' ? null : quoteLeg(parent, destinationId, rock.deltaVExtra, tier, fill, eff);
  const arrivesAtMs = nowMs + out.seconds * 1000;
  const miningEndsAtMs = arrivesAtMs + extractionSeconds * 1000;
  const completesAtMs = miningEndsAtMs + (back ? back.seconds * 1000 : 0);
  const price = RESOURCE_MAP.get(oreId)?.baseMarketPrice ?? 0;
  return {
    ok: true,
    order: {
      mode: 'mine', asteroidId: rock.id, fieldId: field.id, parentLocationId: parent,
      oreId, fillUnits: fill, thenAction,
      originId, destinationId,
      startedAtMs: nowMs, arrivesAtMs, miningEndsAtMs, completesAtMs,
      fuelCost: out.fuel + (back?.fuel ?? 0), ratePerHour: rate, surveyed: !!intel,
    },
    transitOutSeconds: out.seconds, extractionSeconds, transitBackSeconds: back?.seconds ?? 0, deltaVOut: out.deltaV,
    expectedValue: Math.round(fill * price),
  };
}

// ─── Phase derivation ────────────────────────────────────────────────────────

export function miningOrderPhase(order: MiningOrder, nowMs: number): MiningOrderPhase {
  if (nowMs >= order.completesAtMs) return 'complete';
  if (order.mode === 'return') return 'returning';
  if (nowMs < order.arrivesAtMs) return 'transit_out';
  if (order.mode === 'survey') return 'complete';
  if (nowMs < order.miningEndsAtMs) return 'mining';
  return 'returning';
}

export interface MiningOrderProgress {
  phase: MiningOrderPhase;
  label: string;
  /** 0-100 over the whole order. */
  pct: number;
  etaSeconds: number;
  /** Units extracted so far (mining phase interpolates). */
  unitsSoFar: number;
}

export function describeMiningOrder(order: MiningOrder, nowMs: number): MiningOrderProgress {
  const phase = miningOrderPhase(order, nowMs);
  const total = Math.max(1, order.completesAtMs - order.startedAtMs);
  const pct = Math.max(0, Math.min(100, ((nowMs - order.startedAtMs) / total) * 100));
  const etaSeconds = Math.max(0, (order.completesAtMs - nowMs) / 1000);
  let unitsSoFar = 0;
  if (order.mode === 'mine') {
    if (phase === 'mining') {
      const span = Math.max(1, order.miningEndsAtMs - order.arrivesAtMs);
      unitsSoFar = Math.floor(order.fillUnits * Math.min(1, (nowMs - order.arrivesAtMs) / span));
    } else if (phase === 'returning' || phase === 'complete') unitsSoFar = order.fillUnits;
  } else if (order.mode === 'return') unitsSoFar = order.fillUnits;
  const parentName = LOCATION_MAP.get(order.parentLocationId)?.name || order.parentLocationId;
  const destName = LOCATION_MAP.get(order.destinationId)?.name || order.destinationId;
  const label = phase === 'transit_out' ? `Outbound → ${parentName}`
    : phase === 'mining' ? `Mining · ${unitsSoFar}/${order.fillUnits}`
    : phase === 'returning' ? `Returning → ${destName}`
    : order.mode === 'survey' ? 'Survey complete' : 'Complete';
  return { phase, label, pct, etaSeconds, unitsSoFar };
}

// ─── The reducer (client tick) ───────────────────────────────────────────────

type Ship = NonNullable<GameState['ships']>[number];

/**
 * Advance every ship's Mining Order to `nowMs`. Pure; returns the same state
 * object when nothing changed. Sets the ship's public status/route/location
 * per phase (the Outliner, the map and the legacy readers keep working), and
 * on completion:
 *   - local-only play (order.serverAuthoritative === false): credits ore /
 *     sale proceeds / held cargo / local survey intel HERE;
 *   - synced play: credits NOTHING — the server's completion pass ledgers
 *     the ore or the sale and the next sync's reconciliation delivers it.
 * Either way the ship goes idle at its destination with the order cleared.
 */
export function advanceMiningOrders(state: GameState, nowMs: number = Date.now()): GameState {
  const ships = state.ships || [];
  if (!ships.some(s => s.miningOrder)) return state;
  const resources = { ...(state.resources || {}) };
  const locationInventories: Record<string, Record<string, number>> = { ...(state.locationInventories || {}) };
  const asteroidIntel = { ...(state.asteroidIntel || {}) };
  let money = state.money;
  let totalEarned = state.totalEarned;
  const events: GameState['eventLog'] = [];
  let changed = false;

  const nextShips: Ship[] = ships.map(ship => {
    const order = ship.miningOrder;
    if (!order || !ship.isBuilt) return ship;
    const phase = miningOrderPhase(order, nowMs);
    if (phase === 'transit_out') {
      if (ship.status === 'in_transit' && ship.route?.to === order.parentLocationId) return ship;
      changed = true;
      return { ...ship, status: 'in_transit', route: { from: order.originId, to: order.parentLocationId, departedAtMs: order.startedAtMs, arrivalAtMs: order.arrivesAtMs, cargo: {} }, miningOperation: undefined };
    }
    if (phase === 'mining') {
      if (ship.status === 'mining' && ship.currentLocation === order.parentLocationId && !ship.route) return ship;
      changed = true;
      return { ...ship, status: 'mining', currentLocation: order.parentLocationId, route: undefined, miningOperation: undefined };
    }
    if (phase === 'returning') {
      if (ship.status === 'in_transit' && ship.route?.to === order.destinationId) return ship;
      changed = true;
      return { ...ship, status: 'in_transit', currentLocation: order.parentLocationId, route: { from: order.parentLocationId, to: order.destinationId, departedAtMs: order.miningEndsAtMs, arrivalAtMs: order.completesAtMs, cargo: {} } };
    }
    // complete
    changed = true;
    const def = SHIP_MAP.get(ship.definitionId);
    const rockName = order.asteroidId ? (getAsteroid(order.asteroidId)?.name || order.asteroidId) : 'held cargo';
    const oreName = RESOURCE_MAP.get(order.oreId as ResourceId)?.name || order.oreId;
    const base: Ship = { ...ship, miningOrder: undefined, route: undefined, miningOperation: undefined, status: 'idle', currentLocation: order.destinationId };
    if (order.mode === 'survey') {
      if (!order.serverAuthoritative && order.asteroidId) {
        const rock = getAsteroid(order.asteroidId);
        if (rock) asteroidIntel[rock.id] = { ...rollAsteroidIntel(rock, LOCAL_INTEL_SALT), surveyedAtMs: nowMs, via: 'ship' };
      } else if (order.asteroidId && order.intel) {
        asteroidIntel[order.asteroidId] = { ...order.intel, surveyedAtMs: nowMs, via: 'ship' };
      }
      events.push({ id: generateId(), date: state.gameDate, type: 'random_event', title: `🔭 ${ship.name} surveyed ${rockName}`, description: `${def?.name || 'Ship'} on station at ${LOCATION_MAP.get(order.parentLocationId)?.name || order.parentLocationId}. Grade, reserve and rubble risk are now on the Mining console.` });
      return base;
    }
    if (order.thenAction === 'hold') {
      const held: HeldOre = { oreId: order.oreId, units: order.fillUnits, asteroidId: order.asteroidId, fieldId: order.fieldId };
      events.push({ id: generateId(), date: state.gameDate, type: 'milestone', title: `⛏️ ${ship.name} holding ${order.fillUnits} ${oreName}`, description: `Hold full at ${rockName}. Issue a Return order to bring it home, or leave it for a hauler (Phase D).` });
      return { ...base, heldOre: held };
    }
    if (!order.serverAuthoritative) {
      if (order.thenAction === 'return_sell') {
        const price = getSpotPrice(state.marketSnapshot, order.oreId, RESOURCE_MAP.get(order.oreId as ResourceId)?.baseMarketPrice ?? 0) || 0;
        const proceeds = Math.round(order.fillUnits * price * (1 - MINING_SALE_BROKER_FEE));
        money += proceeds;
        totalEarned += proceeds;
        events.push({ id: generateId(), date: state.gameDate, type: 'milestone', title: `💰 ${ship.name} sold ${order.fillUnits} ${oreName}`, description: `$${(proceeds / 1_000_000).toFixed(2)}M at spot (−3% broker) on arrival at ${LOCATION_MAP.get(order.destinationId)?.name || order.destinationId}.` });
      } else {
        creditArrivalCargo(resources, locationInventories, order.destinationId, { [order.oreId]: order.fillUnits });
        events.push({ id: generateId(), date: state.gameDate, type: 'milestone', title: `📦 ${ship.name} unloaded ${order.fillUnits} ${oreName}`, description: `Ore stored at ${LOCATION_MAP.get(order.destinationId)?.name || order.destinationId}.` });
      }
    } else {
      events.push({ id: generateId(), date: state.gameDate, type: 'milestone', title: `📦 ${ship.name} back with ${order.fillUnits} ${oreName}`, description: `${order.thenAction === 'return_sell' ? 'Sale proceeds' : 'The ore'} clear through the corporate registry on the next sync.` });
    }
    return { ...base, heldOre: order.mode === 'return' ? undefined : base.heldOre };
  });

  if (!changed) return state;
  return {
    ...state,
    ships: nextShips,
    resources,
    locationInventories,
    asteroidIntel,
    money,
    totalEarned,
    eventLog: events.length > 0 ? [...events, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG) : state.eventLog,
  };
}

// ─── Helpers the UI and handlers share ───────────────────────────────────────

/** What the Mining console hands page.tsx handleMiningOrder. */
export interface MiningOrderRequest {
  shipInstanceId: string;
  mode: MiningOrderMode;
  asteroidId: string | null;
  fillUnits?: number;
  thenAction?: MiningThenAction;
  destinationId?: string;
}

/** Hulls that can take a Mining Order (extraction gear or a survey sensor). */
export function isMiningCapable(def: ShipDefinition | undefined): boolean {
  return !!def && (!!def.oreExtractionPerHour || !!def.survey);
}

/** A ship may take a new order when built, idle, and not already on one. */
export function canTakeMiningOrder(ship: Ship): boolean {
  return ship.isBuilt && ship.status === 'idle' && !ship.miningOrder;
}

/** Build a full MiningOrder from a plan (client-generated id). */
export function materializeOrder(plan: MiningPlan, id: string, serverAuthoritative: boolean, intel?: AsteroidIntel | null): MiningOrder {
  return { ...plan.order, id, serverAuthoritative, ...(intel ? { intel: { grade: intel.grade, reserve: intel.reserve, risk: intel.risk } } : {}) };
}
