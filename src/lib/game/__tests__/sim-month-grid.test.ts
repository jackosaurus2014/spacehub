/**
 * @jest-environment node
 *
 * Month-grid regression for the balance harnesses after the clock
 * unification (docs/BALANCE.md "Clock unification", 2026-09-02).
 *
 *  1. scripts/sim-harness.ts steps ONE game-month per stepMonth() call and
 *     its month is the world calendar's 21,600 s — it never stepped engine
 *     ticks, so the derived TICKS_PER_GAME_MONTH (10,800) changed nothing.
 *     A 12-month single-player fixture is checked against a hand computation
 *     from services.ts × the engine's own structural multipliers.
 *  2. game-engine.ts processTick accepts a `monthFraction` override so the
 *     tick-stepping runner (scripts/balance-archetypes.ts) can step a 30-tick
 *     month exactly as it did before the unification; 30 × (1/30) ticks and
 *     1 × (1) tick must credit the same month, and a default tick must be
 *     1/10,800 of it.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import { processTick } from '../game-engine';
import { TICK_INTERVALS, TICKS_PER_GAME_MONTH } from '../constants';
import { REAL_MS_PER_GAME_MONTH, getGlobalGameDate } from '../server-time';
import { SERVICE_MAP } from '../services';
import { BUILDING_MAP } from '../buildings';
import { corporateOverheadMonthly, executiveCompensationMonthly, serviceSaturationMultiplier } from '../formulas';
import { computePoolAggregates, demandPoolKey, getServiceCategory } from '../demand-pools';
import { computePoolMultiplier } from '../service-pricing';
import { GRADUATION_GLIDE_MS } from '../frontier';
import {
  GAME_MONTH_MS, GRADUATION_GLIDE_GAME_MONTHS, newPlayer, newWorld, stepMonth, makeBuilding,
  bookNetWorth, toActivitySummary,
} from '../../../../scripts/sim-harness';

describe('sim-harness month grid', () => {
  it('the harness month IS the world calendar month, and the engine tick grid derives from it', () => {
    expect(GAME_MONTH_MS).toBe(REAL_MS_PER_GAME_MONTH);
    expect(GAME_MONTH_MS).toBe(21_600_000);
    expect(TICKS_PER_GAME_MONTH * TICK_INTERVALS[1]).toBe(GAME_MONTH_MS);
    // Real-time engine constants convert to harness months on the same clock.
    expect(GRADUATION_GLIDE_GAME_MONTHS).toBe(GRADUATION_GLIDE_MS / REAL_MS_PER_GAME_MONTH);
  });

  it('12 months of a two-building corporation equal the hand computation from services.ts × multipliers', () => {
    // ground_station + mission_control: no power draw, no consumption, no
    // mining — the service stack reduces to revenuePerMonth × saturation(0)
    // × demand-pool multiplier. Solo in an empty world (NPC demand floor).
    const p = newPlayer('fixture', 500_000_000, () => [], { maxBuildsPerMonth: 0 });
    p.buildings.push(makeBuilding('ground_station', 'earth_surface'));
    p.buildings.push(makeBuilding('mission_control', 'earth_surface'));
    const world = newWorld([p]);

    // Hand computation.
    const aggregates = computePoolAggregates([toActivitySummary(p)], 0);
    let expectedRevenue = 0, expectedOperating = 0, expectedMaintenance = 0;
    for (const b of p.buildings) {
      const def = BUILDING_MAP.get(b.definitionId)!;
      expectedMaintenance += def.maintenanceCostPerMonth;
      for (const svcId of def.enabledServices) {
        const svc = SERVICE_MAP.get(svcId)!;
        expectedOperating += svc.operatingCostPerMonth;
        const cat = getServiceCategory(svcId)!;
        const agg = aggregates.get(demandPoolKey(b.locationId, cat))!;
        const poolMult = computePoolMultiplier(agg.dNpc + agg.dDerived, agg.cSupply);
        expectedRevenue += svc.revenuePerMonth * serviceSaturationMultiplier(0) * poolMult;
      }
    }
    const overhead = corporateOverheadMonthly(2);
    expect(expectedRevenue).toBeGreaterThan(0);

    let money = p.money;
    for (let m = 0; m < 12; m++) {
      const nwBefore = bookNetWorth(p);
      expect(nwBefore).toBe(Math.round(money + (30_000_000 + 80_000_000) * 0.6));
      const execComp = executiveCompensationMonthly(nwBefore);
      stepMonth(world, m);
      const row = p.history[m];
      expect(row.month).toBe(m);
      expect(row.revenue).toBeCloseTo(expectedRevenue, 6);
      expect(row.operating).toBeCloseTo(expectedOperating, 6);
      expect(row.maintenance).toBeCloseTo(expectedMaintenance, 6);
      expect(row.overhead).toBeCloseTo(overhead, 6);
      expect(row.execComp).toBeCloseTo(execComp, 6);
      expect(row.inputCost).toBe(0);
      expect(row.net).toBeCloseTo(expectedRevenue - expectedOperating - expectedMaintenance - overhead - execComp, 6);
      money += row.net;
      expect(p.money).toBeCloseTo(money, 6);
    }
    // Legacy row shape: no D4 fields unless opted in.
    expect(p.history[0].buildingLines).toBeUndefined();
    expect(p.history[0].refitCapex).toBeUndefined();
  });

  it('D4 per-building lines sum to the fleet revenue and a Mark II refit multiplies only its own line', () => {
    const p = newPlayer('lines', 5_000_000_000, () => [], {
      maxBuildsPerMonth: 0,
      refitPlan: (pl, month) => (month === 1 ? [{ instanceId: pl.buildings[0].instanceId, target: 2 }] : []),
    });
    p.buildings.push(makeBuilding('ground_station', 'earth_surface'));
    p.buildings.push(makeBuilding('mission_control', 'earth_surface'));
    const world = newWorld([p], 0, null, { trackBuildingLines: true });
    stepMonth(world, 0);
    const r0 = p.history[0];
    const lines0 = r0.buildingLines!;
    const sum0 = Object.values(lines0).reduce((a, l) => a + l.revenue, 0);
    expect(sum0).toBeCloseTo(r0.revenue, 6);
    expect(r0.refits).toBe(0);
    stepMonth(world, 1);
    const r1 = p.history[1];
    expect(r1.refits).toBe(1);
    expect(p.buildings[0].markLevel).toBe(2);
    // Money: getMarkUpgradeCost = 1.5 × $30M plus the materials bill.
    expect(r1.refitCapex).toBeGreaterThanOrEqual(45_000_000);
    expect(r1.capex).toBe(r1.refitCapex);
    const gs0 = lines0[p.buildings[0].instanceId];
    const gs1 = r1.buildingLines![p.buildings[0].instanceId];
    const mc0 = lines0[p.buildings[1].instanceId];
    const mc1 = r1.buildingLines![p.buildings[1].instanceId];
    expect(gs1.revenue).toBeCloseTo(gs0.revenue * 1.6, 6);
    expect(gs1.maintenance).toBeCloseTo(gs0.maintenance * 2.2, 6);
    expect(mc1.revenue).toBeCloseTo(mc0.revenue, 6);
    expect(mc1.maintenance).toBeCloseTo(mc0.maintenance, 6);
    // Book value carries the depreciated refit spend.
    expect(bookNetWorth(p)).toBe(Math.round(p.money + (30_000_000 + 80_000_000) * 0.6 + Math.round(45_000_000 * 0.6)));
  });
});

describe('processTick monthFraction (tick-stepping runners)', () => {
  const LAUNCH_SVC = SERVICE_MAP.get('svc_launch_small')!;

  /** Mid-month live fixture (same shape as clock-unification.test.ts). */
  function liveState(): GameState {
    const g = getGlobalGameDate();
    return {
      ...getNewGameState(),
      money: 1_000_000_000,
      gameDate: { year: g.year, month: g.month },
      lastTickAt: Date.now(),
      workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
      activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: g.year, month: g.month }, revenueMultiplier: 1 }],
      buildings: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: g.year, month: g.month }, completionDate: { year: g.year, month: g.month }, isComplete: true, startedAtMs: Date.now() - 10_000_000, realDurationSeconds: 1 }],
    };
  }

  /** One default tick first: a fresh $1B fixture's first tick is also its
   *  Frontier graduation (frontierGraduatedAtMs is stamped), and the
   *  post-graduation multiplier stack differs from the Frontier one. Every
   *  grid must be compared from the same settled state. */
  function settled(): GameState {
    return processTick(liveState());
  }

  it('30 ticks at 1/30 (the pre-unification grid) and 1 tick at 1 credit the same month', () => {
    const base = settled();
    let s30 = base;
    for (let t = 0; t < 30; t++) s30 = processTick(s30, { monthFraction: 1 / 30 });
    const s1 = processTick(base, { monthFraction: 1 });
    const earned30 = s30.totalEarned - base.totalEarned;
    const earned1 = s1.totalEarned - base.totalEarned;
    expect(earned1).toBeGreaterThan(LAUNCH_SVC.revenuePerMonth * 0.5);
    expect(Math.abs(earned30 - earned1) / earned1).toBeLessThan(0.005);
    expect(Math.abs((s30.money - base.money) - (s1.money - base.money)) / Math.abs(s1.money - base.money)).toBeLessThan(0.01);
  });

  it('a default tick is 1/10,800 of a whole-month tick, and out-of-range overrides fall back', () => {
    const base = settled();
    const whole = processTick(base, { monthFraction: 1 }).totalEarned - base.totalEarned;
    const one = processTick(base).totalEarned - base.totalEarned;
    expect(Math.abs(one * TICKS_PER_GAME_MONTH - whole) / whole).toBeLessThan(0.01);
    expect(processTick(base, { monthFraction: 0 }).totalEarned - base.totalEarned).toBe(one);
    expect(processTick(base, { monthFraction: 5 }).totalEarned - base.totalEarned).toBe(one);
  });
});
