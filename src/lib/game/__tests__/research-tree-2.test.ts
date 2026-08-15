/**
 * @jest-environment node
 *
 * 4X Upgrade Waves W3+W10 (docs/4X_BASELINE_2026-08.md Part 2a Op4/Op5) —
 * Research Tree 2.0: doctrine gates, repeatable programs, rare techs. Covers:
 *  - Doctrine exclusivity: excludes/doctrineGroup symmetry across the tree,
 *    isDoctrineLocked / getDoctrineLockedBy / getDoctrineOverrideCost (2x
 *    money + 6-month retool surcharge), and processTick recording the first
 *    doctrine choice into GameState.doctrineChoices.
 *  - Repeatable escalation: getRepeatableNextCost's 2.5x/level formula,
 *    isRepeatableMaxed at level 5, processTick incrementing
 *    repeatableResearchLevels WITHOUT ever pushing the id into
 *    completedResearch, and getResearchBonuses summing repeatable levels
 *    inside the SAME aggregate caps W1 proved for the base 254 (extended
 *    here to a fully-maxed tree: 272 base completions + all 6 repeatables
 *    at level 5).
 *  - Rare-tech lifecycle: hidden by default, visible once granted via
 *    unlockedRareTechIds, researchable (getResearchDisplayState) once
 *    visible.
 *  - V20 save migration: getNewGameState ships empty doctrineChoices /
 *    repeatableResearchLevels; loadGame migrates a pre-V20 save missing
 *    both fields to the same empty defaults (additive, numerically neutral).
 */
import type { GameState } from '../types';
import { processTick } from '../game-engine';
import { getGlobalGameDate } from '../server-time';
import { getNewGameState, loadGame } from '../save-load';
import { SAVE_KEY } from '../constants';
import {
  RESEARCH,
  RESEARCH_MAP,
  getResearchBonuses,
  isDoctrineLocked,
  getDoctrineLockedBy,
  getDoctrineOverrideCost,
  isRareTechVisible,
  getRepeatableLevel,
  isRepeatableMaxed,
  getRepeatableNextCost,
  getResearchDisplayState,
} from '../research-tree';
import type { ResearchBonuses } from '../research-tree';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Same fixture pattern as audit-wave-b-wiring.test.ts: pinned to the current
 *  global game date so isMonthEnd is false and the tick is deterministic. */
function baseState(overrides: Partial<GameState> = {}): GameState {
  const now = Date.now();
  const globalDate = getGlobalGameDate();
  return {
    version: 1,
    createdAt: now,
    lastTickAt: now,
    money: 1_000_000_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: globalDate.year, month: globalDate.month },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    npcCompanies: [],
    frontierStatus: 'none',
    ...overrides,
  };
}

/** An activeResearch entry guaranteed complete on the next processTick call
 *  (started far enough in the past that even a 1x speed multiplier clears
 *  the duration). */
function completingResearch(id: string) {
  const def = RESEARCH_MAP.get(id)!;
  return {
    definitionId: id,
    startDate: { year: 2150, month: 1 },
    progressMonths: 0,
    totalMonths: def.baseTimeMonths,
    startedAtMs: Date.now() - (def.realResearchSeconds + 3600) * 1000,
    realDurationSeconds: def.realResearchSeconds,
  };
}

// ─── Doctrine gates (Op4) ───────────────────────────────────────────────────

describe('W3 doctrine gates — data integrity', () => {
  test('every excludes reference is symmetric (A excludes B => B excludes A)', () => {
    for (const def of RESEARCH) {
      for (const otherId of def.excludes || []) {
        const other = RESEARCH_MAP.get(otherId);
        expect(other).toBeDefined();
        expect(other!.excludes || []).toContain(def.id);
      }
    }
  });

  test('every research with excludes also has a doctrineGroup, and vice versa', () => {
    for (const def of RESEARCH) {
      expect(!!def.excludes?.length).toBe(!!def.doctrineGroup);
    }
  });

  test('there are exactly 3 doctrine pairs (6 techs) per 4X_BASELINE Op4', () => {
    const withDoctrine = RESEARCH.filter(r => r.doctrineGroup);
    expect(withDoctrine.length).toBe(6);
    const groups = new Set(withDoctrine.map(r => r.doctrineGroup));
    expect(groups.size).toBe(3);
    expect(groups).toEqual(new Set(['propulsion_doctrine', 'workforce_doctrine', 'research_doctrine']));
  });

  test('propulsion doctrine reuses nuclear_thermal/nuclear_electric as a real sibling branch (shared prereq)', () => {
    const ntr = RESEARCH_MAP.get('nuclear_thermal')!;
    const nep = RESEARCH_MAP.get('nuclear_electric')!;
    expect(ntr.prerequisites).toEqual(nep.prerequisites);
    expect(ntr.excludes).toEqual(['nuclear_electric']);
    expect(nep.excludes).toEqual(['nuclear_thermal']);
  });
});

