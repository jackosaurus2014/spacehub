// ─── Space Tycoon: tab access and navigation guard ──────────────────────────
// Standing follow-up from the 2026-08-16 simulated-newcomer FTUE audit, folded
// into AAA Round 2 (docs/AAA_PROGRAM_2026-08.md).
//
// THE DEFECT. `space-tycoon/page.tsx` drove navigation through a raw
// `useState` setter with ~23 call sites. Any caller passing a corporation-tier
// LOCKED tab rendered a panel the player has not unlocked — a render hole with
// no matching entry in the tab bar, so the player lands in a surface the
// staged-unlock design says does not exist for them yet, with no lit tab to
// navigate away from. Exactly ONE call site (the tutorial deck) carried an
// ad-hoc `if (unlockedTabIds.has(resolved))` guard, which proved the hazard
// without covering the other twenty-two — and recent waves have only added
// routing surfaces (the sub-view request bus, map radial verbs, Legacy Hall
// deep-links, the Situation Log's crisis rows).
//
// THE FIX IS STRUCTURAL, NOT PER-CALL-SITE. Three parts:
//
//   1. The unlock set and the navigation decision are PURE FUNCTIONS here,
//      so they are unit-testable without mounting the page (which is what
//      made the previous guard untestable and therefore un-regressed).
//   2. `page.tsx` renames the raw setter to `setTabUnsafe` and exposes a
//      single `navigateToTab`. Any future caller who writes `setTab(...)`
//      now gets a COMPILE ERROR rather than a silent render hole, and
//      writing `setTabUnsafe(...)` is a deliberate, greppable act.
//   3. Legacy-alias resolution moves in here too, so a caller cannot resolve
//      an alias and then skip the lock check (the exact order-of-operations
//      that made the ad-hoc guard easy to get wrong).
//
// SIX-HUB CONSOLIDATION (2026-09, GAME_DESIGN_REVIEW_2026-09 §3 item 3b).
// Tier gating moved from the tab bar to the hub sub-view rows: every hub is
// always visible, and a LOCKED entry renders LockedSubtabNotice in place of
// its panel. `navigateToTab` therefore no longer REFUSES a locked target —
// it lands on the lock notice, which is a lit hub + lit row entry, so the
// original "render hole" (a panel with no lit tab) cannot occur by
// construction. `resolveTabNavigation` below keeps its refuse-on-locked
// contract for callers that want a yes/no; page.tsx now uses
// `resolveHubNavigation`, which returns the hub, the entry, and whether the
// shell must show the lock notice instead of the panel.

import type { GameState, GameTab } from './types';
import { getTierUnlockedTabs, isFoldedFeatureUnlocked } from './corporation-tiers';
import { BUILDING_MAP } from './buildings';
import { getSubViewUnlockTier, resolveHubTarget, type GameHub, type HubSubView } from './hubs';

/** Audit Wave F (§B2-B5): eight tabs were merged into hub tabs. Child panels,
 *  tutorial steps, feature-unlock toasts and nav callbacks all hand back tab
 *  ids as plain strings, and a future URL/deep-link entry point could too, so
 *  a removed id must route to the hub that now owns that functionality rather
 *  than rendering a dead branch. Moved here from page.tsx so that resolution
 *  and the lock check cannot be separated. */
export const LEGACY_TAB_MAP: Record<string, GameTab> = {
  diplomacy: 'contracts',
  bidding: 'contracts',
  rivals: 'leaderboard',
  leagues: 'leaderboard',
  intelligence: 'market',
  economy: 'market',
  futures: 'market',
  spatial: 'map',
};

/** Map a possibly-legacy tab id onto the tab that owns it today. Idempotent:
 *  no hub tab is itself a legacy key, so resolving twice is resolving once. */
export function resolveLegacyTab(id: string): GameTab {
  return LEGACY_TAB_MAP[id] ?? (id as GameTab);
}

/**
 * Every tab this save has actually unlocked.
 *
 * Corporation tier is the primary gate (`corporation-tiers.ts`), plus the one
 * building-driven override the catalogue promises in copy: the Orbital
 * Fabrication Lab's tooltip says it unlocks Crafting, so a completed
 * fabrication facility grants it regardless of tier.
 *
 * A null state (the game has not loaded yet) returns an EMPTY set, which
 * `resolveTabNavigation` reads as "no gating information available" and
 * therefore does not gate on — the boot path must not be blocked by a set
 * that has not been computed yet.
 */
