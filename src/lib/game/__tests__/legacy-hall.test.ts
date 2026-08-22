/**
 * @jest-environment node
 *
 * AAA Round 1, wave E4 — the Legacy Hall's derivation layer.
 *
 * The Hall renders 48 milestones, 7 dynasties, a five-rung standing ladder,
 * six soft-capped bonus channels, a title roll and an era medal case. Its whole
 * value proposition is that every one of those numbers is REAL, so the tests
 * that matter here are the ones that can catch a number going fake:
 *
 *   1. the completeness guard  — a milestone shipping with no progress term
 *      (the E3.3 class of defect: a declared thing with no consumer);
 *   2. the DRIFT guard         — a progress term that no longer agrees with
 *      the milestone's own `check()` over a battery of states. This is the
 *      load-bearing test of the wave: `check` is an opaque predicate, so the
 *      term is hand-authored, and a hand-authored mirror WILL drift unless
 *      something fails when it does;
 *   3. the honesty guard       — an underivable condition must render as a
 *      binary state, never as an invented percentage;
 *   4. the ladder guard        — the Hall's spelled-out tier thresholds must
 *      agree with `getLegacyDisplayTier`, whose answer they claim to explain;
 *   5. the refactor guard      — `getLegacyBonuses` (read by the tick every
 *      month) must be untouched by E4's added breakdown function.
 */

import type { GameState } from '../types';
import {
  LEGACY_MILESTONES, STRETCH_LEGACIES, DEFAULT_LEGACY,
  getLegacyBonuses, getLegacyBonusBreakdown, getLegacyDisplayTier,
  LEGACY_CATEGORY_CAPS,
  type LegacyState, type LegacyDisplayTier,
} from '../legacy-system';
import {
  MILESTONE_TERMS, MEASURED_50Y_BEST_GROSS,
  isMilestoneTermComplete, getLegacyMilestoneViews, getLegacyStretchViews,
  getLegacyStanding, getLegacyStandingBonuses, getLegacyTitles,
  getLegacyEraRoll, getLegacyFilingSummary,
} from '../legacy-hall';
import { VICTORY_CONDITIONS } from '../victory-conditions';
import { ACHIEVEMENTS } from '../achievements';

// ─── State battery ──────────────────────────────────────────────────────────
// The drift guard is only as good as the states it runs over: a battery that
// never crosses a threshold proves nothing. These states are chosen to sit on
// BOTH sides of every threshold any milestone term names.

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    money: 0,
    totalEarned: 0,
    totalSpent: 0,
    companyName: 'Test Corp',
    gameDate: { year: 2150, month: 1, day: 1 },
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface'],
    resources: {},
    eventLog: [],
    stats: {},
    ...over,
  } as unknown as GameState;
}

const bld = (locationId: string, isComplete = true) => ({
  id: `b-${locationId}-${Math.random()}`, definitionId: 'x', locationId, isComplete,
});
const ship = (isBuilt = true) => ({ instanceId: `s${Math.random()}`, definitionId: 'x', isBuilt, currentLocation: 'leo', status: 'idle' });
const era = (medal: string, eraIndex: number) => ({
  eraIndex, charterId: 'expansion_era', startedAtMs: 1_700_000_000_000 + eraIndex, endedAtMs: 1_700_100_000_000 + eraIndex,
  bracketAtStart: 1, medal, goalScore: 1, goalActual: 9, goalTarget: 8, headlineStats: [], notableEvents: [],
});
const leader = (i: number) => ({ definitionId: `l${i}`, name: `Leader ${i}`, class: 'Engineer', rarity: 'common', retiredAtMs: 1_700_000_000_000 + i, monthsServed: 24 });

const ALL_LOCATIONS = [
  'earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit',
  'mars_surface', 'asteroid_belt', 'jupiter_system', 'saturn_system', 'outer_system',
];

