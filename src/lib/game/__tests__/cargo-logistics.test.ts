/**
 * 4X Wave W14 — Cargo Logistics + Per-Location Inventory (audit C1).
 *
 * Proofs, per the wave spec:
 *  - local accrual: production routes to the producing location's stockpile
 *    once logistics is unlocked; grace default preserves pre-W14 behavior
 *  - freight lifecycle is a dup-proof ledger pair: debit-at-departure
 *    (origin stock + Δv-priced fuel), credit-at-arrival exactly once
 *  - Δv pricing consumes the spatial-strategy lane graph and the W1
 *    fuelEfficiency research bucket (capped 50%)
 *  - capacity honors hull + Extended Cargo Bay modules + tanker liquid rules
 *  - the market can only clear goods physically at Earth/home
 *  - V23 additive save migration: global pool seeds the Earth inventory,
 *    nothing moves, old saves keep working
 *
 * Runs in the default jsdom environment (NOT node) so the loadGame
 * migration tests have a real localStorage.
 */
import {
  HOME_LOCATION_IDS,
  isHomeLocation,
  getLocationInventory,
  getLocationStock,
  getSellableQuantity,
  getResourceTotals,
  hasFreightCapability,
  routeProductionCredit,
  creditArrivalCargo,
  getShipCargoCapacity,
  getCargoLoadUnits,
  getRouteDeltaV,
  getFuelEfficiencyMultiplier,
  getFreightFuelCost,
  planFreight,
  dispatchShipWithCargo,
  EXT_CARGO_BAY_MODULE_ID,
  FREIGHT_HULL_FUEL_RATE,
  FREIGHT_CARGO_FUEL_RATE,
  FREIGHT_MIN_FUEL_COST,
} from '../cargo-logistics';
import { processTick, processFullTick } from '../game-engine';
import { getNewGameState, loadGame } from '../save-load';
import { SAVE_KEY } from '../constants';
import { getGlobalGameDate } from '../server-time';
import type { GameState } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Deterministic baseline: current global calendar date (so isMonthEnd is
 *  false and no random-event / hazard / narrative month-end rolls fire),
 *  no NPCs (no NPC-tick noise), ample cash. */
function baseState(overrides: Partial<GameState> = {}): GameState {
  const s = getNewGameState();
  const g = getGlobalGameDate();
  return {
    ...s,
    gameDate: { year: g.year, month: g.month },
    tickCount: 5,
    npcCompanies: [],
    money: 10_000_000_000,
    ...overrides,
  };
}

type ShipRow = NonNullable<GameState['ships']>[number];

function makeShip(partial: Partial<ShipRow> & { instanceId: string; definitionId: string }): ShipRow {
  return {
    name: `Test-${partial.instanceId}`,
    status: 'idle',
    currentLocation: 'leo',
    isBuilt: true,
    ...partial,
  };
}

/** Sum of one resource across the global pool + every local stockpile +
 *  every in-transit manifest — the conservation invariant. */
function totalEverywhere(state: GameState, resourceId: string): number {
  let total = (state.resources || {})[resourceId] || 0;
  for (const inv of Object.values(state.locationInventories || {})) {
    total += inv?.[resourceId] || 0;
  }
  for (const ship of state.ships || []) {
    total += ship.route?.cargo?.[resourceId] || 0;
  }
  return total;
}

// ─── inventory model ─────────────────────────────────────────────────────────

describe('per-location inventory model', () => {
  it('home cluster (earth/leo/geo) shares the global pool as its inventory', () => {
    const s = baseState({ resources: { iron: 120 } });
    for (const home of HOME_LOCATION_IDS) {
      expect(isHomeLocation(home)).toBe(true);
      expect(getLocationStock(s, home, 'iron')).toBe(120);
    }
  });

  it('remote locations read their own stockpile, not the global pool', () => {
    const s = baseState({
      resources: { iron: 120 },
      locationInventories: { asteroid_belt: { iron: 30, gold: 5 } },
    });
    expect(isHomeLocation('asteroid_belt')).toBe(false);
    expect(getLocationStock(s, 'asteroid_belt', 'iron')).toBe(30);
    expect(getLocationStock(s, 'asteroid_belt', 'gold')).toBe(5);
    expect(getLocationInventory(s, 'ceres_surface')).toEqual({});
  });

  it('getResourceTotals splits at-home vs remote with a breakdown', () => {
    const s = baseState({
      resources: { iron: 100 },
      locationInventories: { asteroid_belt: { iron: 40 }, mars_surface: { iron: 10 } },
    });
    const t = getResourceTotals(s, 'iron');
    expect(t.atHome).toBe(100);
    expect(t.remote).toBe(50);
    expect(t.total).toBe(150);
    expect(t.remoteBreakdown[0]).toEqual({ locationId: 'asteroid_belt', quantity: 40 });
  });

  it('market sellable quantity is the home pool ONLY (audit C1 market interface)', () => {
    const s = baseState({
      resources: { platinum_group: 8 },
      locationInventories: { asteroid_belt: { platinum_group: 500 } },
    });
    expect(getSellableQuantity(s, 'platinum_group')).toBe(8);
  });
});

