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
  RUBBLE_HULL_WEAR,
  UNSURVEYED_YIELD_MULT,
  getAsteroid,
  getFieldsForShipTier,
  oreForRock,
  rockEventMults,
  rollAsteroidIntel,
  rollRockEvents,
  type AsteroidField,
  type AsteroidIntel,
  type AsteroidRock,
  type RockEventState,
} from './asteroids';
// Mining Phase B (2026-09-13): claims, shared-rock pressure, NPC shakedowns.
import { markClaimWorked } from './asteroid-claims';
import { isInFrontier } from './frontier';
import { expectedShakedownLoss, orderHasReturnLeg, settleShakedown, shakedownOdds, type EscortCover } from './npc-shakedown';
import { applyRockPressure, rockPressureShare } from './rock-pressure';
// Mining Phase C (2026-09-13): refining at the field, depot-covered fuel.
import {
  MOBILE_REFINERY_RECOVERY,
  applyProductLoss,
  isRefinableOre,
  maxOreBatchForHold,
  maxOreBatchForTime,
  productValue,
  refineOpex,
  refineOutputs,
  refineSeconds,
  refinedUnitTotal,
} from './ore-refining';
import { depotCoverage } from './propellant-depots';
import { REAL_MS_PER_GAME_MONTH } from './server-time';
import { FREIGHT_CARGO_FUEL_RATE, FREIGHT_MIN_FUEL_COST, creditArrivalCargo, getRouteDeltaV } from './cargo-logistics';
// CC-2 (Pass 11): the Lunar HQ's logistics terms — −12% fuel per leg and
// −10% on a belt rock's Δv surcharge (headquarters.ts hqMiningLogisticsFor).
import { HQ_BELT_LOCATIONS, type HqMiningLogistics } from './headquarters';
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

/** Mining Phase C: real seconds a SWEEP hull (Survey Cruiser) spends on each
 *  rock of a pass. A sweep is unlimited but not instant — six rocks is half a
 *  real hour of the hull's time, and the reveal lands when the pass ENDS, so
 *  nothing can be claimed before the work is done. A single-rock survey
 *  (Prospector Barge, Starfarer) is unchanged from Phase A: the reveal is the
 *  arrival. */
export const SURVEY_SWEEP_SECONDS_PER_ROCK = 300;

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
  intel: (Pick<AsteroidIntel, 'grade'> & RockEventState) | null | undefined,
  hullDamagePct?: number,
  /** Phase B: the rock's live events (rubble yield x1.25, spin-up rate x0.6)
   *  apply at `nowMs`; omitted = no event term (Phase A callers). */
  nowMs?: number,
): number {
  const base = def.oreExtractionPerHour || 0;
  if (base <= 0) return 0;
  const gradeTerm = intel ? intel.grade : field.meanGrade * UNSURVEYED_YIELD_MULT;
  const ev = typeof nowMs === 'number' ? rockEventMults(intel, nowMs) : { yieldMult: 1, rateMult: 1 };
  return Math.round(base * gradeTerm * hullDamageFactor(hullDamagePct) * ev.yieldMult * ev.rateMult * 100) / 100;
}

// ─── Fuel + transit ──────────────────────────────────────────────────────────

export interface LegCost { deltaV: number; seconds: number; fuel: number }

/** CC-2: per-leg logistics terms from the seated HQ. `deltaVMult` scales
 *  the ROCK's Δv surcharge only (the lane Δv is physics); `fuelMult`
 *  scales the whole fuel bill. Transit time is unchanged — the bonus is a
 *  cheaper burn, not a faster one. */
export interface LegLogistics { fuelMult?: number; deltaVMult?: number }

/** One leg between a location and a rock. `loadedUnits` is the cargo aboard;
 *  `loadWeight` is what a unit of it weighs against the freight fuel term —
 *  ORE_LOAD_WEIGHT for loose rock (Phase A), 1 for refined PRODUCT (Phase C:
 *  a concentrate is dense, and there is far less of it). */
export function quoteLeg(
  fromLocationId: string,
  toLocationId: string,
  rockDeltaVExtra: number,
  hullTier: number,
  loadedUnits: number,
  fuelEfficiencyMult: number = 1,
  logistics: LegLogistics = {},
  loadWeight: number = ORE_LOAD_WEIGHT,
): LegCost {
  const laneDv = getRouteDeltaV(fromLocationId, toLocationId);
  const dvMult = typeof logistics.deltaVMult === 'number' && Number.isFinite(logistics.deltaVMult) ? Math.max(0.5, Math.min(1, logistics.deltaVMult)) : 1;
  const fuelMult = typeof logistics.fuelMult === 'number' && Number.isFinite(logistics.fuelMult) ? Math.max(0.5, Math.min(1, logistics.fuelMult)) : 1;
  const deltaV = laneDv + Math.max(0, rockDeltaVExtra) * dvMult;
  const seconds = Math.round((fromLocationId === toLocationId ? 0 : getTravelTime(fromLocationId, toLocationId)) + rockDeltaVExtra * TRANSIT_SECONDS_PER_DELTA_V);
  const raw = deltaV * (MINING_HULL_FUEL_RATE * Math.max(1, hullTier) + FREIGHT_CARGO_FUEL_RATE * Math.max(0, loadWeight) * Math.max(0, loadedUnits));
  const fuel = Math.max(FREIGHT_MIN_FUEL_COST, Math.round(raw * Math.max(0.5, Math.min(1, fuelEfficiencyMult)) * fuelMult));
  return { deltaV, seconds, fuel };
}

