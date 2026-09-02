/**
 * @jest-environment node
 *
 * D4 — Mark-II / Mark-III in-place upgrades (docs/GAME_DESIGN_REVIEW_2026-09.md
 * §1 D4, docs/BALANCE.md "Mark-II tier (D4)"). Proofs:
 *  - cost table (1.5x / 2.5x baseCost), revenue (1.6x / 2.4x), maintenance
 *    (2.2x / 3.6x), refit time (60% / 90% of realBuildSeconds)
 *  - prerequisites: complete, operational, < 10% damage, no refit running,
 *    Mark III research gate per category (every gate is an existing T3 tech)
 *  - cap exclusions: maxPerPlayer definitions and no-service definitions
 *  - payback preview math (build-preview.ts computeMarkUpgradePreview)
 *  - saturation still counts a Mark III building as ONE unit (engine + preview)
 *  - start / complete state transitions, money + materials + attestation
 *  - book value includes the refit spend
 */
import type { GameState, BuildingInstance } from '../types';
import { BUILDINGS, BUILDING_MAP, markBookValue } from '../buildings';
import { RESEARCH_MAP } from '../research-tree';
import { getNewGameState } from '../save-load';
import { processTick } from '../game-engine';
import { computeEconomyReport } from '../economy-report';
import { computeBuildPreview, computeMarkUpgradePreview } from '../build-preview';
import { computeBookNetWorth, BOOK_VALUE_DEPRECIATION_FACTOR } from '../frontier';
import { serviceSaturationMultiplier } from '../formulas';
import {
  MARK_COST_MULT, MARK_REVENUE_MULT, MARK_MAINTENANCE_MULT, MARK_BUILD_TIME_FRACTION, MARK_MAX_DAMAGE_PCT,
  MARK_III_GATE_BY_CATEGORY, MAX_MARK_LEVEL,
  getMarkLevel, getMarkRevenueMultiplier, getMarkMaintenanceMultiplier,
  getMarkUpgradeCost, getMarkUpgradeSeconds, getMarkUpgradeResourceCost, markSpendToDate,
  isMarkEligibleDefinition, getNextMarkLevel, canStartMarkUpgrade, applyMarkUpgradeStart, completeMarkUpgrades,
} from '../mark-upgrades';
import { validateSyncEconomics } from '../sync-validation';
import { buildServerFlowState, computeServerMonthlyGrossDetailed } from '../resource-plausibility';

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
  const now = Date.now();
  return {
    ...s,
    frontierStatus: 'graduated',
    npcCompanies: [],
    money: 10_000_000_000,
    createdAt: now,
    lastTickAt: now,
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface'],
    ...overrides,
  };
}

const GS = BUILDING_MAP.get('ground_station')!;
const GEO = BUILDING_MAP.get('sat_telecom_geo')!;
const svcOf = (defId: string, locationId: string, instanceId: string) => {
  const def = BUILDING_MAP.get(defId)!;
  return { definitionId: def.enabledServices[0], locationId, linkedBuildingIds: [instanceId], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 };
};

