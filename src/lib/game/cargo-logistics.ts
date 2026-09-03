// ─── Space Tycoon: Cargo Logistics + Per-Location Inventory (4X Wave W14) ────
// docs/GAME_SYSTEMS_AUDIT_2026-08.md C1 ("Real cargo logistics") +
// docs/4X_BASELINE_2026-08.md W14. Freight is the heart of a space trading
// MMO: dispatch deducts cargo at the ORIGIN, enforces cargoCapacity (hull +
// fitted cargo modules), charges a real Δv-priced fuel bill (finally
// consuming spatial-strategy.ts lane physics AND the W1 research
// `fuelEfficiency` bucket), and arrival credits the DESTINATION's local
// stockpile. The ledger-style debit-at-departure / credit-at-arrival pair is
// the exact dup-proof pattern audit hotlist #5 (wave A) demanded before the
// arrival-credit path could be re-enabled.
//
// Inventory model (additive V23 state):
//   • state.resources           — the Earth/home pool. Unchanged meaning:
//     market sells, build costs, crafting, contracts all draw from it, and
//     it doubles as the local inventory of the HOME cluster (earth_surface /
//     leo / geo — the near-Earth economy where the NPC market clears).
//   • state.locationInventories — locationId → resourceId → qty. Local
//     stockpiles at every non-home location. Production accrues here once
//     logistics is unlocked; freight moves goods between pools.
//   • state.logisticsUnlocked   — one-way ratchet. False on old + new saves
//     (grace default: production keeps crediting the global pool exactly as
//     before W14); flips true the first time the corporation owns a BUILT
//     transport/tanker hull, and stays true. From then on, remote production
//     accrues locally — mining at Ceres fills Ceres storage — and the supply
//     phase becomes physical. Migration prescription (audit C1): the global
//     pool "seeds" the Earth inventory, i.e. nothing a pre-W14 save owns is
//     moved or stranded; only NEW remote production routes locally.
//
// Every function here is pure + deterministic (no RNG, no Date.now inside
// the math) — dispatch takes `nowMs` explicitly, mirroring expeditions.ts.

