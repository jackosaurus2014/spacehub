// ─── Space Tycoon: the six hubs (GAME_DESIGN_REVIEW_2026-09 §3, item 3b) ────
//
// The second tab consolidation. Wave F folded eight tabs into hub tabs and the
// count regrew to 30 (9 visible, 21 behind "More ▾"; Rivals three taps deep,
// P&L two). This module is the single source of truth for the NEW shape:
//
//   six always-visible hubs, each with a sub-view row
//
// Nothing is deleted. Every panel that existed keeps its GameTab id and its
// render branch in page.tsx — this file only decides which hub OWNS each
// GameTab, what the row under that hub shows, and how any string a caller
// might still hand to `navigateToTab` (a GameTab id, a Wave-F legacy id such
// as 'rivals', a panel token such as 'market:analytics', or a hub token such
// as 'records:rivals') resolves to ONE hub entry. Deep links, toasts, tutorial
// steps and situation-log rows therefore keep working unchanged.
//
// Tier gating lives on the ENTRY, not the hub: a hub is always visible; a
// locked entry renders the existing LockedSubtabNotice in place of the panel
// (tab-access.ts decides locked/unlocked; this file only carries the data).
//
// Pure data + pure functions. No React, no game content imports beyond the
// tier tables, so it is trivially unit-testable (hubs.test.ts inside
// tab-access.test.ts).

import type { GameTab } from './types';
import type { IconName } from './icons';
import { FOLDED_FEATURE_TIERS, getTabUnlockTier, type FoldedFeature } from './corporation-tiers';

export type GameHub = 'command' | 'build' | 'markets' | 'contracts' | 'corporation' | 'records';

export interface HubSubView {
  /** Stable id, unique within its hub. The hub token is `${hub}:${id}`. */
  id: string;
  label: string;
  icon: IconName;
  /** The GameTab whose page.tsx render branch shows this entry. */
  tab: GameTab;
  /** Panel-level sub-view request (sub-view.ts token, e.g. 'market:analytics')
   *  handed to the hub panel after navigation. Omitted for entries that ARE
   *  the whole panel. */
  subView?: string;
  /** Wave-F folded-feature gate. The entry is locked below
   *  FOLDED_FEATURE_TIERS[feature] even when `tab` itself is unlocked. */
  feature?: FoldedFeature;
  /** A site page instead of a panel (the row renders a Link). */
  href?: string;
  /** A shell-level action instead of a panel (the row renders a button that
   *  the shell handles). */
  action?: 'achievements';
}

export interface HubDef {
  id: GameHub;
  label: string;
  /** ≤ 9 chars — the mobile bottom-nav and narrow-row label. */
  shortLabel: string;
  icon: IconName;
  subViews: HubSubView[];
}

/** The catalogue. Order within a hub is the row order; the first entry that
 *  is unlocked AND renders a panel is the hub's landing entry. Promotions the
 *  review asked for: P&L (Command, 2nd slot) and Rivals (Records, 1st slot). */