describe('W3 doctrine gates — isDoctrineLocked / getDoctrineLockedBy / getDoctrineOverrideCost', () => {
  test('neither side is locked before either is researched', () => {
    const ntr = RESEARCH_MAP.get('nuclear_thermal')!;
    const nep = RESEARCH_MAP.get('nuclear_electric')!;
    expect(isDoctrineLocked(ntr, [])).toBe(false);
    expect(isDoctrineLocked(nep, [])).toBe(false);
  });

  test('completing one side locks the other, and getDoctrineLockedBy identifies it', () => {
    const nep = RESEARCH_MAP.get('nuclear_electric')!;
    expect(isDoctrineLocked(nep, ['nuclear_thermal'])).toBe(true);
    expect(getDoctrineLockedBy(nep, ['nuclear_thermal'])?.id).toBe('nuclear_thermal');
    // The chosen side itself is never locked by its own completion.
    const ntr = RESEARCH_MAP.get('nuclear_thermal')!;
    expect(isDoctrineLocked(ntr, ['nuclear_thermal'])).toBe(false);
  });

  test('override cost is exactly 2x money + 6-month proportional retool surcharge', () => {
    const nep = RESEARCH_MAP.get('nuclear_electric')!;
    const override = getDoctrineOverrideCost(nep);
    expect(override.money).toBe(nep.baseCostMoney * 2);
    expect(override.totalMonths).toBe(nep.baseTimeMonths + 6);
    const expectedRetoolSeconds = Math.round((6 / nep.baseTimeMonths) * nep.realResearchSeconds);
    expect(override.realDurationSeconds).toBe(nep.realResearchSeconds + expectedRetoolSeconds);
    expect(override.realDurationSeconds).toBeGreaterThan(nep.realResearchSeconds);
  });

  test('non-doctrine research is never locked', () => {
    const plain = RESEARCH_MAP.get('reusable_boosters')!;
    expect(isDoctrineLocked(plain, RESEARCH.map(r => r.id))).toBe(false);
    expect(getDoctrineLockedBy(plain, RESEARCH.map(r => r.id))).toBeNull();
  });
});

describe('W3 doctrine gates — getResearchDisplayState reflects lock/override state', () => {
  test('locked sibling shows doctrineLocked with the override cost as effective cost', () => {
    const nep = RESEARCH_MAP.get('nuclear_electric')!;
    const disp = getResearchDisplayState(nep, { completedResearch: ['nuclear_thermal'] });
    expect(disp.doctrineLocked).toBe(true);
    expect(disp.lockedBySiblingId).toBe('nuclear_thermal');
    expect(disp.effectiveMoneyCost).toBe(nep.baseCostMoney * 2);
    expect(disp.completed).toBe(false); // still researchable, just at override price
  });

  test('unlocked doctrine tech shows base cost, not override', () => {
    const ntr = RESEARCH_MAP.get('nuclear_thermal')!;
    const disp = getResearchDisplayState(ntr, { completedResearch: [] });
    expect(disp.doctrineLocked).toBe(false);
    expect(disp.effectiveMoneyCost).toBe(ntr.baseCostMoney);
  });
});

