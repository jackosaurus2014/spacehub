/**
 * Balance Pass 1 — Storage integrity: volatile boiloff + warehouse-overflow
 * decay (docs/BALANCE.md "Pass 1 — Resource generation vs sinks";
 * engine: consumption.ts runStorageIntegrity via processConsumptionForMonth).
 *
 * Proofs:
 *  - volatiles lose their authored boiloff fraction of TOTAL stock per month
 *    at full ramp
 *  - non-volatiles below their storage cap never decay
 *  - stock above the cap decays STORAGE_OVERFLOW_DECAY_PER_MONTH
 *  - warehouse capability (inventoryProtection) extends capacity
 *  - lazy anchor: first pass stamps storageDecayStartMonth and applies ZERO
 *    decay (36-real-hour migration grace, no save migration)
 *  - the ramp scales losses linearly over STORAGE_DECAY_RAMP_MONTHS
 *  - location inventories decay proportionally alongside the global pool
 *  - boundedness: the hoarder asymptote is finite (cap + gen/decay)
 */
import {
  processConsumptionForMonth,
  DEFAULT_CONSUMPTION_STATE,
  VOLATILE_BOILOFF_PER_MONTH,
  STORAGE_OVERFLOW_DECAY_PER_MONTH,
  STORAGE_DECAY_RAMP_MONTHS,
  baseStorageCapUnits,
  storageCapacityUnits,
  STORAGE_WAREHOUSE_SUM_CAP,
  STORAGE_WAREHOUSE_CAPACITY_WEIGHT,
} from '../consumption';
import { getNewGameState } from '../save-load';
import type { GameState, BuildingInstance } from '../types';

const MONTH = 6000;

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

/** Graduated state with the decay ramp fully matured (anchor far in the past). */
function fullRampState(overrides: Partial<GameState> = {}): GameState {
  const s = getNewGameState();
  return {
    ...s,
    frontierStatus: 'graduated',
    npcCompanies: [],
    money: 10_000_000_000,
    buildings: [],
    resources: {},
    consumptionState: {
      ...DEFAULT_CONSUMPTION_STATE,
      lastProcessedMonth: MONTH - 1,
      storageDecayStartMonth: MONTH - 1000,
    },
    ...overrides,
  };
}

describe('volatile boiloff', () => {
  it('drains the authored fraction of total stored volatiles at full ramp', () => {
    const state = fullRampState({ resources: { methane: 1000 } });
    const { state: out, storageLosses } = processConsumptionForMonth(state, MONTH);
    const rate = VOLATILE_BOILOFF_PER_MONTH.methane;
    expect(rate).toBeGreaterThan(0);
    expect(out.resources.methane).toBeCloseTo(1000 * (1 - rate), 5);
    expect(storageLosses?.methane).toBeCloseTo(1000 * rate, 1);
  });

  it('every authored boiloff rate is a sane monthly fraction (0 < r ≤ 0.10)', () => {
    for (const [res, rate] of Object.entries(VOLATILE_BOILOFF_PER_MONTH)) {
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(0.10);
      expect(typeof res).toBe('string');
    }
  });
});

