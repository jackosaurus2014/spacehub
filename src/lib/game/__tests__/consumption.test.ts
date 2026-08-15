/**
 * Economic PvP Wave E3 — The Consumption Engine
 * (docs/ECONOMY_PVP_2026-08.md §2.2 + §E3)
 *
 * Proofs, per the wave spec:
 *  - recipe consumption math: inputs drawn from the building's location pool,
 *    producer outputs credited, proportional draw under partial supply
 *  - soft-floor efficiency: linear down to 0.5, never a hard stop
 *  - phase-in ramp: 25% → 100% over 3 game-months from the migration anchor;
 *    fresh games (null anchor) run at full rate
 *  - grandfather grace: 6-month input stockpile credited per affected
 *    completed building (save-load V32)
 *  - away-catch-up parity: N months processed one-by-one ≡ one catch-up call
 *    (the shared advanceConsumptionToMonth cursor)
 *  - sourcing order: local stock first → market policy queues procurement →
 *    local policy runs degraded with nothing queued
 *  - determinism: same input state ⇒ byte-identical output
 *  - frontier exemption + first-run anchoring (no retro-billing)
 */
import {
  processConsumptionForMonth,
  advanceConsumptionToMonth,
  applyGrandfatherGrace,
  getConsumptionPhaseInFraction,
  getBuildingConsumptionEfficiency,
  deriveSupplySummary,
  setBuildingSupplyPolicy,
  applyConsumptionFlush,
  queueConsumptionFlush,
  consumeConsumptionFlush,
  __clearConsumptionFlushQueue,
  CONSUMPTION_EFFICIENCY_FLOOR,
  PHASE_IN_MONTHS,
  PHASE_IN_START_FRACTION,
  GRACE_STOCKPILE_MONTHS,
  DEFAULT_CONSUMPTION_STATE,
} from '../consumption';
import { BUILDING_MAP } from '../buildings';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import type { GameState, BuildingInstance } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTH = 5000; // arbitrary world-month index for deterministic tests

function makeBuilding(partial: Partial<BuildingInstance> & { instanceId: string; definitionId: string; locationId: string }): BuildingInstance {
  return {
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 6 },
    isComplete: true,
    startedAtMs: 0,
    realDurationSeconds: 0,
    ...partial,
  };
}

/** Graduated (non-frontier), no phase-in, cursor anchored just before MONTH —
 *  a state whose next consumption pass is exactly MONTH. */
function baseState(overrides: Partial<GameState> = {}): GameState {
  const s = getNewGameState();
  return {
    ...s,
    frontierStatus: 'graduated',
    npcCompanies: [],
    money: 10_000_000_000,
    consumptionState: {
      ...DEFAULT_CONSUMPTION_STATE,
      lastProcessedMonth: MONTH - 1,
    },
    ...overrides,
  };
}

// Sanity: the recipes this suite leans on exist as authored.
describe('recipe authoring', () => {
  it('the five §4.4 buildings exist with their recipes', () => {
    const plant = BUILDING_MAP.get('propellant_plant_lunar');
    expect(plant?.consumesPerMonth).toEqual({ lunar_water: 30 });
    expect(plant?.producesPerMonth).toEqual({ rocket_fuel: 20 });
    expect(BUILDING_MAP.get('propellant_plant_mars')?.producesPerMonth).toEqual({ rocket_fuel: 20 });
    expect(BUILDING_MAP.get('agri_dome')?.producesPerMonth).toHaveProperty('organic_compounds');
    expect(BUILDING_MAP.get('life_support_works')?.producesPerMonth).toHaveProperty('life_support_pack');
    expect(BUILDING_MAP.get('orbital_refinery')?.producesPerMonth).toHaveProperty('steel_ingots');
  });

  it('launch pads consume propellant; stations consume life support; T4 reactors consume fusion fuel', () => {
    expect(BUILDING_MAP.get('launch_pad_small')?.consumesPerMonth).toEqual({ rocket_fuel: 10 });
    expect(BUILDING_MAP.get('launch_pad_heavy')?.consumesPerMonth).toEqual({ rocket_fuel: 120 });
    expect(BUILDING_MAP.get('space_station_small')?.consumesPerMonth).toEqual({ life_support_pack: 3 });
    expect(BUILDING_MAP.get('nuclear_reactor_jupiter')?.consumesPerMonth).toEqual({ helium3: 0.2, deuterium: 0.5 });
    // Bootstrap T1 extractor stays recipe-free (on-ramp protection)
    expect(BUILDING_MAP.get('mining_lunar_basic')?.consumesPerMonth).toBeUndefined();
  });

  it('running a producer at the 0.5 floor is maintenance-negative (no something-from-nothing printer)', () => {
    for (const id of ['propellant_plant_lunar', 'propellant_plant_mars', 'life_support_works', 'orbital_refinery', 'agri_dome']) {
      const def = BUILDING_MAP.get(id)!;
      let floorOutputValue = 0;
      for (const [res, qty] of Object.entries(def.producesPerMonth || {})) {
        const { RESOURCE_MAP } = require('../resources');
        floorOutputValue += qty * CONSUMPTION_EFFICIENCY_FLOOR * RESOURCE_MAP.get(res)!.baseMarketPrice;
      }
      expect(floorOutputValue).toBeLessThan(def.maintenanceCostPerMonth * 1.1 + 1);
    }
  });
});

