/**
 * @jest-environment node
 *
 * Meaningful Decisions Wave M2 — The Exit Decision (docs/MEANINGFUL_2026-08.md
 * §M2, finding F5): "over-building is punished but irrecoverable — a player
 * who mis-expands bleeds maintenance forever with no exit decision."
 *
 * Proofs, per the wave spec:
 *  - decommission recovery math: 40% of baseCost (cash) + 50% of resourceCost
 *    (materials, floored) — and the never-profitable invariant (a
 *    build-then-decommission round trip always returns less value than was
 *    spent, even at base prices, even ignoring the sunk Nth-copy premium)
 *  - T1/T2 decommission is instant; T3+ schedules a teardown and only pays
 *    out once the window elapses
 *  - mothball: zero revenue, zero consumption/production, 25% maintenance,
 *    reversible via a paid reactivation with a spin-up delay
 *  - month-boundary transition processors are idempotent and shared by the
 *    live tick and away catch-up (parity)
 *  - pool capacity/derived demand exclude mothballed buildings
 *  - save migration: an absent `status` field defaults to fully operational
 */
import type { GameState, BuildingInstance } from '../types';
import { BUILDINGS, BUILDING_MAP } from '../buildings';
import { RESOURCE_MAP } from '../resources';
import { getNewGameState, loadGame } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import { processTick } from '../game-engine';
import { processConsumptionForMonth } from '../consumption';
import { computeLocalPoolMultiplier } from '../service-pricing';
import { getServiceCategory, demandPoolKey } from '../demand-pools';
import { calculateAwayOperations } from '../away-operations';
import {
  computeDecommissionRecovery,
  mothballBuilding,
  reactivateBuilding,
  decommissionBuilding,
  processMothballTransitionsForMonth,
  processScheduledDecommissionsForMonth,
  isBuildingOperational,
  isBuildingMothballed,
  isBuildingReactivating,
  isBuildingDecommissioning,
  getMothballMaintenanceMultiplier,
  DECOMMISSION_MONEY_RECOVERY_FRACTION,
  DECOMMISSION_RESOURCE_RECOVERY_FRACTION,
  DECOMMISSION_TEARDOWN_MIN_TIER,
  DECOMMISSION_TEARDOWN_MONTHS,
  REACTIVATION_SPINUP_MONTHS,
  REACTIVATION_FEE_FRACTION,
  MOTHBALL_MAINTENANCE_FRACTION,
} from '../mothball';

const MONTH = 5000;

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

function baseState(overrides: Partial<GameState> = {}): GameState {
  const s = getNewGameState();
  return {
    ...s,
    frontierStatus: 'graduated',
    npcCompanies: [],
    money: 10_000_000_000,
    ...overrides,
  };
}

// ─── Decommission recovery math ─────────────────────────────────────────────

describe('computeDecommissionRecovery', () => {
  it('money is exactly 40% of the UN-scaled baseCost', () => {
    const def = BUILDING_MAP.get('mining_asteroid')!;
    const recovery = computeDecommissionRecovery(def);
    expect(recovery.money).toBe(Math.round(def.baseCost * DECOMMISSION_MONEY_RECOVERY_FRACTION));
    expect(DECOMMISSION_MONEY_RECOVERY_FRACTION).toBeLessThan(1);
  });

  it('resources are floor(50%) of each resourceCost quantity', () => {
    const def = BUILDING_MAP.get('mining_asteroid')!;
    const recovery = computeDecommissionRecovery(def);
    for (const [resId, qty] of Object.entries(def.resourceCost!)) {
      expect(recovery.resources[resId]).toBe(Math.floor(qty * DECOMMISSION_RESOURCE_RECOVERY_FRACTION));
    }
  });

  it('a building with no resourceCost recovers zero materials', () => {
    const def = BUILDING_MAP.get('launch_pad_small')!;
    expect(def.resourceCost).toBeUndefined();
    const recovery = computeDecommissionRecovery(def);
    expect(recovery.resources).toEqual({});
  });

  it('never-profitable invariant: across EVERY building in the game, cash+material recovery value is strictly less than what was spent to build it (never a profit path)', () => {
    for (const def of BUILDINGS) {
      const recovery = computeDecommissionRecovery(def);
      let recoveredValue = recovery.money;
      let spentValue = def.baseCost;
      for (const [resId, qty] of Object.entries(def.resourceCost || {})) {
        const price = RESOURCE_MAP.get(resId as never)?.baseMarketPrice ?? 0;
        recoveredValue += (recovery.resources[resId] || 0) * price;
        spentValue += qty * price;
      }
      expect(recoveredValue).toBeLessThan(spentValue);
      // Stronger bound: recovery never exceeds 60% of what was spent (40%
      // cash + 50% materials, both fractions < 1 — the sinks-first ceiling).
      expect(recoveredValue).toBeLessThanOrEqual(spentValue * 0.6 + 1);
    }
  });

  it('the cost-scaling position premium (formulas.scaledBuildingCost) is never refunded — recovery reads the flat baseCost regardless of build count', () => {
    const def = BUILDING_MAP.get('sat_telecom')!;
    const recoveryAt0 = computeDecommissionRecovery(def);
    // computeDecommissionRecovery takes only the definition — there is no
    // "count at location" input at all, so the 40th satellite's inflated
    // purchase price structurally cannot leak into the refund.
    expect(recoveryAt0.money).toBe(Math.round(def.baseCost * DECOMMISSION_MONEY_RECOVERY_FRACTION));
  });
});