import type { GameState } from './types';
import { SHIP_MAP, getTravelTime } from './ships';
import { LANES } from './spatial-strategy';
import { LOCATION_MAP } from './solar-system';
import { RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';
import { getResearchBonuses } from './research-tree';
import { getFittedModulesForShip } from './modules';
import { generateId } from './formulas';
import { MAX_EVENT_LOG } from './constants';
// Wave E5 (docs/ECONOMY_PVP_2026-08.md §2.8/§E5): "shipping lanes are
// investments" (CLAUDE.md) — repeated dispatches on a lane earn a fuel
// discount (server-shared, delivered via state.laneBonuses), and every
// dispatch here records one usage tick for the next sync to transmit.
import { getLaneBonus, accumulateLaneUsage } from './trade-lanes';
// AAA Round 1 E3.6: Dominion/Reaver route licences discount the fuel bill.
import { getFactionLicenseBonuses } from './factions';
// Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O6 "chokepoint squeeze — lane
// concessions"): zone governors may levy a small public freight toll
// (0.5-2% of cargo value, capped) on rival dispatches crossing their zone.
// Computed here at dispatch time from the synced offense snapshot
// (deterministic), debited with the fuel bill, and settled to the governor
// through the sync route's ledger credit. Frontier corps exempt; alternate
// routes / voting the governor out / trade treaties are the counterplay.
import { computeCargoValue, computeFreightTolls, accumulateTollPayments, type FreightTollCharge } from './offense';
// Construction Purposes wave (docs/CONSTRUCTION_PURPOSES_2026-08.md):
// propellant infrastructure (launch pads, propellant plants/depots, Titan
// refinery) at a dispatch's ORIGIN or DESTINATION discounts the fuel bill —
// logisticsSupport, combined endpoint total capped at 15% (mirrors the
// lane-investment cap; stacks multiplicatively with lane + research terms).
import { getLocationCapabilityBonus, CAPABILITY_CAPS } from './building-capabilities';
// Row 13 (docs/GAME_DESIGN_REVIEW_2026-09.md §2): location-aware spending —
// the build/craft/scrap consumers of `state.resources` now resolve against
// the pool that physically holds the goods. buildings.ts + production-chains
// are leaf modules from here (neither imports cargo-logistics), so this adds
// no cycle.
import { BUILDING_MAP } from './buildings';
import { facilityTierFor, type ProductDefinition } from './production-chains';

// ─── Home cluster ────────────────────────────────────────────────────────────

/** The near-Earth cluster whose shared inventory IS state.resources — the
 *  pool the NPC market trades against. Selling on the market requires goods
 *  here (CLAUDE.md "logistics cost money"; audit C1 market interface). */
export const HOME_LOCATION_IDS = ['earth_surface', 'leo', 'geo'] as const;

export function isHomeLocation(locationId: string): boolean {
  return (HOME_LOCATION_IDS as readonly string[]).includes(locationId);
}

// ─── Inventory readers ───────────────────────────────────────────────────────

/** Read-only view of the inventory pool at a location. Home cluster → the
 *  global Earth pool; anywhere else → that location's local stockpile. */
export function getLocationInventory(state: GameState, locationId: string): Record<string, number> {
  if (isHomeLocation(locationId)) return state.resources || {};
  return (state.locationInventories || {})[locationId] || {};
}

export function getLocationStock(state: GameState, locationId: string, resourceId: string): number {
  return getLocationInventory(state, locationId)[resourceId] || 0;
}

/** Units of a resource sellable on the NPC market — home pool only. Remote
 *  stockpiles must be freighted to Earth before they can clear the market. */
export function getSellableQuantity(state: GameState, resourceId: string): number {
  return (state.resources || {})[resourceId] || 0;
}

export interface ResourceTotals {
  atHome: number;
  remote: number;
  total: number;
  /** Non-home locations holding stock, largest first. */
  remoteBreakdown: { locationId: string; quantity: number }[];
}

/** Where a resource physically sits — the honest readout behind the market
 *  panel's "N more units at remote stockpiles" line. */
export function getResourceTotals(state: GameState, resourceId: string): ResourceTotals {
  const atHome = (state.resources || {})[resourceId] || 0;
  const remoteBreakdown: { locationId: string; quantity: number }[] = [];
  let remote = 0;
  for (const [locId, inv] of Object.entries(state.locationInventories || {})) {
    const qty = inv?.[resourceId] || 0;
    if (qty > 0) {
      remote += qty;
      remoteBreakdown.push({ locationId: locId, quantity: qty });
    }
  }
  remoteBreakdown.sort((a, b) => b.quantity - a.quantity);
  return { atHome, remote, total: atHome + remote, remoteBreakdown };
}

// ─── Production routing (grace ratchet) ──────────────────────────────────────

/** True once the corporation has ever owned a built transport/tanker hull —
 *  the "player builds logistics" moment that activates local accrual. */
export function hasFreightCapability(state: GameState): boolean {
  for (const s of state.ships || []) {
    if (!s.isBuilt) continue;
    const def = SHIP_MAP.get(s.definitionId);
    if (def?.role === 'transport' || def?.role === 'tanker') return true;
  }
  return false;
}

/**
 * Route a production credit to the right pool. Mutates the `resources` /
 * `locationInventories` COPIES the tick engine already works on (the engine
 * owns copy-on-write of the outer objects; this helper handles the nested
 * per-location copy). `routeLocally` = state.logisticsUnlocked — while
 * false (grace default for saves without freight), everything still lands
 * in the global pool, preserving pre-W14 behavior exactly.
 */
export function routeProductionCredit(
  resources: Record<string, number>,
  locationInventories: Record<string, Record<string, number>>,
  locationId: string,
  resourceId: string,
  amount: number,
  routeLocally: boolean,
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

/**
 * Credit arriving freight cargo at its destination. Unlike production, this
 * ALWAYS routes by destination (home → global pool, remote → local
 * stockpile) regardless of the grace ratchet — freight is an explicit
 * player order, so its goods land where the player sent them.
 */
export function creditArrivalCargo(
  resources: Record<string, number>,
  locationInventories: Record<string, Record<string, number>>,
  destinationId: string,
  cargo: Record<string, number>,
): number {
  let credited = 0;
  for (const [resId, qty] of Object.entries(cargo || {})) {
    if (!qty || qty <= 0) continue;
    credited += qty;
    if (isHomeLocation(destinationId)) {
      resources[resId] = (resources[resId] || 0) + qty;
    } else {
      const loc = { ...(locationInventories[destinationId] || {}) };
      loc[resId] = (loc[resId] || 0) + qty;
      locationInventories[destinationId] = loc;
    }
  }
  return credited;
}

// ─── Cargo capacity (hull + modules) ─────────────────────────────────────────

/** The Extended Cargo Bay module (modules.ts) was flagged inert pending C1 —
 *  it is now real: +30% effective cargo capacity per fitted bay. Same
 *  flag-constant pattern as MINING_LASER_MODULE_ID. */
export const EXT_CARGO_BAY_MODULE_ID = 'mod_ext_cargo_bay';
export const EXT_CARGO_BAY_CAPACITY_BONUS = 0.30;

/** Effective cargo capacity for a ship instance: hull capacity × fitted
 *  Extended Cargo Bays (+30% each, additive). */
export function getShipCargoCapacity(state: GameState, shipInstanceId: string): number {
  const ship = (state.ships || []).find(s => s.instanceId === shipInstanceId);
  if (!ship) return 0;
  const def = SHIP_MAP.get(ship.definitionId);
  if (!def) return 0;
  let bonus = 0;
  for (const m of getFittedModulesForShip(state, shipInstanceId)) {
    if (m.definitionId === EXT_CARGO_BAY_MODULE_ID) bonus += EXT_CARGO_BAY_CAPACITY_BONUS;
  }
  return Math.floor(def.cargoCapacity * (1 + bonus));
}

/** Tankers carry "2x effective capacity for liquids" (fuel_tanker def text —
 *  previously flavor, now mechanical): water + hydrocarbon units count at
 *  half weight against a tanker's capacity. */
export const TANKER_LIQUID_WEIGHT = 0.5;

/** Capacity-units consumed by a cargo manifest for a given ship role. */
export function getCargoLoadUnits(role: string | undefined, cargo: Record<string, number>): number {
  let load = 0;
  for (const [resId, qty] of Object.entries(cargo || {})) {
    if (!qty || qty <= 0) continue;
    const cat = RESOURCE_MAP.get(resId as ResourceId)?.category;
    const isLiquid = cat === 'water' || cat === 'hydrocarbon';
    load += qty * (role === 'tanker' && isLiquid ? TANKER_LIQUID_WEIGHT : 1);
  }
  return load;
}

// ─── Δv routing (spatial-strategy lane graph) ────────────────────────────────

/** Adjacency list over the canonical LANES graph (bidirectional). Built once. */
const LANE_ADJACENCY: Map<string, { to: string; deltaV: number }[]> = (() => {
  const adj = new Map<string, { to: string; deltaV: number }[]>();
  for (const lane of LANES) {
    adj.set(lane.from, [...(adj.get(lane.from) || []), { to: lane.to, deltaV: lane.deltaV }]);
    adj.set(lane.to, [...(adj.get(lane.to) || []), { to: lane.from, deltaV: lane.deltaV }]);
  }
  return adj;
})();

/**
 * Total Δv (m/s) for the cheapest lane path between two locations —
 * Dijkstra over the 24-lane spatial-strategy graph (tiny; exact). Falls
 * back to |ΔV_from_LEO(to) − ΔV_from_LEO(from)| + 2,000 m/s maneuvering
 * margin if either endpoint is off the lane graph.
 */
export function getRouteDeltaV(from: string, to: string): number {
  if (from === to) return 0;
  if (LANE_ADJACENCY.has(from) && LANE_ADJACENCY.has(to)) {
    const dist = new Map<string, number>([[from, 0]]);
    const visited = new Set<string>();
    // Simple O(V²) Dijkstra — the graph has ~24 nodes.
    for (;;) {
      let current: string | null = null;
      let best = Infinity;
      dist.forEach((d, node) => {
        if (!visited.has(node) && d < best) { best = d; current = node; }
      });
      if (current === null) break;
      if (current === to) return best;
      visited.add(current);
      for (const edge of LANE_ADJACENCY.get(current) || []) {
        const nd = best + edge.deltaV;
        if (nd < (dist.get(edge.to) ?? Infinity)) dist.set(edge.to, nd);
      }
    }
  }
  const fromDv = LOCATION_MAP.get(from)?.deltaVFromLEO ?? 0;
  const toDv = LOCATION_MAP.get(to)?.deltaVFromLEO ?? 0;
  return Math.abs(toDv - fromDv) + 2_000;
}

// ─── Fuel pricing ────────────────────────────────────────────────────────────
// fuel bill = Δv × (hull rate × tier  +  cargo rate × load units)
//             × (1 − research fuelEfficiencyBonus, cap 50%)
//
// Magnitude anchors (BALANCE.md "logistics cost money", sinks scale with
// activity): a T1 Cargo Shuttle repositioning LEO→lunar orbit (4,000 m/s)
// burns $400K empty / ~$1.4M fully loaded; a T3 Heavy Transport hauling 500
// units LEO→Belt (9,000 m/s) pays ~$25M — ~10% of a platinum manifest's
// market value. Real friction, never confiscatory.

export const FREIGHT_HULL_FUEL_RATE = 100;  // $ per m/s per ship tier (empty hull)
export const FREIGHT_CARGO_FUEL_RATE = 5;   // $ per m/s per cargo load-unit
export const FREIGHT_MIN_FUEL_COST = 10_000; // floor — no free hops

/** Research fuel-efficiency multiplier (W1 bucket, consumed here per its
 *  own declaration comment). Returns 0.5–1.0 (bonus capped at 50%). */
export function getFuelEfficiencyMultiplier(state: GameState): number {
  const bonuses = getResearchBonuses(state.completedResearch || [], state.repeatableResearchLevels);
  return Math.max(0.5, 1 - bonuses.fuelEfficiencyBonus);
}

/** Δv-priced fuel bill for a dispatch. Pure; deterministic. */
export function getFreightFuelCost(
  state: GameState,
  shipInstanceId: string,
  from: string,
  to: string,
  cargo: Record<string, number>,
): number {
  const ship = (state.ships || []).find(s => s.instanceId === shipInstanceId);
  const def = ship ? SHIP_MAP.get(ship.definitionId) : undefined;
  if (!ship || !def) return 0;
  const deltaV = getRouteDeltaV(from, to);
  const loadUnits = getCargoLoadUnits(def.role, cargo);
  const raw = deltaV * (FREIGHT_HULL_FUEL_RATE * def.tier + FREIGHT_CARGO_FUEL_RATE * loadUnits);
  // Wave E5 (§2.8): heavily-used lanes discount the fuel bill up to
  // LANE_BONUS_CAP (15%) — "repeated routes... get faster, safer, and
  // cheaper with... investment" (CLAUDE.md). Reads the last server snapshot;
  // 0 (no discount) when absent/stale — pre-E5 behavior exactly.
  const laneDiscount = getLaneBonus(state.laneBonuses, from, to);
  // Construction Purposes wave: endpoint logistics infrastructure (see
  // import comment). Sum of origin + destination capability, capped at the
  // same central logisticsSupport ceiling.
  const endpointDiscount = Math.min(
    CAPABILITY_CAPS.logisticsSupport,
    getLocationCapabilityBonus(state, from, 'logisticsSupport')
      + getLocationCapabilityBonus(state, to, 'logisticsSupport'),
  );
  // AAA Round 1 E3.6: Dominion Priority Routing / Reaver Route Charts.
  // Escorted lanes and charted short-cuts are exactly what those two
  // licences promise in their own description text; before this wave the
  // `grants` flags were read by nothing at all. Capped at 12% inside
  // getFactionLicenseBonuses and applied as a third independent discount
  // term, the same shape as the lane and endpoint discounts above.
  const freightFuelDiscount = getFactionLicenseBonuses(state).freightFuelDiscount;
  const cost = Math.round(
    raw * getFuelEfficiencyMultiplier(state)
      * (1 - laneDiscount) * (1 - endpointDiscount) * (1 - freightFuelDiscount),
  );
  return Math.max(FREIGHT_MIN_FUEL_COST, cost);
}

// ─── Freight planning + atomic dispatch ──────────────────────────────────────

export type FreightPlanError = {
  ok: false;
  reason:
    | 'ship_not_found'
    | 'ship_not_built'
    | 'ship_busy'
    | 'already_there'
    | 'invalid_cargo'
    | 'cargo_exceeds_capacity'
    | 'insufficient_origin_stock'
    | 'insufficient_funds';
  detail?: string;
};

export interface FreightPlan {
  ok: true;
  shipInstanceId: string;
  from: string;
  to: string;
  cargo: Record<string, number>;
  deltaV: number;
  loadUnits: number;
  capacity: number;
  fuelCost: number;
  /** Wave M5 (O6): governor freight tolls owed by this dispatch (sum of
   *  `tolls[].amount`). 0 when no tolled zone is crossed / Frontier / no
   *  synced offense snapshot. */
  tollCost: number;
  tolls: FreightTollCharge[];
  travelSeconds: number;
}

/** Sanitize a cargo manifest: positive integers on known resources only. */
function normalizeCargo(cargo: Record<string, number> | undefined): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const [resId, qty] of Object.entries(cargo || {})) {
    if (qty === 0) continue;
    if (!Number.isFinite(qty) || qty < 0 || Math.floor(qty) !== qty) return null;
    if (!RESOURCE_MAP.has(resId as ResourceId)) return null;
    out[resId] = qty;
  }
  return out;
}