describe('W3 doctrine persistence — processTick records the first choice into GameState.doctrineChoices', () => {
  test('completing nuclear_thermal stamps doctrineChoices.propulsion_doctrine and pushes to completedResearch', () => {
    const state = baseState({ activeResearch: completingResearch('nuclear_thermal') });
    const next = processTick(state);
    expect(next.completedResearch).toContain('nuclear_thermal');
    expect(next.doctrineChoices?.propulsion_doctrine).toBe('nuclear_thermal');
  });

  test('a later override-unlock of the locked sibling does not overwrite the original choice', () => {
    const state = baseState({
      completedResearch: ['nuclear_thermal'],
      doctrineChoices: { propulsion_doctrine: 'nuclear_thermal' },
      activeResearch: completingResearch('nuclear_electric'),
    });
    const next = processTick(state);
    expect(next.completedResearch).toContain('nuclear_electric');
    // Both sides are now completed, but the recorded doctrine stays NTR —
    // the first choice, not the last completion.
    expect(next.doctrineChoices?.propulsion_doctrine).toBe('nuclear_thermal');
  });

  test('non-doctrine research completion leaves doctrineChoices untouched', () => {
    const state = baseState({ activeResearch: completingResearch('reusable_boosters') });
    const next = processTick(state);
    expect(next.completedResearch).toContain('reusable_boosters');
    expect(next.doctrineChoices).toEqual({});
  });
});

// ─── Repeatable programs (Op5) ──────────────────────────────────────────────

describe('W3 repeatables — data integrity', () => {
  test('exactly 6 repeatable programs, each maxLevel 5, cost multiplier 2.5x, effect magnitude 0.02', () => {
    const repeatables = RESEARCH.filter(r => r.repeatable);
    expect(repeatables.length).toBe(6);
    for (const r of repeatables) {
      expect(r.repeatable!.maxLevel).toBe(5);
      expect(r.repeatable!.costMultiplierPerLevel).toBe(2.5);
      expect(r.repeatable!.effectPerLevel.length).toBe(1);
      expect(r.repeatable!.effectPerLevel[0].magnitude).toBeCloseTo(0.02);
    }
  });

  test('repeatables are not doctrine techs and vice versa (disjoint sets)', () => {
    for (const r of RESEARCH) {
      if (r.repeatable) expect(r.doctrineGroup).toBeUndefined();
      if (r.doctrineGroup) expect(r.repeatable).toBeUndefined();
    }
  });
});

describe('W3 repeatables — getRepeatableNextCost / isRepeatableMaxed', () => {
  const program = () => RESEARCH_MAP.get('launch_cadence_optimization')!;

  test('level-0 (never started) cost equals baseCostMoney', () => {
    const def = program();
    const cost = getRepeatableNextCost(def, 0);
    expect(cost.money).toBe(def.baseCostMoney);
  });

  test('cost scales by 2.5x per level already completed (doc formula)', () => {
    const def = program();
    for (let level = 0; level <= 4; level++) {
      const cost = getRepeatableNextCost(def, level);
      expect(cost.money).toBe(Math.round(def.baseCostMoney * Math.pow(2.5, level)));
    }
  });

  test('isRepeatableMaxed is false below level 5, true at level 5', () => {
    const def = program();
    expect(isRepeatableMaxed(def, { [def.id]: 4 })).toBe(false);
    expect(isRepeatableMaxed(def, { [def.id]: 5 })).toBe(true);
    expect(isRepeatableMaxed(def, undefined)).toBe(false);
  });

  test('getRepeatableLevel defaults to 0 when absent', () => {
    const def = program();
    expect(getRepeatableLevel(def.id, undefined)).toBe(0);
    expect(getRepeatableLevel(def.id, {})).toBe(0);
    expect(getRepeatableLevel(def.id, { [def.id]: 3 })).toBe(3);
  });
});