export const HUB_CATALOG: readonly HubDef[] = [
  {
    id: 'command', label: 'Command', shortLabel: 'Command', icon: 'dashboard',
    subViews: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', tab: 'dashboard' },
      { id: 'pnl', label: 'P&L', icon: 'money', tab: 'reports', subView: 'reports:quarterly' },
      { id: 'log', label: 'Situation Log', icon: 'warning', tab: 'reports', subView: 'reports:log' },
      { id: 'mail', label: 'Mail', icon: 'reports', tab: 'reports', subView: 'reports:mail' },
      { id: 'emergency', label: 'Emergency', icon: 'cal-systemic-crisis', tab: 'reports', subView: 'reports:emergency' },
      { id: 'map', label: 'Map', icon: 'map', tab: 'map' },
    ],
  },
  {
    id: 'build', label: 'Build & Fleet', shortLabel: 'Build', icon: 'build',
    subViews: [
      { id: 'build', label: 'Build', icon: 'build', tab: 'build' },
      { id: 'services', label: 'Services', icon: 'services', tab: 'services' },
      { id: 'crafting', label: 'Manufacture', icon: 'crafting', tab: 'crafting' },
      { id: 'research', label: 'Research', icon: 'research', tab: 'research' },
      { id: 'fleet', label: 'Fleet', icon: 'fleet', tab: 'fleet' },
      { id: 'modules', label: 'Modules', icon: 'modules', tab: 'modules' },
      { id: 'megastructures', label: 'Megastructures', icon: 'megastructures', tab: 'megastructures' },
      { id: 'megaproject', label: 'Mega-Project', icon: 'megaproject', tab: 'megaproject' },
    ],
  },
  {
    id: 'markets', label: 'Markets', shortLabel: 'Markets', icon: 'market',
    subViews: [
      { id: 'spot', label: 'Spot & Orders', icon: 'market', tab: 'market', subView: 'market:spot' },
      { id: 'analytics', label: 'Analytics', icon: 'activity', tab: 'market', subView: 'market:analytics', feature: 'intelligence' },
      { id: 'economy', label: 'Economy', icon: 'globe', tab: 'market', subView: 'market:economy', feature: 'economy' },
      { id: 'futures', label: 'Futures', icon: 'predictions', tab: 'market', subView: 'market:futures', feature: 'futures' },
      { id: 'predictions', label: 'Predictions', icon: 'predictions', tab: 'predictions' },
    ],
  },
  {
    id: 'contracts', label: 'Contracts & Diplomacy', shortLabel: 'Contracts', icon: 'contracts',
    subViews: [
      { id: 'standard', label: 'Contracts', icon: 'contracts', tab: 'contracts', subView: 'contracts:standard' },
      { id: 'deliveries', label: 'Faction Deliveries', icon: 'handshake', tab: 'contracts', subView: 'contracts:deliveries', feature: 'diplomacy' },
      { id: 'races', label: 'Races', icon: 'target', tab: 'contracts', subView: 'contracts:races' },
      { id: 'bidding', label: 'PVP Bidding', icon: 'swords', tab: 'contracts', subView: 'contracts:pvp', feature: 'bidding' },
      // Diplomacy (2026-09-02, docs/ECONOMY_PVP_2026-08.md "Diplomacy"):
      // binding corp-to-corp supply contracts + pacts, and the public
      // diplomacy timeline. Tier 1 — the cooperative half of economic
      // warfare is part of the on-ramp, not the endgame.
      { id: 'corp', label: 'Corp Contracts', icon: 'handshake', tab: 'contracts', subView: 'contracts:corp' },
      { id: 'diplomacy', label: 'Diplomacy', icon: 'scroll', tab: 'contracts', subView: 'contracts:diplomacy' },
      { id: 'bounties', label: 'Bounties', icon: 'bounties', tab: 'bounties' },
      { id: 'alliance', label: 'Alliance', icon: 'alliance', tab: 'alliance' },
      { id: 'factions', label: 'Factions', icon: 'factions', tab: 'factions' },
      { id: 'governance', label: 'Governance', icon: 'governance', tab: 'governance' },
    ],
  },
  {
    id: 'corporation', label: 'Corporation', shortLabel: 'Corp', icon: 'alliance',
    subViews: [
      { id: 'workforce', label: 'Crew', icon: 'workforce', tab: 'workforce' },
      { id: 'poach', label: 'Poach', icon: 'target', tab: 'workforce', subView: 'workforce:poach' },
      { id: 'commanders', label: 'Commanders', icon: 'commanders', tab: 'commanders' },
      { id: 'subsidiaries', label: 'Subsidiaries', icon: 'subsidiaries', tab: 'subsidiaries' },
      { id: 'specialization', label: 'Specialize', icon: 'specialization', tab: 'specialization' },
      { id: 'territory', label: 'Territory', icon: 'territory', tab: 'territory' },
      { id: 'espionage', label: 'Intel', icon: 'espionage', tab: 'espionage' },
      { id: 'science', label: 'Science', icon: 'science', tab: 'science' },
      { id: 'victory', label: 'Victory', icon: 'victory', tab: 'victory' },
    ],
  },
  {
    id: 'records', label: 'Records', shortLabel: 'Records', icon: 'archive',
    subViews: [
      { id: 'rivals', label: 'Rivals', icon: 'swords', tab: 'leaderboard', subView: 'leaderboard:rivals', feature: 'rivals' },
      { id: 'leagues', label: 'Leagues', icon: 'leaderboard', tab: 'leaderboard', subView: 'leaderboard:leagues', feature: 'leagues' },
      { id: 'ranks', label: 'Ranks', icon: 'leaderboard', tab: 'leaderboard', subView: 'leaderboard:ranks' },
      { id: 'seasons', label: 'Seasons', icon: 'seasons', tab: 'seasons' },
      { id: 'speedruns', label: 'Speed Runs', icon: 'speedruns', tab: 'speedruns' },
      { id: 'achievements', label: 'Achievements', icon: 'medal', tab: 'leaderboard', action: 'achievements' },
      { id: 'chronicle', label: 'Chronicle', icon: 'scroll', tab: 'reports', subView: 'reports:legacy' },
      { id: 'heritage', label: 'Heritage', icon: 'archive', tab: 'leaderboard', subView: 'leaderboard:heritage' },
      { id: 'discoveries', label: 'Discoveries', icon: 'discoveries', tab: 'discoveries' },
      { id: 'interstellar', label: 'Interstellar', icon: 'interstellar', tab: 'interstellar' },
      { id: 'balance', label: 'Balance Reports', icon: 'balance', tab: 'leaderboard', href: '/space-tycoon/balance-reports' },
    ],
  },
];

