/**
 * @jest-environment node
 *
 * Tab access and the navigation guard.
 *
 * Standing follow-up from the 2026-08-16 simulated-newcomer FTUE audit, folded
 * into AAA Round 2. The defect this guards: `space-tycoon/page.tsx` drove
 * navigation through a raw `useState` setter with ~23 call sites, exactly one
 * of which checked whether the destination tab was corporation-tier UNLOCKED.
 * Every other path could render a panel with no matching entry in the tab bar
 * — a render hole outside the staged-unlock design.
 *
 * The headline assertion is the last describe block: **a locked tab cannot be
 * navigated to.** Everything above it exists so that assertion is meaningful
 * (the unlock set must be real, and alias resolution must happen INSIDE the
 * check rather than beside it).
 */
import type { GameState, GameTab } from '../types';
import {
  LEGACY_TAB_MAP,
  getUnlockedTabIds,
  isTabUnlocked,
  resolveLegacyTab,
  resolveTabNavigation,
} from '../tab-access';
import { CORPORATION_TIERS, getTierUnlockedTabs } from '../corporation-tiers';
import { BUILDINGS } from '../buildings';

function stateAtTier(tier: number, overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: 0, lastTickAt: 0,
    money: 0, totalEarned: 0, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], ships: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface'], resources: {}, eventLog: [],
    corporationTier: tier,
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...overrides,
  } as GameState;
}

describe('tab-access — legacy alias resolution', () => {
  it('routes every merged-away id to a tab that still exists', () => {
    for (const [legacy, target] of Object.entries(LEGACY_TAB_MAP)) {
      expect(resolveLegacyTab(legacy)).toBe(target);
      // The target must not itself be a legacy key, or resolution would need
      // more than one pass and callers could stop halfway.
      expect(LEGACY_TAB_MAP[target]).toBeUndefined();
    }
  });

  it('is idempotent — resolving twice is resolving once', () => {
    for (const legacy of Object.keys(LEGACY_TAB_MAP)) {
      expect(resolveLegacyTab(resolveLegacyTab(legacy))).toBe(resolveLegacyTab(legacy));
    }
    expect(resolveLegacyTab('map')).toBe('map');
  });

  it('passes through an id it does not know', () => {
    expect(resolveLegacyTab('dashboard')).toBe('dashboard');
  });
});

describe('tab-access — getUnlockedTabIds', () => {
  it('a Tier-1 corporation has the tier-1 tabs and nothing deeper', () => {
    const unlocked = getUnlockedTabIds(stateAtTier(1));
    for (const t of getTierUnlockedTabs(1)) expect(unlocked.has(t)).toBe(true);
    // Spot-check the deep gates that produced the original render hole.
    for (const locked of ['governance', 'victory', 'interstellar', 'espionage', 'seasons'] as GameTab[]) {
      expect(unlocked.has(locked)).toBe(false);
    }
  });

  it('the set grows monotonically with corporation tier', () => {
    let previous = new Set<GameTab>();
    for (const tierDef of CORPORATION_TIERS) {
      const unlocked = getUnlockedTabIds(stateAtTier(tierDef.tier));
      previous.forEach(t => expect(unlocked.has(t)).toBe(true));
      previous = unlocked;
    }
  });

  it('a completed fabrication facility unlocks Crafting regardless of tier', () => {
    const fabLab = BUILDINGS.find(b => b.category === 'fabrication_facility');
    expect(fabLab).toBeDefined();
    const withFab = stateAtTier(1, {
      buildings: [{
        instanceId: 'f1', definitionId: fabLab!.id, locationId: fabLab!.requiredLocation ?? 'leo',
        buildStartDate: { year: 2150, month: 1 }, completionDate: { year: 2150, month: 1 },
        isComplete: true, startedAtMs: 0, realDurationSeconds: 1,
      }] as GameState['buildings'],
    });
    expect(getUnlockedTabIds(stateAtTier(1)).has('crafting')).toBe(false);
    expect(getUnlockedTabIds(withFab).has('crafting')).toBe(true);
  });

  it('an INCOMPLETE fabrication facility does not unlock Crafting', () => {
    const fabLab = BUILDINGS.find(b => b.category === 'fabrication_facility')!;
    const building = stateAtTier(1, {
      buildings: [{
        instanceId: 'f1', definitionId: fabLab.id, locationId: fabLab.requiredLocation ?? 'leo',
        buildStartDate: { year: 2150, month: 1 }, completionDate: { year: 2150, month: 1 },
        isComplete: false, startedAtMs: 0, realDurationSeconds: 1,
      }] as GameState['buildings'],
    });
    expect(getUnlockedTabIds(building).has('crafting')).toBe(false);
  });

  it('a null state returns an EMPTY set — the boot-path signal, not a lockout', () => {
    expect(getUnlockedTabIds(null).size).toBe(0);
    expect(getUnlockedTabIds(undefined).size).toBe(0);
  });

  it('tolerates a state with no buildings array', () => {
    expect(() => getUnlockedTabIds({ corporationTier: 3 } as GameState)).not.toThrow();
  });
});