describe('consumption math', () => {
  it('fully supplied: draws inputs, credits outputs, efficiency 1.0', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' })],
      resources: { rocket_fuel: 100 },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.resources.rocket_fuel).toBe(90);
    expect(out.consumptionState!.efficiency.b1).toBe(1);
    expect(out.consumptionState!.shortfallResources.b1).toBeUndefined();
    // demand telemetry accrued
    expect(out.consumptionState!.pendingDemandFlows.rocket_fuel).toBeCloseTo(10, 5);
  });

  it('producer building converts inputs to outputs in its own location pool', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'p1', definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' })],
      logisticsUnlocked: true,
      locationInventories: { lunar_surface: { lunar_water: 30 } },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.locationInventories!.lunar_surface.lunar_water || 0).toBe(0);
    expect(out.locationInventories!.lunar_surface.rocket_fuel).toBeCloseTo(20, 5);
    // produced units join the mined-flow supply pressure pipe
    expect(out.pendingMarketFlows!.mined.rocket_fuel).toBe(20);
  });

  it('soft floor: zero supply → efficiency 0.5, half output, building never stops', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'p1', definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' })],
      logisticsUnlocked: true,
      locationInventories: {},
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.consumptionState!.efficiency.p1).toBe(CONSUMPTION_EFFICIENCY_FLOOR);
    expect(out.locationInventories!.lunar_surface.rocket_fuel).toBeCloseTo(10, 5);
    expect(out.consumptionState!.shortfallResources.p1).toEqual(['lunar_water']);
  });

  it('partial supply: linear efficiency between floor and 1, proportional draw', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' })],
      resources: { rocket_fuel: 5 }, // half of the 10 required
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.consumptionState!.efficiency.b1).toBeCloseTo(0.75, 3); // 0.5 + 0.5×0.5
    expect(out.resources.rocket_fuel).toBeCloseTo(0, 5); // drew the available half
  });

  it('life-support shortfall hits crew morale', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 's1', definitionId: 'space_station_small', locationId: 'leo' })],
      resources: {},
      workforce: { engineers: 5, scientists: 0, miners: 0, operators: 0, morale: 1.0 },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.workforce!.morale).toBeLessThan(1.0);
    expect(out.workforce!.morale).toBeCloseTo(0.95, 3);
  });
});

describe('phase-in ramp (§E3 grandfather grace)', () => {
  it('null anchor = full rate (fresh games)', () => {
    expect(getConsumptionPhaseInFraction({ ...DEFAULT_CONSUMPTION_STATE, phaseInStartMonth: null }, 123)).toBe(1);
  });

  it('ramps 25% → 100% over 3 game-months from the anchor', () => {
    const cs = { ...DEFAULT_CONSUMPTION_STATE, phaseInStartMonth: 100 };
    expect(getConsumptionPhaseInFraction(cs, 100)).toBeCloseTo(PHASE_IN_START_FRACTION, 5);
    expect(getConsumptionPhaseInFraction(cs, 101)).toBeCloseTo(0.5, 5);
    expect(getConsumptionPhaseInFraction(cs, 102)).toBeCloseTo(0.75, 5);
    expect(getConsumptionPhaseInFraction(cs, 100 + PHASE_IN_MONTHS)).toBe(1);
    expect(getConsumptionPhaseInFraction(cs, 100 + PHASE_IN_MONTHS + 50)).toBe(1);
  });

  it('phase-in scales both input draw and producer output (no free goods)', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'p1', definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' })],
      logisticsUnlocked: true,
      locationInventories: { lunar_surface: { lunar_water: 100 } },
      consumptionState: { ...DEFAULT_CONSUMPTION_STATE, phaseInStartMonth: MONTH, lastProcessedMonth: MONTH - 1 },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    // 25% of 30 water drawn, 25% of 20 fuel produced (fully supplied ⇒ eff 1)
    expect(out.locationInventories!.lunar_surface.lunar_water).toBeCloseTo(100 - 30 * 0.25, 3);
    expect(out.locationInventories!.lunar_surface.rocket_fuel).toBeCloseTo(20 * 0.25, 3);
  });
});