export const HUB_IDS: readonly GameHub[] = HUB_CATALOG.map(h => h.id);

/** Five-slot phone bottom nav: four hubs + "More" (Corporation, Records). */
export const MOBILE_PRIMARY_HUBS: readonly GameHub[] = ['command', 'build', 'markets', 'contracts'];
export const MOBILE_MORE_HUBS: readonly GameHub[] = ['corporation', 'records'];

const HUB_MAP: ReadonlyMap<GameHub, HubDef> = new Map(HUB_CATALOG.map(h => [h.id, h]));

export function getHubDef(hub: GameHub): HubDef {
  return HUB_MAP.get(hub)!;
}

export function hubToken(hub: GameHub, entry: HubSubView): string {
  return `${hub}:${entry.id}`;
}

export interface HubTarget {
  hub: GameHub;
  entry: HubSubView;
}

/** Wave-F legacy tab ids → the precise entry that owns them today. These are
 *  MORE specific than tab-access.ts's LEGACY_TAB_MAP (which only knew the
 *  hub tab): 'rivals' now lands ON the Rivals sub-view, not merely on the
 *  Standings panel with Rivals two clicks away. */
const LEGACY_ENTRY_MAP: Readonly<Record<string, string>> = {
  diplomacy: 'contracts:deliveries',
  bidding: 'contracts:bidding',
  rivals: 'records:rivals',
  leagues: 'records:leagues',
  intelligence: 'markets:analytics',
  economy: 'markets:economy',
  futures: 'markets:futures',
  spatial: 'command:map',
};

/** Index: hub token ('records:rivals') → target. */
const BY_TOKEN = new Map<string, HubTarget>();
/** Index: panel sub-view token ('leaderboard:rivals') → target. */
const BY_SUBVIEW = new Map<string, HubTarget>();
/** Index: GameTab → its tab-level entry. Tabs whose row entries are ALL
 *  deep views (market, contracts, reports, leaderboard) get a SYNTHETIC
 *  tab-level entry with no sub-view request and no feature gate, so a bare
 *  `navigateToTab('leaderboard')` lands the panel on its own default (Ranks
 *  or Leagues by tier — exactly as before) rather than on a possibly-locked
 *  first row entry; the panel then announces its real view and the row
 *  lights the right key. */
const BY_TAB = new Map<GameTab, HubTarget>();

/** Labels for the synthetic tab-level entries (the panel's own name). */
const TAB_LEVEL_LABEL: Partial<Record<GameTab, string>> = {
  market: 'Markets',
  contracts: 'Contracts',
  reports: 'Reports',
  leaderboard: 'Standings',
  workforce: 'Crew',
};

for (const hub of HUB_CATALOG) {
  for (const entry of hub.subViews) {
    const target: HubTarget = { hub: hub.id, entry };
    BY_TOKEN.set(hubToken(hub.id, entry), target);
    if (entry.subView && !BY_SUBVIEW.has(entry.subView)) BY_SUBVIEW.set(entry.subView, target);
    if (entry.href || entry.action) continue;
    const existing = BY_TAB.get(entry.tab);
    if (existing && !existing.entry.subView) continue; // a real tab-level entry already won
    if (!entry.subView) {
      BY_TAB.set(entry.tab, target);
    } else if (!existing) {
      // Every GameTab id is also a registry IconName (icons.test.ts guards it).
      BY_TAB.set(entry.tab, {
        hub: hub.id,
        entry: { id: entry.tab, label: TAB_LEVEL_LABEL[entry.tab] ?? entry.label, icon: entry.tab as IconName, tab: entry.tab },
      });
    }
  }
}

/** A bare hub id is addressed as `hub:<id>` so it can never collide with a
 *  GameTab of the same name ('build' is both a hub and a panel). */
export const HUB_ID_PREFIX = 'hub:';

