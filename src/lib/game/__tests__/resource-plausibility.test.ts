/**
 * Server-authoritative inventory phase 1 — per-resource plausibility clamp.
 * docs/SECURITY_AUDIT_2026-09.md "Server-authoritative inventory — phase 1".
 *
 * Fixture: two mines (lunar ice → svc_mining_lunar, Mars → svc_mining_mars)
 * and one refinery (propellant_plant_lunar: 30 lunar_water → 20 rocket_fuel).
 */
import {
  computeResourceCeilings,
  computeMaxProductionPerMonth,
  buildServerFlowState,
  clampResources,
  ceilingFor,
  flatFloor,
  elapsedGameMonths,
  selectCeilingsToStash,
  readResourceStash,
  serverSellableQuantity,
  getResourceClampMode,
  RESOURCE_SLACK,
  FLAT_FLOOR_MIN,
  FLAT_FLOOR_FRACTION,
  GAME_MONTH_WALL_MS,
  MIN_ELAPSED_MS,
  MAX_ELAPSED_MS,
  MAX_BUILDING_MINING_CLIENT_MULT,
  MAX_SHIP_MINING_CLIENT_MULT,
  MAX_SHIP_MODULE_MINING_MULT,
  MAX_MEGASTRUCTURE_MINING_MULT,
  MEGASTRUCTURE_PASSIVE_CEILING,
  RESOURCE_BASELINE_KEY,
  RESOURCE_CEILINGS_KEY,
  RESOURCE_CEILINGS_MAX_KEYS,
} from '../resource-plausibility';
import { MINING_PRODUCTION } from '../resources';
import { BUILDING_MAP } from '../buildings';
import { TICK_INTERVALS, TICKS_PER_GAME_MONTH } from '../constants';

const gd = { year: 2126, month: 1 };
function building(instanceId: string, definitionId: string, locationId: string) {
  return {
    instanceId, definitionId, locationId,
    buildStartDate: gd, completionDate: gd, isComplete: true,
    startedAtMs: 0, realDurationSeconds: 0,
  };
}
function service(definitionId: string, locationId: string, linkedBuildingIds: string[]) {
  return { definitionId, locationId, linkedBuildingIds, startDate: gd, revenueMultiplier: 1 };
}

const FIXTURE = {
  prevBuildingsData: [
    building('b-lunar', 'mining_lunar_ice', 'lunar_surface'),
    building('b-mars', 'mining_mars', 'mars_surface'),
    building('b-ref', 'propellant_plant_lunar', 'lunar_surface'),
  ],
  prevActiveServices: [
    service('svc_mining_lunar', 'lunar_surface', ['b-lunar']),
    service('svc_mining_mars', 'mars_surface', ['b-mars']),
  ],
  prevShipsData: [],
  prevResearch: [] as string[],
};

const passive = (r: string) => MEGASTRUCTURE_PASSIVE_CEILING[r] || 0;
const lunarWaterBase = MINING_PRODUCTION.svc_mining_lunar.find(p => p.resource === 'lunar_water')!.amountPerMonth;
const ironBase = MINING_PRODUCTION.svc_mining_mars.find(p => p.resource === 'iron')!.amountPerMonth;
const fuelBase = BUILDING_MAP.get('propellant_plant_lunar')!.producesPerMonth!.rocket_fuel!;

describe('constants', () => {
  it('derives the game-month wall clock from the engine constants (60 s at 1×)', () => {
    expect(GAME_MONTH_WALL_MS).toBe(TICKS_PER_GAME_MONTH * TICK_INTERVALS[1]);
    expect(GAME_MONTH_WALL_MS).toBe(60_000);
  });

  it('exports the tunables the audit doc cites', () => {
    expect(RESOURCE_SLACK).toBe(3);
    expect(FLAT_FLOOR_MIN).toBe(100);
    expect(FLAT_FLOOR_FRACTION).toBe(0.25);
    expect(MIN_ELAPSED_MS).toBe(5_000);
    expect(MAX_ELAPSED_MS).toBe(30 * 24 * 3600_000);
  });

  it('client-only multiplier caps are finite products > 1, derived where possible', () => {
    expect(MAX_BUILDING_MINING_CLIENT_MULT).toBeGreaterThan(1);
    expect(Number.isFinite(MAX_BUILDING_MINING_CLIENT_MULT)).toBe(true);
    expect(MAX_SHIP_MINING_CLIENT_MULT).toBeGreaterThan(1);
    // Derived from getShipDerivedStats(...).moduleSlots — must not silently read as 1.
    expect(MAX_SHIP_MODULE_MINING_MULT).toBeGreaterThan(1);
    expect(MAX_MEGASTRUCTURE_MINING_MULT).toBeGreaterThanOrEqual(2.0); // ≥ the largest single term
    expect(passive('iron')).toBeGreaterThan(0);
  });
});