describe('warehouse overflow decay', () => {
  it('non-volatile stock below the cap never decays', () => {
    const cap = baseStorageCapUnits('iron');
    const state = fullRampState({ resources: { iron: cap - 1 } });
    const { state: out, storageLosses } = processConsumptionForMonth(state, MONTH);
    expect(out.resources.iron).toBeCloseTo(cap - 1, 5);
    expect(storageLosses?.iron).toBeUndefined();
  });

  it('stock above the cap decays at STORAGE_OVERFLOW_DECAY_PER_MONTH', () => {
    const cap = baseStorageCapUnits('iron');
    const overflow = 4_000;
    const state = fullRampState({ resources: { iron: cap + overflow } });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.resources.iron).toBeCloseTo(cap + overflow - overflow * STORAGE_OVERFLOW_DECAY_PER_MONTH, 3);
  });

  it('rarity tiers get tighter caps than bulk raw', () => {
    expect(baseStorageCapUnits('platinum_group')).toBeLessThan(baseStorageCapUnits('iron'));
    expect(baseStorageCapUnits('station_module')).toBeLessThan(baseStorageCapUnits('steel_ingots'));
  });

  it('inventoryProtection buildings extend capacity (warehousing matters)', () => {
    const none: GameState['buildings'] = [];
    const withWarehouse = [
      makeBuilding({ instanceId: 'w1', definitionId: 'fabrication_asteroid', locationId: 'asteroid_belt' }),
    ];
    expect(storageCapacityUnits(withWarehouse, 'iron')).toBeGreaterThan(storageCapacityUnits(none, 'iron'));
    // Cap on the warehouse sum: capacity multiplier never exceeds
    // 1 + WEIGHT × SUM_CAP.
    const many = Array.from({ length: 40 }, (_, i) =>
      makeBuilding({ instanceId: `w${i}`, definitionId: 'fabrication_asteroid', locationId: 'asteroid_belt' }));
    const maxMult = 1 + STORAGE_WAREHOUSE_CAPACITY_WEIGHT * STORAGE_WAREHOUSE_SUM_CAP;
    expect(storageCapacityUnits(many, 'iron')).toBeCloseTo(baseStorageCapUnits('iron') * maxMult, 5);
  });

  it('location inventories decay proportionally alongside the global pool', () => {
    const cap = baseStorageCapUnits('iron');
    const total = cap + 4_000;
    const state = fullRampState({
      resources: { iron: total / 2 },
      locationInventories: { asteroid_belt: { iron: total / 2 } },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    const expectedTotal = total - 4_000 * STORAGE_OVERFLOW_DECAY_PER_MONTH;
    const g = out.resources.iron || 0;
    const l = out.locationInventories?.asteroid_belt?.iron || 0;
    expect(g + l).toBeCloseTo(expectedTotal, 3);
    expect(g).toBeCloseTo(l, 3); // proportional split preserved
  });
});

describe('migration grace — lazy anchor + ramp', () => {
  it('first pass stamps the anchor and destroys NOTHING', () => {
    const state = fullRampState({
      resources: { methane: 1000, iron: 100_000 },
      consumptionState: { ...DEFAULT_CONSUMPTION_STATE, lastProcessedMonth: MONTH - 1 }, // no anchor
    });
    const { state: out, storageLosses } = processConsumptionForMonth(state, MONTH);
    expect(out.resources.methane).toBe(1000);
    expect(out.resources.iron).toBe(100_000);
    expect(Object.keys(storageLosses || {})).toHaveLength(0);
    expect(out.consumptionState?.storageDecayStartMonth).toBe(MONTH);
  });

  it('ramps linearly: halfway through the window, losses are half rate', () => {
    const anchor = MONTH - STORAGE_DECAY_RAMP_MONTHS / 2;
    const state = fullRampState({
      resources: { methane: 1000 },
      consumptionState: { ...DEFAULT_CONSUMPTION_STATE, lastProcessedMonth: MONTH - 1, storageDecayStartMonth: anchor },
    });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    const rate = VOLATILE_BOILOFF_PER_MONTH.methane * 0.5;
    expect(out.resources.methane).toBeCloseTo(1000 * (1 - rate), 5);
  });

  it('the anchor survives the pass (persists without a save migration)', () => {
    const state = fullRampState({ resources: {} });
    const { state: out } = processConsumptionForMonth(state, MONTH);
    expect(out.consumptionState?.storageDecayStartMonth).toBe(MONTH - 1000);
  });
});

describe('boundedness — the founder directive', () => {
  it('a hoarder mining G units/mo converges to a FINITE stockpile asymptote', () => {
    // Iterate the map S ← (S + G) with overflow decay; it must converge to
    // cap + G/decay instead of growing unboundedly.
    const G = 500; // asteroid rig iron firehose
    const cap = baseStorageCapUnits('iron');
    let stock = 0;
    for (let i = 0; i < 400; i++) {
      stock += G;
      const overflow = Math.max(0, stock - cap);
      stock -= overflow * STORAGE_OVERFLOW_DECAY_PER_MONTH;
    }
    const asymptote = cap + G / STORAGE_OVERFLOW_DECAY_PER_MONTH - G;
    expect(stock).toBeLessThan(asymptote * 1.05);
    expect(stock).toBeGreaterThan(asymptote * 0.95);
  });
});