/**
 * Pure freight quote — validates everything a dispatch would and prices it.
 * UI panels call this live for the capacity bar + fuel readout; the mutator
 * below re-runs it so validation can never be bypassed.
 */
export function planFreight(
  state: GameState,
  shipInstanceId: string,
  toLocationId: string,
  cargo: Record<string, number> = {},
  nowMs: number = Date.now(),
): FreightPlan | FreightPlanError {
  const ship = (state.ships || []).find(s => s.instanceId === shipInstanceId);
  if (!ship) return { ok: false, reason: 'ship_not_found' };
  if (!ship.isBuilt) return { ok: false, reason: 'ship_not_built' };
  if (ship.status !== 'idle') return { ok: false, reason: 'ship_busy' };
  if (ship.currentLocation === toLocationId) return { ok: false, reason: 'already_there' };
  const def = SHIP_MAP.get(ship.definitionId);
  if (!def) return { ok: false, reason: 'ship_not_found' };

  const manifest = normalizeCargo(cargo);
  if (manifest === null) return { ok: false, reason: 'invalid_cargo' };

  const capacity = getShipCargoCapacity(state, shipInstanceId);
  const loadUnits = getCargoLoadUnits(def.role, manifest);
  if (loadUnits > capacity) {
    return { ok: false, reason: 'cargo_exceeds_capacity', detail: `${loadUnits} load-units > ${capacity} capacity` };
  }

  for (const [resId, qty] of Object.entries(manifest)) {
    const have = getLocationStock(state, ship.currentLocation, resId);
    if (have < qty) {
      return { ok: false, reason: 'insufficient_origin_stock', detail: `${resId}: need ${qty}, ${have} at origin` };
    }
  }

  const fuelCost = getFreightFuelCost(state, shipInstanceId, ship.currentLocation, toLocationId, manifest);
  // Wave M5 (O6): governor freight tolls on tolled zones this route crosses.
  const tolls = computeFreightTolls(state, ship.currentLocation, toLocationId, computeCargoValue(manifest), nowMs);
  const tollCost = tolls.reduce((s, t) => s + t.amount, 0);
  if (state.money < fuelCost + tollCost) {
    return { ok: false, reason: 'insufficient_funds', detail: `Fuel bill ${fuelCost.toLocaleString()}${tollCost > 0 ? ` + toll ${tollCost.toLocaleString()}` : ''}` };
  }

  return {
    ok: true,
    shipInstanceId,
    from: ship.currentLocation,
    to: toLocationId,
    cargo: manifest,
    deltaV: getRouteDeltaV(ship.currentLocation, toLocationId),
    loadUnits,
    capacity,
    fuelCost,
    tollCost,
    tolls,
    travelSeconds: getTravelTime(ship.currentLocation, toLocationId),
  };
}