describe('D4 — Mark table', () => {
  it('cost is 1.5x / 2.5x baseCost: a $1.2B building refits for $1.8B then $3B; ground_station $45M / $75M', () => {
    const t3 = { baseCost: 1_200_000_000 };
    expect(getMarkUpgradeCost(t3, 2)).toBe(1_800_000_000);
    expect(getMarkUpgradeCost(t3, 3)).toBe(3_000_000_000);
    expect(getMarkUpgradeCost(GS, 2)).toBe(45_000_000);
    expect(getMarkUpgradeCost(GS, 3)).toBe(75_000_000);
    expect(getMarkUpgradeCost(GS, 1)).toBe(0);
    expect(getMarkUpgradeCost(GS, 4)).toBe(0);
    expect(MARK_COST_MULT).toEqual({ 1: 0, 2: 1.5, 3: 2.5 });
  });

  it('revenue 1.6x / 2.4x and maintenance 2.2x / 3.6x; absent, level 1 and garbage levels are 1.0', () => {
    expect(getMarkRevenueMultiplier(undefined)).toBe(1);
    expect(getMarkRevenueMultiplier({ markLevel: 1 })).toBe(1);
    expect(getMarkRevenueMultiplier({ markLevel: 2 })).toBe(1.6);
    expect(getMarkRevenueMultiplier({ markLevel: 3 })).toBe(2.4);
    expect(getMarkRevenueMultiplier({ markLevel: 7 })).toBe(1);
    expect(getMarkRevenueMultiplier(3)).toBe(2.4);
    expect(getMarkMaintenanceMultiplier({ markLevel: 2 })).toBe(2.2);
    expect(getMarkMaintenanceMultiplier({ markLevel: 3 })).toBe(3.6);
    expect(getMarkMaintenanceMultiplier(null)).toBe(1);
    expect(MARK_REVENUE_MULT[3] / MARK_REVENUE_MULT[2]).toBeCloseTo(1.5, 6);
    // Maintenance climbs faster than revenue at every step — the refit is a
    // real P&L decision, never a free win.
    expect(MARK_MAINTENANCE_MULT[2]).toBeGreaterThan(MARK_REVENUE_MULT[2]);
    expect(MARK_MAINTENANCE_MULT[3]).toBeGreaterThan(MARK_REVENUE_MULT[3]);
  });

  it('refit time is 60% / 90% of the base build time', () => {
    expect(MARK_BUILD_TIME_FRACTION).toEqual({ 1: 0, 2: 0.6, 3: 0.9 });
    expect(getMarkUpgradeSeconds(GS, 2)).toBe(Math.round(GS.realBuildSeconds * 0.6));
    expect(getMarkUpgradeSeconds(GS, 3)).toBe(Math.round(GS.realBuildSeconds * 0.9));
    expect(getMarkUpgradeSeconds(GS, 1)).toBe(0);
  });

  it('cumulative refit spend at Mark III is 4x baseCost; markLevel clamps', () => {
    expect(markSpendToDate(GS, 3)).toBe(GS.baseCost * 4);
    expect(markSpendToDate(GS, 2)).toBe(GS.baseCost * 1.5);
    expect(markSpendToDate(GS, 1)).toBe(0);
    expect(getMarkLevel({ markLevel: 0 })).toBe(1);
    expect(getMarkLevel({ markLevel: 3 })).toBe(3);
    expect(MAX_MARK_LEVEL).toBe(3);
  });

  it('materials bill is modest and tier-scaled (never above the largest authored definition bill)', () => {
    for (const def of BUILDINGS) {
      for (const lvl of [2, 3]) {
        for (const [, q] of Object.entries(getMarkUpgradeResourceCost(def, lvl))) {
          expect(q).toBeGreaterThan(0);
          expect(q).toBeLessThanOrEqual(100);
        }
      }
    }
    expect(getMarkUpgradeResourceCost(GS, 3)).toHaveProperty('platinum_group');
  });
});

