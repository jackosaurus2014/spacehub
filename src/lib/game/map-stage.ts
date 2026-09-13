// ─── Space Tycoon: Map-as-Stage layout logic (Wave V4) ──────────────────────
// docs/VISUAL_DEPTH_2026-08.md §V4.1 — on desktop (≥1280px, the same
// breakpoint where the Outliner rail docks), the map stays MOUNTED and
// visible behind every non-map tab, which renders as an overlay sheet over
// the frozen/dimmed map. On phones the map unmounts exactly as before
// (full-screen panels — no WebGL under a scrolled panel on mid-tier devices,
// per the 60Hz budget).
//
// Browser-crash investigation 2026-09-12: between those two bands (a
// desktop-class window of 768-1279 CSS px — every Windows laptop at 150%+
// scaling, or any un-maximised window) the map used to unmount on EVERY hub
// switch and remount on every return, creating a fresh WebGL2 context each
// time while React Three Fiber only force-loses the previous one 500 ms
// later. Measured on production: +2 WebGL2 contexts per return to the map,
// Chrome's 16-context cap reached after eight returns. That band now keeps
// the map mounted but HIDDEN (display:none): the context survives, the
// renderer is frozen exactly as when covered, and nothing is drawn. The
// overlay-sheet presentation stays ≥1280px only — it was designed for the
// docked-Outliner layout.
//
// Pure decision functions, extracted from page.tsx so the open/close state
// machine is unit-testable without a DOM.

import type { GameTab } from './types';

/** Desktop stage breakpoint — matches the Outliner rail's docking width. */
export const STAGE_MIN_WIDTH = 1280;

export const STAGE_MEDIA_QUERY = `(min-width: ${STAGE_MIN_WIDTH}px)`;

/** Below this the viewport is a phone: the map unmounts behind other tabs.
 *  Matches MapCommandCenter's own 3D-capability floor (innerWidth ≥ 768). */
export const STAGE_HIDDEN_MIN_WIDTH = 768;

export const STAGE_HIDDEN_MEDIA_QUERY = `(min-width: ${STAGE_HIDDEN_MIN_WIDTH}px)`;

export interface StageLayout {
  /** Render MapCommandCenter at all (mounted ⇒ WebGL context preserved). */
  mapMounted: boolean;
  /** Map is mounted but not the active surface (covered by a panel overlay,
   *  or hidden) — renderers must freeze (no rAF work, retained framebuffer
   *  only) and the map subtree goes inert (focus stays in the panel). */
  mapCovered: boolean;
  /** Non-map panel renders as an overlay sheet over the dimmed map. */
  overlayOpen: boolean;
  /** Map is mounted but display:none — the 768-1279px band. The panel
   *  renders full-width exactly as on a phone; only the map's lifecycle
   *  differs (kept alive, not remounted). */
  mapHidden: boolean;
}

/** The stage state machine. `desktopStage` is the ≥1280px media-query
 *  result; `wideViewport` is the ≥768px one (phones are below it). */
export function computeStageLayout(tab: GameTab, desktopStage: boolean, wideViewport = false): StageLayout {
  const onMap = tab === 'map';
  if (onMap) return { mapMounted: true, mapCovered: false, overlayOpen: false, mapHidden: false };
  if (desktopStage) return { mapMounted: true, mapCovered: true, overlayOpen: true, mapHidden: false };
  if (wideViewport) return { mapMounted: true, mapCovered: true, overlayOpen: false, mapHidden: true };
  return { mapMounted: false, mapCovered: false, overlayOpen: false, mapHidden: false };
}

/** Overlay dismissal: Escape (and only Escape) returns to the map tab.
 *  Returns the tab to switch to, or null to ignore the key. Callers must
 *  only invoke this while the overlay is open. */
export function overlayDismissTab(key: string): GameTab | null {
  return key === 'Escape' ? 'map' : null;
}
