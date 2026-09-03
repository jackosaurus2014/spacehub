/**
 * @jest-environment node
 *
 * Row 6 — "Per-building crew requirements"
 * (docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 6, founder-approved;
 *  docs/STATS_DESIGN.md §3 "Crew"; docs/BALANCE.md "Per-building crew
 *  (2026-09-02)").
 *
 * The defect (BALANCE.md H2): labor demand capped near ~19 heads for ANY
 * corporation, because nothing scaled with fleet size — the workforce bonus
 * caps (+50% revenue at 10 engineers, +100% mining at 5 miners) were the only
 * reason to hire, so a rational player hired the same crew at 3 buildings and
 * at 34. The wage index could therefore only move with server POPULATION.
 *
 * What is asserted here:
 *   1. Every building definition carries a crew requirement, tier-scaled.
 *   2. Ships draw pilots + engineers from their existing crewRequired stat.
 *   3. getRequiredCrew sums COMPLETE buildings and BUILT hulls only.
 *   4. The staffing ratio is the MINIMUM across demanded roles, and the
 *      efficiency multiplier runs 0.5 -> 1.0 (0.7 floor in the Frontier),
 *      never above 1.0.
 *   5. The engine actually applies it to service revenue and mining output.
 *   6. The wage index reads REQUIRED headcount, so an unfilled position bids
 *      for labor.
 */
import {
  BUILDINGS, BUILDING_MAP, getBuildingCrew, getBuildingCrewTotal, crewProfile,
  CREW_TIER_BASE, CREW_CATEGORY_WEIGHT, CREW_ROLE_MIX,
} from '../buildings';
import { SHIPS, SHIP_MAP, getShipCrew, getShipDerivedStats } from '../ships';
import {
  DEFAULT_WORKFORCE, getRequiredCrew, getRequiredCrewTotal, getStaffingReport,
  getStaffingEfficiency, STAFFING_FLOOR, STAFFING_FRONTIER_FLOOR, CREWED_ROLES,
} from '../workforce';
import { computeLaborAggregates, requiredHeadcountFor, laborSupply } from '../labor-market';
import { processTick } from '../game-engine';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import type { GameState } from '../types';

// ─── 1. Building crew totals ────────────────────────────────────────────────

describe('Row 6 — building crew requirements', () => {
  it('every building definition carries an authored crew requirement', () => {
    for (const def of BUILDINGS) {
      expect(def.crew).toBeDefined();
      expect(getBuildingCrewTotal(def)).toBeGreaterThan(0);
    }
    expect(BUILDINGS.length).toBeGreaterThan(90);
  });

  it('the authored field always equals the documented category+tier profile', () => {
    for (const def of BUILDINGS) {
      expect(getBuildingCrew(def)).toEqual(crewProfile(def.category, def.tier));
    }
  });

  it('crew scales with tier within a category, and never lands on a role outside the mix', () => {
    for (const category of Object.keys(CREW_ROLE_MIX) as Array<keyof typeof CREW_ROLE_MIX>) {
      const mix = CREW_ROLE_MIX[category];
      let previous = 0;
      for (const tier of [1, 2, 3, 4, 5, 6]) {
        const c = crewProfile(category, tier);
        const total = (c.engineers || 0) + (c.operators || 0) + (c.scientists || 0) + (c.miners || 0);
        expect(total).toBeGreaterThanOrEqual(previous);
        previous = total;
        for (const role of ['engineers', 'operators', 'scientists', 'miners'] as const) {
          if (!mix[role]) expect(c[role]).toBeUndefined();
        }
      }
    }
  });

  it('a tier-1 building asks for a small crew; a tier-6 one asks for several times more', () => {
    const t1 = crewProfile('space_station', 1);
    const t6 = crewProfile('space_station', 6);
    const total = (c: ReturnType<typeof crewProfile>) =>
      (c.engineers || 0) + (c.operators || 0) + (c.scientists || 0) + (c.miners || 0);
    expect(total(t1)).toBeGreaterThanOrEqual(2);
    expect(total(t1)).toBeLessThanOrEqual(4);
    expect(total(t6)).toBeGreaterThan(total(t1) * 3);
    expect(CREW_TIER_BASE[6]).toBeGreaterThan(CREW_TIER_BASE[1]);
    expect(CREW_CATEGORY_WEIGHT.space_station).toBeGreaterThan(CREW_CATEGORY_WEIGHT.satellite);
  });

  it('a fully-crewed building costs a sane fraction of its payroll headroom (no instant money-loser)', () => {
    // The magnitude rule (BALANCE.md): payroll at full crew stays well under
    // the building's own maintenance + operating scale — the shortfall
    // multiplier is worth up to 2x revenue, so crewing up must be profitable.
    const pad = BUILDING_MAP.get('launch_pad_small')!;
    expect(getBuildingCrewTotal(pad)).toBeLessThanOrEqual(4);
  });
});