// ─── production routing + grace ratchet ──────────────────────────────────────

describe('production credit routing (grace ratchet)', () => {
  it('routes remote production locally when the ratchet is on', () => {
    const resources: Record<string, number> = {};
    const inv: Record<string, Record<string, number>> = {};
    routeProductionCredit(resources, inv, 'ceres_surface', 'iron', 10, true);
    expect(resources.iron).toBeUndefined();
    expect(inv.ceres_surface.iron).toBe(10);
  });

  it('grace default (ratchet off) keeps pre-W14 behavior: global credit', () => {
    const resources: Record<string, number> = {};
    const inv: Record<string, Record<string, number>> = {};
    routeProductionCredit(resources, inv, 'ceres_surface', 'iron', 10, false);
    expect(resources.iron).toBe(10);
    expect(inv.ceres_surface).toBeUndefined();
  });

  it('home-cluster production always credits the global pool', () => {
    const resources: Record<string, number> = {};
    const inv: Record<string, Record<string, number>> = {};
    routeProductionCredit(resources, inv, 'leo', 'iron', 10, true);
    expect(resources.iron).toBe(10);
    expect(Object.keys(inv)).toHaveLength(0);
  });

  it('hasFreightCapability requires a BUILT transport/tanker hull', () => {
    const none = baseState({ ships: [makeShip({ instanceId: 'a', definitionId: 'mining_drone' })] });
    expect(hasFreightCapability(none)).toBe(false);
    const unbuilt = baseState({ ships: [makeShip({ instanceId: 'a', definitionId: 'cargo_shuttle', isBuilt: false })] });
    expect(hasFreightCapability(unbuilt)).toBe(false);
    const tanker = baseState({ ships: [makeShip({ instanceId: 'a', definitionId: 'fuel_tanker' })] });
    expect(hasFreightCapability(tanker)).toBe(true);
  });

  it('engine: remote mining service fills the LOCAL stockpile once unlocked (Ceres ore fills Ceres storage)', () => {
    const s = baseState({
      logisticsUnlocked: true,
      activeServices: [{
        definitionId: 'svc_mining_asteroid', locationId: 'asteroid_belt',
        linkedBuildingIds: [], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1,
      }],
    });
    const out = processTick(s);
    expect((out.locationInventories?.asteroid_belt?.iron || 0)).toBeGreaterThan(0);
    expect(out.resources.iron || 0).toBe(0);
  });

  it('engine: same service credits the GLOBAL pool while the grace ratchet is off', () => {
    const s = baseState({
      logisticsUnlocked: false,
      activeServices: [{
        definitionId: 'svc_mining_asteroid', locationId: 'asteroid_belt',
        linkedBuildingIds: [], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1,
      }],
    });
    const out = processTick(s);
    expect(out.resources.iron || 0).toBeGreaterThan(0);
    expect(out.locationInventories?.asteroid_belt).toBeUndefined();
  });

  it('engine: home-located production stays global even with the ratchet on', () => {
    const s = baseState({
      logisticsUnlocked: true,
      activeServices: [{
        definitionId: 'svc_mining_asteroid', locationId: 'leo',
        linkedBuildingIds: [], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1,
      }],
    });
    const out = processTick(s);
    expect(out.resources.iron || 0).toBeGreaterThan(0);
    expect(out.locationInventories?.leo).toBeUndefined();
  });

  it('engine ratchet: flips on (once, one-way) when a built freight hull exists', () => {
    const s = baseState({
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'cargo_shuttle' })],
      logisticsUnlocked: false,
    });
    const out = processFullTick(s);
    expect(out.logisticsUnlocked).toBe(true);
    expect(out.eventLog.some(e => e.title.includes('Logistics network online'))).toBe(true);
    // No freight hull → stays off.
    const bare = processFullTick(baseState({ ships: [], logisticsUnlocked: false }));
    expect(bare.logisticsUnlocked).toBe(false);
  });
});

// ─── Δv pricing + fuel efficiency ────────────────────────────────────────────