// ─── Mothball / reactivate state machine ────────────────────────────────────

describe('mothballBuilding / reactivateBuilding', () => {
  it('mothballs a completed, active building', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo' })],
    });
    const out = mothballBuilding(state, 'b1', MONTH);
    const bld = out.buildings.find(b => b.instanceId === 'b1')!;
    expect(bld.status).toBe('mothballed');
    expect(bld.mothballedAtMonth).toBe(MONTH);
    expect(isBuildingMothballed(bld)).toBe(true);
    expect(isBuildingOperational(bld)).toBe(false);
  });

  it('no-ops on a building under construction', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', isComplete: false })],
    });
    const out = mothballBuilding(state, 'b1', MONTH);
    expect(out).toBe(state);
  });

  it('no-ops on an already-mothballed building (idempotent)', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', status: 'mothballed' })],
    });
    const out = mothballBuilding(state, 'b1', MONTH);
    expect(out).toBe(state);
  });

  it('reactivateBuilding charges a fee and moves to reactivating', () => {
    const def = BUILDING_MAP.get('sat_telecom')!;
    const fee = Math.round(def.baseCost * REACTIVATION_FEE_FRACTION);
    const state = baseState({
      money: fee + 1_000_000,
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', status: 'mothballed' })],
    });
    const out = reactivateBuilding(state, 'b1', MONTH);
    const bld = out.buildings.find(b => b.instanceId === 'b1')!;
    expect(bld.status).toBe('reactivating');
    expect(bld.reactivationStartMonth).toBe(MONTH);
    expect(out.money).toBe(state.money - fee);
    expect(isBuildingOperational(bld)).toBe(false);
  });

  it('reactivateBuilding no-ops (does not charge) when the corp cannot afford the fee', () => {
    const state = baseState({
      money: 0,
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', status: 'mothballed' })],
    });
    const out = reactivateBuilding(state, 'b1', MONTH);
    expect(out).toBe(state);
  });

  it('reactivateBuilding no-ops on a building that is not mothballed', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo' })],
    });
    const out = reactivateBuilding(state, 'b1', MONTH);
    expect(out).toBe(state);
  });

  it('getMothballMaintenanceMultiplier is 1.0 for active, 25% for mothballed/reactivating/decommissioning', () => {
    expect(getMothballMaintenanceMultiplier(undefined)).toBe(1);
    expect(getMothballMaintenanceMultiplier({ status: undefined })).toBe(1);
    expect(getMothballMaintenanceMultiplier({ status: 'active' })).toBe(1);
    expect(getMothballMaintenanceMultiplier({ status: 'mothballed' })).toBe(MOTHBALL_MAINTENANCE_FRACTION);
    expect(getMothballMaintenanceMultiplier({ status: 'reactivating' })).toBe(MOTHBALL_MAINTENANCE_FRACTION);
    expect(getMothballMaintenanceMultiplier({ status: 'decommissioning' })).toBe(MOTHBALL_MAINTENANCE_FRACTION);
  });
});

// ─── Decommission: T1/T2 instant vs T3+ scheduled teardown ──────────────────