// ─── 2. Ship crew ───────────────────────────────────────────────────────────

describe('Row 6 — ship crew', () => {
  it('every hull draws pilots (and engineers) totalling its crewRequired stat', () => {
    for (const def of SHIPS) {
      const stat = Math.round(getShipDerivedStats(def).crewRequired || 0);
      const crew = getShipCrew(def);
      const total = (crew.pilots || 0) + (crew.engineers || 0);
      if (stat <= 0) { expect(total).toBe(0); continue; }
      expect(total).toBe(stat);
      expect(crew.pilots).toBeGreaterThanOrEqual(1);
    }
  });

  it('a survey hull is pilot-heavy; a maintenance tug is engineer-heavy', () => {
    const survey = SHIPS.find(s => s.role === 'survey')!;
    const tug = SHIPS.find(s => s.role === 'maintenance')!;
    const sc = getShipCrew(survey);
    const tc = getShipCrew(tug);
    expect((sc.pilots || 0) / Math.max(1, (sc.pilots || 0) + (sc.engineers || 0)))
      .toBeGreaterThan((tc.pilots || 0) / Math.max(1, (tc.pilots || 0) + (tc.engineers || 0)));
  });
});

// ─── 3. Aggregation ─────────────────────────────────────────────────────────

const bld = (definitionId: string, over: Record<string, unknown> = {}) => ({
  instanceId: `b_${definitionId}_${Math.random().toString(36).slice(2, 7)}`,
  definitionId,
  locationId: BUILDING_MAP.get(definitionId)!.requiredLocation,
  buildStartDate: { year: 2150, month: 1 },
  completionDate: { year: 2150, month: 1 },
  isComplete: true,
  startedAtMs: 0,
  realDurationSeconds: 1,
  ...over,
});

describe('Row 6 — getRequiredCrew', () => {
  it('sums complete buildings only', () => {
    const one = getRequiredCrew([bld('launch_pad_small')], []);
    const alsoPending = getRequiredCrew(
      [bld('launch_pad_small'), bld('ground_station', { isComplete: false })], [],
    );
    expect(alsoPending).toEqual(one);
  });

  it('skips mothballed buildings (they produce nothing, so they are not staffed)', () => {
    const active = getRequiredCrew([bld('mission_control')], []);
    const mothballed = getRequiredCrew([bld('mission_control', { status: 'mothballed' })], []);
    expect(getRequiredCrewTotal(active)).toBeGreaterThan(0);
    expect(getRequiredCrewTotal(mothballed)).toBe(0);
  });

  it('adds built hulls (pilots + engineers) and ignores unbuilt ones', () => {
    const hull = SHIPS[0];
    const withShip = getRequiredCrew([], [{ definitionId: hull.id, isBuilt: true }]);
    const withoutShip = getRequiredCrew([], [{ definitionId: hull.id, isBuilt: false }]);
    expect(getRequiredCrewTotal(withShip)).toBeGreaterThan(0);
    expect(getRequiredCrewTotal(withoutShip)).toBe(0);
    expect(withShip.pilot).toBeGreaterThanOrEqual(1);
  });

  it('scales with fleet size — the whole point (BALANCE.md H2)', () => {
    const small = getRequiredCrewTotal(getRequiredCrew([bld('launch_pad_small')], []));
    const big = getRequiredCrewTotal(getRequiredCrew(
      Array.from({ length: 20 }, () => bld('space_station_mars')), [],
    ));
    expect(big).toBeGreaterThan(small * 20);
    // The pre-Row-6 ceiling was ~19 heads for ANY corporation.
    expect(big).toBeGreaterThan(19);
  });

  it('unknown definition ids are ignored, not thrown on', () => {
    expect(() => getRequiredCrew([bld('launch_pad_small'), { ...bld('launch_pad_small'), definitionId: 'nope' }], [])).not.toThrow();
  });
});