/**
 * THE freight mutator — the only sanctioned way to put cargo on a route.
 * Atomically (single state return): debits the manifest from the ORIGIN
 * inventory, debits the Δv-priced fuel bill, and sets the ship in transit
 * with the cargo on its route. The matching credit happens exactly once in
 * game-engine's transit-arrival branch (which wave A had disabled pending
 * this debit side). No path exists that credits without this debit.
 */
export function dispatchShipWithCargo(
  state: GameState,
  shipInstanceId: string,
  toLocationId: string,
  cargo: Record<string, number> = {},
  nowMs: number = Date.now(),
): { ok: true; state: GameState; plan: FreightPlan } | FreightPlanError {
  const plan = planFreight(state, shipInstanceId, toLocationId, cargo, nowMs);
  if (!plan.ok) return plan;

  // Debit origin inventory (ledger-style: departure debit).
  let resources = state.resources;
  let locationInventories = state.locationInventories;
  const hasCargo = Object.keys(plan.cargo).length > 0;
  if (hasCargo) {
    if (isHomeLocation(plan.from)) {
      resources = { ...state.resources };
      for (const [resId, qty] of Object.entries(plan.cargo)) {
        resources[resId] = (resources[resId] || 0) - qty;
      }
    } else {
      const originInv = { ...((state.locationInventories || {})[plan.from] || {}) };
      for (const [resId, qty] of Object.entries(plan.cargo)) {
        originInv[resId] = (originInv[resId] || 0) - qty;
        if (originInv[resId] <= 0) delete originInv[resId];
      }
      locationInventories = { ...(state.locationInventories || {}), [plan.from]: originInv };
    }
  }

  const ships = (state.ships || []).map(s =>
    s.instanceId === shipInstanceId
      ? {
          ...s,
          status: 'in_transit' as const,
          miningOperation: undefined,
          route: {
            from: plan.from,
            to: plan.to,
            departedAtMs: nowMs,
            arrivalAtMs: nowMs + plan.travelSeconds * 1000,
            cargo: plan.cargo,
          },
        }
      : s,
  );

  const toName = LOCATION_MAP.get(plan.to)?.name || plan.to;
  const cargoSummary = hasCargo
    ? `${Object.values(plan.cargo).reduce((a, b) => a + b, 0)} units of cargo`
    : 'no cargo';

  const newState: GameState = {
    ...state,
    money: state.money - plan.fuelCost - plan.tollCost,
    totalSpent: state.totalSpent + plan.fuelCost + plan.tollCost,
    resources,
    locationInventories,
    ships,
    // Wave E5 (§2.8): every dispatch is one usage tick on its lane — recorded
    // here (outside the periodic tick loop) since dispatch is a one-shot
    // player action. Sent to the server as laneDispatchesThisTick and
    // drained via trade-lanes.ts's own hand-off queue after a successful sync.
    pendingLaneUsage: accumulateLaneUsage(state.pendingLaneUsage, plan.from, plan.to),
    // Wave M5 (O6): tolls debited above settle to the governor via sync
    // (`tollPaymentsThisTick` → server ledger credit, capped server-side).
    pendingTollPayments: plan.tollCost > 0
      ? accumulateTollPayments(state.pendingTollPayments, plan.tolls)
      : state.pendingTollPayments,
    eventLog: [{
      id: generateId(),
      date: state.gameDate,
      type: 'milestone' as const,
      title: `🚚 Freight dispatched → ${toName}`,
      description: `Carrying ${cargoSummary}. Fuel bill: $${(plan.fuelCost / 1_000_000).toFixed(2)}M (${plan.deltaV.toLocaleString()} m/s Δv).${plan.tollCost > 0 ? ` Zone freight toll: $${(plan.tollCost / 1_000_000).toFixed(2)}M (${plan.tolls.map(t => `${t.zoneSlug} ${(t.tollPct * 100).toFixed(1)}%`).join(', ')}).` : ''}`,
    }, ...state.eventLog].slice(0, MAX_EVENT_LOG),
  };

  return { ok: true, state: newState, plan };
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export const FREIGHT_PLAN_ERROR_TEXT: Record<FreightPlanError['reason'], string> = {
  ship_not_found: 'Ship not found.',
  ship_not_built: 'That ship is still under construction.',
  ship_busy: 'That ship is not idle.',
  already_there: 'The ship is already at that location.',
  invalid_cargo: 'Invalid cargo manifest.',
  cargo_exceeds_capacity: 'Cargo exceeds the ship’s capacity.',
  insufficient_origin_stock: 'Not enough stock at the origin location.',
  insufficient_funds: 'Not enough cash to cover the fuel bill.',
};

// ─── Location-aware spending (GAME_DESIGN_REVIEW_2026-09 §2 row 13) ──────────
// W14 shipped the inventory MODEL (per-location stockpiles + freight). It
// deliberately left every *consumer* of `state.resources` global: an
// Earth-built beam was usable on Ceres with no transport
// (docs/MANUFACTURING_2026-08.md "Deliberately not done"). This section
// closes that gap on the spend side — building materials, crafting inputs,
// and scrap recovery now resolve at the pool that physically holds the
// goods, which is what makes "logistics cost money" (CLAUDE.md) a decision
// instead of flavour.
//
// The ratchet is unchanged: while `state.logisticsUnlocked` is false (any
// save that has never owned a built transport/tanker hull), every helper
// here reads and writes the ONE global pool, so pre-row-13 behavior is
// preserved exactly. Home-cluster sites (earth_surface/leo/geo) always use
// the global pool — it *is* their local inventory.
//
// SERVER NOTE: the sync's `serverResources` stays a single global map. Server
// truth is location-agnostic; this is a client-economy slice. The material
// attestation/ledger paths (inventory-attestations.ts, /assets/* routes) are
// untouched — a spend still debits the same TOTAL units server-side, only
// the client decides which pool they physically leave from.

/** Is the per-location economy live for this save? */
export function isLocationEconomyActive(state: GameState): boolean {
  return state.logisticsUnlocked === true;
}

/** Debit a resource at a location. Mirror image of routeProductionCredit —
 *  same copy-on-write contract (the caller owns the outer copies). */
export function debitLocationInventory(
  resources: Record<string, number>,
  locationInventories: Record<string, Record<string, number>>,
  locationId: string,
  resourceId: string,
  amount: number,
  routeLocally: boolean,
): void {
  if (amount <= 0) return;
  if (!routeLocally || isHomeLocation(locationId)) {
    resources[resourceId] = Math.max(0, (resources[resourceId] || 0) - amount);
    return;
  }
  const loc = { ...(locationInventories[locationId] || {}) };
  loc[resourceId] = Math.max(0, (loc[resourceId] || 0) - amount);
  if (loc[resourceId] <= 0) delete loc[resourceId];
  locationInventories[locationId] = loc;
}

/** Debit a whole material bill at one location. Returns fresh top-level
 *  copies so callers can drop them straight into a state object. */
export function spendMaterialsAtLocation(
  state: GameState,
  locationId: string,
  cost: Record<string, number>,
): { resources: Record<string, number>; locationInventories: Record<string, Record<string, number>> } {
  const resources = { ...(state.resources || {}) };
  const locationInventories: Record<string, Record<string, number>> = { ...(state.locationInventories || {}) };
  const routeLocally = isLocationEconomyActive(state);
  for (const [resId, qty] of Object.entries(cost || {})) {
    debitLocationInventory(resources, locationInventories, locationId, resId, qty, routeLocally);
  }
  return { resources, locationInventories };
}

export interface MaterialShortfall {
  resourceId: string;
  /** Units the order needs. */
  need: number;
  /** Units physically present at the build/fab site. */
  atSite: number;
  /** Units that must be hauled in (need − atSite). */
  short: number;
  /** Pools holding the missing units, largest first. */
  sources: { locationId: string; quantity: number }[];
}

export interface LocalMaterialsCheck {
  ok: boolean;
  locationId: string;
  /** True when this site draws the global pool (ratchet off, or home cluster). */
  usesHomePool: boolean;
  shortfalls: MaterialShortfall[];
}

/** Pools OTHER than this site holding a resource, largest first. */
function otherPoolsHolding(state: GameState, siteId: string, resourceId: string): { locationId: string; quantity: number }[] {
  const out: { locationId: string; quantity: number }[] = [];
  const home = (state.resources || {})[resourceId] || 0;
  if (!isHomeLocation(siteId) && home > 0) out.push({ locationId: 'earth_surface', quantity: home });
  for (const [locId, inv] of Object.entries(state.locationInventories || {})) {
    if (locId === siteId) continue;
    const qty = inv?.[resourceId] || 0;
    if (qty > 0) out.push({ locationId: locId, quantity: qty });
  }
  out.sort((a, b) => b.quantity - a.quantity);
  return out;
}

/**
 * Can this location pay a material bill out of its OWN stock? The honest
 * "N units must be hauled from X" readout behind BuildPanel's cards.
 */
export function checkLocalMaterials(
  state: GameState,
  locationId: string,
  cost: Record<string, number> | undefined,
): LocalMaterialsCheck {
  const routeLocally = isLocationEconomyActive(state);
  const usesHomePool = !routeLocally || isHomeLocation(locationId);
  const shortfalls: MaterialShortfall[] = [];
  for (const [resId, qty] of Object.entries(cost || {})) {
    if (!qty || qty <= 0) continue;
    const atSite = usesHomePool
      ? (state.resources || {})[resId] || 0
      : getLocationStock(state, locationId, resId);
    if (atSite >= qty) continue;
    shortfalls.push({
      resourceId: resId,
      need: qty,
      atSite,
      short: qty - atSite,
      sources: usesHomePool ? [] : otherPoolsHolding(state, locationId, resId),
    });
  }
  return { ok: shortfalls.length === 0, locationId, usesHomePool, shortfalls };
}

// ─── One-click hauling (BuildPanel's "Dispatch hauler") ──────────────────────

export interface HaulSuggestion {
  ok: true;
  shipInstanceId: string;
  shipName: string;
  from: string;
  to: string;
  cargo: Record<string, number>;
  fuelCost: number;
  tollCost: number;
  travelSeconds: number;
  capacity: number;
  loadUnits: number;
  /** True when hull capacity could not take the whole shortfall in one run. */
  partial: boolean;
}

export type HaulSuggestionError = {
  ok: false;
  reason: 'no_shortfall' | 'no_source' | 'no_freighter' | 'plan_failed';
  /** Player-facing explanation — always says what to do next. */
  detail: string;
};

/**
 * Idle, built transport/tanker hulls able to lift out of a given pool. The
 * home cluster is ONE pool with three docks (earth_surface / leo / geo), so a
 * shuttle parked in LEO can lift Earth stock — anywhere else, the hull has to
 * be at that exact location.
 */
export function getIdleFreightersAt(state: GameState, locationId: string): NonNullable<GameState['ships']> {
  const homePool = isHomeLocation(locationId);
  return (state.ships || []).filter(s => {
    if (!s.isBuilt || s.status !== 'idle') return false;
    if (homePool ? !isHomeLocation(s.currentLocation) : s.currentLocation !== locationId) return false;
    const def = SHIP_MAP.get(s.definitionId);
    return def?.role === 'transport' || def?.role === 'tanker';
  });
}

/**
 * Plan the single freight run that best closes a material shortfall at
 * `toLocationId`: pick the pool holding the most missing units, pick the
 * biggest idle freighter parked there, and fill its hold with the shortfall
 * (largest lines first). Pure — priced through planFreight, so the quote the
 * button shows is the quote dispatch charges.
 */
export function planShortfallHaul(
  state: GameState,
  toLocationId: string,
  cost: Record<string, number> | undefined,
  nowMs: number = Date.now(),
): HaulSuggestion | HaulSuggestionError {
  const check = checkLocalMaterials(state, toLocationId, cost);
  if (check.ok) return { ok: false, reason: 'no_shortfall', detail: 'Everything this order needs is already on site.' };

  // Score candidate source pools by how much of the shortfall each covers.
  const coverage = new Map<string, number>();
  for (const sf of check.shortfalls) {
    for (const src of sf.sources) {
      coverage.set(src.locationId, (coverage.get(src.locationId) || 0) + Math.min(sf.short, src.quantity));
    }
  }
  if (coverage.size === 0) {
    const names = check.shortfalls.map(s => `${Math.ceil(s.short)} ${s.resourceId.replace(/_/g, ' ')}`).join(', ');
    return { ok: false, reason: 'no_source', detail: `Nowhere in the corporation holds the missing ${names} — mine, craft or buy them first.` };
  }
  const [bestSource] = [...coverage.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const from = bestSource[0];

  const freighters = getIdleFreightersAt(state, from);
  const fromName = LOCATION_MAP.get(from)?.name || from;
  if (freighters.length === 0) {
    return {
      ok: false,
      reason: 'no_freighter',
      detail: `The missing materials are at ${fromName}, but no idle transport or tanker is parked there. Send one to ${fromName} first (Fleet → Dispatch).`,
    };
  }
  const ship = freighters
    .slice()
    .sort((a, b) => getShipCargoCapacity(state, b.instanceId) - getShipCargoCapacity(state, a.instanceId))[0];
  // The hull's own dock is the origin of record (inside the home cluster the
  // pool and the dock can differ — LEO lifting Earth stock).
  const origin = ship.currentLocation;
  const capacity = getShipCargoCapacity(state, ship.instanceId);
  const role = SHIP_MAP.get(ship.definitionId)?.role;

  // Fill the hold: biggest shortfall lines first, never more than the source
  // actually holds, never past capacity (load-units respect tanker liquids).
  const cargo: Record<string, number> = {};
  let partial = false;
  const lines = check.shortfalls
    .map(sf => ({ resourceId: sf.resourceId, want: Math.ceil(sf.short), have: getLocationStock(state, origin, sf.resourceId) }))
    .sort((a, b) => b.want - a.want);
  for (const line of lines) {
    const wanted = Math.min(line.want, Math.floor(line.have));
    if (wanted <= 0) { partial = true; continue; }
    if (wanted < line.want) partial = true;
    let take = wanted;
    while (take > 0 && getCargoLoadUnits(role, { ...cargo, [line.resourceId]: take }) > capacity) take--;
    if (take <= 0) { partial = true; continue; }
    if (take < wanted) partial = true;
    cargo[line.resourceId] = take;
  }
  if (Object.keys(cargo).length === 0) {
    return { ok: false, reason: 'plan_failed', detail: `${ship.name} has no spare capacity for this manifest.` };
  }

  const plan = planFreight(state, ship.instanceId, toLocationId, cargo, nowMs);
  if (!plan.ok) {
    return { ok: false, reason: 'plan_failed', detail: FREIGHT_PLAN_ERROR_TEXT[plan.reason] + (plan.detail ? ` (${plan.detail})` : '') };
  }
  return {
    ok: true,
    shipInstanceId: ship.instanceId,
    shipName: ship.name,
    from: origin,
    to: toLocationId,
    cargo: plan.cargo,
    fuelCost: plan.fuelCost,
    tollCost: plan.tollCost,
    travelSeconds: plan.travelSeconds,
    capacity,
    loadUnits: plan.loadUnits,
    partial,
  };
}

// ─── Fabrication siting (crafting draws + credits at the plant) ──────────────

/** Locations with a completed fabrication facility able to run a recipe. */
export function getFabricationSites(
  state: GameState,
  recipe: Pick<ProductDefinition, 'tier'>,
): string[] {
  const need = facilityTierFor(recipe);
  const sites = new Set<string>();
  for (const b of state.buildings || []) {
    if (!b.isComplete) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    if (!def || def.category !== 'fabrication_facility' || def.tier < need) continue;
    sites.add(b.locationId);
  }
  return [...sites].sort();
}

export interface FabricationSiting {
  /** Chosen plant location, or null when the corporation has no capable facility. */
  locationId: string | null;
  /** Every capable site, sorted. */
  candidates: string[];
  /** True when the chosen site holds every input locally. */
  inputsOnSite: boolean;
}

/**
 * Which plant runs this recipe. Deterministic: the first capable site (home
 * cluster first, then alphabetical) that holds ALL inputs locally; if none
 * does, the first capable site — so the panel can explain the shortfall
 * against a concrete plant instead of silently failing.
 */
export function chooseFabricationSite(
  state: GameState,
  recipe: Pick<ProductDefinition, 'tier' | 'inputs'>,
): FabricationSiting {
  const candidates = getFabricationSites(state, recipe);
  if (candidates.length === 0) return { locationId: null, candidates, inputsOnSite: false };
  const ordered = candidates
    .slice()
    .sort((a, b) => (isHomeLocation(b) ? 1 : 0) - (isHomeLocation(a) ? 1 : 0) || a.localeCompare(b));
  for (const site of ordered) {
    if (checkLocalMaterials(state, site, recipe.inputs as Record<string, number>).ok) {
      return { locationId: site, candidates, inputsOnSite: true };
    }
  }
  return { locationId: ordered[0], candidates, inputsOnSite: false };
}

// ─── "Stock by location" readout (BuildPanel header / Dashboard) ─────────────

export interface LocationStockRow {
  /** 'home' for the shared Earth/LEO/GEO pool, otherwise the location id. */
  id: string;
  name: string;
  isHome: boolean;
  /** Total units held in this pool. */
  units: number;
  /** Distinct resources held. */
  lines: number;
  /** Largest holdings first (the caller caps for display). */
  top: { resourceId: string; quantity: number }[];
}

export function getStockByLocation(state: GameState): LocationStockRow[] {
  const rows: LocationStockRow[] = [];
  const build = (id: string, name: string, isHome: boolean, inv: Record<string, number>): LocationStockRow => {
    const held = Object.entries(inv || {}).filter(([, q]) => (q || 0) > 0);
    return {
      id,
      name,
      isHome,
      units: held.reduce((a, [, q]) => a + q, 0),
      lines: held.length,
      top: held.map(([resourceId, quantity]) => ({ resourceId, quantity })).sort((a, b) => b.quantity - a.quantity),
    };
  };
  rows.push(build('home', 'Home cluster (Earth · LEO · GEO)', true, state.resources || {}));
  for (const [locId, inv] of Object.entries(state.locationInventories || {})) {
    const row = build(locId, LOCATION_MAP.get(locId)?.name || locId, false, inv || {});
    if (row.units > 0) rows.push(row);
  }
  return rows.sort((a, b) => (b.isHome ? 1 : 0) - (a.isHome ? 1 : 0) || b.units - a.units);
}