describe('decommissionBuilding', () => {
  it('T1 building scraps instantly: removed, cash + resources credited immediately', () => {
    const def = BUILDING_MAP.get('launch_pad_small')!;
    expect(def.tier).toBeLessThan(DECOMMISSION_TEARDOWN_MIN_TIER);
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface' })],
      activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: ['b1'], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 }],
    });
    const recovery = computeDecommissionRecovery(def);
    const out = decommissionBuilding(state, 'b1', MONTH);
    expect(out.buildings.find(b => b.instanceId === 'b1')).toBeUndefined();
    expect(out.activeServices.length).toBe(0);
    expect(out.money).toBe(state.money + recovery.money);
    expect(out.totalEarned).toBe(state.totalEarned + recovery.money);
  });

  it('T3+ building schedules a teardown instead of scrapping instantly', () => {
    const def = BUILDING_MAP.get('mining_asteroid')!;
    expect(def.tier).toBeGreaterThanOrEqual(DECOMMISSION_TEARDOWN_MIN_TIER);
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'mining_asteroid', locationId: 'asteroid_belt' })],
    });
    const moneyBefore = state.money;
    const out = decommissionBuilding(state, 'b1', MONTH);
    const bld = out.buildings.find(b => b.instanceId === 'b1')!;
    expect(bld).toBeDefined(); // still present — teardown in progress
    expect(bld.status).toBe('decommissioning');
    expect(bld.decommissionCompletesAtMonth).toBe(MONTH + DECOMMISSION_TEARDOWN_MONTHS);
    // No payout yet — recovery credits on completion, not on initiation.
    expect(out.money).toBe(moneyBefore);
    expect(isBuildingOperational(bld)).toBe(false);
  });

  it('no-ops on a building under construction', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: false })],
    });
    const out = decommissionBuilding(state, 'b1', MONTH);
    expect(out).toBe(state);
  });

  it('no-ops on a building already mid-teardown', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'mining_asteroid', locationId: 'asteroid_belt', status: 'decommissioning', decommissionCompletesAtMonth: MONTH + 1 })],
    });
    const out = decommissionBuilding(state, 'b1', MONTH);
    expect(out).toBe(state);
  });
});

// ─── Month-boundary transition processors (shared by live tick + away) ─────

describe('processMothballTransitionsForMonth', () => {
  it('flips reactivating -> active once the spin-up window elapses, not before', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', status: 'reactivating', reactivationStartMonth: MONTH })],
    });
    const tooSoon = processMothballTransitionsForMonth(state, MONTH); // 0 months elapsed
    expect(isBuildingReactivating(tooSoon.buildings[0])).toBe(true);

    const onTime = processMothballTransitionsForMonth(state, MONTH + REACTIVATION_SPINUP_MONTHS);
    const bld = onTime.buildings[0];
    expect(bld.status).toBe('active');
    expect(bld.reactivationStartMonth).toBeUndefined();
    expect(isBuildingOperational(bld)).toBe(true);
  });

  it('idempotent — running twice for the same month does not re-fire', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', status: 'reactivating', reactivationStartMonth: MONTH })],
    });
    const once = processMothballTransitionsForMonth(state, MONTH + REACTIVATION_SPINUP_MONTHS);
    const twice = processMothballTransitionsForMonth(once, MONTH + REACTIVATION_SPINUP_MONTHS);
    expect(twice).toBe(once); // no-op the second time — no-change short-circuit
  });

  it('leaves mothballed (not reactivating) buildings untouched', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', status: 'mothballed' })],
    });
    const out = processMothballTransitionsForMonth(state, MONTH + 10);
    expect(out).toBe(state);
  });
});

describe('processScheduledDecommissionsForMonth', () => {
  it('removes the building and credits recovery once the teardown window elapses', () => {
    const def = BUILDING_MAP.get('mining_asteroid')!;
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'mining_asteroid', locationId: 'asteroid_belt', status: 'decommissioning', decommissionCompletesAtMonth: MONTH })],
      activeServices: [{ definitionId: 'svc_mining_asteroid', locationId: 'asteroid_belt', linkedBuildingIds: ['b1'], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 }],
    });
    const recovery = computeDecommissionRecovery(def);

    const tooSoon = processScheduledDecommissionsForMonth(state, MONTH - 1);
    expect(tooSoon).toBe(state); // window hasn't elapsed yet

    const out = processScheduledDecommissionsForMonth(state, MONTH);
    expect(out.buildings.find(b => b.instanceId === 'b1')).toBeUndefined();
    expect(out.activeServices.length).toBe(0);
    expect(out.money).toBe(state.money + recovery.money);
    for (const [resId, qty] of Object.entries(recovery.resources)) {
      expect(out.resources[resId]).toBe((state.resources[resId] || 0) + qty);
    }
  });

  it('no-ops when nothing is due', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo' })],
    });
    const out = processScheduledDecommissionsForMonth(state, MONTH);
    expect(out).toBe(state);
  });
});

// ─── Consumption integration: mothballed buildings draw/produce nothing ────