/** The leg terms for a field: the belt Δv term applies only to rocks in
 *  a belt field (HQ_BELT_LOCATIONS); the fuel term applies everywhere. */
export function legLogisticsFor(hq: HqMiningLogistics | null | undefined, parentLocationId: string | null | undefined): LegLogistics {
  if (!hq) return {};
  const belt = !!parentLocationId && HQ_BELT_LOCATIONS.includes(parentLocationId);
  return { fuelMult: hq.fuelMult, deltaVMult: belt ? hq.beltDeltaVMult : 1 };
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
  | 'rock_exhausted'
  | 'rock_claimed'
  | 'standing_off'
  | 'escort_invalid'
  // Mining Phase C
  | 'ship_cannot_refine'
  | 'ore_not_refinable'
  | 'nothing_to_refine';

export interface MiningPlanInput {
  def: ShipDefinition;
  /** Hull + module capacity (cargo-logistics getShipCargoCapacity). */
  cargoCapacity: number;
  mode: MiningOrderMode;
  /** Required for 'mine' and 'survey'. */
  rock?: AsteroidRock | null;
  /** The corporation's survey of the rock, if any (Phase B: with the rock's
   *  live event state — rubble / spin-up — when the caller has it). */
  intel?: (AsteroidIntel & RockEventState) | null;
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
  // ── Mining Phase B ──
  /** The rock is under THIS corporation's claim (exclusive, share 1). */
  claimed?: boolean;
  /** The rock is under ANOTHER corporation's claim → refused. */
  claimedByOther?: boolean;
  /** Corporations (including this one) with live 'mine' orders on the rock
   *  — the public activity count; the pressure quote uses it. */
  sharedMiners?: number;
  /** The player stood off this rock on an event card until this ms. */
  standOffUntilMs?: number;
  /** Escort cover on the return leg (npc-shakedown.ts). */
  escortCover?: EscortCover;
  escortInstanceId?: string | null;
  /** Inside the Protected Frontier (shakedown odds 0). */
  frontier?: boolean;
  /** CC-2: the seated HQ's logistics terms (headquarters.ts
   *  hqMiningLogisticsForState on the client, …ForLocationId on the
   *  server). Absent = neutral. */
  hqLogistics?: HqMiningLogistics | null;
  // ── Mining Phase C ──
  /** Propellant in the corporation's OWN depot at this order's field
   *  (propellant-depots.ts). The caller passes it only when a depot of
   *  theirs holds a slot there; the planner then bills the cash remainder
   *  and reports what the depot drew. The server draws the units atomically
   *  — an inflated figure here buys nothing. */
  depotStockUnits?: number;
  /** Recovery of the refining plant doing the work (default: the mobile
   *  barge's MOBILE_REFINERY_RECOVERY). */
  refineRecovery?: number;
  /** A sweep survey's extra targets (Survey Cruiser). The server picks them
   *  from its own view of what is unsurveyed; the client mirrors. */
  sweepTargets?: string[];
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
  /** Phase B: the pressure share the quote assumed (1 on a claimed rock). */
  pressureShare: number;
  /** Phase B: shakedown odds on the return leg and the expected units lost. */
  shakedownOdds: number;
  expectedShakedownLoss: number;
  /** Phase B: units the quote expects to LAND (fill x share − expected loss). */
  expectedUnits: number;
  /** Phase B: the rock's live events as the quote saw them. */
  rockEvents: { rubble: boolean; spinUp: boolean };
  // ── Mining Phase C ──
  /** 'refine': seconds the plant runs after extraction. */
  refiningSeconds: number;
  /** 'refine'/'return' of a refined parcel: the product manifest expected to
   *  land, after pressure and the expected shakedown. */
  outputs: Record<string, number>;
  /** Refining opex burned at creation (separate from the fuel bill). */
  refineOpex: number;
  /** Depot coverage applied to this order's fuel bill. */
  depotCovered: number;
  depotUnitsDrawn: number;
  /** The fuel bill BEFORE the depot covered its share (for the console). */
  fuelBeforeDepot: number;
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
  rock_claimed: 'That rock is under another corporation\'s claim until it lapses.',
  standing_off: 'You stood off this rock until its event settles.',
  escort_invalid: 'That escort is not an idle security hull at the departure point or the field.',
  ship_cannot_refine: 'This hull has no refining plant — build a Refinery Barge.',
  ore_not_refinable: 'There is no refinery recipe for that material.',
  nothing_to_refine: 'Nothing to refine: target a rock, or hold ore at the field first.',
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
    // Phase C: a refined parcel flies as PRODUCT — fewer units, full weight.
    const recovery = input.refineRecovery ?? MOBILE_REFINERY_RECOVERY;
    const products = held.refined ? refineOutputs(held.oreId, held.units, recovery) : {};
    const cargoUnits = held.refined ? refinedUnitTotal(products) : held.units;
    const back = quoteLeg(parent, destinationId, rock?.deltaVExtra ?? 0, tier, cargoUnits, eff, legLogisticsFor(input.hqLogistics, field?.parentLocationId), held.refined ? 1 : ORE_LOAD_WEIGHT);
    const depot = depotCoverage(back.fuel, input.depotStockUnits ?? 0);
    const thenAction: MiningThenAction = input.thenAction === 'return_sell' ? 'return_sell' : 'return_store';
    const price = RESOURCE_MAP.get(held.oreId as ResourceId)?.baseMarketPrice ?? 0;
    const cover: EscortCover = input.escortCover ?? 'none';
    const odds = shakedownOdds(parent, cover, !!input.frontier);
    const loss = expectedShakedownLoss(parent, cover, !!input.frontier, cargoUnits);
    const landedUnits = Math.max(0, Math.round(cargoUnits - loss));
    const landedProducts = held.refined ? applyProductLoss(products, cargoUnits > 0 ? loss / cargoUnits : 0).outputs : {};
    return {
      ok: true,
      order: {
        mode: 'return', asteroidId: held.asteroidId, fieldId: held.fieldId, parentLocationId: parent,
        oreId: held.oreId, fillUnits: held.units, thenAction,
        originId: parent, destinationId,
        startedAtMs: nowMs, arrivesAtMs: nowMs, miningEndsAtMs: nowMs, completesAtMs: nowMs + back.seconds * 1000,
        fuelCost: depot.cashFuel, ratePerHour: 0, surveyed: true,
        pressureShare: 1, expectedUnits: landedUnits, shakedownOdds: odds,
        ...(held.refined ? { refined: true, outputs: landedProducts } : {}),
        ...(depot.covered > 0 ? { depotCovered: depot.covered, depotUnitsDrawn: depot.unitsDrawn } : {}),
        ...(cover === 'assigned' && input.escortInstanceId ? { escortInstanceId: input.escortInstanceId } : {}),
      },
      transitOutSeconds: 0, extractionSeconds: 0, transitBackSeconds: back.seconds, deltaVOut: back.deltaV,
      expectedValue: held.refined ? productValue(landedProducts) : Math.round(landedUnits * price),
      pressureShare: 1, shakedownOdds: odds, expectedShakedownLoss: loss, expectedUnits: landedUnits,
      rockEvents: { rubble: false, spinUp: false },
      refiningSeconds: 0, outputs: landedProducts, refineOpex: 0,
      depotCovered: depot.covered, depotUnitsDrawn: depot.unitsDrawn, fuelBeforeDepot: back.fuel,
    };
  }

  // -- Phase C: refine ore ALREADY ABOARD, in place at the field ----------
  // No rock, no extraction: the plant runs on the hold the ship is already
  // holding (a previous 'hold' order). This is the "stationed at a field"
  // half of the design's Refinery Barge.
  if (mode === 'refine' && !input.rock) {
    const held = input.heldOre;
    if (!held || held.units <= 0 || held.refined) return { ok: false, error: 'nothing_to_refine' };
    if (!def.refineOrePerHour) return { ok: false, error: 'ship_cannot_refine' };
    if (!isRefinableOre(held.oreId)) return { ok: false, error: 'ore_not_refinable' };
    const field = ASTEROID_FIELD_MAP.get(held.fieldId);
    const parent = field?.parentLocationId || originId;
    const recovery = input.refineRecovery ?? MOBILE_REFINERY_RECOVERY;
    const rockHere = held.asteroidId ? getAsteroid(held.asteroidId) : undefined;
    const legs = legLogisticsFor(input.hqLogistics, parent);
    const oreUnits = Math.min(held.units, maxOreBatchForHold(held.oreId, input.cargoCapacity, recovery), maxOreBatchForTime(0, def.refineOrePerHour));
    if (!(oreUnits >= 1)) return { ok: false, error: 'invalid_fill' };
    const products = refineOutputs(held.oreId, oreUnits, recovery);
    const productUnits = refinedUnitTotal(products);
    const plantSeconds = refineSeconds(oreUnits, def.refineOrePerHour);
    const thenAction: MiningThenAction = input.thenAction ?? 'hold';
    const destinationId = thenAction === 'hold' ? parent : (input.destinationId || 'earth_surface');
    const back = thenAction === 'hold' ? null : quoteLeg(parent, destinationId, rockHere?.deltaVExtra ?? 0, tier, productUnits, eff, legs, 1);
    const rawFuel = back?.fuel ?? 0;
    const depot = depotCoverage(rawFuel, input.depotStockUnits ?? 0);
    const cover: EscortCover = thenAction === 'hold' ? 'none' : (input.escortCover ?? 'none');
    const odds = thenAction === 'hold' ? 0 : shakedownOdds(parent, cover, !!input.frontier);
    const loss = thenAction === 'hold' ? 0 : expectedShakedownLoss(parent, cover, !!input.frontier, productUnits);
    const landed = thenAction === 'hold' ? products : applyProductLoss(products, productUnits > 0 ? loss / productUnits : 0).outputs;
    const opex = refineOpex(held.oreId, oreUnits);
    const refineEndsAtMs = nowMs + plantSeconds * 1000;
    return {
      ok: true,
      order: {
        mode: 'refine', asteroidId: held.asteroidId, fieldId: held.fieldId, parentLocationId: parent,
        oreId: held.oreId, fillUnits: oreUnits, thenAction,
        originId: parent, destinationId,
        startedAtMs: nowMs, arrivesAtMs: nowMs, miningEndsAtMs: nowMs,
        refineEndsAtMs, completesAtMs: refineEndsAtMs + (back ? back.seconds * 1000 : 0),
        fuelCost: depot.cashFuel, ratePerHour: def.refineOrePerHour, surveyed: true,
        refined: true, outputs: landed, refineOpex: opex,
        pressureShare: 1, expectedUnits: refinedUnitTotal(landed), shakedownOdds: odds,
        ...(depot.covered > 0 ? { depotCovered: depot.covered, depotUnitsDrawn: depot.unitsDrawn } : {}),
        ...(cover === 'assigned' && input.escortInstanceId ? { escortInstanceId: input.escortInstanceId } : {}),
      },
      transitOutSeconds: 0, extractionSeconds: 0, transitBackSeconds: back?.seconds ?? 0, deltaVOut: back?.deltaV ?? 0,
      expectedValue: productValue(landed),
      pressureShare: 1, shakedownOdds: odds, expectedShakedownLoss: loss, expectedUnits: refinedUnitTotal(landed),
      rockEvents: { rubble: false, spinUp: false },
      refiningSeconds: plantSeconds, outputs: landed, refineOpex: opex,
      depotCovered: depot.covered, depotUnitsDrawn: depot.unitsDrawn, fuelBeforeDepot: rawFuel,
    };
  }

  const rock = input.rock;
  if (!rock) return { ok: false, error: 'unknown_rock' };
  const field = ASTEROID_FIELD_MAP.get(rock.fieldId);
  if (!field) return { ok: false, error: 'unknown_rock' };
  if (!getFieldsForShipTier(tier).some(f => f.id === field.id)) return { ok: false, error: 'field_out_of_reach' };
  const parent = field.parentLocationId;
  const legs = legLogisticsFor(input.hqLogistics, parent);
  const out = quoteLeg(originId, parent, rock.deltaVExtra, tier, 0, eff, legs);
  const oreId = oreForRock(rock);

  if (mode === 'survey') {
    if (!def.survey) return { ok: false, error: 'ship_cannot_survey' };
    // Phase C: a sweep hull (Survey Cruiser) reveals `surveySweep` rocks of
    // the field in one pass -- the target plus the extra ids the caller
    // resolved. One order, one fuel bill, one arrival.
    const sweepCap = Math.max(1, Math.floor(def.surveySweep ?? 1));
    const sweepIds = sweepCap > 1
      ? [rock.id, ...(input.sweepTargets || []).filter(id => id !== rock.id)].slice(0, sweepCap)
      : [rock.id];
    const surveyDepot = depotCoverage(out.fuel, input.depotStockUnits ?? 0);
    const sweepSeconds = sweepIds.length > 1 ? sweepIds.length * SURVEY_SWEEP_SECONDS_PER_ROCK : 0;
    const arrivesAt = nowMs + out.seconds * 1000;
    return {
      ok: true,
      order: {
        mode: 'survey', asteroidId: rock.id, fieldId: field.id, parentLocationId: parent,
        oreId, fillUnits: 0, thenAction: 'hold',
        originId, destinationId: parent,
        startedAtMs: nowMs, arrivesAtMs: arrivesAt, miningEndsAtMs: arrivesAt,
        completesAtMs: arrivesAt + sweepSeconds * 1000,
        fuelCost: surveyDepot.cashFuel, ratePerHour: 0, surveyed: !!input.intel,
        ...(sweepIds.length > 1 ? { sweepAsteroidIds: sweepIds } : {}),
        ...(surveyDepot.covered > 0 ? { depotCovered: surveyDepot.covered, depotUnitsDrawn: surveyDepot.unitsDrawn } : {}),
      },
      transitOutSeconds: out.seconds, extractionSeconds: sweepSeconds, transitBackSeconds: 0, deltaVOut: out.deltaV,
      expectedValue: 0,
      pressureShare: 1, shakedownOdds: 0, expectedShakedownLoss: 0, expectedUnits: 0, rockEvents: { rubble: false, spinUp: false },
      refiningSeconds: 0, outputs: {}, refineOpex: 0,
      depotCovered: surveyDepot.covered, depotUnitsDrawn: surveyDepot.unitsDrawn, fuelBeforeDepot: out.fuel,
    };
  }

  // mode === 'mine' | 'refine' (with a rock: extract, then run the plant)
  const refining = mode === 'refine';
  if (!def.oreExtractionPerHour) return { ok: false, error: 'ship_cannot_mine' };
  if (refining && !def.refineOrePerHour) return { ok: false, error: 'ship_cannot_refine' };
  if (refining && !isRefinableOre(oreId)) return { ok: false, error: 'ore_not_refinable' };
  const recovery = input.refineRecovery ?? MOBILE_REFINERY_RECOVERY;
  const intel = input.intel ?? null;
  if (intel && intel.reserve <= 0) return { ok: false, error: 'rock_exhausted' };
  // Phase B: exclusivity (server-verified; the client mirrors the feed) and
  // the player's own stand-off from an event card.
  if (input.claimedByOther && !input.claimed) return { ok: false, error: 'rock_claimed' };
  if (typeof input.standOffUntilMs === 'number' && input.standOffUntilMs > nowMs) return { ok: false, error: 'standing_off' };
  const capacity = Math.max(0, Math.floor(input.cargoCapacity));
  // Phase C: a refining hull's hold carries the CONCENTRATE, so the batch it
  // can take is capacity / product mass per ore unit -- the whole economic
  // case for refining at the field (ore-refining.ts maxOreBatchForHold).
  // The rate is quoted with the rock's events as they stand NOW -- the same
  // instant the server quotes at (a rubble/spin-up ending mid-extraction is
  // the player's upside/downside, not re-quoted).
  const rate = computeExtractionRate(def, field, intel as (AsteroidIntel & RockEventState) | null, input.hullDamagePct, nowMs);
  if (rate <= 0) return { ok: false, error: 'ship_cannot_mine' };
  const batchCap = refining
    ? Math.min(maxOreBatchForHold(oreId, capacity, recovery), maxOreBatchForTime(rate, def.refineOrePerHour || 1))
    : capacity;
  let fill = Math.floor(input.fillUnits ?? batchCap);
  fill = Math.min(fill, batchCap);
  if (intel) fill = Math.min(fill, Math.floor(intel.reserve));
  if (!(fill >= 1)) return { ok: false, error: 'invalid_fill' };
  const extractionSeconds = Math.ceil((fill / rate) * 3600);
  const plantSeconds = refining ? refineSeconds(fill, def.refineOrePerHour || 1) : 0;
  const thenAction: MiningThenAction = input.thenAction ?? 'return_store';
  const destinationId = thenAction === 'hold' ? parent : (input.destinationId || originId);
  // Phase B: shared-rock pressure and the shakedown on the way home.
  const claimed = !!input.claimed;
  const sharedMiners = claimed ? 1 : Math.max(1, Math.floor(input.sharedMiners ?? 1));
  const share = rockPressureShare(sharedMiners, claimed);
  const oreLanded = applyRockPressure(fill, share);
  const products = refining ? refineOutputs(oreId, oreLanded, recovery) : {};
  const cargoUnits = refining ? refinedUnitTotal(products) : oreLanded;
  // Phase B invariant: pressure costs UNITS, never time or fuel. The leg home
  // is therefore quoted on the QUOTED fill (and, refining, on the product that
  // fill would make), not on what pressure will leave aboard.
  const quotedCargo = refining ? refinedUnitTotal(refineOutputs(oreId, fill, recovery)) : fill;
  const back = thenAction === 'hold' ? null : quoteLeg(parent, destinationId, rock.deltaVExtra, tier, quotedCargo, eff, legs, refining ? 1 : ORE_LOAD_WEIGHT);
  const rawFuel = out.fuel + (back?.fuel ?? 0);
  const depot = depotCoverage(rawFuel, input.depotStockUnits ?? 0);
  const arrivesAtMs = nowMs + out.seconds * 1000;
  const miningEndsAtMs = arrivesAtMs + extractionSeconds * 1000;
  const refineEndsAtMs = miningEndsAtMs + plantSeconds * 1000;
  const completesAtMs = refineEndsAtMs + (back ? back.seconds * 1000 : 0);
  const price = RESOURCE_MAP.get(oreId)?.baseMarketPrice ?? 0;
  const cover: EscortCover = thenAction === 'hold' ? 'none' : (input.escortCover ?? 'none');
  const odds = thenAction === 'hold' ? 0 : shakedownOdds(parent, cover, !!input.frontier);
  const loss = thenAction === 'hold' ? 0 : expectedShakedownLoss(parent, cover, !!input.frontier, cargoUnits);
  const landedProducts = refining
    ? (thenAction === 'hold' ? products : applyProductLoss(products, cargoUnits > 0 ? loss / cargoUnits : 0).outputs)
    : {};
  const expectedUnits = refining ? refinedUnitTotal(landedProducts) : Math.max(0, Math.round(cargoUnits - loss));
  const opex = refining ? refineOpex(oreId, fill) : 0;
  const ev = rockEventMults(intel as RockEventState | null, nowMs);
  return {
    ok: true,
    order: {
      mode: refining ? 'refine' : 'mine', asteroidId: rock.id, fieldId: field.id, parentLocationId: parent,
      oreId, fillUnits: fill, thenAction,
      originId, destinationId,
      startedAtMs: nowMs, arrivesAtMs, miningEndsAtMs, completesAtMs,
      ...(refining ? { refineEndsAtMs, refined: true, outputs: landedProducts, refineOpex: opex } : {}),
      fuelCost: depot.cashFuel, ratePerHour: rate, surveyed: !!intel,
      claimed, sharedMiners, pressureShare: share, expectedUnits, shakedownOdds: odds,
      ...(depot.covered > 0 ? { depotCovered: depot.covered, depotUnitsDrawn: depot.unitsDrawn } : {}),
      ...(cover === 'assigned' && input.escortInstanceId ? { escortInstanceId: input.escortInstanceId } : {}),
    },
    transitOutSeconds: out.seconds, extractionSeconds, transitBackSeconds: back?.seconds ?? 0, deltaVOut: out.deltaV,
    expectedValue: refining ? productValue(landedProducts) : Math.round(expectedUnits * price),
    pressureShare: share, shakedownOdds: odds, expectedShakedownLoss: loss, expectedUnits,
    rockEvents: { rubble: ev.rubble, spinUp: ev.spinUp },
    refiningSeconds: plantSeconds, outputs: landedProducts, refineOpex: opex,
    depotCovered: depot.covered, depotUnitsDrawn: depot.unitsDrawn, fuelBeforeDepot: rawFuel,
  };
}

