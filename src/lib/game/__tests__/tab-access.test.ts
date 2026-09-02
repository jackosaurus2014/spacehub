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

// ─── Six-hub consolidation (GAME_DESIGN_REVIEW_2026-09 §3, item 3b) ────────
// The hub layer sits ABOVE the GameTab ids: every panel keeps its id and its
// render branch; the hub model decides which of six always-visible hubs owns
// it and which row entry lights. These tests pin the three promises the
// consolidation made: (1) every legacy id and every GameTab resolves to one
// hub + one sub-view, (2) every hub is visible at Tier 1, (3) a locked
// sub-view names the right tier and still navigates (to the lock notice).

import {
  HUB_CATALOG, HUB_IDS, MOBILE_MORE_HUBS, MOBILE_PRIMARY_HUBS,
  activeEntryFor, catalogTabs, defaultEntryFor, getSubViewUnlockTier, hubAddress, hubForTab, hubToken, parseHubAddress, resolveHubTarget,
  type GameHub,
} from '../hubs';
import { isSubViewUnlocked, resolveHubNavigation } from '../tab-access';
import { FOLDED_FEATURE_TIERS, getTabUnlockTier } from '../corporation-tiers';

const ALL_TABS: GameTab[] = [
  'dashboard', 'build', 'research', 'map', 'services', 'fleet', 'crafting', 'workforce', 'market',
  'contracts', 'alliance', 'bounties', 'predictions', 'leaderboard', 'seasons', 'territory', 'speedruns',
  'espionage', 'megaproject', 'megastructures', 'reports', 'commanders', 'factions', 'modules',
  'discoveries', 'science', 'interstellar', 'subsidiaries', 'specialization', 'victory', 'governance',
];

describe('hubs — the catalogue', () => {
  it('has exactly six hubs, in the approved order', () => {
    expect(HUB_IDS).toEqual(['command', 'build', 'markets', 'contracts', 'corporation', 'records']);
  });

  it('every GameTab is owned by exactly one hub — no panel fell out of the catalogue', () => {
    const owned = new Set(catalogTabs());
    for (const tab of ALL_TABS) expect(owned.has(tab)).toBe(true);
    // And each tab's panel entries live in ONE hub (an entry may be a deep
    // link into a tab another hub owns — Chronicle into reports — but the
    // tab-level entry is unique).
    for (const tab of ALL_TABS) {
      const owners = HUB_CATALOG.filter(h => h.subViews.some(e => e.tab === tab && !e.subView && !e.href && !e.action));
      expect(owners.length).toBeLessThanOrEqual(1);
      expect(HUB_IDS).toContain(hubForTab(tab));
    }
  });

  it('hub tokens are unique and entry ids are unique within a hub', () => {
    const tokens = new Set<string>();
    for (const hub of HUB_CATALOG) {
      const ids = new Set<string>();
      for (const entry of hub.subViews) {
        expect(ids.has(entry.id)).toBe(false);
        ids.add(entry.id);
        const token = hubToken(hub.id, entry);
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }
    }
  });

  it('promotes P&L into Command and Rivals to the head of Records (the two named promotions)', () => {
    const command = HUB_CATALOG.find(h => h.id === 'command')!;
    expect(command.subViews.findIndex(e => e.id === 'pnl')).toBeLessThanOrEqual(1);
    const records = HUB_CATALOG.find(h => h.id === 'records')!;
    expect(records.subViews[0].id).toBe('rivals');
    expect(records.subViews[0].subView).toBe('leaderboard:rivals');
  });

  it('the phone bottom nav is five slots: four hubs + More covering the other two', () => {
    expect(MOBILE_PRIMARY_HUBS.length).toBe(4);
    expect([...MOBILE_PRIMARY_HUBS, ...MOBILE_MORE_HUBS].sort()).toEqual([...HUB_IDS].sort());
  });
});