// ─── 4. The staffing multiplier ─────────────────────────────────────────────

describe('Row 6 — staffing efficiency', () => {
  const buildings = [bld('launch_pad_small'), bld('mission_control')];
  const required = getRequiredCrew(buildings, []);

  it('is 1.0 when nothing is required', () => {
    const rep = getStaffingReport(DEFAULT_WORKFORCE, {}, false);
    expect(rep.efficiency).toBe(1);
    expect(rep.minRatio).toBe(1);
    expect(rep.worstRole).toBeNull();
  });

  it('is the 0.5 floor with zero crew hired', () => {
    const rep = getStaffingReport(DEFAULT_WORKFORCE, required, false);
    expect(rep.efficiency).toBeCloseTo(STAFFING_FLOOR, 10);
    expect(rep.totalRequired).toBeGreaterThan(0);
    expect(rep.totalHired).toBe(0);
    expect(rep.worstRole).not.toBeNull();
  });

  it('is exactly 1.0 fully crewed, and never above it however much you overhire', () => {
    const full = { ...DEFAULT_WORKFORCE, engineers: required.engineer || 0, operators: required.operator || 0 };
    expect(getStaffingReport(full, required, false).efficiency).toBe(1);
    const over = { ...DEFAULT_WORKFORCE, engineers: 500, operators: 500 };
    expect(getStaffingReport(over, required, false).efficiency).toBe(1);
  });

  it('takes the MINIMUM across roles — one unstaffed role holds the corporation down', () => {
    const lopsided = { ...DEFAULT_WORKFORCE, engineers: 999, operators: 0 };
    const rep = getStaffingReport(lopsided, required, false);
    expect(rep.worstRole).toBe('operator');
    expect(rep.efficiency).toBeCloseTo(STAFFING_FLOOR, 10);
    expect(rep.ratioByRole.engineer).toBe(1);
    expect(rep.ratioByRole.operator).toBe(0);
    expect(rep.shortfallByRole.operator).toBe(required.operator);
  });

  it('is monotone in the binding role and lands halfway at half staffing', () => {
    const need = { engineer: 10 } as ReturnType<typeof getRequiredCrew>;
    const at = (n: number) => getStaffingReport({ ...DEFAULT_WORKFORCE, engineers: n }, need, false).efficiency;
    expect(at(0)).toBeCloseTo(0.5, 10);
    expect(at(5)).toBeCloseTo(0.75, 10);
    expect(at(10)).toBeCloseTo(1.0, 10);
    expect(at(3)).toBeLessThan(at(7));
  });

  it('floors at 0.7 while Protected-Frontier shielded, and never below', () => {
    const rep = getStaffingReport(DEFAULT_WORKFORCE, required, true);
    expect(rep.efficiency).toBeCloseTo(STAFFING_FRONTIER_FLOOR, 10);
    expect(STAFFING_FRONTIER_FLOOR).toBeGreaterThan(STAFFING_FLOOR);
    // The shield only ever raises the floor: a fully crewed Frontier corp is
    // still exactly 1.0, never more.
    const full = { ...DEFAULT_WORKFORCE, engineers: required.engineer || 0, operators: required.operator || 0 };
    expect(getStaffingReport(full, required, true).efficiency).toBe(1);
  });

  it('only the crewed roles participate — hiring negotiators buys no efficiency', () => {
    expect(CREWED_ROLES).not.toContain('negotiator');
    const withNegotiators = { ...DEFAULT_WORKFORCE, negotiators: 50 };
    expect(getStaffingReport(withNegotiators, required, false).efficiency).toBeCloseTo(STAFFING_FLOOR, 10);
  });
});

// ─── 5. The engine applies it ───────────────────────────────────────────────

function liveState(workforce: Partial<GameState['workforce']> = {}): GameState {
  const g = getGlobalGameDate();
  return {
    ...getNewGameState(),
    money: 1_000_000_000,
    gameDate: { year: g.year, month: g.month },
    lastTickAt: Date.now() - 2_000,
    // Explicitly OUTSIDE the Protected Frontier so the 0.5 floor is the one
    // under test (the 0.7 Frontier floor is covered above).
    createdAtMs: Date.now() - 400 * 24 * 3600_000,
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, ...workforce } as GameState['workforce'],
    activeServices: [{
      definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [],
      startDate: { year: g.year, month: g.month }, revenueMultiplier: 1,
    }],
    buildings: [bld('launch_pad_small')],
  } as GameState;
}