describe('W3 repeatables — processTick increments levels WITHOUT touching completedResearch', () => {
  test('completing a repeatable bumps repeatableResearchLevels, not completedResearch', () => {
    const state = baseState({ activeResearch: completingResearch('launch_cadence_optimization') });
    const next = processTick(state);
    expect(next.completedResearch).not.toContain('launch_cadence_optimization');
    expect(next.repeatableResearchLevels?.launch_cadence_optimization).toBe(1);
  });

  test('completing the same repeatable again (level already at 1) advances to level 2', () => {
    const state = baseState({
      repeatableResearchLevels: { launch_cadence_optimization: 1 },
      activeResearch: completingResearch('launch_cadence_optimization'),
    });
    const next = processTick(state);
    expect(next.repeatableResearchLevels?.launch_cadence_optimization).toBe(2);
    expect(next.completedResearch).not.toContain('launch_cadence_optimization');
  });

  test('level never exceeds maxLevel (5) even if completion fires again at level 5', () => {
    const state = baseState({
      repeatableResearchLevels: { launch_cadence_optimization: 5 },
      activeResearch: completingResearch('launch_cadence_optimization'),
    });
    const next = processTick(state);
    expect(next.repeatableResearchLevels?.launch_cadence_optimization).toBe(5);
  });
});

// ─── Repeatables + full tree — aggregate caps still hold (extends W1) ──────

describe('W3 property test — repeatables stay inside the SAME aggregate caps as the base 254 (W1 extension)', () => {
  test('all 272 base/doctrine/rare techs completed + all 6 repeatables maxed at level 5 never exceeds documented caps', () => {
    const allIds = RESEARCH.map(r => r.id);
    const repeatableIds = RESEARCH.filter(r => r.repeatable).map(r => r.id);
    const maxedLevels = Object.fromEntries(repeatableIds.map(id => [id, 5]));

    const bonuses = getResearchBonuses(allIds, maxedLevels);
    const caps: Record<keyof ResearchBonuses, number> = {
      buildCostReduction: 0.50,
      buildSpeedBonus: 0.50,
      miningOutputBonus: 1.0,
      serviceRevenueBonus: 0.50,
      researchSpeedBonus: 0.50,
      maintenanceReduction: 0.50,
      travelSpeedBonus: 0.50,
      insuranceDiscountBonus: 0.40,
      hazardResistanceBonus: 0.30,
      crewMoraleBonus: 0.30,
      fuelEfficiencyBonus: 0.50,
      consumptionReductionBonus: 0.40,
      expeditionRiskBonus: 0.30,
    };
    for (const [key, cap] of Object.entries(caps) as Array<[keyof ResearchBonuses, number]>) {
      expect(bonuses[key]).toBeLessThanOrEqual(cap + 1e-9);
      expect(bonuses[key]).toBeGreaterThanOrEqual(0);
    }
  });

  test('a single maxed repeatable alone (no other research) contributes exactly 5x its per-level magnitude, uncapped at that scale', () => {
    const def = RESEARCH_MAP.get('yield_learning_curve_program')!;
    const bonuses = getResearchBonuses([], { [def.id]: 5 });
    expect(bonuses.miningOutputBonus).toBeCloseTo(0.02 * 5, 6); // 10%, well under the 100% mining cap
  });

  test('repeatable levels beyond maxLevel in a malformed save are clamped, not over-summed', () => {
    const def = RESEARCH_MAP.get('yield_learning_curve_program')!;
    const bonuses = getResearchBonuses([], { [def.id]: 999 }); // corrupt/cheated save value
    expect(bonuses.miningOutputBonus).toBeCloseTo(0.02 * 5, 6); // still only 5 levels' worth
  });

  test('getResearchBonuses with no repeatableLevels arg (legacy call sites) behaves exactly as before W3', () => {
    const bonuses = getResearchBonuses(['reusable_boosters']);
    expect(bonuses.buildCostReduction).toBeCloseTo(0.3, 6);
  });
});

// ─── Rare techs (Op5) — hidden -> visible -> researchable lifecycle ────────