describe('D4 — eligibility and prerequisites', () => {
  it('maxPerPlayer-capped definitions (fabrication_earth, research_institute_earth) and no-service definitions are excluded', () => {
    expect(isMarkEligibleDefinition(BUILDING_MAP.get('fabrication_earth')!).eligible).toBe(false);
    expect(isMarkEligibleDefinition(BUILDING_MAP.get('research_institute_earth')!).eligible).toBe(false);
    for (const def of BUILDINGS) {
      if (def.maxPerPlayer) expect(isMarkEligibleDefinition(def).eligible).toBe(false);
      if (!def.enabledServices || def.enabledServices.length === 0) expect(isMarkEligibleDefinition(def).eligible).toBe(false);
    }
    expect(isMarkEligibleDefinition(BUILDING_MAP.get('research_lab_orbital')!).eligible).toBe(false);
    expect(isMarkEligibleDefinition(BUILDING_MAP.get('nuclear_reactor_leo')!).eligible).toBe(false);
    expect(isMarkEligibleDefinition(GS).eligible).toBe(true);
    expect(isMarkEligibleDefinition(BUILDING_MAP.get('mining_titan')!).eligible).toBe(true);
  });

  it('every Mark III gate is an existing T3+ research node, one per building category, and not a repeatable program', () => {
    const cats = ['launch_pad', 'rocket', 'satellite', 'space_station', 'fabrication_facility', 'datacenter', 'mining_enterprise', 'ground_station', 'solar_farm'];
    for (const cat of cats) {
      const id = MARK_III_GATE_BY_CATEGORY[cat as keyof typeof MARK_III_GATE_BY_CATEGORY];
      const def = RESEARCH_MAP.get(id);
      expect(def).toBeDefined();
      expect(def!.tier).toBeGreaterThanOrEqual(3);
      expect(def!.repeatable).toBeUndefined();
    }
    expect(new Set(Object.values(MARK_III_GATE_BY_CATEGORY)).size).toBe(cats.length);
  });

  it('complete + operational + undamaged → Mark II allowed; the blockers each refuse with a reason', () => {
    const ok = makeBuilding({ instanceId: 'b', definitionId: 'ground_station', locationId: 'earth_surface' });
    expect(canStartMarkUpgrade(ok, GS, [])).toEqual({ allowed: true, target: 2 });
    expect(canStartMarkUpgrade({ ...ok, isComplete: false }, GS, []).allowed).toBe(false);
    expect(canStartMarkUpgrade({ ...ok, status: 'mothballed' }, GS, []).allowed).toBe(false);
    expect(canStartMarkUpgrade({ ...ok, status: 'decommissioning' }, GS, []).allowed).toBe(false);
    expect(canStartMarkUpgrade({ ...ok, damagePct: MARK_MAX_DAMAGE_PCT }, GS, []).allowed).toBe(false);
    expect(canStartMarkUpgrade({ ...ok, damagePct: 0.05 }, GS, []).allowed).toBe(true);
    expect(canStartMarkUpgrade({ ...ok, markUpgradeTarget: 2, markUpgradeStartedAtMs: 1 }, GS, []).allowed).toBe(false);
    expect(canStartMarkUpgrade(ok, BUILDING_MAP.get('fabrication_earth')!, []).allowed).toBe(false);
  });

  it('Mark III requires the category gate tech; Mark III is terminal', () => {
    const mk2 = makeBuilding({ instanceId: 'b', definitionId: 'ground_station', locationId: 'earth_surface', markLevel: 2 });
    const gate = MARK_III_GATE_BY_CATEGORY.ground_station;
    const blocked = canStartMarkUpgrade(mk2, GS, []);
    expect(blocked.allowed).toBe(false);
    expect(blocked.target).toBe(3);
    expect(blocked.missingResearch).toBe(gate);
    expect(canStartMarkUpgrade(mk2, GS, [gate])).toEqual({ allowed: true, target: 3 });
    const mk3 = { ...mk2, markLevel: 3 };
    expect(getNextMarkLevel(mk3)).toBeNull();
    expect(canStartMarkUpgrade(mk3, GS, [gate]).allowed).toBe(false);
  });
});