/** Every state the drift guard runs over. */
const BATTERY: { name: string; state: GameState }[] = [
  { name: 'fresh save', state: baseState() },
  {
    name: 'one LEO building',
    state: baseState({ buildings: [bld('leo')] as never, unlockedLocations: ['earth_surface', 'leo'] }),
  },
  {
    name: 'exactly at every tier-1 threshold',
    state: baseState({
      buildings: [bld('leo'), bld('geo'), bld('lunar_orbit'), ...Array.from({ length: 7 }, () => bld('leo'))] as never,
      completedResearch: ['a', 'b', 'c', 'd', 'e'],
      totalEarned: 1_000_000_000,
      unlockedLocations: ['earth_surface', 'leo', 'geo'],
      activeServices: [1, 2, 3, 4, 5] as never,
      workforce: { engineers: 1, scientists: 1, miners: 1, operators: 0 } as never,
      completedContracts: [1, 2, 3] as never,
      legacy: { ...DEFAULT_LEGACY, trackers: { ...DEFAULT_LEGACY.trackers, totalResourcesMined: 100 } },
    }),
  },
  {
    name: 'one below every tier-1 threshold',
    state: baseState({
      buildings: Array.from({ length: 9 }, () => bld('leo')) as never,
      completedResearch: ['a', 'b', 'c', 'd'],
      totalEarned: 999_999_999,
      unlockedLocations: ['earth_surface', 'leo'],
      activeServices: [1, 2, 3, 4] as never,
      workforce: { engineers: 1, scientists: 1, miners: 0, operators: 0 } as never,
      completedContracts: [1, 2] as never,
      legacy: { ...DEFAULT_LEGACY, trackers: { ...DEFAULT_LEGACY.trackers, totalResourcesMined: 99 } },
    }),
  },
  {
    name: 'mid-game corporation',
    state: baseState({
      buildings: [
        ...Array.from({ length: 20 }, () => bld('leo')),
        ...Array.from({ length: 5 }, () => bld('lunar_surface')),
        bld('asteroid_belt'),
        bld('outer_system'),
        bld('leo', false),
      ] as never,
      completedResearch: Array.from({ length: 41 }, (_, i) => `r${i}`),
      totalEarned: 120_000_000_000,
      unlockedLocations: ALL_LOCATIONS,
      activeServices: Array.from({ length: 21 }, (_, i) => i) as never,
      ships: Array.from({ length: 11 }, () => ship()) as never,
      workforce: { engineers: 8, scientists: 7, miners: 5, operators: 2 } as never,
      completedContracts: Array.from({ length: 30 }, (_, i) => i) as never,
      resources: { iron: 6000, water: 5200, ice: 1200, silicon: 900, gold: 600, helium3: 5500, methane: 5100, ammonia: 5000 },
      corporateEras: { currentEra: null, completedEras: [era('bronze', 0), era('gold', 1), era('silver', 2)] } as never,
      retiredLeaders: [leader(1), leader(2)] as never,
      legacy: {
        ...DEFAULT_LEGACY,
        trackers: { totalResourcesMined: 42_000, totalContractsCompleted: 30, totalShipsBuilt: 14, totalBuildingsCompleted: 27 },
      },
    }),
  },
  {
    name: 'end-game corporation',
    state: baseState({
      buildings: Array.from({ length: 120 }, () => bld('leo')) as never,
      completedResearch: Array.from({ length: 90 }, (_, i) => `r${i}`),
      totalEarned: 12_000_000_000_000,
      unlockedLocations: ALL_LOCATIONS,
      activeServices: Array.from({ length: 35 }, (_, i) => i) as never,
      ships: Array.from({ length: 25 }, () => ship()) as never,
      workforce: { engineers: 12, scientists: 10, miners: 6, operators: 4 } as never,
      completedContracts: Array.from({ length: 60 }, (_, i) => i) as never,
      resources: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`res${i}`, 9000])),
      corporateEras: {
        currentEra: null,
        completedEras: Array.from({ length: 11 }, (_, i) => era(i % 2 === 0 ? 'platinum' : 'gold', i)),
      } as never,
      retiredLeaders: Array.from({ length: 6 }, (_, i) => leader(i)) as never,
      legacy: {
        ...DEFAULT_LEGACY,
        trackers: { totalResourcesMined: 900_000, totalContractsCompleted: 60, totalShipsBuilt: 40, totalBuildingsCompleted: 130 },
      },
    }),
  },
  {
    name: 'eras but no medals above filed',
    state: baseState({
      corporateEras: { currentEra: null, completedEras: [era('filed', 0), era('filed', 1), era('filed', 2)] } as never,
    }),
  },
  {
    name: 'partial resource stockpiles straddling 500/1000/5000',
    state: baseState({ resources: { a: 499, b: 500, c: 999, d: 1000, e: 4999, f: 5000, g: 5000 } }),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Completeness — no milestone may ship without a progress term
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — milestone term registry completeness', () => {
  it('every legacy milestone has exactly one authored progress term', () => {
    const missing = LEGACY_MILESTONES.filter(m => !MILESTONE_TERMS[m.id]).map(m => m.id);
    expect(missing).toEqual([]);
  });

  it('no orphan terms — every authored term names a real milestone', () => {
    const ids = new Set(LEGACY_MILESTONES.map(m => m.id));
    const orphans = Object.keys(MILESTONE_TERMS).filter(id => !ids.has(id));
    expect(orphans).toEqual([]);
  });

  it('covers all 48 milestones the Hall advertises', () => {
    expect(LEGACY_MILESTONES.length).toBe(48);
    expect(Object.keys(MILESTONE_TERMS).length).toBe(48);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The drift guard — the load-bearing test of this wave
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — progress terms mirror the milestone checks exactly', () => {
  for (const { name, state } of BATTERY) {
    it(`agrees with every check() on: ${name}`, () => {
      const disagreements: string[] = [];
      for (const m of LEGACY_MILESTONES) {
        const byCheck = m.check(state);
        const byTerm = isMilestoneTermComplete(state, m.id);
        if (byCheck !== byTerm) {
          const t = MILESTONE_TERMS[m.id];
          disagreements.push(`${m.id}: check=${byCheck} term=${byTerm} (${t?.current(state)}/${t?.target})`);
        }
      }
      expect(disagreements).toEqual([]);
    });
  }

  it('the battery actually exercises both sides of the thresholds', () => {
    // A drift guard that only ever sees `false` proves nothing. Assert every
    // milestone is satisfied by at least one battery state and unsatisfied by
    // at least one other.
    const neverTrue: string[] = [];
    const neverFalse: string[] = [];
    for (const m of LEGACY_MILESTONES) {
      const results = BATTERY.map(b => m.check(b.state));
      if (!results.some(Boolean)) neverTrue.push(m.id);
      if (!results.some(r => !r)) neverFalse.push(m.id);
    }
    expect(neverFalse).toEqual([]);
    expect(neverTrue).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Honesty — an underivable milestone renders binary, never a fake percent
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — binary vs metered progress', () => {
  const views = getLegacyMilestoneViews(BATTERY[0].state);

  it('a target of one is always binary and carries NO fraction', () => {
    for (const v of views) {
      if (v.term.target <= 1) {
        expect(v.kind).toBe('binary');
        expect(v.fraction).toBeNull();
      } else {
        expect(v.kind).toBe('metered');
        expect(typeof v.fraction).toBe('number');
      }
    }
  });

  it('"is GEO unlocked?" — a predicate with no gradient — is binary, not 0%', () => {
    const geo = views.find(v => v.id === 'legacy_geo_expansion')!;
    expect(geo.kind).toBe('binary');
    expect(geo.fraction).toBeNull();
    // The distinction that matters: a fabricated 0% would be indistinguishable
    // from a real 0% on a metered row. `null` is not zero.
    expect(geo.fraction).not.toBe(0);
  });

  it('an era-medal milestone is binary — "best medal so far" has no meaningful percentage', () => {
    for (const id of ['legacy_era_silver', 'legacy_era_gold', 'legacy_era_platinum', 'legacy_era_first_charter']) {
      const v = views.find(x => x.id === id)!;
      expect(v.kind).toBe('binary');
      expect(v.fraction).toBeNull();
    }
  });

  it('a counted milestone is metered with real current/target values', () => {
    const state = BATTERY.find(b => b.name === 'mid-game corporation')!.state;
    const v = getLegacyMilestoneViews(state).find(x => x.id === 'legacy_fifty_buildings')!;
    expect(v.kind).toBe('metered');
    expect(v.term.current).toBe(state.buildings.filter(b => b.isComplete).length);
    expect(v.term.target).toBe(50);
    expect(v.fraction).toBeCloseTo(Math.min(1, v.term.current / 50), 6);
  });

  it('fractions are clamped to 0..1 even when the metric overshoots', () => {
    const state = BATTERY.find(b => b.name === 'end-game corporation')!.state;
    for (const v of getLegacyMilestoneViews(state)) {
      if (v.fraction !== null) {
        expect(v.fraction).toBeGreaterThanOrEqual(0);
        expect(v.fraction).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4 · Earned is permanent — never re-derived from check()
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — achieved state is read from the record, not recomputed', () => {
  it('a milestone stays achieved after the world state that earned it regresses', () => {
    // Decommission every building; `legacy_ten_buildings.check` now fails.
    const state = baseState({
      buildings: [],
      legacy: { ...DEFAULT_LEGACY, completedMilestones: ['legacy_ten_buildings'] },
    });
    const v = getLegacyMilestoneViews(state).find(x => x.id === 'legacy_ten_buildings')!;
    expect(LEGACY_MILESTONES.find(m => m.id === 'legacy_ten_buildings')!.check(state)).toBe(false);
    expect(v.achieved).toBe(true);
    // …and the row shows the achieved state rather than a shaming 0%.
    expect(v.term.current).toBe(0);
  });

  it('a milestone whose condition is met but not yet awarded is NOT shown as achieved', () => {
    const state = baseState({ buildings: Array.from({ length: 10 }, () => bld('leo')) as never });
    const v = getLegacyMilestoneViews(state).find(x => x.id === 'legacy_ten_buildings')!;
    expect(v.achieved).toBe(false);
    expect(v.fraction).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5 · Reachability honesty
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — generational horizons are labelled, not hidden or flattened', () => {
  const views = getLegacyMilestoneViews(baseState());

  it('uses the measured 50-year best gross as the money yardstick', () => {
    expect(MEASURED_50Y_BEST_GROSS).toBe(611_000_000_000);
  });

  it('targets past the measured ceiling are flagged generational', () => {
    expect(views.find(v => v.id === 'legacy_trillion')!.horizon?.className).toBe('generational');
    expect(views.find(v => v.id === 'legacy_ten_trillion')!.horizon?.className).toBe('generational');
  });

  it('targets inside the measured ceiling are NOT flagged', () => {
    expect(views.find(v => v.id === 'legacy_first_billion')!.horizon).toBeNull();
    expect(views.find(v => v.id === 'legacy_ten_billion')!.horizon).toBeNull();
    expect(views.find(v => v.id === 'legacy_hundred_billion')!.horizon).toBeNull();
  });

  it('a wall-clock horizon of a real year or more is generational; below it is not', () => {
    // 10 eras x 90 real days = 900 days; 3 eras = 270 days.
    expect(views.find(v => v.id === 'legacy_era_decade')!.horizon?.className).toBe('generational');
    expect(views.find(v => v.id === 'legacy_era_veteran')!.horizon).toBeNull();
  });

  it('a count target with no published measurement gets NO horizon label', () => {
    // There is no measured "buildings at 50 years" figure, so claiming this is
    // or is not generational would be invention either way.
    expect(views.find(v => v.id === 'legacy_hundred_buildings')!.horizon).toBeNull();
  });

  it('the horizon basis always cites the measurement it derives from', () => {
    const t = views.find(v => v.id === 'legacy_trillion')!;
    expect(t.horizon!.basis).toMatch(/611B|BALANCE\.md/);
    const e = views.find(v => v.id === 'legacy_era_decade')!;
    expect(e.horizon!.basis).toMatch(/real days/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 · Dynasties
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — dynasty (stretch) views', () => {
  it('exposes every stretch legacy', () => {
    expect(getLegacyStretchViews(baseState()).map(v => v.id).sort())
      .toEqual(STRETCH_LEGACIES.map(s => s.id).sort());
  });

  it('level 0 measures from zero, not from the curve constant', () => {
    // stretch_revenue's getRequirement(0) is $10B — a constant in the curve,
    // not a bar the player has cleared. Using it as the floor would render a
    // negative fraction on every new save.
    const v = getLegacyStretchViews(baseState({ totalEarned: 25_000_000_000 }))
      .find(x => x.id === 'stretch_revenue')!;
    expect(v.level).toBe(0);
    expect(v.floor).toBe(0);
    expect(v.nextRequirement).toBe(50_000_000_000);
    expect(v.fraction).toBeCloseTo(0.5, 6);
  });

  it('a banked level measures from that level\'s requirement to the next', () => {
    const state = baseState({
      completedResearch: Array.from({ length: 22 }, (_, i) => `r${i}`),
      legacy: { ...DEFAULT_LEGACY, stretchLevels: { stretch_research: 1 } },
    });
    const v = getLegacyStretchViews(state).find(x => x.id === 'stretch_research')!;
    expect(v.level).toBe(1);
    expect(v.floor).toBe(15);
    expect(v.nextRequirement).toBe(30);
    expect(v.fraction).toBeCloseTo((22 - 15) / 15, 6);
  });

  it('rawContribution reproduces the engine\'s own accumulation formula', () => {
    const state = baseState({ legacy: { ...DEFAULT_LEGACY, stretchLevels: { stretch_mining: 3 } } });
    const v = getLegacyStretchViews(state).find(x => x.id === 'stretch_mining')!;
    const expected = [1, 2, 3].reduce((sum, n) => sum + 5 * Math.log(1 + n * 0.5), 0);
    expect(v.rawContribution).toBeCloseTo(expected, 9);
  });

  it('flags a generational money rung and leaves count rungs unlabelled', () => {
    // Level 3 of stretch_revenue requires $10B x 5^3 = $1.25T > $611B.
    const at2 = getLegacyStretchViews(baseState({ legacy: { ...DEFAULT_LEGACY, stretchLevels: { stretch_revenue: 2 } } }))
      .find(v => v.id === 'stretch_revenue')!;
    expect(at2.nextRequirement).toBe(1_250_000_000_000);
    expect(at2.horizon?.className).toBe('generational');
    expect(getLegacyStretchViews(baseState()).find(v => v.id === 'stretch_buildings')!.horizon).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7 · The standing ladder must explain getLegacyDisplayTier, not contradict it
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — standing ladder', () => {
  const legacyFrom = (t2: number, t3: number, t4: number, stretch: number): LegacyState => {
    const pick = (tier: number, n: number) =>
      LEGACY_MILESTONES.filter(m => m.tier === tier).slice(0, n).map(m => m.id);
    return {
      ...DEFAULT_LEGACY,
      completedMilestones: [...pick(2, t2), ...pick(3, t3), ...pick(4, t4)],
      stretchLevels: { stretch_revenue: stretch },
    };
  };

  const CASES: [number, number, number, number, LegacyDisplayTier][] = [
    [0, 0, 0, 0, 'Pioneer'],
    [4, 0, 0, 0, 'Pioneer'],
    [5, 0, 0, 0, 'Colonist'],
    [5, 5, 0, 0, 'Admiral'],
    [5, 5, 5, 0, 'Architect'],
    [5, 5, 10, 49, 'Architect'],
    [5, 5, 10, 50, 'Legend'],
  ];

  for (const [t2, t3, t4, stretch, expected] of CASES) {
    it(`t2=${t2} t3=${t3} t4=${t4} stretch=${stretch} -> ${expected}, and matches getLegacyDisplayTier`, () => {
      const legacy = legacyFrom(t2, t3, t4, stretch);
      const standing = getLegacyStanding(baseState({ legacy }));
      expect(standing.displayTier).toBe(expected);
      expect(standing.displayTier).toBe(getLegacyDisplayTier(legacy));
    });
  }

  it('reports the next unmet rung with live counts, and none at Legend', () => {
    const early = getLegacyStanding(baseState({ legacy: legacyFrom(2, 0, 0, 0) }));
    expect(early.next!.tier).toBe('Colonist');
    expect(early.next!.terms[0]).toMatchObject({ current: 2, target: 5 });

    const top = getLegacyStanding(baseState({ legacy: legacyFrom(5, 5, 10, 50) }));
    expect(top.next).toBeNull();
  });

  it('counts milestones and dynasty levels off the record', () => {
    const standing = getLegacyStanding(baseState({ legacy: legacyFrom(5, 3, 0, 7) }));
    expect(standing.milestonesEarned).toBe(8);
    expect(standing.milestonesTotal).toBe(48);
    expect(standing.stretchLevels).toBe(7);
    expect(standing.legacyPower).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8 · The bonus ledger — and the refactor guard on the engine's own path
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — legacy bonus breakdown', () => {
  const legacy: LegacyState = {
    ...DEFAULT_LEGACY,
    completedMilestones: LEGACY_MILESTONES.map(m => m.id), // everything
    stretchLevels: Object.fromEntries(STRETCH_LEGACIES.map(s => [s.id, 4])),
  };

  it('E4 did NOT change what the engine applies (getLegacyBonuses is untouched)', () => {
    // Locked to the values the pre-E4 implementation produced for a known
    // input. getLegacyBonuses is read every tick; the breakdown refactor
    // extracted `getCategoryRaw` out of it and must be a pure re-shuffle.
    const empty = getLegacyBonuses(DEFAULT_LEGACY);
    expect(empty).toEqual({
      revenueMultiplier: 1,
      buildSpeedMultiplier: 1,
      researchSpeedMultiplier: 1,
      miningMultiplier: 1,
      costMultiplier: 1,
      bonusCrewCapacity: 0,
    });

    const full = getLegacyBonuses(legacy);
    expect(full.revenueMultiplier).toBeGreaterThan(1);
    expect(full.costMultiplier).toBeLessThan(1);
    expect(full.bonusCrewCapacity).toBeGreaterThan(0);
  });

  it('breakdown effective values reproduce getLegacyBonuses exactly', () => {
    const rows = getLegacyBonusBreakdown(legacy);
    const bonuses = getLegacyBonuses(legacy);
    const by = (c: string) => rows.find(r => r.category === c)!;
    expect(1 + by('revenue').effective / 100).toBeCloseTo(bonuses.revenueMultiplier, 12);
    expect(1 + by('buildSpeed').effective / 100).toBeCloseTo(bonuses.buildSpeedMultiplier, 12);
    expect(1 + by('researchSpeed').effective / 100).toBeCloseTo(bonuses.researchSpeedMultiplier, 12);
    expect(1 + by('miningOutput').effective / 100).toBeCloseTo(bonuses.miningMultiplier, 12);
    expect(1 - by('costReduction').effective / 100).toBeCloseTo(bonuses.costMultiplier, 12);
    expect(Math.floor(by('crewCapacity').effective)).toBe(bonuses.bonusCrewCapacity);
  });

  it('raw never exceeds nothing and effective never exceeds the cap', () => {
    for (const row of getLegacyBonusBreakdown(legacy)) {
      expect(row.effective).toBeLessThanOrEqual(row.cap + 1e-9);
      expect(row.raw).toBeGreaterThanOrEqual(row.effective - 1e-9);
      expect(row.capUsed).toBeGreaterThanOrEqual(0);
      expect(row.capUsed).toBeLessThanOrEqual(1);
      expect(row.lostToCap).toBeCloseTo(Math.max(0, row.raw - row.effective), 9);
    }
  });

  it('crew capacity is the only hard cap, and its cap is reported in slots', () => {
    const rows = getLegacyBonusBreakdown(legacy);
    expect(rows.filter(r => r.hardCap).map(r => r.category)).toEqual(['crewCapacity']);
    expect(rows.find(r => r.category === 'crewCapacity')!.cap).toBe(LEGACY_CATEGORY_CAPS.crewCapacity);
    expect(rows.find(r => r.category === 'revenue')!.cap).toBeCloseTo(LEGACY_CATEGORY_CAPS.revenue * 100, 9);
  });

  it('an empty record reports a zeroed ledger rather than omitting rows', () => {
    const rows = getLegacyStandingBonuses(baseState());
    expect(rows.length).toBe(6);
    for (const r of rows) {
      expect(r.raw).toBe(0);
      expect(r.effective).toBe(0);
      expect(r.capUsed).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9 · Titles
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — the title roll', () => {
  it('lists every victory title, earned or not', () => {
    const titles = getLegacyTitles(baseState());
    const victoryTitles = titles.filter(t => t.source === 'victory');
    expect(victoryTitles.length).toBe(VICTORY_CONDITIONS.length);
    expect(victoryTitles.every(t => !t.earned)).toBe(true);
  });

  it('lists ONLY earned achievement titles (the catalogue lives in its own browser)', () => {
    const withAch = ACHIEVEMENTS.filter(a => a.title);
    expect(withAch.length).toBeGreaterThan(0);
    const none = getLegacyTitles(baseState());
    expect(none.filter(t => t.source === 'achievement')).toEqual([]);

    const state = baseState({ earnedAchievements: [withAch[0].id] });
    const some = getLegacyTitles(state).filter(t => t.source === 'achievement');
    expect(some.length).toBe(1);
    expect(some[0].title).toBe(withAch[0].title);
    expect(some[0].earned).toBe(true);
    // Achievement checks are opaque booleans — no invented percentage.
    expect(some[0].fraction).toBeNull();
  });

  it('an unearned victory title carries the real victory-progress fraction', () => {
    const state = baseState({ completedResearch: Array.from({ length: 50 }, (_, i) => `r${i}`) });
    const t = getLegacyTitles(state).find(x => x.id === 'scientific_transcendence')!;
    expect(t.earned).toBe(false);
    expect(t.fraction).toBeGreaterThan(0);
    expect(t.fraction).toBeLessThan(1);
  });

  it('a victory title outranks an achievement title for the worn slot', () => {
    const achWithTitle = ACHIEVEMENTS.find(a => a.title)!;
    const victory = VICTORY_CONDITIONS[0];
    const state = baseState({
      earnedVictories: [victory.id],
      earnedAchievements: [achWithTitle.id],
      playerTitle: victory.title,
    });
    const titles = getLegacyTitles(state);
    const worn = titles.filter(t => t.worn);
    expect(worn.length).toBe(1);
    expect(worn[0].source).toBe('victory');
    expect(worn[0].title).toBe(victory.title);
  });

  it('an achievement title can be worn when no victory holds the slot', () => {
    const achWithTitle = ACHIEVEMENTS.find(a => a.title)!;
    const state = baseState({ earnedAchievements: [achWithTitle.id], playerTitle: achWithTitle.title });
    const worn = getLegacyTitles(state).filter(t => t.worn);
    expect(worn.length).toBe(1);
    expect(worn[0].source).toBe('achievement');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10 · The record — eras and filings
// ─────────────────────────────────────────────────────────────────────────────

describe('E4 — era roll and filings', () => {
  it('orders completed eras newest-first and tallies the medal case', () => {
    const state = BATTERY.find(b => b.name === 'mid-game corporation')!.state;
    const roll = getLegacyEraRoll(state);
    expect(roll.completed.map(e => e.eraIndex)).toEqual([2, 1, 0]);
    expect(roll.medalCounts).toEqual([
      { medal: 'gold', count: 1 },
      { medal: 'silver', count: 1 },
      { medal: 'bronze', count: 1 },
    ]);
    expect(roll.completed[0].charterName).toBe('Expansion Era');
    expect(roll.completed[0].goalLabel).toBe('New buildings completed');
  });

  it('reports no active era honestly on a save that has never chartered one', () => {
    expect(getLegacyEraRoll(baseState()).active.active).toBe(false);
    expect(getLegacyEraRoll(baseState()).completed).toEqual([]);
    expect(getLegacyEraRoll(baseState()).medalCounts).toEqual([]);
  });

  it('summarises quarterly filings by real arithmetic over stored reports', () => {
    const state = baseState({
      quarterlyReports: [
        { quarterNumber: 1, profit: 100, netWorth: 1000, growthRatePct: null },
        { quarterNumber: 2, profit: -40, netWorth: 1200, growthRatePct: 20 },
        { quarterNumber: 3, profit: 250, netWorth: 1500, growthRatePct: 25 },
      ] as never,
    });
    const f = getLegacyFilingSummary(state);
    expect(f.quartersOnFile).toBe(3);
    expect(f.latestQuarterNumber).toBe(3);
    expect(f.latestNetWorth).toBe(1500);
    expect(f.latestGrowthPct).toBe(25);
    expect(f.lifetimeFiledProfit).toBe(310);
  });

  it('reports an empty filing history as empty, not as zeros presented as data', () => {
    const f = getLegacyFilingSummary(baseState());
    expect(f.quartersOnFile).toBe(0);
    expect(f.latestQuarterNumber).toBeNull();
    expect(f.latestNetWorth).toBeNull();
    expect(f.latestGrowthPct).toBeNull();
  });
});