// ─── Phase derivation ────────────────────────────────────────────────────────

export function miningOrderPhase(order: MiningOrder, nowMs: number): MiningOrderPhase {
  if (nowMs >= order.completesAtMs) return 'complete';
  if (order.mode === 'return') return 'returning';
  if (nowMs < order.arrivesAtMs) return 'transit_out';
  // Phase C: a SWEEP survey works the field for a while after arrival; a
  // single-rock survey completes on arrival as it did in Phase A.
  if (order.mode === 'survey') return nowMs < order.completesAtMs ? 'mining' : 'complete';
  if (nowMs < order.miningEndsAtMs) return 'mining';
  // Phase C: the plant runs between miningEndsAtMs and refineEndsAtMs.
  if (order.mode === 'refine' && typeof order.refineEndsAtMs === 'number' && nowMs < order.refineEndsAtMs) return 'refining';
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
  if (order.mode === 'mine' || order.mode === 'refine') {
    if (phase === 'mining') {
      const span = Math.max(1, order.miningEndsAtMs - order.arrivesAtMs);
      unitsSoFar = Math.floor(order.fillUnits * Math.min(1, (nowMs - order.arrivesAtMs) / span));
    } else if (phase === 'refining' || phase === 'returning' || phase === 'complete') unitsSoFar = order.fillUnits;
  } else if (order.mode === 'return') unitsSoFar = order.fillUnits;
  const parentName = LOCATION_MAP.get(order.parentLocationId)?.name || order.parentLocationId;
  const destName = LOCATION_MAP.get(order.destinationId)?.name || order.destinationId;
  let refinedSoFar = 0;
  if (phase === 'refining' && typeof order.refineEndsAtMs === 'number') {
    const span = Math.max(1, order.refineEndsAtMs - order.miningEndsAtMs);
    refinedSoFar = Math.floor(order.fillUnits * Math.min(1, (nowMs - order.miningEndsAtMs) / span));
  }
  const label = phase === 'transit_out' ? `Outbound → ${parentName}`
    : phase === 'mining' ? (order.mode === 'survey' ? `Surveying · ${(order.sweepAsteroidIds || []).length || 1} rocks` : `Mining · ${unitsSoFar}/${order.fillUnits}`)
    : phase === 'refining' ? `Refining · ${refinedSoFar}/${order.fillUnits} ore`
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
  let totalSpent = state.totalSpent;
  const events: GameState['eventLog'] = [];
  let changed = false;
  // Phase B: escorts freed by completed orders; shakedown lines for the
  // Situation Log; claims worked (lastWorkedAt advances).
  const freedOrderIds = new Set<string>();
  const hazardLines: NonNullable<GameState['recentHazards']> = [];
  const workedRocks: Array<{ asteroidId: string; atMs: number }> = [];
  const frontier = isInFrontier(state, nowMs);

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
      const working = order.mode === 'survey' ? 'surveying' as const : 'mining' as const;
      if (ship.status === working && ship.currentLocation === order.parentLocationId && !ship.route) return ship;
      changed = true;
      return { ...ship, status: working, currentLocation: order.parentLocationId, route: undefined, miningOperation: undefined };
    }
    if (phase === 'refining') {
      // Phase C: the plant runs on station at the field.
      if (ship.status === 'refining' && ship.currentLocation === order.parentLocationId && !ship.route) return ship;
      changed = true;
      return { ...ship, status: 'refining', currentLocation: order.parentLocationId, route: undefined, miningOperation: undefined };
    }
    if (phase === 'returning') {
      if (ship.status === 'in_transit' && ship.route?.to === order.destinationId) return ship;
      changed = true;
      return { ...ship, status: 'in_transit', currentLocation: order.parentLocationId, route: { from: order.parentLocationId, to: order.destinationId, departedAtMs: order.miningEndsAtMs, arrivalAtMs: order.completesAtMs, cargo: {} } };
    }
    // complete
    changed = true;
    freedOrderIds.add(order.id);
    const def = SHIP_MAP.get(ship.definitionId);
    const rockName = order.asteroidId ? (getAsteroid(order.asteroidId)?.name || order.asteroidId) : 'held cargo';
    const oreName = RESOURCE_MAP.get(order.oreId as ResourceId)?.name || order.oreId;
    let base: Ship = { ...ship, miningOrder: undefined, route: undefined, miningOperation: undefined, status: 'idle', currentLocation: order.destinationId };
    if ((order.mode === 'mine' || order.mode === 'refine') && order.asteroidId) {
      workedRocks.push({ asteroidId: order.asteroidId, atMs: order.completesAtMs });
      const rec = asteroidIntel[order.asteroidId];
      // Rubble wear: hull condition is client-owned (hazards.ts precedent) —
      // applied for synced and local play alike when the rock was a rubble
      // field while this order was on it.
      if (rec?.rubbleUntilMs && rec.rubbleUntilMs > order.arrivesAtMs) {
        const wear = Math.round(RUBBLE_HULL_WEAR * (1 + (rec.risk || 0)) * 1000) / 1000;
        base = { ...base, hullDamagePct: Math.min(1, (base.hullDamagePct || 0) + wear) };
        events.push({ id: generateId(), date: state.gameDate, type: 'random_event', title: `🪨 Rubble strike — ${ship.name}`, description: `Working the fractured ${rockName} cost ${(wear * 100).toFixed(1)}% hull.` });
      }
      if (!order.serverAuthoritative && rec) {
        // Local-only play: the rock's reserve, exhaustion and events move
        // here (the server pass does the same for a synced profile).
        const landed = applyRockPressure(order.fillUnits, order.pressureShare ?? 1);
        const reserve = Math.max(0, rec.reserve - landed);
        const rolled = rollRockEvents(rec.risk, order.id, order.completesAtMs, rec, REAL_MS_PER_GAME_MONTH);
        asteroidIntel[order.asteroidId] = { ...rec, ...rolled, reserve, ...(reserve <= 0 ? { exhausted: true } : {}) };
        if (reserve <= 0) events.push({ id: generateId(), date: state.gameDate, type: 'random_event', title: `⛏️ ${rockName} exhausted`, description: 'Nothing left to extract. The slot re-charts as a new rock later in the field\'s cycle.' });
      }
    }
    if (order.mode === 'survey') {
      if (!order.serverAuthoritative && order.asteroidId) {
        for (const id of (order.sweepAsteroidIds && order.sweepAsteroidIds.length > 0 ? order.sweepAsteroidIds : [order.asteroidId])) {
          const rock = getAsteroid(id);
          if (rock) asteroidIntel[rock.id] = { ...rollAsteroidIntel(rock, LOCAL_INTEL_SALT), surveyedAtMs: nowMs, via: 'ship' };
        }
      } else if (order.asteroidId && order.intel) {
        asteroidIntel[order.asteroidId] = { ...order.intel, surveyedAtMs: nowMs, via: 'ship' };
      }
      events.push({ id: generateId(), date: state.gameDate, type: 'random_event', title: `🔭 ${ship.name} surveyed ${rockName}`, description: `${def?.name || 'Ship'} on station at ${LOCATION_MAP.get(order.parentLocationId)?.name || order.parentLocationId}. Grade, reserve and rubble risk are now on the Mining console.` });
      return base;
    }
    if (order.thenAction === 'hold') {
      const heldUnits = (order.mode === 'mine' || order.mode === 'refine') ? applyRockPressure(order.fillUnits, order.pressureShare ?? 1) : order.fillUnits;
      const held: HeldOre = { oreId: order.oreId, units: heldUnits, asteroidId: order.asteroidId, fieldId: order.fieldId, ...(order.refined ? { refined: true } : {}) };
      // Phase C: a refine run that holds parks the CONCENTRATE at the field;
      // the opex was real work and is paid either way (local-only play).
      if (order.refined && !order.serverAuthoritative && order.refineOpex) {
        money -= order.refineOpex;
        totalSpent += order.refineOpex;
      }
      const productLine = order.refined ? describeProducts(refineOutputs(order.oreId, heldUnits, MOBILE_REFINERY_RECOVERY)) : '';
      events.push({ id: generateId(), date: state.gameDate, type: 'milestone', title: order.refined ? `🏭 ${ship.name} holding refined product` : `⛏️ ${ship.name} holding ${heldUnits} ${oreName}`, description: order.refined ? `${heldUnits} ${oreName} processed at ${rockName} → ${productLine}. Issue a Return order to bring it home.` : `Hold full at ${rockName}${heldUnits < order.fillUnits ? ` (${order.fillUnits} quoted — shared-rock pressure)` : ''}. Issue a Return order to bring it home, or leave it for a hauler (Phase D).` });
      return { ...base, heldOre: held };
    }
    if (!order.serverAuthoritative) {
      // Phase B: pressure share, then the NPC shakedown on the lane home.
      // Phase C: a refined run carries PRODUCT — the toll and the credit are
      // taken on the manifest, not on the rock it came from.
      const oreAboard = (order.mode === 'mine' || order.mode === 'refine') ? applyRockPressure(order.fillUnits, order.pressureShare ?? 1) : order.fillUnits;
      const products = order.refined ? refineOutputs(order.oreId, oreAboard, MOBILE_REFINERY_RECOVERY) : {};
      const aboard = order.refined ? refinedUnitTotal(products) : oreAboard;
      if (order.refined && order.refineOpex) {
        money -= order.refineOpex;
        totalSpent += order.refineOpex;
      }
      const cover: EscortCover = order.escortInstanceId ? 'assigned' : 'none';
      const toll = orderHasReturnLeg(order.mode, order.thenAction) ? settleShakedown(order.id, order.parentLocationId, cover, frontier, aboard) : null;
      const landed = toll ? toll.unitsLanded : aboard;
      const landedProducts = order.refined ? applyProductLoss(products, aboard > 0 ? (aboard - landed) / aboard : 0).outputs : {};
      if (toll?.hit || toll?.repelled) {
        const parentName = LOCATION_MAP.get(order.parentLocationId)?.name || order.parentLocationId;
        const summary = toll.hit
          ? `Void Corsairs shook down ${ship.name} on the lane home from ${parentName}: ${toll.unitsLost} ${oreName} handed over (${Math.round(toll.odds * 100)}% odds${order.escortInstanceId ? ', escorted' : ''}).`
          : `Void Corsairs closed on ${ship.name} off ${parentName}; the escort turned them away with nothing lost.`;
        hazardLines.push({ id: `shakedown-${order.id}`, type: 'pirate_raid', severity: toll.hit ? 'major' : 'minor', locationId: order.parentLocationId, occurredAtMs: order.completesAtMs, affectedShipInstanceId: ship.instanceId, targetName: ship.name, damagePct: 0, mitigatedPct: toll.hit ? 0 : 1, destroyed: false, insurancePayout: 0, summary });
        events.push({ id: generateId(), date: state.gameDate, type: 'random_event', title: toll.hit ? `🏴‍☠️ Shakedown — ${ship.name}` : `🛡️ Shakedown repelled — ${ship.name}`, description: summary });
      }
      const cargoName = order.refined ? describeProducts(landedProducts) : `${landed} ${oreName}`;
      if (order.thenAction === 'return_sell') {
        const proceeds = order.refined
          ? Math.round(Object.entries(landedProducts).reduce((sum, [slug, qty]) => sum + qty * (getSpotPrice(state.marketSnapshot, slug, RESOURCE_MAP.get(slug as ResourceId)?.baseMarketPrice ?? 0) || 0), 0) * (1 - MINING_SALE_BROKER_FEE))
          : Math.round(landed * (getSpotPrice(state.marketSnapshot, order.oreId, RESOURCE_MAP.get(order.oreId as ResourceId)?.baseMarketPrice ?? 0) || 0) * (1 - MINING_SALE_BROKER_FEE));
        money += proceeds;
        totalEarned += proceeds;
        events.push({ id: generateId(), date: state.gameDate, type: 'milestone', title: `💰 ${ship.name} sold ${cargoName}`, description: `$${(proceeds / 1_000_000).toFixed(2)}M at spot (−3% broker) on arrival at ${LOCATION_MAP.get(order.destinationId)?.name || order.destinationId}.` });
      } else {
        if (order.refined) {
          if (refinedUnitTotal(landedProducts) > 0) creditArrivalCargo(resources, locationInventories, order.destinationId, landedProducts);
        } else if (landed > 0) {
          creditArrivalCargo(resources, locationInventories, order.destinationId, { [order.oreId]: landed });
        }
        events.push({ id: generateId(), date: state.gameDate, type: 'milestone', title: `📦 ${ship.name} unloaded ${cargoName}`, description: `${order.refined ? 'Product' : 'Ore'} stored at ${LOCATION_MAP.get(order.destinationId)?.name || order.destinationId}.` });
      }
    } else {
      events.push({ id: generateId(), date: state.gameDate, type: 'milestone', title: order.refined ? `🏭 ${ship.name} back with refined product` : `📦 ${ship.name} back with ${order.fillUnits} ${oreName}`, description: `${order.thenAction === 'return_sell' ? 'Sale proceeds' : order.refined ? 'The product' : 'The ore'} clear through the corporate registry on the next sync.` });
    }
    return { ...base, heldOre: order.mode === 'return' ? undefined : base.heldOre };
  });

  if (!changed) return state;
  // Phase B: free the escorts of completed orders.
  const shipsWithEscorts = freedOrderIds.size === 0 ? nextShips : nextShips.map(s => (s.escortingOrderId && freedOrderIds.has(s.escortingOrderId)) ? { ...s, escortingOrderId: undefined } : s);
  let out: GameState = {
    ...state,
    ships: shipsWithEscorts,
    resources,
    locationInventories,
    asteroidIntel,
    money,
    totalEarned,
    totalSpent,
    eventLog: events.length > 0 ? [...events, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG) : state.eventLog,
    ...(hazardLines.length > 0 ? { recentHazards: [...hazardLines, ...(state.recentHazards || [])].slice(0, 50) } : {}),
  };
  for (const w of workedRocks) out = markClaimWorked(out, w.asteroidId, w.atMs);
  return out;
}

