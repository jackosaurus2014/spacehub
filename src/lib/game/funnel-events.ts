// ─── Space Tycoon: first-session funnel events ──────────────────────────────
// Until 2026-09-04 the game emitted no analytics at all: trackGA4Event existed
// in src/lib/analytics.ts and nothing under space-tycoon/ called it. So the
// question "where do new players fall out" had no answer. This module names
// the handful of events that answer it and owns the once-per-save latches, so
// the page and the sync hook stay thin.
//
// The funnel, in order:
//   tycoon_new_game      a corporation is founded (archetype in params)
//   tycoon_tab           every tab change (tab in params)
//   tycoon_first_map     the map opens for the first time this save
//   tycoon_first_build   the first building the PLAYER placed (archetypes
//                        start with 2-3, so this compares against a baseline
//                        captured at founding, not against zero)
//   tycoon_tutorial_step a first-hour-guide step actually advanced
//   tycoon_tutorial_skip the guide was dismissed (step reached in params)
//   tycoon_first_sync    the first successful server sync this save — the
//                        signed-in line; everything before it can be anonymous
//
// Day-2 return is NOT a client event: GA4 already reports new-vs-returning by
// landing page, and the admin analytics route derives it server-side from
// GameProfile.createdAt vs lastSyncAt for signed-in players.
//
// Consent: trackGA4Event refuses to fire without analytics consent, so none of
// this leaks anything the cookie banner was not granted.

import { trackGA4Event } from '@/lib/analytics';

export const TYCOON_EVENTS = {
  newGame: 'tycoon_new_game',
  tab: 'tycoon_tab',
  firstMap: 'tycoon_first_map',
  firstBuild: 'tycoon_first_build',
  tutorialStep: 'tycoon_tutorial_step',
  tutorialSkip: 'tycoon_tutorial_skip',
  firstSync: 'tycoon_first_sync',
} as const;

export type TycoonEventName = (typeof TYCOON_EVENTS)[keyof typeof TYCOON_EVENTS];

/** Keys under this prefix are per-save latches, cleared at founding. */
export const FUNNEL_LATCH_PREFIX = 'spacetycoon_funnel_';
const BASELINE_KEY = `${FUNNEL_LATCH_PREFIX}base_buildings`;

/** The subset of Storage these helpers need — injectable for tests and for
 *  environments where localStorage throws (private mode, thumbnails). */
export interface LatchStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Enumerate keys so a new game can clear only its own latches. */
  keys(): string[];
}

function browserStore(): LatchStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const ls = window.localStorage;
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
      keys: () => Array.from({ length: ls.length }, (_, i) => ls.key(i) ?? '').filter(Boolean),
    };
  } catch {
    return null;
  }
}

export function trackTycoon(name: TycoonEventName, params?: Record<string, string | number | boolean>): void {
  trackGA4Event(name, params);
}

/** Run `fire` the first time `key` is seen for this save. Returns whether it
 *  fired. With no usable storage it fires every time rather than never —
 *  an over-count on a broken browser is a smaller lie than silence. */
export function fireOnce(key: string, fire: () => void, store: LatchStore | null = browserStore()): boolean {
  const full = `${FUNNEL_LATCH_PREFIX}${key}`;
  if (store) {
    if (store.getItem(full)) return false;
    store.setItem(full, '1');
  }
  fire();
  return true;
}

/** A new corporation starts every latch fresh and records how many buildings
 *  it was founded with, so tycoon_first_build means the player's own. */
export function startFunnelForNewGame(startingBuildings: number, store: LatchStore | null = browserStore()): void {
  if (!store) return;
  for (const k of store.keys()) if (k.startsWith(FUNNEL_LATCH_PREFIX)) store.removeItem(k);
  store.setItem(BASELINE_KEY, String(startingBuildings));
}

/** True once the save holds more buildings than it was founded with. Without
 *  a recorded baseline (a save that predates this module) nothing is inferred:
 *  a false "first build" from a veteran's 40-building save would poison the
 *  funnel more than a missing one from a legacy save. */
export function hasPlayerBuilt(currentBuildings: number, store: LatchStore | null = browserStore()): boolean {
  const raw = store?.getItem(BASELINE_KEY);
  if (raw == null) return false;
  const base = Number(raw);
  return Number.isFinite(base) && currentBuildings > base;
}