describe('elapsedGameMonths', () => {
  it('clamps to the 5 s floor and 30 d cap', () => {
    expect(elapsedGameMonths(0)).toBeCloseTo(MIN_ELAPSED_MS / GAME_MONTH_WALL_MS, 10);
    expect(elapsedGameMonths(-5)).toBeCloseTo(MIN_ELAPSED_MS / GAME_MONTH_WALL_MS, 10);
    expect(elapsedGameMonths(Number.NaN)).toBeCloseTo(MIN_ELAPSED_MS / GAME_MONTH_WALL_MS, 10);
    expect(elapsedGameMonths(365 * 24 * 3600_000)).toBeCloseTo(MAX_ELAPSED_MS / GAME_MONTH_WALL_MS, 10);
    expect(elapsedGameMonths(60_000)).toBe(1);
    expect(elapsedGameMonths(600_000)).toBe(10);
  });
});

describe('computeMaxProductionPerMonth (2 mines + 1 refinery)', () => {
  const state = buildServerFlowState({ prevResources: {}, ...FIXTURE });
  const prod = computeMaxProductionPerMonth(state);

  it('mining output = base × building client-multiplier cap (+ megastructure allowance)', () => {
    expect(prod.lunar_water).toBeCloseTo(lunarWaterBase * MAX_BUILDING_MINING_CLIENT_MULT + passive('lunar_water'), 6);
    expect(prod.iron).toBeCloseTo(ironBase * MAX_BUILDING_MINING_CLIENT_MULT + passive('iron'), 6);
  });

  it('industry output has no client multiplier: refinery yields exactly its base', () => {
    expect(prod.rocket_fuel).toBeCloseTo(fuelBase + passive('rocket_fuel'), 6);
  });

  it('only inflows count — the refinery consuming lunar_water does not lower its ceiling', () => {
    const withoutRefinery = computeMaxProductionPerMonth(buildServerFlowState({
      prevResources: {},
      ...FIXTURE,
      prevBuildingsData: FIXTURE.prevBuildingsData.slice(0, 2),
    }));
    expect(prod.lunar_water).toBeCloseTo(withoutRefinery.lunar_water, 6);
  });

  it('a profile with nothing built produces only the megastructure allowance', () => {
    const empty = computeMaxProductionPerMonth(buildServerFlowState({
      prevResources: {}, prevBuildingsData: [], prevShipsData: [], prevActiveServices: [], prevResearch: [],
    }));
    expect(empty.rocket_fuel ?? 0).toBe(passive('rocket_fuel'));
    expect(empty.lunar_water ?? 0).toBe(passive('lunar_water'));
    expect(empty.antimatter_precursors ?? 0).toBe(0);
  });

  it('never throws on garbage rows', () => {
    expect(() => computeMaxProductionPerMonth(buildServerFlowState({
      prevResources: null,
      prevBuildingsData: [{ definitionId: 'nope', isComplete: true }],
      prevShipsData: [{ definitionId: 'nope', isBuilt: true, status: 'mining', miningOperation: { resourceId: 'iron' } }],
      prevActiveServices: [{ definitionId: 'svc_nope' }],
      prevResearch: null,
    }))).not.toThrow();
  });
});

