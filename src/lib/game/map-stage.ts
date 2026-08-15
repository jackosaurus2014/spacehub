// ─── Space Tycoon: Map-as-Stage layout logic (Wave V4) ──────────────────────
// docs/VISUAL_DEPTH_2026-08.md §V4.1 — on desktop (≥1280px, the same
// breakpoint where the Outliner rail docks), the map stays MOUNTED and
// visible behind every non-map tab, which renders as an overlay sheet over
// the frozen/dimmed map. On phones/tablets the map unmounts exactly as
// before (full-screen panels — no WebGL under a scrolled panel on mid-tier
// devices, per the 60Hz budget).
//
// Pure decision functions, extracted from page.tsx so the open/close state
// machine is unit-testable without a DOM.

import type { GameTab } from './types';

/** Desktop stage breakpoint — matches the Outliner rail's docking width. */
export const STAGE_MIN_WIDTH = 1280;

export const STAGE_MEDIA_QUERY = `(min-width: ${STAGE_MIN_WIDTH}px)`;

export interface StageLayout {
  /** Render MapCommandCenter at all (mounted ⇒ WebGL context preserved). */
  mapMounted: boolean;
  /** Map is mounted but fully covered by a panel overlay — renderers must
   *  freeze (no rAF work, retained framebuffer only) and the map subtree
   *  goes inert (focus stays in the panel). */
  mapCovered: boolean;
  /** Non-map panel renders as an overlay sheet over the dimmed map. */
  overlayOpen: boolean;
}

/** The stage state machine. `desktopStage` is the media-query result
 *  (≥1280px AND not reduced-viewport). */
export function computeStageLayout(tab: GameTab, desktopStage: boolean): StageLayout {
  const onMap = tab === 'map';
  if (onMap) return { mapMounted: true, mapCovered: false, overlayOpen: false };
  if (desktopStage) return { mapMounted: true, mapCovered: true, overlayOpen: true };
  return { mapMounted: false, mapCovered: false, overlayOpen: false };
}

/** Overlay dismissal: Escape (and only Escape) returns to the map tab.
 *  Returns the tab to switch to, or null to ignore the key. Callers must
 *  only invoke this while the overlay is open. */
export function overlayDismissTab(key: string): GameTab | null {
  return key === 'Escape' ? 'map' : null;
}