/** "12 Lunar Water Ice, 20 Ammonia" — one line for an event-log entry. */
export function describeProducts(outputs: Record<string, number>): string {
  const parts = Object.entries(outputs)
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, qty]) => `${qty} ${RESOURCE_MAP.get(slug as ResourceId)?.name || slug}`);
  return parts.length > 0 ? parts.join(', ') : 'nothing';
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
  /** Phase B: an idle security hull to assign to the run. */
  escortInstanceId?: string | null;
}

/** Hulls that can take a Mining Order (extraction gear or a survey sensor). */
export function isMiningCapable(def: ShipDefinition | undefined): boolean {
  return !!def && (!!def.oreExtractionPerHour || !!def.survey);
}

/** A ship may take a new order when built, idle, and not already on one. */
export function canTakeMiningOrder(ship: Ship): boolean {
  return ship.isBuilt && ship.status === 'idle' && !ship.miningOrder && !ship.escortingOrderId;
}

// ─── Phase B: escorts ────────────────────────────────────────────────────────

/** A built, idle `security` hull not already escorting or on an order. */
export function canEscort(ship: Ship): boolean {
  const def = SHIP_MAP.get(ship.definitionId);
  return !!def?.security && ship.isBuilt && ship.status === 'idle' && !ship.miningOrder && !ship.escortingOrderId;
}

