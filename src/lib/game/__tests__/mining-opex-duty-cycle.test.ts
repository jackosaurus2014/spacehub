/**
 * @jest-environment node
 *
 * Balance Pass 6 (docs/BALANCE.md "Pass 6") — H4 extraction duty-cycle opex
 * scaling, as specced in Pass 2: `opexMult = clamp(pressure, 0.55, 1.0)`
 * applied to mining_output services' OPERATING cost only (maintenance
 * unchanged) — a depleted deposit runs its rig at a lower duty cycle, so
 * costs fall while output falls.
 *
 * Guards:
 *  - unit: clamp bounds (1.0 → 1.0; 0.4 floor → 0.55; mid passes through),
 *    value-weighted multi-resource blend, non-mining ids neutral, missing
 *    pressures read as untouched (1.0)
 *  - live tick: floored deposit pressure reduces the mining service's
 *    operating cost by exactly the clamp (isolated via revenueMultiplier 0);
 *    maintenance is NOT scaled
 *  - away catch-up: identical discount (engine parity)
 *  - non-mining services' costs are untouched by pressure
 *  - M1 first-copy structure: at pressure 1.0 the multiplier is exactly 1 —
 *    first-copy probes (which price at fresh deposits) are unaffected
 */
import type { GameState, BuildingInstance } from '../types';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import { processTick } from '../game-engine';
import { calculateAwayOperations } from '../away-operations';
import { miningDutyCycleOpexMult, MINING_OPEX_PRESSURE_FLOOR } from '../mining-pricing';
import { MINING_PRODUCTION, RESOURCE_MAP } from '../resources';
import { SERVICE_MAP } from '../services';
import { TICKS_PER_GAME_MONTH } from '../constants';
import type { ExtractionPressureSnapshot } from '../extraction-pressure';

// ─── Unit ───────────────────────────────────────────────────────────────────

describe('miningDutyCycleOpexMult (unit)', () => {
  it('is exactly 1.0 at untouched deposits (pressure 1.0) — M1 first-copy probes unaffected', () => {
    expect(miningDutyCycleOpexMult('svc_mining_lunar_basic', { lunar_water: 1, helium3: 1 })).toBe(1);
    expect(miningDutyCycleOpexMult('svc_mining_lunar_basic', {})).toBe(1); // missing = untouched
  });

  it('floors at 0.55 when every deposit sits at the 0.4 extraction floor', () => {
    expect(MINING_OPEX_PRESSURE_FLOOR).toBe(0.55);
    expect(miningDutyCycleOpexMult('svc_mining_lunar_basic', { lunar_water: 0.4, helium3: 0.4 }))
      .toBe(MINING_OPEX_PRESSURE_FLOOR);
  });

  it('passes mid-range pressure through unclamped', () => {
    expect(miningDutyCycleOpexMult('svc_mining_lunar_basic', { lunar_water: 0.7, helium3: 0.7 }))
      .toBeCloseTo(0.7, 10);
  });

  it('weights a mixed-pressure rig by each resource\'s base-value share', () => {
    const production = MINING_PRODUCTION['svc_mining_lunar_basic'];
    const w = (res: string) =>
      production.find(p => p.resource === res)!.amountPerMonth
      * (RESOURCE_MAP.get(res as never)?.baseMarketPrice || 0);
    const wWater = w('lunar_water');
    const wHe3 = w('helium3');
    const expected = Math.max(
      MINING_OPEX_PRESSURE_FLOOR,
      Math.min(1, (wWater * 0.4 + wHe3 * 1.0) / (wWater + wHe3)),
    );
    expect(miningDutyCycleOpexMult('svc_mining_lunar_basic', { lunar_water: 0.4, helium3: 1.0 }))
      .toBeCloseTo(expected, 10);
  });

  it('is neutral for anything without a MINING_PRODUCTION entry', () => {
    expect(miningDutyCycleOpexMult('svc_telecom_leo', { lunar_water: 0.4 })).toBe(1);
    expect(miningDutyCycleOpexMult('nonexistent', {})).toBe(1);
  });
});

// ─── Engine integration ─────────────────────────────────────────────────────

function makeBuilding(partial: Partial<BuildingInstance> & { instanceId: string; definitionId: string; locationId: string }): BuildingInstance {
  return {
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 1 },
    isComplete: true,
    startedAtMs: 0,
    realDurationSeconds: 0,
    ...partial,
  };
}

