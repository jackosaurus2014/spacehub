// ─── Space Tycoon: Propellant Depot Ships (mining Phase C) ───────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §5: "Parks at a field and refuels
// miners and haulers there; without it every trip pays the full round-trip
// delta-v. Depots are finite slots per field, so the first corporation to
// place one owns the field's economics. Chokepoint by design."
//
// The model, in one line: a stocked depot at a field pays the FIELD SIDE of
// every one of its owner's runs out of that field — DEPOT_COVER_SHARE of the
// order's propellant bill — at DEPOT_FUEL_VALUE_PER_UNIT of burn displaced
// per unit of propellant in the tank. A depot ship delivers propellant in
// ONE bulk load; a mining hull that has to carry its own return propellant
// pays the last-mile cost on every single trip, which is the difference the
// depot sells.
//
// Two ways to keep it stocked, and the choice is the point:
//   cash      — buy propellant and have the depot ship deliver it, priced at
//               rocket-fuel spot x the field's delivery multiplier. Cheap in
//               cislunar space, break-even in the Trojans, a LOSS past
//               Neptune (DEPOT_DELIVERY_MULT below).
//   feedstock — pour in what you refined locally. C-type ore refines to water
//               ice and ammonia (ore-refining.ts), and both electrolyse into
//               propellant at the field. On the Kuiper Fringe this is the
//               only way a depot pays for itself, which is exactly the
//               "refine near the field" loop the design asks for.
//
// Slots are finite per field and held by whoever deployed first, released
// only by recalling the ship (or scrapping it). No claim-jumping, no
// contest mechanic: the scarcity IS the contest.
//
// Pure. No React, no DB. The DB half is server-mining.ts (PropellantDepot
// rows), the route is /api/space-tycoon/assets/mining {op:'deploy_depot' |
// 'stock_depot' | 'recall_depot'}.

import { ASTEROID_FIELD_MAP, type AsteroidField } from './asteroids';
import { RESOURCE_MAP, type ResourceId } from './resources';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Depot slots per field. The Frontier field gets one more so a newcomer is
 *  never locked out of the only field they can reach (§6 Frontier shield). */
export const DEPOT_SLOTS_PER_FIELD = 2;
export const DEPOT_SLOTS_FRONTIER_FIELD = 3;

/** Dollars of a mining order's propellant bill displaced per unit of
 *  propellant drawn from a depot. Well above the $120K market price of
 *  refined rocket fuel because the market price is the price AT EARTH: the
 *  fuel term in a mining order (mining-orders.ts quoteLeg) already embeds
 *  what it costs to have propellant where the rock is. The depot ship hauls
 *  that last mile once, in bulk, instead of every hull paying it every trip.
 *  Tuned in scripts/sim-mining.ts scenario 8 (docs/BALANCE.md Pass 15). */
export const DEPOT_FUEL_VALUE_PER_UNIT = 250_000;

/** The share of one order's fuel bill a stocked depot can cover: the FIELD
 *  SIDE of the run. The other 40% is the leg the destination's own supply
 *  chain burns, which a depot at the field cannot touch. */
export const DEPOT_COVER_SHARE = 0.6;

/** Delivery multiplier on rocket-fuel spot when a depot is restocked FOR
 *  CASH, by field. Cislunar is a short hop; the Kuiper Fringe is not, and
 *  cash restocking there costs more than the burn it displaces on purpose —
 *  past Neptune you refine your own or you do without. */
export const DEPOT_DELIVERY_MULT: Readonly<Record<string, number>> = {
  field_near_earth: 1.2,
  field_inner_belt: 1.6,
  field_ceres: 1.6,
  field_trojans: 2.1,
  field_kuiper: 2.8,
};

/** Propellant units one unit of each accepted feedstock yields in the
 *  depot's cracking plant. Refined rocket fuel goes in as-is; water ice
 *  electrolyses at a small loss; ammonia is the low-grade option. All three
 *  are things ore-refining.ts produces at a field (C-type recipe) or a
 *  fabricator makes at home. */