describe('hubs — resolveHubTarget: every id a caller might still pass lands somewhere', () => {
  it('resolves every GameTab id to a hub + entry that renders that tab, with NO deep request and NO feature gate', () => {
    // A bare tab id must land the panel on its own default (Standings picks
    // Leagues/Ranks by tier exactly as before), never on a possibly-locked
    // first row entry such as Rivals.
    for (const tab of ALL_TABS) {
      const t = resolveHubTarget(tab);
      expect(t).not.toBeNull();
      expect(t!.entry.tab).toBe(tab);
      expect(t!.entry.subView).toBeUndefined();
      expect(t!.entry.feature).toBeUndefined();
      expect(HUB_IDS).toContain(t!.hub);
    }
    expect(resolveHubTarget('leaderboard')!.entry.label).toBe('Standings');
  });

  it('resolves every Wave-F legacy id to the SPECIFIC sub-view that owns it now', () => {
    const expected: Record<string, string> = {
      diplomacy: 'contracts:deliveries',
      bidding: 'contracts:bidding',
      rivals: 'records:rivals',
      leagues: 'records:leagues',
      intelligence: 'markets:analytics',
      economy: 'markets:economy',
      futures: 'markets:futures',
      spatial: 'command:map',
    };
    // Every key of the older LEGACY_TAB_MAP is covered — the two maps cannot drift apart.
    expect(Object.keys(expected).sort()).toEqual(Object.keys(LEGACY_TAB_MAP).sort());
    for (const [legacy, token] of Object.entries(expected)) {
      const t = resolveHubTarget(legacy)!;
      expect(t).not.toBeNull();
      expect(hubToken(t.hub, t.entry)).toBe(token);
      // …and it agrees with the coarser LEGACY_TAB_MAP about the hub TAB.
      expect(t.entry.tab).toBe(LEGACY_TAB_MAP[legacy]);
    }
  });

  it('resolves panel tokens and hub tokens, and passes unknown deep tokens through on the owning tab', () => {
    const analytics = resolveHubTarget('market:analytics')!;
    expect(hubToken(analytics.hub, analytics.entry)).toBe('markets:analytics');
    const quarterly = resolveHubTarget('reports:quarterly')!;
    expect(hubToken(quarterly.hub, quarterly.entry)).toBe('command:pnl');
    expect(resolveHubTarget('records:rivals')!.entry.id).toBe('rivals');
    // competitive-posture.ts hands out tokens the catalogue does not list.
    const deep = resolveHubTarget('workforce:poach-defend')!;
    expect(deep.hub).toBe('corporation');
    expect(deep.entry.tab).toBe('workforce');
    expect(deep.entry.subView).toBe('workforce:poach-defend');
    expect(resolveHubTarget('map:slots')!.entry.tab).toBe('map');
  });

  it('returns null only for an id nothing owns', () => {
    expect(resolveHubTarget('definitely_not_a_tab')).toBeNull();
    expect(resolveHubTarget('')).toBeNull();
  });
});

describe('hubs — every hub is visible at Tier 1 (gating lives on the row, not the hub)', () => {
  const tier1 = stateAtTier(1);
  const unlocked = getUnlockedTabIds(tier1);

  it('every hub resolves to a landing entry at Tier 1 — five land on live panels, Corporation (all T2+) lands on the nearest lock notice', () => {
    for (const hub of HUB_IDS) {
      const landing = defaultEntryFor(hub, e => isSubViewUnlocked(tier1, e, unlocked));
      expect(landing).toBeDefined();
      expect(landing.href).toBeUndefined();
      expect(landing.action).toBeUndefined();
      if (hub === 'corporation') {
        // Every Corporation entry is Tier 2+ by design (staged unlocks); the
        // hub stays visible and the notice names the soonest goal.
        expect(isSubViewUnlocked(tier1, landing, unlocked)).toBe(false);
        expect(landing.id).toBe('specialization');
        expect(getSubViewUnlockTier(landing)).toBe(2);
      } else {
        expect(isSubViewUnlocked(tier1, landing, unlocked)).toBe(true);
      }
    }
    // …and at Tier 3 Corporation lands on Crew (its first row entry).
    const t3 = stateAtTier(3);
    expect(defaultEntryFor('corporation', e => isSubViewUnlocked(t3, e)).id).toBe('workforce');
  });

  it('hubs are addressed as hub:<id> so "build" the hub never shadows "build" the panel; the shell lands a hub on defaultEntryFor', () => {
    for (const hub of HUB_IDS) {
      expect(parseHubAddress(hubAddress(hub))).toBe(hub);
      expect(resolveHubTarget(hubAddress(hub))).toBeNull();
    }
    expect(parseHubAddress('build')).toBeNull();
    expect(resolveHubTarget('build')!.entry.tab).toBe('build');
    expect(parseHubAddress('hub:nope')).toBeNull();
    expect(defaultEntryFor('records', () => true).id).toBe('rivals');
    // …but at Tier 1 Rivals (T4) and Leagues (T5) are locked, so Records lands on Ranks.
    expect(defaultEntryFor('records', e => isSubViewUnlocked(tier1, e, unlocked)).id).toBe('ranks');
    expect(defaultEntryFor('command', () => true).id).toBe('dashboard');
  });
});