describe('Δv-priced freight fuel (consumes the W1 fuelEfficiency bucket)', () => {
  it('routes over the spatial-strategy lane graph (leo→lunar_surface = 4,000 + 1,870 m/s)', () => {
    expect(getRouteDeltaV('leo', 'lunar_orbit')).toBe(4000);
    expect(getRouteDeltaV('leo', 'lunar_surface')).toBe(5870);
    expect(getRouteDeltaV('earth_surface', 'leo')).toBe(9400);
  });

  it('is symmetric and zero for a null trip', () => {
    expect(getRouteDeltaV('leo', 'asteroid_belt')).toBe(getRouteDeltaV('asteroid_belt', 'leo'));
    expect(getRouteDeltaV('leo', 'leo')).toBe(0);
  });

  it('falls back to deltaVFromLEO physics off the lane graph', () => {
    // unknown ids: |0−0| + 2,000 maneuvering margin
    expect(getRouteDeltaV('nowhere_a', 'nowhere_b')).toBe(2000);
  });

  it('prices fuel = Δv × (hull rate × tier + cargo rate × load), floor applied', () => {
    const s = baseState({
      resources: { iron: 1000 },
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'cargo_shuttle', currentLocation: 'leo' })],
    });
    const empty = getFreightFuelCost(s, 'sh1', 'leo', 'lunar_orbit', {});
    expect(empty).toBe(Math.max(FREIGHT_MIN_FUEL_COST, 4000 * FREIGHT_HULL_FUEL_RATE * 1));
    const loaded = getFreightFuelCost(s, 'sh1', 'leo', 'lunar_orbit', { iron: 40 });
    expect(loaded).toBe(4000 * (FREIGHT_HULL_FUEL_RATE * 1 + FREIGHT_CARGO_FUEL_RATE * 40));
    expect(loaded).toBeGreaterThan(empty);
  });

  it('a longer (higher-Δv) route costs more for the same load', () => {
    const s = baseState({
      resources: { iron: 1000 },
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'heavy_transport', currentLocation: 'leo' })],
    });
    const near = getFreightFuelCost(s, 'sh1', 'leo', 'lunar_orbit', { iron: 100 });
    const far = getFreightFuelCost(s, 'sh1', 'leo', 'asteroid_belt', { iron: 100 });
    expect(far).toBeGreaterThan(near);
  });

  it('fuelEfficiency research reduces the bill (propellant_depots −30%)', () => {
    const plain = baseState({
      resources: { iron: 1000 },
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'cargo_shuttle', currentLocation: 'leo' })],
    });
    const skilled = { ...plain, completedResearch: ['propellant_depots'] };
    expect(getFuelEfficiencyMultiplier(plain)).toBe(1);
    expect(getFuelEfficiencyMultiplier(skilled)).toBeCloseTo(0.7, 5);
    const base = getFreightFuelCost(plain, 'sh1', 'leo', 'lunar_orbit', { iron: 40 });
    const cheap = getFreightFuelCost(skilled, 'sh1', 'leo', 'lunar_orbit', { iron: 40 });
    expect(cheap).toBe(Math.round(base * 0.7));
  });

  it('fuelEfficiency stacking is capped at 50% (never free logistics)', () => {
    const stacked = baseState({
      completedResearch: ['propellant_depots', 'metallic_hydrogen', 'rotating_detonation'],
    });
    expect(getFuelEfficiencyMultiplier(stacked)).toBe(0.5);
  });
});

// ─── capacity: hull + modules + tanker rules ─────────────────────────────────

describe('cargo capacity (modules become real)', () => {
  it('hull capacity comes from the definition', () => {
    const s = baseState({ ships: [makeShip({ instanceId: 'sh1', definitionId: 'cargo_shuttle' })] });
    expect(getShipCargoCapacity(s, 'sh1')).toBe(50);
  });

  it('Extended Cargo Bay grants +30% each, stacking (previously inert per wave B)', () => {
    const s = baseState({
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'cargo_shuttle' })],
      moduleInventory: [
        { instanceId: 'm1', definitionId: EXT_CARGO_BAY_MODULE_ID, acquiredAtMs: 0 },
        { instanceId: 'm2', definitionId: EXT_CARGO_BAY_MODULE_ID, acquiredAtMs: 0 },
      ],
      fittedModules: { sh1: ['m1'] },
    });
    expect(getShipCargoCapacity(s, 'sh1')).toBe(65); // 50 × 1.3
    const two = { ...s, fittedModules: { sh1: ['m1', 'm2'] } };
    expect(getShipCargoCapacity(two, 'sh1')).toBe(80); // 50 × 1.6
  });

  it('tankers carry liquids at half weight (2x liquid capacity, per the def text)', () => {
    expect(getCargoLoadUnits('tanker', { lunar_water: 600 })).toBe(300);
    expect(getCargoLoadUnits('tanker', { methane: 100, iron: 100 })).toBe(150);
    expect(getCargoLoadUnits('transport', { lunar_water: 600 })).toBe(600);
  });

  it('planFreight rejects manifests over effective capacity', () => {
    const s = baseState({
      resources: { lunar_water: 1000 },
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'fuel_tanker', currentLocation: 'leo' })],
    });
    const fits = planFreight(s, 'sh1', 'lunar_orbit', { lunar_water: 600 }); // 300 load-units = capacity
    expect(fits.ok).toBe(true);
    const over = planFreight(s, 'sh1', 'lunar_orbit', { lunar_water: 602 });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toBe('cargo_exceeds_capacity');
  });
});