describe('tab-access — resolveTabNavigation IS the guard (the regression)', () => {
  const tier1 = stateAtTier(1);
  const tier5 = stateAtTier(5);

  it('REFUSES a corporation-tier-locked tab', () => {
    // This is the assertion the whole file exists for. Before the guard, each
    // of these would have rendered a panel with no lit tab in the bar.
    for (const locked of ['governance', 'victory', 'megastructures', 'interstellar', 'espionage'] as GameTab[]) {
      expect(getUnlockedTabIds(tier1).has(locked)).toBe(false); // premise
      expect(resolveTabNavigation(tier1, locked)).toBeNull();   // guard
    }
  });

  it('allows every tab the corporation has actually unlocked', () => {
    for (const t of Array.from(getUnlockedTabIds(tier5))) {
      expect(resolveTabNavigation(tier5, t)).toBe(t);
    }
  });

  it('refuses a LEGACY alias whose resolved target is locked — resolution happens inside the check', () => {
    // The order-of-operations trap: a caller that resolved the alias and then
    // forgot to re-check would sail straight through. `intelligence` -> `market`
    // happens to be tier-1, so use a deep target to make the point.
    const deepAlias = Object.entries(LEGACY_TAB_MAP)
      .find(([, target]) => !getUnlockedTabIds(tier1).has(target));
    if (deepAlias) {
      expect(resolveTabNavigation(tier1, deepAlias[0])).toBeNull();
    }
    // And an alias whose target IS unlocked resolves rather than being refused
    // for being an alias.
    expect(resolveTabNavigation(tier1, 'intelligence')).toBe('market');
  });

  it('refuses an unknown tab id outright', () => {
    expect(resolveTabNavigation(tier1, 'definitely_not_a_tab')).toBeNull();
  });

  it('does NOT gate before the save has loaded (empty set = no information)', () => {
    // The boot path navigates to the initial tab before the first render that
    // could compute an unlock set. Gating there would break loading a save.
    expect(resolveTabNavigation(null, 'map')).toBe('map');
    expect(resolveTabNavigation(null, 'governance')).toBe('governance');
  });

  it('honours a caller-supplied unlock set (page.tsx passes its render memo)', () => {
    const set = new Set<GameTab>(['dashboard', 'map']);
    expect(resolveTabNavigation(tier5, 'governance', set)).toBeNull();
    expect(resolveTabNavigation(tier5, 'map', set)).toBe('map');
  });

  it('agrees with isTabUnlocked in both directions', () => {
    for (const t of ['dashboard', 'map', 'governance', 'victory', 'crafting'] as GameTab[]) {
      expect(resolveTabNavigation(tier1, t) !== null).toBe(isTabUnlocked(tier1, t));
      expect(resolveTabNavigation(tier5, t) !== null).toBe(isTabUnlocked(tier5, t));
    }
  });
});

describe('tab-access — the page cannot reintroduce the hole', () => {
  it('space-tycoon/page.tsx contains no raw setTab( call', () => {
    // Structural guard, not a value test: the raw setter was renamed to
    // `setTabUnsafe`, so any future caller writing `setTab(...)` is a compile
    // error. This test fails if the old name is ever reintroduced, which is
    // the only way the per-call-site hazard can come back.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/space-tycoon/page.tsx'),
      'utf8',
    );
    expect(/\bsetTab\((?!Unsafe)/.test(src)).toBe(false);
    // And the raw setter is called exactly once — inside navigateToTab.
    expect((src.match(/setTabUnsafe\(/g) || []).length).toBe(1);
    expect(src).toContain('const navigateToTab = useCallback(');
  });
});