export const DEPOT_FEEDSTOCK_YIELD: Readonly<Record<string, number>> = {
  rocket_fuel: 1,
  lunar_water: 0.8,
  mars_water: 0.8,
  ammonia: 0.5,
  methane: 0.7,
};

export const DEPOT_FEEDSTOCK_IDS: readonly string[] = Object.keys(DEPOT_FEEDSTOCK_YIELD);

/** Largest single restock request (keeps one call from draining a warehouse
 *  by typo; repeat the op to fill a big tank). */
export const DEPOT_MAX_RESTOCK_UNITS = 5_000;

// ─── Slots ───────────────────────────────────────────────────────────────────

export function depotSlotsForField(field: Pick<AsteroidField, 'frontier'> | null | undefined): number {
  return field?.frontier ? DEPOT_SLOTS_FRONTIER_FIELD : DEPOT_SLOTS_PER_FIELD;
}

export function depotSlotsForFieldId(fieldId: string): number {
  return depotSlotsForField(ASTEROID_FIELD_MAP.get(fieldId));
}

/** The lowest free slot index in a field, or null when the field is full. */
export function firstFreeSlot(fieldId: string, takenSlots: readonly number[]): number | null {
  const slots = depotSlotsForFieldId(fieldId);
  const taken = new Set(takenSlots);
  for (let i = 0; i < slots; i++) if (!taken.has(i)) return i;
  return null;
}

// ─── Records ─────────────────────────────────────────────────────────────────

/** One of the corporation's own depots (server truth = PropellantDepot row). */
export interface DepotRecord {
  id: string;
  fieldId: string;
  slotIndex: number;
  /** The depot hull holding the slot. */
  shipInstanceId: string;
  stockUnits: number;
  capacity: number;
  deployedAtMs: number;
}

/** A row of the public depot register (who holds which slot at which field).
 *  Stock levels are NOT public — how much propellant a rival has left is
 *  earned intelligence, not a free read (CLAUDE.md "deeper intelligence is
 *  earned"). */
export interface PublicDepotView {
  fieldId: string;
  slotIndex: number;
  holderName: string;
  deployedAtMs: number;
}

// ─── Coverage maths ──────────────────────────────────────────────────────────

export interface DepotCoverage {
  /** Dollars of the order's fuel bill the depot pays. */
  covered: number;
  /** Propellant units drawn from the tank for it. */
  unitsDrawn: number;
  /** What the corporation still pays in cash. */
  cashFuel: number;
}

/**
 * How much of `fuelCost` a depot holding `stockUnits` covers. Pure and
 * identical on the client quote and the server settlement; the server draws
 * the units atomically, so a forged stock figure buys nothing.
 */
export function depotCoverage(fuelCost: number, stockUnits: number): DepotCoverage {
  const bill = Math.max(0, Math.round(fuelCost));
  const stock = Math.max(0, stockUnits);
  if (bill <= 0 || stock <= 0) return { covered: 0, unitsDrawn: 0, cashFuel: bill };
  const cap = Math.floor(bill * DEPOT_COVER_SHARE);
  const covered = Math.min(cap, Math.floor(stock * DEPOT_FUEL_VALUE_PER_UNIT));
  if (covered <= 0) return { covered: 0, unitsDrawn: 0, cashFuel: bill };
  const unitsDrawn = Math.round((covered / DEPOT_FUEL_VALUE_PER_UNIT) * 1000) / 1000;
  return { covered, unitsDrawn, cashFuel: bill - covered };
}

/** Cash price per propellant unit delivered to a field (spot x the field's
 *  delivery multiplier). `spot` defaults to refined rocket fuel's base
 *  price. */