describe('W10 rare techs — hidden by default', () => {
  const RARE_IDS = [
    'europan_biochemistry', 'xenobiochemistry', 'deep_biosphere_ecology',
    'iso_materials_analysis', 'precursor_studies', 'vacuum_metallurgy_breakthrough',
    'hive_pattern_mathematics', 'metric_engineering_refinements',
  ];

  test('all 8 rare techs exist, are flagged rare, and are tier 5', () => {
    for (const id of RARE_IDS) {
      const def = RESEARCH_MAP.get(id);
      expect(def).toBeDefined();
      expect(def!.rare).toBe(true);
      expect(def!.tier).toBe(5);
    }
  });

  test('invisible with no unlockedRareTechIds at all', () => {
    for (const id of RARE_IDS) {
      const def = RESEARCH_MAP.get(id)!;
      expect(isRareTechVisible(def, undefined)).toBe(false);
      expect(isRareTechVisible(def, [])).toBe(false);
    }
  });

  test('invisible when unlockedRareTechIds contains OTHER ids', () => {
    const def = RESEARCH_MAP.get('europan_biochemistry')!;
    expect(isRareTechVisible(def, ['xenobiochemistry', 'precursor_studies'])).toBe(false);
  });

  test('non-rare techs are always visible regardless of unlockedRareTechIds', () => {
    const plain = RESEARCH_MAP.get('reusable_boosters')!;
    expect(isRareTechVisible(plain, undefined)).toBe(true);
    expect(isRareTechVisible(plain, [])).toBe(true);
  });
});

describe('W10 rare techs — visible and researchable once granted', () => {
  test('isRareTechVisible flips true once the id is in unlockedRareTechIds', () => {
    const def = RESEARCH_MAP.get('europan_biochemistry')!;
    expect(isRareTechVisible(def, ['europan_biochemistry'])).toBe(true);
  });

  test('getResearchDisplayState.visible reflects the grant, and the tech is startable (not pre-completed)', () => {
    const def = RESEARCH_MAP.get('iso_materials_analysis')!;
    const hidden = getResearchDisplayState(def, { completedResearch: [], unlockedRareTechIds: [] });
    expect(hidden.visible).toBe(false);

    const granted = getResearchDisplayState(def, { completedResearch: [], unlockedRareTechIds: ['iso_materials_analysis'] });
    expect(granted.visible).toBe(true);
    expect(granted.completed).toBe(false);
    expect(granted.effectiveMoneyCost).toBe(def.baseCostMoney);
  });

  test('processTick can complete a granted rare tech like any other research', () => {
    const state = baseState({
      unlockedRareTechIds: ['hive_pattern_mathematics'],
      activeResearch: completingResearch('hive_pattern_mathematics'),
    });
    const next = processTick(state);
    expect(next.completedResearch).toContain('hive_pattern_mathematics');
  });

  test('every authored rare-tech effect magnitude stays within PER_EFFECT_CAP (0.30), same discipline as W1', () => {
    for (const id of ['europan_biochemistry', 'xenobiochemistry', 'deep_biosphere_ecology', 'iso_materials_analysis', 'precursor_studies', 'vacuum_metallurgy_breakthrough', 'hive_pattern_mathematics', 'metric_engineering_refinements']) {
      const def = RESEARCH_MAP.get(id)!;
      for (const eff of def.effects || []) {
        expect(eff.magnitude).toBeLessThanOrEqual(0.30 + 1e-9);
      }
    }
  });
});

// ─── V20 save migration ──────────────────────────────────────────────────────

describe('W3+W10 — V20 save migration', () => {
  it('getNewGameState ships empty doctrineChoices and repeatableResearchLevels', () => {
    const fresh = getNewGameState();
    expect(fresh.doctrineChoices).toEqual({});
    expect(fresh.repeatableResearchLevels).toEqual({});
  });

  it('loadGame additively migrates a pre-V20 save (missing both fields) to empty defaults', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;

    const legacy = getNewGameState() as GameState & { doctrineChoices?: unknown; repeatableResearchLevels?: unknown };
    delete legacy.doctrineChoices;
    delete legacy.repeatableResearchLevels;
    store.set(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.doctrineChoices).toEqual({});
    expect(loaded!.repeatableResearchLevels).toEqual({});
  });

  it('loadGame preserves existing V20 progress instead of resetting it', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;

    const withProgress = getNewGameState();
    (withProgress as GameState).doctrineChoices = { propulsion_doctrine: 'nuclear_electric' };
    (withProgress as GameState).repeatableResearchLevels = { launch_cadence_optimization: 3 };
    store.set(SAVE_KEY, JSON.stringify(withProgress));

    const loaded = loadGame()!;
    expect(loaded.doctrineChoices).toEqual({ propulsion_doctrine: 'nuclear_electric' });
    expect(loaded.repeatableResearchLevels).toEqual({ launch_cadence_optimization: 3 });
  });
});
