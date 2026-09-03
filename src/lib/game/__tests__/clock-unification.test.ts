/**
 * @jest-environment node
 *
 * Clock unification (2026-09-02, docs/GAME_DESIGN_REVIEW_2026-09.md D1).
 * The engine used to credit one game-month of P&L every 30 ticks (60 s)
 * while the world calendar advanced one game-month every 6 h — 360x. These
 * tests pin the derived constant, the per-tick fraction, the sub-unit
 * production carry, and the state-derived money ceiling.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import { processTick } from '../game-engine';
import { TICK_INTERVALS, TICKS_PER_GAME_MONTH } from '../constants';
import { REAL_SECONDS_PER_GAME_MONTH, REAL_MS_PER_GAME_MONTH, getGlobalGameDate } from '../server-time';
import { SERVICE_MAP } from '../services';
import { MINING_PRODUCTION } from '../resources';
import {
  buildServerFlowState,
  computeServerMonthlyGross,
  computeServerMonthlyGrossDetailed,
  GAME_MONTH_WALL_MS,
  elapsedGameMonths,
} from '../resource-plausibility';
import {
  clampPlausibleMoney,
  plausibleIncomeHeadroom,
  MONEY_HEADROOM_MULT,
  MAX_ABSOLUTE_INCOME_PER_MS,
} from '../ledger-reconcile';

const LAUNCH_SVC = SERVICE_MAP.get('svc_launch_small')!;

/** A live-tick fixture whose gameDate matches the world calendar, so the
 *  tick under test is an ordinary mid-month tick (no month-end lumps). */
function liveState(overrides: Partial<GameState> = {}): GameState {
  const g = getGlobalGameDate();
  return {
    ...getNewGameState(),
    money: 1_000_000_000,
    gameDate: { year: g.year, month: g.month },
    lastTickAt: Date.now(),
    // Row 6 (docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 6): a launch pad needs
    // 1 engineer + 1 operator to run at full efficiency. This suite measures
    // the CLOCK, so it staffs the pad — an unstaffed corporation is a
    // separate (deliberate) 0.5x multiplier tested in workforce-crew.test.ts.
    workforce: { engineers: 1, scientists: 0, miners: 0, operators: 1 },
    activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: g.year, month: g.month }, revenueMultiplier: 1 }],
    buildings: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: g.year, month: g.month }, completionDate: { year: g.year, month: g.month }, isComplete: true, startedAtMs: Date.now() - 10_000_000, realDurationSeconds: 1 }],
    ...overrides,
  };
}

describe('the one game clock', () => {
  it('TICKS_PER_GAME_MONTH is derived from the world calendar, not typed', () => {
    expect(REAL_SECONDS_PER_GAME_MONTH).toBe(21_600);
    expect(TICKS_PER_GAME_MONTH).toBe(REAL_SECONDS_PER_GAME_MONTH / (TICK_INTERVALS[1] / 1000));
    expect(TICKS_PER_GAME_MONTH).toBe(10_800);
    expect(REAL_MS_PER_GAME_MONTH).toBe(21_600_000);
    expect(GAME_MONTH_WALL_MS).toBe(REAL_MS_PER_GAME_MONTH);
    // The plausibility window measures game-months on the same clock.
    expect(elapsedGameMonths(REAL_MS_PER_GAME_MONTH)).toBe(1);
    expect(elapsedGameMonths(12 * 3_600_000)).toBe(2);
  });

  it('one live tick credits monthly revenue / 10,800 (not / 30)', () => {
    const s = liveState();
    const out = processTick(s);
    const earned = out.totalEarned - s.totalEarned;
    const perTickBase = LAUNCH_SVC.revenuePerMonth / TICKS_PER_GAME_MONTH; // ≈ $463
    // Multiplier stack on a fresh corp sits near 1.0; the old clock would
    // have credited 360x this.
    expect(earned).toBeGreaterThan(perTickBase * 0.5);
    expect(earned).toBeLessThan(perTickBase * 2);
    expect(earned).toBeLessThan(LAUNCH_SVC.revenuePerMonth / 30 / 10);
  });

  it('income history stores a monthly run-rate (per-tick net x ticks per month)', () => {
    const s = liveState({ incomeHistory: [] });
    const out = processTick(s);
    expect(out.incomeHistory!.length).toBe(1);
    const runRate = out.incomeHistory![0];
    // Launch pad: $5M/mo revenue vs $2M op + $500K maintenance — a positive
    // monthly run-rate of a few $M, not a few hundred dollars.
    expect(Math.abs(runRate)).toBeGreaterThan(500_000);
    expect(Math.abs(runRate)).toBeLessThan(20_000_000);
  });

  it('sub-unit mining output is carried between ticks instead of rounded away', () => {
    const g = getGlobalGameDate();
    const production = MINING_PRODUCTION.svc_mining_lunar;
    expect(production && production.length > 0).toBe(true);
    let s = liveState({
      activeServices: [{ definitionId: 'svc_mining_lunar', locationId: 'moon_surface', linkedBuildingIds: [], startDate: { year: g.year, month: g.month }, revenueMultiplier: 1 }],
      buildings: [],
      resources: {},
      locationInventories: {},
    });
    const before = { ...s.resources };
    const TICKS = 120;
    for (let i = 0; i < TICKS; i++) s = processTick(s);
    let credited = 0;
    let carried = 0;
    for (const { resource } of production) {
      credited += (s.resources[resource] || 0) - (before[resource] || 0);
      carried += s.fractionalCarry?.[`moon_surface:${resource}`] || 0;
    }
    const expectedUnits = production.reduce((a, p) => a + p.amountPerMonth, 0) * (TICKS / TICKS_PER_GAME_MONTH);
    // Nothing is lost: credited whole units + the carried remainder equal the
    // exact fractional production (multiplier stack ≈ 1 on a fresh corp).
    expect(credited + carried).toBeGreaterThan(expectedUnits * 0.5);
    expect(credited + carried).toBeLessThan(expectedUnits * 2.5);
    expect(carried).toBeGreaterThanOrEqual(0);
    expect(carried).toBeLessThan(production.length); // each key carries < 1 unit
  });
});

