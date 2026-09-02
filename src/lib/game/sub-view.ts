// ─── Space Tycoon: sub-view request bus (PvP Discoverability pass, 2026-08) ─
//
// The problem this solves, precisely: the game's top-level navigation is
// `setTab(GameTab)`, but every competitive verb lives one level DEEPER — the
// price-campaign declare form is Markets → Analytics, the poach inbox is Crew
// → (scroll), the slot auctions are the Map HUD's Spatial Strategy overlay.
// Hub panels hold their sub-tab in local `useState`, so `setTab('market')`
// lands the player on Spot & Orders and the verb they were sent to find is
// still two clicks away and invisible.
//
// This module is the smallest possible fix and deliberately NOT a router:
// a module-level single-slot request that a hub panel consumes on mount or on
// change. Same emitter shape as map-ping.ts, same "fire and forget, nothing is
// lost if nobody is listening" posture — except this one also PARKS the
// request, because the ordering is always "navigate, then the panel mounts".
//
// Nothing here changes navigation semantics: `setTab` is still the only way
// to change tabs, and a panel that ignores the request behaves exactly as it
// did before.

/** Tokens are `<tab>:<sub-view>` strings owned by competitive-posture.ts's
 *  CompetitiveSubView union, but typed loosely here so this module never
 *  imports game content (keeps it dependency-free and trivially testable). */
export type SubViewToken = string;

type SubViewListener = (token: SubViewToken) => void;

const listeners = new Set<SubViewListener>();

/** The single parked request, or null. Single-slot on purpose: two competing
 *  navigation intents in flight at once is a bug, and the newest one wins. */
let pending: SubViewToken | null = null;

/** How long a parked request stays valid. A request that never gets consumed
 *  (the target panel is tier-locked, the player navigated somewhere else)
 *  must not fire minutes later when they finally open that hub. */
export const SUB_VIEW_REQUEST_TTL_MS = 15_000;
let pendingAtMs = 0;

/** The tab half of a token, e.g. 'market:analytics' -> 'market'. */
export function subViewTab(token: SubViewToken): string {
  const i = token.indexOf(':');
  return i === -1 ? token : token.slice(0, i);
}

/** The view half of a token, e.g. 'market:analytics' -> 'analytics'. */
export function subViewName(token: SubViewToken): string {
  const i = token.indexOf(':');
  return i === -1 ? '' : token.slice(i + 1);
}

export function onSubViewRequest(listener: SubViewListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Ask for a sub-view. Notifies any already-mounted listener immediately AND
 * parks the request so a panel that mounts a moment later (the normal case —
 * the caller does setTab() in the same click) still sees it.
 */
export function requestSubView(token: SubViewToken, nowMs: number = Date.now()): void {
  if (!token) return;
  pending = token;
  pendingAtMs = nowMs;
  listeners.forEach(l => {
    try { l(token); } catch { /* a broken listener must not break navigation */ }
  });
}

/**
 * Consume a parked request addressed to `tab`. Returns the sub-view name
 * (e.g. 'analytics') or null. Consuming clears the slot, so a request is
 * honoured exactly once — re-mounting the panel later does not re-trigger it.
 */
export function consumeSubViewRequest(tab: string, nowMs: number = Date.now()): string | null {
  if (!pending) return null;
  if (nowMs - pendingAtMs > SUB_VIEW_REQUEST_TTL_MS) {
    pending = null;
    return null;
  }
  if (subViewTab(pending) !== tab) return null;
  const view = subViewName(pending);
  pending = null;
  return view || null;
}

// ─── Announcements (six-hub consolidation, 2026-09) ─────────────────────────
// The request bus above flows shell → panel. The shell's hub sub-view row
// also needs the reverse: when a hub panel changes its own sub-tab (the
// player clicked inside the panel, or the panel consumed a request), the row
// must light the matching entry. Same fire-and-forget posture; the shell is
// the only listener and a panel that never announces simply leaves the row
// on its tab-level default.

const announceListeners = new Set<SubViewListener>();
let current: SubViewToken | null = null;

/** A hub panel reports the sub-view it is showing, e.g. 'market:analytics'. */
export function announceSubView(token: SubViewToken): void {
  current = token;
  announceListeners.forEach(l => {
    try { l(token); } catch { /* never let a listener break a panel render */ }
  });
}

export function onSubViewAnnounce(listener: SubViewListener): () => void {
  announceListeners.add(listener);
  return () => { announceListeners.delete(listener); };
}

/** The most recently announced token (null before any panel has spoken). */
export function currentSubView(): SubViewToken | null {
  return current;
}

/** Test helper / hard reset (e.g. loading a different save). */
export function __clearSubViewRequests(): void {
  pending = null;
  pendingAtMs = 0;
  listeners.clear();
  announceListeners.clear();
  current = null;
}