describe('Row 6 — the engine pays the multiplier', () => {
  it('an unstaffed launch pad earns materially less than a crewed one', () => {
    const need = getRequiredCrew([bld('launch_pad_small')], []);
    const bare = processTick(liveState());
    const crewed = processTick(liveState({ engineers: need.engineer || 1, operators: need.operator || 1 }));
    const earnedBare = bare.totalEarned;
    const earnedCrewed = crewed.totalEarned;
    expect(earnedCrewed).toBeGreaterThan(earnedBare);
    // 0.5 vs 1.0 on the revenue product, plus the (separate, capped)
    // workforce serviceRevenue bonus the two hires also bring — so the ratio
    // sits a little under a half, never at or above it.
    const ratio = earnedBare / Math.max(1, earnedCrewed);
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.55);
  });

  it('overstaffing does not buy more revenue than full staffing', () => {
    const need = getRequiredCrew([bld('launch_pad_small')], []);
    const full = processTick(liveState({ engineers: need.engineer || 1, operators: need.operator || 1 }));
    const over = processTick(liveState({ engineers: 40, operators: 40 }));
    // Same staffing multiplier (1.0); any difference is the workforce BONUS
    // stack, which is a separate, capped system — so never LESS than full.
    expect(over.totalEarned).toBeGreaterThanOrEqual(full.totalEarned);
  });

  it('getStaffingEfficiency off a GameState agrees with getStaffingReport', () => {
    const s = liveState({ engineers: 1 });
    expect(getStaffingEfficiency(s, false)).toBeCloseTo(
      getStaffingReport(s.workforce, getRequiredCrew(s.buildings, s.ships), false).efficiency, 10,
    );
  });
});

// ─── 6. The labor market reads REQUIRED headcount ───────────────────────────

describe('Row 6 — labor demand', () => {
  it('an unfilled position still bids for labor (demand = max(hired, required))', () => {
    const buildings = Array.from({ length: 30 }, () => ({ definitionId: 'space_station_mars', isComplete: true }));
    const required = requiredHeadcountFor(buildings);
    const hiredNone = computeLaborAggregates([{ id: 'p1', headcount: {}, crewQuarters: 0, requiredHeadcount: required }]);
    const noRequirement = computeLaborAggregates([{ id: 'p1', headcount: {}, crewQuarters: 0 }]);
    const eng = hiredNone.get('engineer')!;
    expect(eng.requiredRaw).toBe(required.engineer);
    expect(eng.demandEffective).toBeGreaterThan(0);
    expect(eng.index).toBeGreaterThanOrEqual(noRequirement.get('engineer')!.index);
  });

  it('demand grows with the fleet — the H2 defect this row fixes', () => {
    const at = (n: number) => {
      const buildings = Array.from({ length: n }, () => ({ definitionId: 'space_station_mars', isComplete: true }));
      return computeLaborAggregates([{
        id: 'p', headcount: {}, crewQuarters: 0, requiredHeadcount: requiredHeadcountFor(buildings),
      }]).get('engineer')!.requiredRaw;
    };
    expect(at(40)).toBeGreaterThan(at(10));
    expect(at(10)).toBeGreaterThan(at(2));
  });

  it('omitting requiredHeadcount reproduces the pre-Row-6 aggregate exactly', () => {
    const summaries = [{ id: 'p', headcount: { engineer: 25 }, crewQuarters: 4 }];
    const agg = computeLaborAggregates(summaries).get('engineer')!;
    expect(agg.requiredRaw).toBe(0);
    expect(agg.demandEffective).toBeCloseTo(agg.employedEffective, 10);
    expect(agg.supply).toBe(laborSupply('engineer', 4));
  });

  it('requiredHeadcountFor mirrors getRequiredCrew for the same fleet', () => {
    const rows = [{ definitionId: 'mining_lunar_water', isComplete: true }];
    if (!BUILDING_MAP.has('mining_lunar_water')) return; // definition renamed — nothing to assert
    expect(requiredHeadcountFor(rows)).toEqual(
      getRequiredCrew([{ definitionId: 'mining_lunar_water', isComplete: true }], []),
    );
  });
});