export function hubAddress(hub: GameHub): string {
  return `${HUB_ID_PREFIX}${hub}`;
}

/** 'hub:records' → 'records'; anything else → null. */
export function parseHubAddress(requested: string): GameHub | null {
  if (!requested.startsWith(HUB_ID_PREFIX)) return null;
  const id = requested.slice(HUB_ID_PREFIX.length);
  return (HUB_IDS as readonly string[]).includes(id) ? (id as GameHub) : null;
}

/** Every GameTab that some hub entry renders. Used by the tests to prove no
 *  panel fell out of the catalogue. */
export function catalogTabs(): GameTab[] {
  return Array.from(BY_TAB.keys());
}

/** The hub that owns a GameTab. Every GameTab is owned by exactly one hub
 *  (guarded by tests); the fallback is 'command' so an unknown id can never
 *  crash the shell. */
export function hubForTab(tab: GameTab): GameHub {
  return BY_TAB.get(tab)?.hub ?? 'command';
}

/**
 * Resolve ANY navigation string a caller might still pass to one hub entry.
 * Accepted, in this order:
 *   1. a hub token          'records:rivals'
 *   2. a panel token        'leaderboard:rivals', 'market:analytics'
 *   3. a Wave-F legacy id   'rivals', 'bidding', 'intelligence', …
 *   4. a GameTab id         'leaderboard', 'market', 'build', …
 * Returns null only for an id nothing owns.
 */
export function resolveHubTarget(requested: string): HubTarget | null {
  if (!requested) return null;
  const byToken = BY_TOKEN.get(requested);
  if (byToken) return byToken;
  const bySubView = BY_SUBVIEW.get(requested);
  if (bySubView) return bySubView;
  const legacy = LEGACY_ENTRY_MAP[requested];
  if (legacy) return BY_TOKEN.get(legacy) ?? null;
  const byTab = BY_TAB.get(requested as GameTab);
  if (byTab) return byTab;
  // A panel token whose view the catalogue does not list (e.g.
  // 'workforce:poach-defend', 'map:slots'): land on the tab, keep the token
  // so the panel can still honour it.
  const colon = requested.indexOf(':');
  if (colon > 0) {
    const tabPart = requested.slice(0, colon) as GameTab;
    const owner = BY_TAB.get(tabPart);
    if (owner) return { hub: owner.hub, entry: { ...owner.entry, subView: requested } };
  }
  return null;
}

/** The corporation tier at which an entry becomes usable: the later of its
 *  tab's tier and its folded-feature tier. Link/action entries are tier 1. */
export function getSubViewUnlockTier(entry: HubSubView): number {
  if (entry.href || entry.action) return 1;
  const tabTier = getTabUnlockTier(entry.tab);
  const featureTier = entry.feature ? FOLDED_FEATURE_TIERS[entry.feature] : 1;
  return Math.max(tabTier, featureTier);
}

/** Which entry in `hub` the row should light for the shell's current (tab,
 *  announced sub-view) pair. Deep entries match on their token; otherwise
 *  the tab-level entry; otherwise the first entry for that tab. */
export function activeEntryFor(hub: GameHub, tab: GameTab, subView: string | null): HubSubView | null {
  const def = getHubDef(hub);
  const forTab = def.subViews.filter(e => e.tab === tab && !e.href && !e.action);
  if (forTab.length === 0) return null;
  if (subView) {
    const deep = forTab.find(e => e.subView === subView);
    if (deep) return deep;
  }
  return forTab.find(e => !e.subView) ?? forTab[0];
}

/** The entry a hub lands on when the player taps the hub itself: the first
 *  entry in row order that renders a panel and passes `isUnlocked`; if
 *  everything is locked (a brand-new corporation opening Corporation), the
 *  entry with the lowest unlock tier, so the lock notice names the nearest
 *  goal (Specialize at Tier 2). */
export function defaultEntryFor(hub: GameHub, isUnlocked: (entry: HubSubView) => boolean): HubSubView {
  const panels = getHubDef(hub).subViews.filter(e => !e.href && !e.action);
  const unlocked = panels.find(isUnlocked);
  if (unlocked) return unlocked;
  // Nothing unlocked yet (a Tier-1 corporation opening Corporation): land on
  // the entry that unlocks SOONEST so the notice names the nearest goal.
  return panels.reduce((best, e) => (getSubViewUnlockTier(e) < getSubViewUnlockTier(best) ? e : best), panels[0]);
}

export function isGameHub(id: string): id is GameHub {
  return (HUB_IDS as readonly string[]).includes(id);
}