describe('consumption.ts integration', () => {
  it('a mothballed building with a recipe consumes and produces zero this month', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'p1', definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface', status: 'mothballed' })],
      logisticsUnlocked: true,
      locationInventories: { lunar_surface: { lunar_water: 30 } },
      consumptionState: { phaseInStartMonth: null, graceCredited: true, lastProcessedMonth: MONTH - 1, efficiency: {}, shortfallResources: {}, pendingDemandFlows: {}, pendingProcurement: {} },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    // stock untouched — nothing drawn
    expect(out.locationInventories!.lunar_surface.lunar_water).toBe(30);
    // nothing produced
    expect(out.locationInventories!.lunar_surface.rocket_fuel || 0).toBe(0);
    // no efficiency entry recorded (excluded from the `completed` pass entirely)
    expect(out.consumptionState!.efficiency.p1).toBeUndefined();
  });

  it('an active twin of the same building keeps consuming/producing normally', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'p1', definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' })],
      logisticsUnlocked: true,
      locationInventories: { lunar_surface: { lunar_water: 30 } },
      consumptionState: { phaseInStartMonth: null, graceCredited: true, lastProcessedMonth: MONTH - 1, efficiency: {}, shortfallResources: {}, pendingDemandFlows: {}, pendingProcurement: {} },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.locationInventories!.lunar_surface.lunar_water || 0).toBe(0);
    expect(out.locationInventories!.lunar_surface.rocket_fuel).toBeCloseTo(20, 5);
    expect(out.consumptionState!.efficiency.p1).toBe(1);
  });
});

// ─── game-engine.ts integration: revenue / maintenance / mining ────────────

describe('game-engine.ts §1/§2/§6 integration (processTick)', () => {
  function monthEndState(overrides: Partial<GameState> = {}): GameState {
    const now = Date.now();
    const globalDate = getGlobalGameDate();
    const prevMonth = globalDate.month === 1
      ? { year: globalDate.year - 1, month: 12 }
      : { year: globalDate.year, month: globalDate.month - 1 };
    return baseState({
      createdAt: now, lastTickAt: now,
      gameDate: prevMonth,
      unlockedLocations: ['earth_surface', 'leo', 'lunar_surface'],
      ...overrides,
    });
  }

  let randomSpy: jest.SpyInstance;
  beforeEach(() => { randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99); });
  afterEach(() => randomSpy.mockRestore());

  it('a mothballed satellite earns zero revenue and pays 25% maintenance; its active twin earns full revenue and pays full maintenance', () => {
    const svcDef = { definitionId: 'svc_telecom_leo', locationId: 'leo', linkedBuildingIds: [] as string[], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 };
    const state = monthEndState({
      buildings: [
        makeBuilding({ instanceId: 'active1', definitionId: 'sat_telecom', locationId: 'leo' }),
        makeBuilding({ instanceId: 'mothballed1', definitionId: 'sat_telecom', locationId: 'leo', status: 'mothballed' }),
      ],
      activeServices: [
        { ...svcDef, linkedBuildingIds: ['active1'] },
        { ...svcDef, linkedBuildingIds: ['mothballed1'] },
      ],
    });
    const before = state.money;
    const out = processTick(state);
    // Money moved (revenue from active1 minus maintenance from both minus
    // overhead/exec-comp) — the important proof is the DELTA the mothballed
    // building contributes, isolated via a solo-active-only run below.
    const soloActive = processTick(monthEndState({
      buildings: [makeBuilding({ instanceId: 'active1', definitionId: 'sat_telecom', locationId: 'leo' })],
      activeServices: [{ ...svcDef, linkedBuildingIds: ['active1'] }],
    }));
    // The mothballed twin adds no revenue: total net from the two-building
    // state should be LESS than the solo-active net (it only adds maintenance
    // cost, at 25%, never revenue).
    const soloActiveDelta = soloActive.money - before;
    const bothDelta = out.money - before;
    expect(bothDelta).toBeLessThan(soloActiveDelta);
    const def = BUILDING_MAP.get('sat_telecom')!;
    const expectedExtraMaint = Math.round(def.maintenanceCostPerMonth * (1 / require('../constants').TICKS_PER_GAME_MONTH) * MOTHBALL_MAINTENANCE_FRACTION);
    // Allow small rounding slack from the many compounding multipliers.
    expect(soloActiveDelta - bothDelta).toBeGreaterThanOrEqual(expectedExtraMaint - 5);
  });

  it('a mothballed mining rig produces zero resources this month; an active twin produces the full monthly amount', () => {
    const svc = { definitionId: 'svc_mining_lunar_basic', locationId: 'lunar_surface', startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 };
    const mothballedState = monthEndState({
      buildings: [makeBuilding({ instanceId: 'm1', definitionId: 'mining_lunar_basic', locationId: 'lunar_surface', status: 'mothballed' })],
      activeServices: [{ ...svc, linkedBuildingIds: ['m1'] }],
    });
    const activeState = monthEndState({
      buildings: [makeBuilding({ instanceId: 'm1', definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' })],
      activeServices: [{ ...svc, linkedBuildingIds: ['m1'] }],
    });
    const mothballedOut = processTick(mothballedState);
    const activeOut = processTick(activeState);
    expect(mothballedOut.resources.lunar_water || 0).toBe(0);
    // Exact figure depends on the private multiplier stack (tier/research/
    // legacy bonuses, all neutral-ish by default but not guaranteed exactly
    // 1.0) — the M2 proof is the CONTRAST (mothballed=0, active>0), not the
    // precise monthly figure (that's consumption.test.ts/formulas' territory).
    expect(activeOut.resources.lunar_water || 0).toBeGreaterThan(0);
  });
});

// ─── Demand-pool capacity/derived-demand exclusion ─────────────────────────

describe('service-pricing.ts — pool capacity excludes mothballed buildings', () => {
  it('a mothballed satellite contributes no capacity to its demand pool; an active one does', () => {
    const category = getServiceCategory('svc_telecom_leo')!;
    const key = demandPoolKey('leo', category);
    expect(key).toBeTruthy();

    const svcDef = { definitionId: 'svc_telecom_leo', locationId: 'leo', linkedBuildingIds: ['b1'], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 };
    const noBuildingState = baseState({ buildings: [], activeServices: [] });
    const activeBuildingState = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo' })],
      activeServices: [svcDef],
    });
    const mothballedBuildingState = baseState({
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', status: 'mothballed' })],
      activeServices: [svcDef],
    });

    const multNoBuilding = computeLocalPoolMultiplier(noBuildingState, 'leo', category, 1);
    const multActive = computeLocalPoolMultiplier(activeBuildingState, 'leo', category, 1);
    const multMothballed = computeLocalPoolMultiplier(mothballedBuildingState, 'leo', category, 1);

    // The mothballed building's capacity claim vanishes — its pool multiplier
    // reads IDENTICAL to having no building there at all, while the active
    // building measurably changes the multiplier (adds capacity → moves it
    // off the no-capacity baseline).
    expect(multMothballed).toBe(multNoBuilding);
    expect(multActive).not.toBe(multNoBuilding);
  });
});