/** Escorts a mining order may assign: idle security hulls at the departure
 *  point (they fly the run) or at the field's parent (they meet it there). */
export function escortCandidates(state: GameState, originId: string, parentLocationId: string): Ship[] {
  return (state.ships || []).filter(s => canEscort(s) && (s.currentLocation === originId || s.currentLocation === parentLocationId));
}

/** Whether an unassigned security hull sits idle at the field's parent —
 *  the STATIONED cover (npc-shakedown.ts ESCORT_STATIONED_ODDS_MULT). */
export function hasStationedEscort(state: GameState, parentLocationId: string): boolean {
  return (state.ships || []).some(s => canEscort(s) && s.currentLocation === parentLocationId);
}

/** The cover a request resolves to on the client (the server re-derives it
 *  from the registry — a bad escort id is refused, never silently downgraded). */
export function resolveEscortCover(state: GameState, originId: string, parentLocationId: string, escortInstanceId?: string | null): { cover: EscortCover; escortInstanceId?: string; error?: MiningPlanError } {
  if (escortInstanceId) {
    const ok = escortCandidates(state, originId, parentLocationId).some(s => s.instanceId === escortInstanceId);
    return ok ? { cover: 'assigned', escortInstanceId } : { cover: 'none', error: 'escort_invalid' };
  }
  return { cover: hasStationedEscort(state, parentLocationId) ? 'stationed' : 'none' };
}

/** Build a full MiningOrder from a plan (client-generated id). */
export function materializeOrder(plan: MiningPlan, id: string, serverAuthoritative: boolean, intel?: AsteroidIntel | null): MiningOrder {
  return { ...plan.order, id, serverAuthoritative, ...(intel ? { intel: { grade: intel.grade, reserve: intel.reserve, risk: intel.risk } } : {}) };
}