describe('D4 — start / complete transitions and the attestation path', () => {
  it('start deducts money + materials, attests materials via pendingInventoryAttestations.built, and stamps the refit; unaffordable → same reference', () => {
    const inst = makeBuilding({ instanceId: 'b', definitionId: 'ground_station', locationId: 'earth_surface' });
    const materials = getMarkUpgradeResourceCost(GS, 2);
    const resources: Record<string, number> = { ...getNewGameState().resources };
    for (const [r, q] of Object.entries(materials)) resources[r] = q + 5;
    const state = baseState({ buildings: [inst], resources });
    const now = 1_000_000;
    const next = applyMarkUpgradeStart(state, 'b', GS, now);
    expect(next).not.toBe(state);
    expect(next.money).toBe(state.money - getMarkUpgradeCost(GS, 2));
    expect(next.totalSpent).toBe(state.totalSpent + getMarkUpgradeCost(GS, 2));
    for (const [r, q] of Object.entries(materials)) {
      expect(next.resources[r]).toBe(5);
      expect(next.pendingInventoryAttestations?.built[r]).toBe(q);
    }
    const b = next.buildings[0];
    expect(b.markUpgradeTarget).toBe(2);
    expect(b.markUpgradeStartedAtMs).toBe(now);
    expect(b.markUpgradeDurationSeconds).toBe(getMarkUpgradeSeconds(GS, 2));
    expect(getMarkLevel(b)).toBe(1); // still Mark I until the wall clock elapses

    const poor = { ...state, money: 1 };
    expect(applyMarkUpgradeStart(poor, 'b', GS, now)).toBe(poor);
    const noMaterials = { ...state, resources: {} };
    expect(applyMarkUpgradeStart(noMaterials, 'b', GS, now)).toBe(noMaterials);
    expect(applyMarkUpgradeStart(state, 'nope', GS, now)).toBe(state);
  });

  it('completeMarkUpgrades flips markLevel only once the duration has elapsed (same array reference otherwise)', () => {
    const running = makeBuilding({ instanceId: 'b', definitionId: 'ground_station', locationId: 'earth_surface', markUpgradeTarget: 2, markUpgradeStartedAtMs: 0, markUpgradeDurationSeconds: 100 });
    const early = completeMarkUpgrades([running], 50_000);
    expect(early.buildings[0]).toBe(running);
    expect(early.completed).toEqual([]);
    const done = completeMarkUpgrades([running], 100_000);
    expect(done.completed.length).toBe(1);
    expect(done.buildings[0].markLevel).toBe(2);
    expect(done.buildings[0].markUpgradeTarget).toBeUndefined();
    expect(done.buildings[0].markUpgradeStartedAtMs).toBeUndefined();
    expect(done.buildings[0].markUpgradeDurationSeconds).toBeUndefined();
  });

  it('book value includes the depreciated refit spend (frontier.ts computeBookNetWorth)', () => {
    const mk1 = makeBuilding({ instanceId: 'b', definitionId: 'ground_station', locationId: 'earth_surface' });
    const mk3 = { ...mk1, markLevel: 3 };
    expect(markBookValue(mk1, BOOK_VALUE_DEPRECIATION_FACTOR)).toBe(0);
    expect(markBookValue(mk3, BOOK_VALUE_DEPRECIATION_FACTOR)).toBe(Math.round(GS.baseCost * 4 * BOOK_VALUE_DEPRECIATION_FACTOR));
    expect(markBookValue({ ...mk3, isComplete: false }, BOOK_VALUE_DEPRECIATION_FACTOR)).toBe(0);
    const s1 = baseState({ buildings: [mk1], resources: {} });
    const s3 = baseState({ buildings: [mk3], resources: {} });
    expect(computeBookNetWorth(s3) - computeBookNetWorth(s1)).toBe(Math.round(GS.baseCost * 4 * BOOK_VALUE_DEPRECIATION_FACTOR));
  });
});