describe('hubs — locked sub-views map to the right tier and still navigate', () => {
  it('folded features carry their Wave-F tier; tab-level entries carry their tab tier; the later of the two wins', () => {
    const rivals = resolveHubTarget('rivals')!.entry;
    expect(getSubViewUnlockTier(rivals)).toBe(FOLDED_FEATURE_TIERS.rivals);
    const bidding = resolveHubTarget('bidding')!.entry;
    expect(getSubViewUnlockTier(bidding)).toBe(FOLDED_FEATURE_TIERS.bidding);
    const analytics = resolveHubTarget('intelligence')!.entry;
    expect(getSubViewUnlockTier(analytics)).toBe(FOLDED_FEATURE_TIERS.intelligence);
    for (const tab of ALL_TABS) {
      const entry = resolveHubTarget(tab)!.entry;
      expect(getSubViewUnlockTier(entry)).toBe(getTabUnlockTier(tab));
    }
    expect(getTabUnlockTier('leaderboard')).toBe(1);
    expect(getTabUnlockTier('interstellar')).toBe(7);
  });

  it('resolveHubNavigation never refuses a known id: a locked target navigates with locked=true and the tier to name', () => {
    const tier1 = stateAtTier(1);
    for (const requested of ['governance', 'victory', 'interstellar', 'espionage', 'rivals', 'bidding', 'intelligence']) {
      const nav = resolveHubNavigation(tier1, requested)!;
      expect(nav).not.toBeNull();
      expect(nav.locked).toBe(true);
      expect(nav.unlockTier).toBeGreaterThan(1);
      expect(nav.unlockTier).toBe(getSubViewUnlockTier(nav.entry));
    }
    // And an unlocked one is not flagged.
    const map = resolveHubNavigation(tier1, 'map')!;
    expect(map.locked).toBe(false);
    expect(map.hub).toBe('command');
    expect(map.tab).toBe('map');
  });

  it('the lock lifts at exactly the named tier — and the sub-view request token rides along', () => {
    const rivalsTier = FOLDED_FEATURE_TIERS.rivals;
    expect(resolveHubNavigation(stateAtTier(rivalsTier - 1), 'rivals')!.locked).toBe(true);
    const at = resolveHubNavigation(stateAtTier(rivalsTier), 'rivals')!;
    expect(at.locked).toBe(false);
    expect(at.tab).toBe('leaderboard');
    expect(at.subView).toBe('leaderboard:rivals');
  });

  it('does NOT gate before the save has loaded (empty set = no information), matching resolveTabNavigation', () => {
    expect(resolveHubNavigation(null, 'governance')!.locked).toBe(false);
    expect(resolveHubNavigation(null, 'rivals')!.locked).toBe(false);
  });

  it('a completed fabrication facility unlocks the Manufacture entry regardless of tier', () => {
    const fabLab = BUILDINGS.find(b => b.category === 'fabrication_facility')!;
    const withFab = stateAtTier(1, {
      buildings: [{
        instanceId: 'f1', definitionId: fabLab.id, locationId: fabLab.requiredLocation ?? 'leo',
        buildStartDate: { year: 2150, month: 1 }, completionDate: { year: 2150, month: 1 },
        isComplete: true, startedAtMs: 0, realDurationSeconds: 1,
      }] as GameState['buildings'],
    });
    expect(resolveHubNavigation(stateAtTier(1), 'crafting')!.locked).toBe(true);
    expect(resolveHubNavigation(withFab, 'crafting')!.locked).toBe(false);
  });

  it('link and action entries are never locked', () => {
    const records = HUB_CATALOG.find(h => h.id === 'records')!;
    const balance = records.subViews.find(e => e.href)!;
    const achievements = records.subViews.find(e => e.action)!;
    expect(isSubViewUnlocked(stateAtTier(1), balance)).toBe(true);
    expect(isSubViewUnlocked(stateAtTier(1), achievements)).toBe(true);
    expect(getSubViewUnlockTier(balance)).toBe(1);
  });
});

describe('hubs — activeEntryFor lights the right row entry', () => {
  it('deep entries match on their announced token; otherwise the tab-level entry', () => {
    expect(activeEntryFor('records', 'leaderboard', 'leaderboard:rivals')!.id).toBe('rivals');
    expect(activeEntryFor('records', 'leaderboard', 'leaderboard:ranks')!.id).toBe('ranks');
    expect(activeEntryFor('command', 'reports', 'reports:quarterly')!.id).toBe('pnl');
    expect(activeEntryFor('command', 'dashboard', null)!.id).toBe('dashboard');
    expect(activeEntryFor('corporation', 'workforce', null)!.id).toBe('workforce');
    expect(activeEntryFor('corporation', 'workforce', 'workforce:poach')!.id).toBe('poach');
  });

  it('an unknown token for a tab with only deep entries falls back to the first entry', () => {
    expect(activeEntryFor('markets', 'market', 'market:nope')!.id).toBe('spot');
    expect(activeEntryFor('records', 'leaderboard', null)!.id).toBe('rivals');
  });

  it('returns null for a hub that does not render the tab', () => {
    const hub: GameHub = 'build';
    expect(activeEntryFor(hub, 'leaderboard', null)).toBeNull();
  });
});

describe('hubs — the page cannot regrow a "More" overflow', () => {
  it('space-tycoon/page.tsx mounts the six-hub chrome and no overflow dropdown', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(path.join(process.cwd(), 'src/app/space-tycoon/page.tsx'), 'utf8');
    expect(src).toContain('<HubBar');
    expect(src).toContain('<HubSubViewRow');
    expect(src).toContain('<GameBottomNav');
    expect(src).toContain('<OverlayManager');
    expect(src).not.toContain('showMoreTabs');
    expect(src).not.toContain('PRIMARY_TAB_IDS');
  });
});