export function depotRestockPricePerUnit(fieldId: string, spot?: number): number {
  const base = typeof spot === 'number' && Number.isFinite(spot) && spot > 0
    ? spot
    : (RESOURCE_MAP.get('rocket_fuel' as ResourceId)?.baseMarketPrice ?? 120_000);
  const mult = DEPOT_DELIVERY_MULT[fieldId] ?? 2;
  return Math.round(base * mult);
}

/** Propellant units `qty` of a feedstock resource yields. */
export function feedstockPropellant(slug: string, qty: number): number {
  const y = DEPOT_FEEDSTOCK_YIELD[slug];
  if (!y) return 0;
  return Math.max(0, Math.floor(Math.max(0, qty) * y * 100) / 100);
}

/** Feedstock units needed for `propellantUnits` of tank (rounded up). */
export function feedstockForPropellant(slug: string, propellantUnits: number): number {
  const y = DEPOT_FEEDSTOCK_YIELD[slug];
  if (!y) return 0;
  return Math.ceil(Math.max(0, propellantUnits) / y);
}

/** Is cash restocking at this field cheaper than the burn it displaces? The
 *  number the Depot console shows, and the reason to refine locally. */
export function depotCashMargin(fieldId: string, spot?: number): number {
  return DEPOT_FUEL_VALUE_PER_UNIT - depotRestockPricePerUnit(fieldId, spot);
}

// ─── Refusals ────────────────────────────────────────────────────────────────

export type DepotError =
  | 'unknown_field'
  | 'not_depot_ship'
  | 'ship_busy'
  | 'ship_not_at_field'
  | 'field_full'
  | 'already_deployed'
  | 'no_depot'
  | 'depot_full'
  | 'invalid_units'
  | 'insufficient_funds'
  | 'insufficient_feedstock';

export const DEPOT_ERROR_TEXT: Readonly<Record<DepotError, string>> = {
  unknown_field: 'That asteroid field is not in the catalogue.',
  not_depot_ship: 'That hull is not a propellant depot.',
  ship_busy: 'That hull is on an order — recall it first.',
  ship_not_at_field: 'The depot ship has to be at the field before it can take a slot.',
  field_full: 'Every depot slot at that field is taken. Depots are finite — that is the point.',
  already_deployed: 'That depot ship already holds a slot.',
  no_depot: 'You hold no depot slot at that field.',
  depot_full: 'The depot tank is full.',
  invalid_units: 'Enter how much propellant to load.',
  insufficient_funds: 'Not enough cash for the delivery.',
  insufficient_feedstock: 'Not enough of that feedstock in your inventory.',
};

export interface DeployDepotCheckInput {
  fieldId: string;
  /** The hull's depot capacity (ShipDefinition.depotCapacity); 0 = not a depot. */
  depotCapacity: number;
  /** Where the hull is; must be the field's parent location. */
  shipLocationId: string;
  shipBusy: boolean;
  shipAlreadyDeployed: boolean;
  takenSlots: readonly number[];
}

export type DepotCheck = { ok: true; slotIndex: number; capacity: number } | { ok: false; error: DepotError };

/** The same refusal ladder on the client preview and the server route. */
export function checkDeployDepot(input: DeployDepotCheckInput): DepotCheck {
  const field = ASTEROID_FIELD_MAP.get(input.fieldId);
  if (!field) return { ok: false, error: 'unknown_field' };
  if (!(input.depotCapacity > 0)) return { ok: false, error: 'not_depot_ship' };
  if (input.shipAlreadyDeployed) return { ok: false, error: 'already_deployed' };
  if (input.shipBusy) return { ok: false, error: 'ship_busy' };
  if (input.shipLocationId !== field.parentLocationId) return { ok: false, error: 'ship_not_at_field' };
  const slot = firstFreeSlot(input.fieldId, input.takenSlots);
  if (slot === null) return { ok: false, error: 'field_full' };
  return { ok: true, slotIndex: slot, capacity: Math.floor(input.depotCapacity) };
}