// ─── freight lifecycle: atomic, dup-proof ────────────────────────────────────

describe('freight lifecycle (ledger-style debit/credit, no duplication)', () => {
  const NOW = 1_800_000_000_000;

  function shuttleState(extra: Partial<GameState> = {}): GameState {
    return baseState({
      resources: { iron: 100 },
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'cargo_shuttle', currentLocation: 'leo' })],
      logisticsUnlocked: true,
      ...extra,
    });
  }

  it('dispatch atomically debits origin stock + fuel and sets the route manifest', () => {
    const s = shuttleState();
    const r = dispatchShipWithCargo(s, 'sh1', 'lunar_surface', { iron: 40 }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.resources.iron).toBe(60);
    expect(r.state.money).toBe(s.money - r.plan.fuelCost);
    expect(r.state.totalSpent).toBe(s.totalSpent + r.plan.fuelCost);
    const ship = r.state.ships![0];
    expect(ship.status).toBe('in_transit');
    expect(ship.route?.cargo).toEqual({ iron: 40 });
    expect(ship.route?.from).toBe('leo');
    expect(ship.route?.to).toBe('lunar_surface');
  });

  it('dispatch from a REMOTE origin debits that local stockpile', () => {
    const s = baseState({
      resources: {},
      locationInventories: { asteroid_belt: { platinum_group: 30 } },
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'heavy_transport', currentLocation: 'asteroid_belt' })],
    });
    const r = dispatchShipWithCargo(s, 'sh1', 'leo', { platinum_group: 25 }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.locationInventories?.asteroid_belt?.platinum_group).toBe(5);
  });

  it('rejects insufficient origin stock / funds / busy ship / same destination / bad manifest', () => {
    const s = shuttleState();
    const lowStock = { ...s, resources: { iron: 30 } };
    expect((planFreight(lowStock, 'sh1', 'lunar_surface', { iron: 40 }) as { reason: string }).reason).toBe('insufficient_origin_stock');
    const broke = { ...s, money: 0 };
    expect((planFreight(broke, 'sh1', 'lunar_surface', { iron: 10 }) as { reason: string }).reason).toBe('insufficient_funds');
    const busy = { ...s, ships: [{ ...s.ships![0], status: 'mining' as const }] };
    expect((planFreight(busy, 'sh1', 'lunar_surface', {}) as { reason: string }).reason).toBe('ship_busy');
    expect((planFreight(s, 'sh1', 'leo', {}) as { reason: string }).reason).toBe('already_there');
    expect((planFreight(s, 'sh1', 'lunar_surface', { iron: 1.5 }) as { reason: string }).reason).toBe('invalid_cargo');
    expect((planFreight(s, 'sh1', 'lunar_surface', { iron: -3 }) as { reason: string }).reason).toBe('invalid_cargo');
    // failed plans never mutate: dispatch returns the error, not a state
    const rr = dispatchShipWithCargo(lowStock, 'sh1', 'lunar_surface', { iron: 40 }, NOW);
    expect(rr.ok).toBe(false);
  });

  it('arrival credits the destination stockpile EXACTLY once (dup-proof)', () => {
    const s = shuttleState();
    // Depart far enough in the past that the ship has already arrived.
    const past = Date.now() - 10_000_000;
    const r = dispatchShipWithCargo(s, 'sh1', 'lunar_surface', { iron: 40 }, past);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const arrived = processFullTick(r.state);
    const ship = arrived.ships!.find(x => x.instanceId === 'sh1')!;
    expect(ship.status).toBe('idle');
    expect(ship.currentLocation).toBe('lunar_surface');
    expect(ship.route).toBeUndefined();
    expect(arrived.locationInventories?.lunar_surface?.iron).toBe(40);
    expect(arrived.eventLog.some(e => e.title.includes('Cargo delivered'))).toBe(true);

    // Second tick: the route is gone — no re-credit possible.
    const again = processFullTick(arrived);
    expect(again.locationInventories?.lunar_surface?.iron).toBe(40);
  });

  it('arrival at a HOME location credits the global (market) pool', () => {
    const s = baseState({
      resources: {},
      locationInventories: { asteroid_belt: { gold: 20 } },
      ships: [makeShip({ instanceId: 'sh1', definitionId: 'heavy_transport', currentLocation: 'asteroid_belt' })],
    });
    const past = Date.now() - 100_000_000;
    const r = dispatchShipWithCargo(s, 'sh1', 'leo', { gold: 20 }, past);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const arrived = processFullTick(r.state);
    expect(arrived.resources.gold).toBe(20);
    expect(arrived.locationInventories?.leo).toBeUndefined();
    // Sellable only now that it is physically home.
    expect(getSellableQuantity(arrived, 'gold')).toBe(20);
  });

  it('conservation: total units across pools + manifests is invariant through the lifecycle', () => {
    const s = shuttleState();
    const before = totalEverywhere(s, 'iron');
    const past = Date.now() - 10_000_000;
    const r = dispatchShipWithCargo(s, 'sh1', 'lunar_surface', { iron: 40 }, past);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(totalEverywhere(r.state, 'iron')).toBe(before);   // in transit
    const arrived = processFullTick(r.state);
    expect(totalEverywhere(arrived, 'iron')).toBe(before);   // delivered
  });

  it('empty reposition still pays the hull fuel bill (no free hops)', () => {
    const s = shuttleState();
    const r = dispatchShipWithCargo(s, 'sh1', 'lunar_orbit', {}, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.money).toBeLessThan(s.money);
    expect(r.state.resources.iron).toBe(100); // nothing debited
  });
});