describe('ceiling math', () => {
  it('flat floor = max(100, 25% of prev)', () => {
    expect(flatFloor(0)).toBe(FLAT_FLOOR_MIN);
    expect(flatFloor(100)).toBe(FLAT_FLOOR_MIN);
    expect(flatFloor(1000)).toBe(250);
    expect(flatFloor(Number.NaN)).toBe(FLAT_FLOOR_MIN);
  });

  it('ceiling = prev + max(0, ledgerDelta) + SLACK × prod × months + floor', () => {
    expect(ceilingFor(1000, 50, 10, 2)).toBe(1000 + 50 + RESOURCE_SLACK * 10 * 2 + 250);
    // negative ledger deltas (escrow) are never subtracted — upward-only
    expect(ceilingFor(1000, -400, 10, 2)).toBe(1000 + 0 + RESOURCE_SLACK * 10 * 2 + 250);
    expect(ceilingFor(undefined, undefined, undefined, 1)).toBe(FLAT_FLOOR_MIN);
  });

  it('computeResourceCeilings on the fixture, one game month elapsed, with ledger deltas', () => {
    const { ceilings, prodPerMonth, elapsedMonths } = computeResourceCeilings({
      prevResources: { lunar_water: 1000, iron: 40, rocket_fuel: 0 },
      ...FIXTURE,
      ledgerDeltas: { lunar_water: 50, iron: -30, titanium: 5 },
      elapsedMs: 60_000,
    });
    expect(elapsedMonths).toBe(1);
    expect(ceilings.lunar_water).toBeCloseTo(1000 + 50 + RESOURCE_SLACK * prodPerMonth.lunar_water + 250, 6);
    expect(ceilings.iron).toBeCloseTo(40 + 0 + RESOURCE_SLACK * prodPerMonth.iron + 100, 6);
    expect(ceilings.rocket_fuel).toBeCloseTo(0 + RESOURCE_SLACK * prodPerMonth.rocket_fuel + 100, 6);
    // A ledger-only slug still gets a ceiling (prev 0 + delta + floor [+ allowance]).
    expect(ceilings.titanium).toBeCloseTo(5 + RESOURCE_SLACK * (prodPerMonth.titanium || 0) + 100, 6);
    // Producible-but-unheld slugs get one too.
    expect(ceilings.helium3).toBeGreaterThan(FLAT_FLOOR_MIN);
  });

  it('slack scales with elapsed time (10 months ≈ 10× the production term)', () => {
    const a = computeResourceCeilings({ prevResources: { iron: 0 }, ...FIXTURE, ledgerDeltas: {}, elapsedMs: 60_000 });
    const b = computeResourceCeilings({ prevResources: { iron: 0 }, ...FIXTURE, ledgerDeltas: {}, elapsedMs: 600_000 });
    expect(b.ceilings.iron - 100).toBeCloseTo((a.ceilings.iron - 100) * 10, 6);
  });

  it('elapsed clamp: 0 ms and 1 year give the floor/cap month counts', () => {
    const lo = computeResourceCeilings({ prevResources: { iron: 0 }, ...FIXTURE, ledgerDeltas: {}, elapsedMs: 0 });
    const hi = computeResourceCeilings({ prevResources: { iron: 0 }, ...FIXTURE, ledgerDeltas: {}, elapsedMs: 365 * 24 * 3600_000 });
    expect(lo.elapsedMonths).toBeCloseTo(MIN_ELAPSED_MS / GAME_MONTH_WALL_MS, 10);
    expect(hi.elapsedMonths).toBeCloseTo(MAX_ELAPSED_MS / GAME_MONTH_WALL_MS, 10);
  });
});

describe('clampResources (upward-only)', () => {
  const ceilings = { iron: 500, lunar_water: 1_300 };

  it('passes values at or below the ceiling and never clamps decreases', () => {
    const r = clampResources({ iron: 500, lunar_water: 3 }, ceilings);
    expect(r.clamped).toEqual({ iron: 500, lunar_water: 3 });
    expect(r.rejected).toEqual([]);
  });

  it('clamps an implausible claim down to the ceiling and reports it', () => {
    const r = clampResources({ iron: 1_000_000, lunar_water: 1_000 }, ceilings);
    expect(r.clamped).toEqual({ iron: 500, lunar_water: 1_000 });
    expect(r.rejected).toEqual([{ resource: 'iron', client: 1_000_000, ceiling: 500 }]);
  });

  it('a slug with no ceiling entry is bounded by the flat floor for prev=0', () => {
    const r = clampResources({ antimatter_precursors: 10_000 }, ceilings);
    expect(r.clamped.antimatter_precursors).toBe(FLAT_FLOOR_MIN);
    expect(r.rejected[0]).toEqual({ resource: 'antimatter_precursors', client: 10_000, ceiling: FLAT_FLOOR_MIN });
  });

  it('normalises NaN / negative / non-number client values to 0', () => {
    const r = clampResources({ iron: Number.NaN, lunar_water: -5, helium3: 'x' as unknown as number }, ceilings);
    expect(r.clamped).toEqual({ iron: 0, lunar_water: 0, helium3: 0 });
    expect(r.rejected).toEqual([]);
  });

  it('tolerates a null client map', () => {
    expect(clampResources(null, ceilings)).toEqual({ clamped: {}, rejected: [] });
  });
});