describe('state-derived money ceiling', () => {
  it('a profile with no revenue-producing state gets only the tier-1 subsidiary allowance', () => {
    const state = buildServerFlowState({ prevResources: {}, prevBuildingsData: [], prevShipsData: [], prevActiveServices: [], prevResearch: [] });
    const d = computeServerMonthlyGrossDetailed(state, { totalEarned: 0 });
    expect(d.services).toBe(0);
    expect(d.megastructurePassive).toBe(0);
    expect(d.gross).toBe(d.subsidiaries);
  });

  it('services are valued at their definition x documented caps; megastructure allowances gate on totalEarned', () => {
    const state = buildServerFlowState({
      prevResources: {},
      prevBuildingsData: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true }],
      prevShipsData: [],
      prevActiveServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], revenueMultiplier: 1 }],
      prevResearch: [],
    });
    const poor = computeServerMonthlyGrossDetailed(state, { totalEarned: 0 });
    const rich = computeServerMonthlyGrossDetailed(state, { totalEarned: 1_000_000_000_000 });
    expect(poor.services).toBeGreaterThanOrEqual(LAUNCH_SVC.revenuePerMonth);
    expect(Number.isFinite(poor.services)).toBe(true);
    expect(poor.megastructurePassive).toBe(0);
    expect(rich.megastructurePassive).toBeGreaterThan(0);
    expect(rich.gross).toBeGreaterThan(poor.gross);
    expect(computeServerMonthlyGross(state, { totalEarned: 0 })).toBe(poor.gross);
  });

  it('headroom = min(gross x 2 x elapsedMonths, $500/ms x elapsed) — the 60 s window of a $273M corp', () => {
    const gross = 273_000_000;
    const oneMinute = 60_000;
    const stateDerived = gross * MONEY_HEADROOM_MULT * (oneMinute / REAL_MS_PER_GAME_MONTH);
    const backstop = oneMinute * MAX_ABSOLUTE_INCOME_PER_MS;
    expect(plausibleIncomeHeadroom(oneMinute, gross)).toBe(Math.round(Math.min(stateDerived, backstop)));
    // ≈ $1.5M per minute for that corp — the old flat ceiling granted $120M.
    expect(plausibleIncomeHeadroom(oneMinute, gross)).toBeLessThan(2_000_000);
    expect(plausibleIncomeHeadroom(oneMinute, gross)).toBeGreaterThan(1_000_000);
    // Twelve hours away at 100% efficiency is two months of gross — inside the ceiling.
    const twelveHours = 12 * 3_600_000;
    expect(plausibleIncomeHeadroom(twelveHours, gross)).toBeGreaterThanOrEqual(2 * gross);
    // A whale is bounded by the absolute backstop, whatever its gross.
    expect(plausibleIncomeHeadroom(oneMinute, 1e15)).toBe(backstop);
    // No revenue state, no headroom.
    expect(plausibleIncomeHeadroom(oneMinute, 0)).toBe(0);
    expect(clampPlausibleMoney(101, 100, oneMinute, 0).clampedMoney).toBe(100);
  });
});