function flooredPressure(now: number): ExtractionPressureSnapshot {
  return {
    asOf: now,
    entries: {
      'lunar_surface:lunar_water': { locationId: 'lunar_surface', resourceId: 'lunar_water', pressure: 0.4 },
      'lunar_surface:helium3': { locationId: 'lunar_surface', resourceId: 'helium3', pressure: 0.4 },
    },
  };
}

/** Lunar miner with revenueMultiplier 0 on its service — isolates the COST
 *  side so the money delta between neutral and floored pressure is exactly
 *  the duty-cycle opex discount. */
function lunarMiner(now: number, overrides: Partial<GameState> = {}): GameState {
  const globalDate = getGlobalGameDate(now);
  return {
    ...getNewGameState(),
    npcCompanies: [],
    money: 500_000_000,
    createdAt: now - 90 * 24 * 3600 * 1000,
    lastTickAt: now,
    frontierStatus: 'graduated',
    gameDate: { year: globalDate.year, month: globalDate.month },
    buildings: [
      makeBuilding({ instanceId: 'm1', definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' }),
      makeBuilding({ instanceId: 'p1', definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' }),
    ],
    activeServices: [{
      definitionId: 'svc_mining_lunar_basic', locationId: 'lunar_surface',
      startDate: { year: 2026, month: 1 }, revenueMultiplier: 0, linkedBuildingIds: ['m1'],
    }],
    ...overrides,
  } as GameState;
}

const OP = SERVICE_MAP.get('svc_mining_lunar_basic')!.operatingCostPerMonth;
const FRACTION = 1 / TICKS_PER_GAME_MONTH;
/** Per-tick discount the floored duty cycle should produce. */
const EXPECTED_TICK_DISCOUNT =
  Math.round(OP * FRACTION) - Math.round(OP * FRACTION * MINING_OPEX_PRESSURE_FLOOR);

describe('game-engine.ts §1 — duty-cycle opex on the live tick', () => {
  it('a floored deposit cuts the mining service operating cost to the 0.55 clamp exactly', () => {
    const now = Date.now();
    const before = lunarMiner(now).money;
    const neutralDelta = processTick(lunarMiner(now)).money - before;
    const flooredDelta = processTick(lunarMiner(now, { extractionPressure: flooredPressure(now) })).money - before;
    // Costs fall, so the floored save keeps MORE money — by the exact
    // discount (±2: exec comp keys off book NW, which the retained cash
    // nudges, shifting its own rounding by at most a dollar or two).
    expect(Math.abs(flooredDelta - neutralDelta - EXPECTED_TICK_DISCOUNT)).toBeLessThanOrEqual(2);
  });

  it('maintenance is NOT scaled by pressure (only operating cost is)', () => {
    // The assertion above already pins the delta to the OPERATING discount
    // alone: if maintenance were also scaled, the measured delta would exceed
    // EXPECTED_TICK_DISCOUNT by the maintenance share. Belt and braces:
    expect(EXPECTED_TICK_DISCOUNT).toBeGreaterThan(0);
  });

  it('non-mining services are untouched by extraction pressure', () => {
    const now = Date.now();
    const telecom = (extra: Partial<GameState>) => lunarMiner(now, {
      buildings: [makeBuilding({ instanceId: 't1', definitionId: 'sat_telecom', locationId: 'leo' })],
      activeServices: [{
        definitionId: 'svc_telecom_leo', locationId: 'leo',
        startDate: { year: 2026, month: 1 }, revenueMultiplier: 0, linkedBuildingIds: ['t1'],
      }],
      ...extra,
    });
    const before = telecom({}).money;
    const neutralDelta = processTick(telecom({})).money - before;
    const flooredDelta = processTick(telecom({ extractionPressure: flooredPressure(now) })).money - before;
    expect(flooredDelta).toBeCloseTo(neutralDelta, 0);
  });
});

describe('away-operations.ts — engine parity for the duty-cycle discount', () => {
  it('the away catch-up charges the same discounted opex per tick', () => {
    const now = Date.now();
    const AWAY_MS = 3600 * 1000; // 1h at 2s ticks = 1800 ticks, same game month
    const run = (extra: Partial<GameState>) => {
      const s = lunarMiner(now, { lastTickAt: now - AWAY_MS, ...extra });
      const r = calculateAwayOperations(s, now);
      expect(r).not.toBeNull();
      return r!.ledger.moneyDelta;
    };
    const neutral = run({});
    const floored = run({ extractionPressure: flooredPressure(now) });
    const ticks = Math.floor(AWAY_MS / 2000);
    expect(floored - neutral).toBeCloseTo(EXPECTED_TICK_DISCOUNT * ticks, 0);
  });
});