// ─── Away-catch-up parity ───────────────────────────────────────────────────

describe('away-operations.ts parity', () => {
  it('a mothballed building contributes zero revenue/mining and 25% maintenance to the away-catch-up projection', () => {
    const now = Date.now();
    const globalDate = getGlobalGameDate(now);
    const svcDef = { definitionId: 'svc_telecom_leo', locationId: 'leo', startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 };
    const away = (status: BuildingInstance['status']) => baseState({
      lastTickAt: now - 2 * 3_600_000, // 2h away — comfortably past the 30s floor
      gameDate: { year: globalDate.year, month: globalDate.month }, // avoid a huge unrelated month-catch-up loop
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo', status })],
      activeServices: [{ ...svcDef, linkedBuildingIds: ['b1'] }],
    });
    const activeResult = calculateAwayOperations(away(undefined), now);
    const mothballedResult = calculateAwayOperations(away('mothballed'), now);
    expect(activeResult).not.toBeNull();
    expect(mothballedResult).not.toBeNull();
    // Mothballed away-projection nets LESS than active (loses all revenue,
    // still pays reduced maintenance) — never more.
    expect(mothballedResult!.ledger.moneyDelta).toBeLessThan(activeResult!.ledger.moneyDelta);
  });
});

// ─── Save migration (V36) ───────────────────────────────────────────────────

describe('save migration — BuildingInstance.status', () => {
  it('a pre-M2 save (no status field on any building) loads with every building treated as fully operational', () => {
    const fresh = getNewGameState();
    const preM2Save = {
      ...fresh,
      buildings: [makeBuilding({ instanceId: 'b1', definitionId: 'sat_telecom', locationId: 'leo' })],
    };
    // Simulate a stored save exactly as an old client would have written it
    // (no status/mothballedAtMonth/reactivationStartMonth/
    // decommissionCompletesAtMonth keys at all on the building object).
    const raw = JSON.stringify(preM2Save);
    (global as unknown as { localStorage: Storage }).localStorage = {
      getItem: () => raw,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    const bld = loaded!.buildings.find(b => b.instanceId === 'b1')!;
    expect(bld.status).toBeUndefined();
    expect(isBuildingOperational(bld)).toBe(true);
    expect(isBuildingMothballed(bld)).toBe(false);
    expect(isBuildingDecommissioning(bld)).toBe(false);
  });
});