describe('grandfather grace (save-load V32)', () => {
  it('credits GRACE_STOCKPILE_MONTHS of inputs per affected completed building, into its own pool', () => {
    const state = baseState({
      buildings: [
        makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
        makeBuilding({ instanceId: 'p1', definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' }),
        makeBuilding({ instanceId: 'u1', definitionId: 'launch_pad_medium', locationId: 'earth_surface', isComplete: false }),
      ],
      logisticsUnlocked: true,
      resources: {},
      locationInventories: {},
      consumptionState: undefined,
    });
    applyGrandfatherGrace(state, 777);
    expect(state.resources.rocket_fuel).toBe(10 * GRACE_STOCKPILE_MONTHS); // completed pad only — the unfinished one gets nothing
    expect(state.locationInventories!.lunar_surface.lunar_water).toBe(30 * GRACE_STOCKPILE_MONTHS);
    expect(state.consumptionState).toMatchObject({
      phaseInStartMonth: 777,
      lastProcessedMonth: 777,
      graceCredited: true,
    });
  });
});

describe('advanceConsumptionToMonth (the shared live/away cursor)', () => {
  it('first run anchors without retro-consuming', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' })],
      resources: { rocket_fuel: 100 },
      consumptionState: { ...DEFAULT_CONSUMPTION_STATE }, // lastProcessedMonth null
    });
    const out = advanceConsumptionToMonth(state, MONTH);
    expect(out.resources.rocket_fuel).toBe(100); // nothing consumed
    expect(out.consumptionState!.lastProcessedMonth).toBe(MONTH);
  });

  it('is idempotent per month (live tick + away catch-up can never double-consume)', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' })],
      resources: { rocket_fuel: 100 },
    });
    const once = advanceConsumptionToMonth(state, MONTH);
    const twice = advanceConsumptionToMonth(once, MONTH);
    expect(twice.resources.rocket_fuel).toBe(90);
    expect(twice).toBe(once); // same reference — target ≤ cursor is a no-op
  });

  it('away-catch-up parity: three months one-by-one ≡ one catch-up call', () => {
    const make = () => baseState({
      buildings: [
        makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
        makeBuilding({ instanceId: 'p1', definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' }),
      ],
      logisticsUnlocked: true,
      resources: { rocket_fuel: 25 },
      locationInventories: { lunar_surface: { lunar_water: 70 } },
    });

    let stepped = make();
    for (let m = MONTH; m < MONTH + 3; m++) stepped = advanceConsumptionToMonth(stepped, m);
    const jumped = advanceConsumptionToMonth(make(), MONTH + 2);

    expect(jumped.resources).toEqual(stepped.resources);
    expect(jumped.locationInventories).toEqual(stepped.locationInventories);
    expect(jumped.consumptionState!.efficiency).toEqual(stepped.consumptionState!.efficiency);
    expect(jumped.consumptionState!.lastProcessedMonth).toBe(stepped.consumptionState!.lastProcessedMonth);
    expect(jumped.consumptionState!.pendingDemandFlows).toEqual(stepped.consumptionState!.pendingDemandFlows);
  });

  it('frontier corporations are exempt (cursor advances, nothing consumed)', () => {
    const state = baseState({
      frontierStatus: 'active',
      frontierEnteredAtMs: Date.now(),
      money: 50_000_000, // under the Frontier net-worth cap
      totalEarned: 0,
      totalSpent: 0,
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' })],
      resources: { rocket_fuel: 100 },
    });
    const out = advanceConsumptionToMonth(state, MONTH + 5);
    expect(out.resources.rocket_fuel).toBe(100);
    expect(out.consumptionState!.lastProcessedMonth).toBe(MONTH + 5);
  });
});

describe('sourcing order (local → market policy → degraded)', () => {
  it('draws local stock FIRST regardless of policy', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', supplyPolicy: 'market' })],
      resources: { rocket_fuel: 100 },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.resources.rocket_fuel).toBe(90);
    expect(out.consumptionState!.pendingProcurement).toEqual({}); // no shortfall → nothing queued
  });

  it("'market' policy queues the shortfall as procurement; efficiency still degrades this month", () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', supplyPolicy: 'market' })],
      resources: { rocket_fuel: 4 },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.consumptionState!.pendingProcurement.rocket_fuel).toBe(6); // ceil(10 − 4)
    expect(out.consumptionState!.efficiency.b1).toBeCloseTo(0.7, 3);
  });

  it("'local' policy (default) runs degraded and queues NOTHING", () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' })],
      resources: {},
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.consumptionState!.pendingProcurement).toEqual({});
    expect(out.consumptionState!.efficiency.b1).toBe(CONSUMPTION_EFFICIENCY_FLOOR);
  });

  it('setBuildingSupplyPolicy toggles per building', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' })],
    });
    const out = setBuildingSupplyPolicy(state, 'b1', 'market');
    expect(out.buildings[0].supplyPolicy).toBe('market');
    expect(state.buildings[0].supplyPolicy).toBeUndefined(); // pure
  });
});

