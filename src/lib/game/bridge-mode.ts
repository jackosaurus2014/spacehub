// ─── Bridge mode (Graphics review 2026-09-12, item 5) ───────────────────────
// docs/GRAPHICS_REVIEW_2026-09-12.md §(b) row 5: "Site chrome collapses to
// one plate; map gets ~900 px tall". At 1366×900 the map stage measured 517
// px tall under 383 px of chrome (site launch rail + site nav + ResourceBar +
// Frontier band + hub bar + sub-view row). Bridge mode hides the SITE chrome
// (everything the root layout mounts above `<main>` — Navigation, launch
// rail, live banner, ticker, breadcrumb) and folds a logo/back link into the
// game hub bar, so the game keeps its own instrument cluster and the map
// takes the rest of the viewport. On desktop the Outliner stays docked.
//
// Mechanism: the game shell sets `data-bridge="on"|"off"` on itself AND on
// <html>. GameStyles.tsx (a styled-jsx global that only exists while the
// game shell is mounted) hides `[data-site-chrome]` elements under
// `:root[data-bridge="on"]`, so the site chrome can only ever disappear
// inside the game route — leaving the route unmounts the stylesheet and the
// shell's cleanup removes the attribute.
//
// Keyboard: `F` toggles, `Escape` exits — but Escape is the lowest-priority
// key on the page (a panel overlay's Escape-to-map, a modal's own Escape
// and any handler that already called preventDefault all win). Persisted
// under `tycoon-bridge-mode`; default OFF for existing players, with a
// one-time "Press F for bridge mode" hint chip.
//
// Pure decision functions, unit-tested without a DOM (map-stage.ts precedent).

export const BRIDGE_MODE_KEY = 'tycoon-bridge-mode'; // 'on' | 'off'
export const BRIDGE_HINT_KEY = 'tycoon-bridge-hint-seen'; // '1'

/** The keyboard binding surfaced in the button title / hint chip. */
export const BRIDGE_TOGGLE_KEY = 'F';

/** Window event the shell dispatches after the bridge attribute changes.
 *  The map stage measures its height from its own top edge, and hiding the
 *  chrome above it moves that edge without a resize event. */
export const BRIDGE_LAYOUT_EVENT = 'tycoon:layout';

/** Minimal storage shape so the helpers run against localStorage, an
 *  in-memory stub in tests, or nothing at all (SSR). */
export interface BridgeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Stored preference → boolean. Anything but the literal 'on' is OFF, so a
 *  corrupted or missing value never traps a player in bridge mode. */
export function readBridgePreference(storage: BridgeStorage | null | undefined): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(BRIDGE_MODE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeBridgePreference(storage: BridgeStorage | null | undefined, on: boolean): void {
  if (!storage) return;
  try {
    storage.setItem(BRIDGE_MODE_KEY, on ? 'on' : 'off');
  } catch { /* storage unavailable — the session keeps the in-memory value */ }
}

/** The hint chip shows once per browser, and never to a player who has
 *  already found bridge mode (a stored preference of either value counts as
 *  "found it"). */
export function shouldShowBridgeHint(storage: BridgeStorage | null | undefined): boolean {
  if (!storage) return false;
  try {
    if (storage.getItem(BRIDGE_HINT_KEY) === '1') return false;
    return storage.getItem(BRIDGE_MODE_KEY) === null;
  } catch {
    return false;
  }
}

export function markBridgeHintSeen(storage: BridgeStorage | null | undefined): void {
  if (!storage) return;
  try { storage.setItem(BRIDGE_HINT_KEY, '1'); } catch { /* ignore */ }
}

/** The subset of a KeyboardEvent the decision needs — kept structural so
 *  tests pass plain objects. */
export interface BridgeKeyEvent {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
}

export interface BridgeKeyContext {
  /** Current bridge state. */
  bridge: boolean;
  /** Focus is in a text field (input/textarea/select/contentEditable) —
   *  letters must type, never toggle. */
  inTextField: boolean;
  /** A modal dialog ([aria-modal="true"]) is open — its own keys win. */
  modalOpen: boolean;
  /** The desktop panel overlay is open — its Escape returns to the map and
   *  must not ALSO leave bridge mode. */
  overlayOpen: boolean;
}

export type BridgeKeyAction = 'toggle' | 'exit' | null;

/** What a keydown means for bridge mode, or null to leave the event alone.
 *  `F` (either case, no modifiers) toggles; `Escape` exits only when bridge
 *  is on and nothing higher-priority is listening. */
export function bridgeKeyAction(e: BridgeKeyEvent, ctx: BridgeKeyContext): BridgeKeyAction {
  if (e.defaultPrevented) return null;
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (ctx.inTextField || ctx.modalOpen) return null;
  if (e.key === 'f' || e.key === 'F') return 'toggle';
  if (e.key === 'Escape') {
    if (!ctx.bridge || ctx.overlayOpen) return null;
    return 'exit';
  }
  return null;
}

/** Apply an action to the current state. */
export function applyBridgeAction(bridge: boolean, action: BridgeKeyAction): boolean {
  if (action === 'toggle') return !bridge;
  if (action === 'exit') return false;
  return bridge;
}