export function getUnlockedTabIds(state: GameState | null | undefined): Set<GameTab> {
  if (!state) return new Set<GameTab>();
  const unlocked = new Set<GameTab>(getTierUnlockedTabs(state.corporationTier || 1));
  const hasFabLab = (state.buildings || []).some(b => {
    if (!b.isComplete) return false;
    return BUILDING_MAP.get(b.definitionId)?.category === 'fabrication_facility';
  });
  if (hasFabLab) unlocked.add('crafting');
  return unlocked;
}

export function isTabUnlocked(state: GameState | null | undefined, tab: string): boolean {
  const unlocked = getUnlockedTabIds(state);
  if (unlocked.size === 0) return true; // no gating information yet — see above
  return unlocked.has(resolveLegacyTab(tab));
}

/**
 * The navigation decision, in one place.
 *
 * Returns the tab to switch to, or **null** when the request must be refused.
 * Refusing is a NO-OP by design (the player stays where they are) rather than
 * a redirect to the Dashboard: a deep-link from the Situation Log or the
 * Outliner into a surface this corporation has not unlocked should quietly do
 * nothing, not yank the player out of whatever they were reading. That is
 * also the behaviour of the single ad-hoc guard this replaces, so no shipped
 * path changes meaning.
 *
 * `unlocked` may be passed in when the caller already has the set for this
 * render (page.tsx does) — purely to avoid recomputing it on every click.
 */
export function resolveTabNavigation(
  state: GameState | null | undefined,
  requested: string,
  unlocked?: Set<GameTab>,
): GameTab | null {
  const resolved = resolveLegacyTab(requested);
  const set = unlocked ?? getUnlockedTabIds(state);
  // Empty set = the game has not loaded far enough to know what is unlocked.
  // Gating here would break the boot path (which navigates to the initial tab
  // before the first render that computes the set).
  if (set.size === 0) return resolved;
  return set.has(resolved) ? resolved : null;
}

// ─── Hub navigation (six-hub consolidation) ─────────────────────────────────

export interface HubNavigation {
  hub: GameHub;
  entry: HubSubView;
  /** The GameTab whose render branch page.tsx mounts. */
  tab: GameTab;
  /** Panel-level sub-view request to fire after switching tabs, if any. */
  subView: string | null;
  /** True when the shell must render LockedSubtabNotice instead of the
   *  panel. Always false before the save has loaded (empty unlock set). */
  locked: boolean;
  /** Corporation tier the LockedSubtabNotice names. */
  unlockTier: number;
}

/**
 * Is this hub entry usable for this save? Two gates, both must pass: the
 * entry's GameTab is in the unlock set (tier or fab-lab override), and its
 * folded feature (if any) has reached its Wave-F tier. Link and action
 * entries are never locked. An empty unlock set means "not loaded yet" and
 * reads as unlocked, exactly like resolveTabNavigation.
 */
export function isSubViewUnlocked(
  state: GameState | null | undefined,
  entry: HubSubView,
  unlocked?: Set<GameTab>,
): boolean {
  if (entry.href || entry.action) return true;
  const set = unlocked ?? getUnlockedTabIds(state);
  if (set.size === 0) return true;
  if (!set.has(entry.tab)) return false;
  if (entry.feature && !isFoldedFeatureUnlocked(state?.corporationTier || 1, entry.feature)) return false;
  return true;
}

/**
 * The navigation decision for the hub shell. Never refuses a known id: a
 * locked target still navigates (to its lock notice) so deep links from the
 * Situation Log, toasts, the tutorial deck and the Legacy Hall all land
 * somewhere legible instead of silently doing nothing. Returns null only for
 * an id nothing owns.
 */
export function resolveHubNavigation(
  state: GameState | null | undefined,
  requested: string,
  unlocked?: Set<GameTab>,
): HubNavigation | null {
  const target = resolveHubTarget(requested);
  if (!target) return null;
  const { hub, entry } = target;
  return {
    hub,
    entry,
    tab: entry.tab,
    subView: entry.subView ?? null,
    locked: !isSubViewUnlocked(state, entry, unlocked),
    unlockTier: getSubViewUnlockTier(entry),
  };
}