describe('stash helpers', () => {
  it('selectCeilingsToStash keeps ≤35 keys, held resources first (largest holdings first)', () => {
    const ceilings: Record<string, number> = {};
    for (let i = 0; i < 60; i++) ceilings[`r${i}`] = 1000 + i;
    const client: Record<string, number> = { r59: 5, r58: 50, r40: 500 };
    const out = selectCeilingsToStash(ceilings, client);
    expect(Object.keys(out)).toHaveLength(RESOURCE_CEILINGS_MAX_KEYS);
    expect(Object.keys(out).slice(0, 3)).toEqual(['r40', 'r58', 'r59']);
    expect(out.r40).toBe(1040);
  });

  it('readResourceStash round-trips and ignores garbage', () => {
    expect(readResourceStash(null)).toEqual({ baselineAt: null, ceilings: null });
    expect(readResourceStash({ engineers: 3 })).toEqual({ baselineAt: null, ceilings: null });
    const r = readResourceStash({
      [RESOURCE_BASELINE_KEY]: '2026-09-01T00:00:00.000Z',
      [RESOURCE_CEILINGS_KEY]: { iron: 500, bad: 'x' },
    });
    expect(r.baselineAt).toBe('2026-09-01T00:00:00.000Z');
    expect(r.ceilings).toEqual({ iron: 500 });
  });

  it('getResourceClampMode defaults to shadow and accepts off/enforce', () => {
    expect(getResourceClampMode({})).toBe('shadow');
    expect(getResourceClampMode({ RESOURCE_CLAMP_MODE: 'garbage' })).toBe('shadow');
    expect(getResourceClampMode({ RESOURCE_CLAMP_MODE: 'OFF' })).toBe('off');
    expect(getResourceClampMode({ RESOURCE_CLAMP_MODE: ' enforce ' })).toBe('enforce');
  });
});

describe('serverSellableQuantity (Phase B slice)', () => {
  const baselined = {
    resources: { iron: 1_000_000, helium3: 40 },
    workforceData: {
      [RESOURCE_BASELINE_KEY]: '2026-09-01T00:00:00.000Z',
      [RESOURCE_CEILINGS_KEY]: { iron: 10_250 },
    },
  };

  it('returns the raw figure when the profile was never baselined (pre-phase-1 behaviour)', () => {
    const r = serverSellableQuantity({ resources: { iron: 1_000_000 }, workforceData: null }, 'iron', 'shadow');
    expect(r).toEqual({ held: 1_000_000, raw: 1_000_000, cappedByCeiling: false, ceiling: null, source: 'raw' });
  });

  it('caps at the last ceiling once baselined — in shadow AND enforce mode', () => {
    expect(serverSellableQuantity(baselined, 'iron', 'shadow')).toEqual({ held: 10_250, raw: 1_000_000, cappedByCeiling: true, ceiling: 10_250, source: 'ceiling' });
    expect(serverSellableQuantity(baselined, 'iron', 'enforce').held).toBe(10_250);
  });

  it('falls back to raw for a slug outside the stashed ceiling map', () => {
    expect(serverSellableQuantity(baselined, 'helium3', 'shadow')).toEqual({ held: 40, raw: 40, cappedByCeiling: false, ceiling: null, source: 'raw' });
  });

  it('mode off bypasses the cap entirely', () => {
    expect(serverSellableQuantity(baselined, 'iron', 'off').held).toBe(1_000_000);
  });

  it('a raw figure already under the ceiling is untouched', () => {
    const r = serverSellableQuantity({ ...baselined, resources: { iron: 500 } }, 'iron', 'enforce');
    expect(r).toEqual({ held: 500, raw: 500, cappedByCeiling: false, ceiling: 10_250, source: 'ceiling' });
  });
});