// ─── V23 migration ───────────────────────────────────────────────────────────

describe('V23 additive save migration (pre-W14 saves keep working)', () => {
  afterEach(() => localStorage.removeItem(SAVE_KEY));

  it('old saves gain empty locationInventories + ratchet off; the global pool seeds the Earth inventory untouched', () => {
    const old = getNewGameState();
    old.resources = { iron: 777, platinum_group: 12 };
    delete (old as Partial<GameState>).locationInventories;
    delete (old as Partial<GameState>).logisticsUnlocked;
    localStorage.setItem(SAVE_KEY, JSON.stringify(old));

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.locationInventories).toEqual({});
    expect(loaded!.logisticsUnlocked).toBe(false);
    // Nothing moved or stranded: Earth pool exactly as saved.
    expect(loaded!.resources).toEqual({ iron: 777, platinum_group: 12 });
    expect(getLocationStock(loaded!, 'earth_surface', 'iron')).toBe(777);
  });

  it('saves that already have W14 state round-trip it unchanged', () => {
    const cur = getNewGameState();
    cur.locationInventories = { ceres_surface: { iron: 9 } };
    cur.logisticsUnlocked = true;
    localStorage.setItem(SAVE_KEY, JSON.stringify(cur));
    const loaded = loadGame();
    expect(loaded!.locationInventories).toEqual({ ceres_surface: { iron: 9 } });
    expect(loaded!.logisticsUnlocked).toBe(true);
  });

  it('fresh games initialize the V23 fields', () => {
    const s = getNewGameState();
    expect(s.locationInventories).toEqual({});
    expect(s.logisticsUnlocked).toBe(false);
  });
});

// ─── arrival-credit helper semantics ────────────────────────────────────────

describe('creditArrivalCargo routing', () => {
  it('credits remote destinations locally and home destinations globally, returning delivered units', () => {
    const resources: Record<string, number> = { iron: 1 };
    const inv: Record<string, Record<string, number>> = {};
    expect(creditArrivalCargo(resources, inv, 'mars_surface', { iron: 5, gold: 2 })).toBe(7);
    expect(inv.mars_surface).toEqual({ iron: 5, gold: 2 });
    expect(resources.iron).toBe(1);
    expect(creditArrivalCargo(resources, inv, 'earth_surface', { iron: 4 })).toBe(4);
    expect(resources.iron).toBe(5);
  });

  it('ignores empty/zero manifests', () => {
    const resources: Record<string, number> = {};
    const inv: Record<string, Record<string, number>> = {};
    expect(creditArrivalCargo(resources, inv, 'mars_surface', {})).toBe(0);
    expect(creditArrivalCargo(resources, inv, 'mars_surface', { iron: 0 })).toBe(0);
    expect(Object.keys(inv)).toHaveLength(0);
  });
});