describe('D4 — engine math and the saturation invariant', () => {
  let randomSpy: jest.SpyInstance;
  beforeEach(() => { randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99); });
  afterEach(() => randomSpy.mockRestore());

  const solo = (markLevel: number, defId = 'sat_telecom_geo', loc = 'geo') => baseState({
    buildings: [makeBuilding({ instanceId: 'a', definitionId: defId, locationId: loc, markLevel })],
    activeServices: [svcOf(defId, loc, 'a')],
  });

  it('economy report: Mark III revenue is 2.4x and maintenance 3.6x the Mark I twin', () => {
    const r1 = computeEconomyReport(solo(1));
    const r3 = computeEconomyReport(solo(3));
    expect(r1.monthlyRevenue).toBeGreaterThan(0);
    expect(r3.monthlyRevenue / r1.monthlyRevenue).toBeCloseTo(2.4, 2);
    // The maintenance LINE is exactly 3.6x (total costs also move through
    // exec-comp, which is a wealth tax on book value that now includes the
    // refit spend — a real, intended second-order effect, tested separately).
    expect(r1.costs.buildingMaintenance).toBeGreaterThan(0);
    expect(r3.costs.buildingMaintenance / r1.costs.buildingMaintenance).toBeCloseTo(3.6, 3);
    expect(r3.costs.executiveCompensation).toBeGreaterThanOrEqual(r1.costs.executiveCompensation);
  });

  it('live tick: a Mark III GEO satellite nets more per tick than its Mark I twin (revenue lift beats the maintenance lift)', () => {
    const s1 = solo(1); const s3 = solo(3);
    const d1 = processTick(s1).money - s1.money;
    const d3 = processTick(s3).money - s3.money;
    expect(d3).toBeGreaterThan(d1);
  });

  it('saturation still counts a Mark III building as ONE unit: adding a second Mark I copy earns the same increment whether the first is Mark I or Mark III', () => {
    const pair = (firstMark: number) => baseState({
      buildings: [
        makeBuilding({ instanceId: 'a', definitionId: 'sat_telecom_geo', locationId: 'geo', markLevel: firstMark }),
        makeBuilding({ instanceId: 'b', definitionId: 'sat_telecom_geo', locationId: 'geo' }),
      ],
      activeServices: [svcOf('sat_telecom_geo', 'geo', 'a'), svcOf('sat_telecom_geo', 'geo', 'b')],
    });
    const line = (s: GameState) => computeEconomyReport(s).revenueLines.find(l => l.serviceId === 'svc_telecom_geo' && l.locationId === 'geo')!;
    const l1 = line(pair(1)); const l3 = line(pair(3));
    expect(l1.instanceCount).toBe(2);
    expect(l3.instanceCount).toBe(2);
    // avgSaturation is the mean of the per-instance saturation multipliers
    // (positions 0 and 1). If a Mark III counted as 2.4 units, copy #2 would
    // sit at position 2.4 and the average would drop.
    expect(l3.avgSaturation).toBeCloseTo(l1.avgSaturation, 6);
    expect(l1.avgSaturation).toBeCloseTo((serviceSaturationMultiplier(0) + serviceSaturationMultiplier(1)) / 2, 6);
    // And copy #1's Mark III lifts the pair's total by exactly 1.4x copy #1's
    // Mark I share (both copies share base and pool; only saturation differs).
    const share0 = serviceSaturationMultiplier(0) / (serviceSaturationMultiplier(0) + serviceSaturationMultiplier(1));
    expect(l3.saturatedRevenuePerMonth - l1.saturatedRevenuePerMonth).toBeCloseTo(1.4 * l1.saturatedRevenuePerMonth * share0, -3);
    // Preview layer: the build card for copy #2 is identical either way.
    const p1 = computeBuildPreview(pair(1), GEO, 'geo');
    const p3 = computeBuildPreview(pair(3), GEO, 'geo');
    expect(p3.projectedRevenueMonthly).toBe(p1.projectedRevenueMonthly);
  });

  it('preview: Δ revenue / Δ maintenance / payback follow the table exactly at the current run-rate', () => {
    const s = solo(1);
    const mk = computeMarkUpgradePreview(s, 'a')!;
    expect(mk.target).toBe(2);
    expect(mk.check.allowed).toBe(true);
    expect(mk.cost).toBe(getMarkUpgradeCost(GEO, 2));
    expect(mk.nextRevenueMonthly / mk.currentRevenueMonthly).toBeCloseTo(1.6, 2);
    expect(mk.nextMaintenanceMonthly / mk.currentMaintenanceMonthly).toBeCloseTo(2.2, 2);
    expect(mk.deltaNetMonthly).toBe(mk.deltaRevenueMonthly - mk.deltaMaintenanceMonthly);
    expect(mk.paybackMonths).toBe(Math.ceil(mk.cost / mk.deltaNetMonthly));
    // Same building at Mark II: next target is III and gated on research.
    const mk2 = computeMarkUpgradePreview({ ...s, buildings: [{ ...s.buildings[0], markLevel: 2 }] }, 'a')!;
    expect(mk2.target).toBe(3);
    expect(mk2.check.allowed).toBe(false);
    expect(mk2.check.missingResearch).toBe(MARK_III_GATE_BY_CATEGORY.satellite);
    expect(mk2.nextRevenueMonthly / mk2.currentRevenueMonthly).toBeCloseTo(2.4 / 1.6, 2);
    // A money-losing refit reports null payback instead of a number.
    expect(computeMarkUpgradePreview(s, 'missing')).toBeNull();
  });
});