describe('determinism', () => {
  it('same input state twice ⇒ identical economic output', () => {
    const make = () => baseState({
      buildings: [
        makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_medium', locationId: 'earth_surface', supplyPolicy: 'market' }),
        makeBuilding({ instanceId: 'p1', definitionId: 'orbital_refinery', locationId: 'asteroid_belt' }),
      ],
      logisticsUnlocked: true,
      resources: { rocket_fuel: 17 },
      locationInventories: { asteroid_belt: { iron: 150, aluminum: 100 } },
    });
    const a = processConsumptionForMonth(make(), MONTH).state;
    const b = processConsumptionForMonth(make(), MONTH).state;
    expect(b.resources).toEqual(a.resources);
    expect(b.locationInventories).toEqual(a.locationInventories);
    expect(b.consumptionState!.efficiency).toEqual(a.consumptionState!.efficiency);
    expect(b.consumptionState!.pendingProcurement).toEqual(a.consumptionState!.pendingProcurement);
    expect(b.consumptionState!.pendingDemandFlows).toEqual(a.consumptionState!.pendingDemandFlows);
  });
});

describe('sync flush hand-off', () => {
  beforeEach(() => __clearConsumptionFlushQueue());

  it('applyConsumptionFlush subtracts exactly the transmitted amounts', () => {
    const state = baseState({
      consumptionState: {
        ...DEFAULT_CONSUMPTION_STATE,
        lastProcessedMonth: MONTH,
        pendingDemandFlows: { rocket_fuel: 30, life_support_pack: 4 },
        pendingProcurement: { rocket_fuel: 12 },
      },
    });
    const out = applyConsumptionFlush(state, { demand: { rocket_fuel: 30 }, procurement: { rocket_fuel: 12 } });
    expect(out.consumptionState!.pendingDemandFlows).toEqual({ life_support_pack: 4 });
    expect(out.consumptionState!.pendingProcurement).toEqual({});
  });

  it('queue merges and consumes once', () => {
    queueConsumptionFlush({ demand: { iron: 5 }, procurement: {} });
    queueConsumptionFlush({ demand: { iron: 3 }, procurement: { iron: 2 } });
    expect(consumeConsumptionFlush()).toEqual({ demand: { iron: 8 }, procurement: { iron: 2 } });
    expect(consumeConsumptionFlush()).toBeNull();
  });
});

describe('supply summary lens + efficiency reader', () => {
  it('aggregates monthly burn vs stock across pools', () => {
    const state = baseState({
      buildings: [
        makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
        makeBuilding({ instanceId: 'b2', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
      ],
      resources: { rocket_fuel: 40 },
    });
    const summary = deriveSupplySummary(state, MONTH);
    const fuel = summary.find(l => l.resourceId === 'rocket_fuel')!;
    expect(fuel.perMonth).toBe(20);
    expect(fuel.stock).toBe(40);
    expect(fuel.coverageMonths).toBe(2);
  });

  it('getBuildingConsumptionEfficiency defaults to 1 and clamps into [floor, 1]', () => {
    const state = baseState({
      consumptionState: { ...DEFAULT_CONSUMPTION_STATE, lastProcessedMonth: MONTH, efficiency: { x: 0.62, y: 7 } },
    });
    expect(getBuildingConsumptionEfficiency(state, 'missing')).toBe(1);
    expect(getBuildingConsumptionEfficiency(state, 'x')).toBe(0.62);
    expect(getBuildingConsumptionEfficiency(state, 'y')).toBe(1);
  });
});

describe('new-save defaults', () => {
  it('fresh games carry consumptionState with full-rate recipes and an unanchored cursor', () => {
    const s = getNewGameState();
    expect(s.consumptionState).toBeDefined();
    expect(s.consumptionState!.phaseInStartMonth).toBeNull();
    expect(s.consumptionState!.lastProcessedMonth).toBeNull();
    // and the current world month resolves to a usable index for the anchor
    expect(getGlobalGameDate().totalMonths).toBeGreaterThan(0);
  });
});