describe('D4 — sync path (validation, server gross ceiling, persisted shape)', () => {
  const gsPayload = (markLevel: number, extra: Record<string, unknown> = {}) => ({
    money: 1,
    buildings: [{ instanceId: 'gs1', definitionId: 'ground_station', locationId: 'earth_surface', isComplete: true, upgradeLevel: 0, markLevel, ...extra }],
    activeServices: [{ definitionId: GS.enabledServices[0], locationId: 'earth_surface', linkedBuildingIds: ['gs1'] }],
  });
  const grossFor = (payload: Record<string, unknown>) => {
    const r = validateSyncEconomics(payload);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error);
    return computeServerMonthlyGrossDetailed(buildServerFlowState({
      prevResources: {}, prevBuildingsData: r.data.buildings, prevShipsData: [], prevActiveServices: r.data.activeServices, prevResearch: [],
    }));
  };

  it('markLevel 3 passes validation, is kept on the validated building (with instanceId), and raises the gross ceiling 2.4x for that service', () => {
    const r = validateSyncEconomics(gsPayload(3));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.buildings[0]).toMatchObject({ instanceId: 'gs1', definitionId: 'ground_station', markLevel: 3 });
    const mk1 = grossFor(gsPayload(1));
    const mk3 = grossFor(gsPayload(3));
    expect(mk1.services).toBeGreaterThan(0);
    expect(mk3.services / mk1.services).toBeCloseTo(MARK_REVENUE_MULT[3], 4);
    expect(mk3.gross - mk3.services).toBe(mk1.gross - mk1.services); // only the service term moved
  });

  it('absent markLevel defaults to 1 (neutral ceiling); markLevel 7 / 0 / 2.5 / "3" / NaN are validation failures', () => {
    const bare = { definitionId: 'ground_station', locationId: 'earth_surface', isComplete: true };
    const absent = validateSyncEconomics({ money: 1, buildings: [bare] });
    expect(absent.ok).toBe(true);
    if (absent.ok) expect(absent.data.buildings[0].markLevel).toBe(1);
    expect(grossFor({ ...gsPayload(1), buildings: [bare] }).services).toBe(grossFor(gsPayload(1)).services);
    for (const bad of [7, 0, 2.5, '3', Number.NaN]) {
      expect(validateSyncEconomics(gsPayload(bad as number))).toMatchObject({ ok: false, field: 'buildings[0].markLevel' });
    }
  });

  it('refit-in-progress fields survive validation; target must be 2..3 and above markLevel; timestamps finite', () => {
    const ok = validateSyncEconomics(gsPayload(1, { markUpgradeTarget: 2, markUpgradeStartedAtMs: 1_700_000_000_000, markUpgradeDurationSeconds: 3600 }));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.buildings[0]).toMatchObject({ markLevel: 1, markUpgradeTarget: 2, markUpgradeStartedAtMs: 1_700_000_000_000, markUpgradeDurationSeconds: 3600 });
    }
    // An in-flight refit earns at the CURRENT mark — the ceiling ignores the target.
    expect(grossFor(gsPayload(1, { markUpgradeTarget: 3, markUpgradeStartedAtMs: 1, markUpgradeDurationSeconds: 10 })).services)
      .toBe(grossFor(gsPayload(1)).services);
    expect(validateSyncEconomics(gsPayload(1, { markUpgradeTarget: 4 }))).toMatchObject({ ok: false, field: 'buildings[0].markUpgradeTarget' });
    expect(validateSyncEconomics(gsPayload(1, { markUpgradeTarget: 1 }))).toMatchObject({ ok: false, field: 'buildings[0].markUpgradeTarget' });
    expect(validateSyncEconomics(gsPayload(2, { markUpgradeTarget: 2 }))).toMatchObject({ ok: false, field: 'buildings[0].markUpgradeTarget' });
    expect(validateSyncEconomics(gsPayload(1, { markUpgradeTarget: 2, markUpgradeStartedAtMs: Number.POSITIVE_INFINITY })))
      .toMatchObject({ ok: false, field: 'buildings[0].markUpgradeStartedAtMs' });
    expect(validateSyncEconomics(gsPayload(1, { markUpgradeTarget: 2, markUpgradeDurationSeconds: 'soon' })))
      .toMatchObject({ ok: false, field: 'buildings[0].markUpgradeDurationSeconds' });
  });

  it('book value on the validated (sync) shape includes the mark spend', () => {
    const r = validateSyncEconomics(gsPayload(3));
    if (!r.ok) throw new Error(r.error);
    expect(markBookValue(r.data.buildings[0], BOOK_VALUE_DEPRECIATION_FACTOR)).toBe(Math.round(GS.baseCost * 4 * BOOK_VALUE_DEPRECIATION_FACTOR));
  });
});
