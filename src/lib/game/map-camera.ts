// ─── Space Tycoon: 2D map camera math (zoom-to-cursor / pinch / hit-testing) ─
// The founder-flagged problem: the near-Earth cluster (leo / geo / lunar_orbit
// / lunar_surface) was nearly impossible to click apart. Three root causes in
// the 2D canvas (which is ALSO the forced renderer on mobile, reduced-motion
// and no-WebGL2 — so phones had it worst):
//
//   1. Zoom scaled only the X axis (`layout.x * w * zoom` but `layout.y * h`),
//      so zooming in never spread the cluster vertically.
//   2. Wheel zoom was anchored at the origin, not the cursor — zooming in
//      threw the thing you were looking at off-screen.
//   3. Touch had no pan or pinch at all (mouse-only handlers).
//
// This module is the pure math for the fix, kept out of the component so it
// can be unit-tested without a DOM (same precedent as map-zoom.ts /
// map-bodies.ts). The camera model matches the canvas's existing transform:
//
//   screenX = worldFracX * w * zoom + camera.x
//   screenY = worldFracY * h * zoom + camera.y   (Y now scales too)
//
// Because offsets are in screen pixels, all the zoom-about-a-point algebra
// cancels the w/h terms and works per-axis on raw offsets — no dimensions
// needed here.
//
// No animated transitions live in this module: every function returns the
// final camera instantly (direct manipulation), so there is nothing to gate
// on prefers-reduced-motion — an instant state change is always compliant
// with the CLAUDE.md accessibility invariant.

export interface MapCamera {
  /** Uniform scale multiplier, MAP_MIN_ZOOM..MAP_MAX_ZOOM. */
  zoom: number;
  /** Screen-pixel pan offsets (the canvas's `offset.x` / `offset.y`). */
  x: number;
  y: number;
}

export const DEFAULT_MAP_CAMERA: MapCamera = { zoom: 1, x: 0, y: 0 };

/** Zoom clamp. Max raised from 3 → 4 so the near-Earth cluster can be spread
 *  wide enough that every member is individually clickable on a phone; the
 *  map-zoom.ts tier thresholds (0.8 / 1.6) are unaffected. */
export const MAP_MIN_ZOOM = 0.5;
export const MAP_MAX_ZOOM = 4;

/** Multiplicative step for the +/− buttons and the keyboard bindings —
 *  multiplicative (not additive) so a step "feels" the same at every zoom. */
export const BUTTON_ZOOM_FACTOR = 1.3;

/** Wheel sensitivity: zoom factor = exp(-deltaY * sensitivity). Trackpad
 *  pinch arrives as ctrl+wheel with much smaller deltas, so it gets a hotter
 *  coefficient to feel like a real pinch. */
export const WHEEL_ZOOM_SENSITIVITY = 0.0016;
export const CTRL_WHEEL_ZOOM_SENSITIVITY = 0.0045;

/** Pointer movement (px) above which a pointerup is a drag, not a click —
 *  same threshold the 3D renderer uses (`e.delta > 6`). */
export const DRAG_CLICK_SLOP_PX = 6;

/** Arrow-key pan step in screen px (canvas-focused keyboard panning). */
export const KEY_PAN_STEP_PX = 60;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.max(MAP_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, zoom));
}

/**
 * Zoom to `nextZoom` keeping the world point under `focal` (screen px,
 * canvas-relative) stationary — the cursor-centred / button-centred zoom.
 * Derivation per axis: world = (focal - offset) / (dim * zoom) must be equal
 * before and after, so offset' = focal - (focal - offset) * (zoom'/zoom);
 * the dim term cancels.
 */
export function zoomAboutPoint(
  cam: MapCamera,
  nextZoom: number,
  focal: { x: number; y: number },
): MapCamera {
  const zoom = clampZoom(nextZoom);
  const k = zoom / cam.zoom;
  return {
    zoom,
    x: focal.x - (focal.x - cam.x) * k,
    y: focal.y - (focal.y - cam.y) * k,
  };
}

/** Wheel event → new camera, zooming about the cursor. */
export function wheelZoom(
  cam: MapCamera,
  deltaY: number,
  focal: { x: number; y: number },
  ctrlKey = false,
): MapCamera {
  const sensitivity = ctrlKey ? CTRL_WHEEL_ZOOM_SENSITIVITY : WHEEL_ZOOM_SENSITIVITY;
  return zoomAboutPoint(cam, cam.zoom * Math.exp(-deltaY * sensitivity), focal);
}

/** One pinch sample: distance between the two pointers + their midpoint
 *  (screen px, canvas-relative). */
export interface PinchState {
  dist: number;
  x: number;
  y: number;
}

/**
 * Two-finger pinch update: scales zoom by the distance ratio AND pans by the
 * midpoint drift, keeping the world point that was under the old midpoint
 * pinned under the new one — so pinch-zoom and two-finger pan are one gesture,
 * exactly like every map app. Degenerate distances (0) fall back to pure pan.
 */
export function pinchCamera(cam: MapCamera, prev: PinchState, next: PinchState): MapCamera {
  const rawZoom = prev.dist > 0 ? cam.zoom * (next.dist / prev.dist) : cam.zoom;
  const zoom = clampZoom(rawZoom);
  const k = zoom / cam.zoom;
  return {
    zoom,
    x: next.x - (prev.x - cam.x) * k,
    y: next.y - (prev.y - cam.y) * k,
  };
}

// ── Hit-testing ──────────────────────────────────────────────────────────────

/** Floor on the clickable radius so a 3px pip is still a ~44px-diameter touch
 *  target at any zoom (CLAUDE.md mobile-parity: 44px targets). */
export const MIN_HIT_RADIUS_PX = 22;

/** Clickable radius for a body: its drawn radius (which scales with zoom) plus
 *  slack, floored to a real touch target. */
export function hitRadius(baseRadius: number, zoom: number): number {
  return Math.max(baseRadius * zoom + 10, MIN_HIT_RADIUS_PX);
}

export interface HitCandidate {
  id: string;
  x: number;
  y: number;
  /** Clickable radius in screen px (already zoom-scaled — see hitRadius). */
  r: number;
}

/**
 * Nearest-centre hit test. The old first-hit loop meant that inside a cluster
 * the LOCATIONS array order — not the cursor — decided which body a click
 * landed on; with hit-radius floors the targets overlap by design, so picking
 * the nearest centre is what makes the cluster clickable at all.
 */
export function pickNearest(
  px: number,
  py: number,
  candidates: readonly HitCandidate[],
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const dist = Math.hypot(px - c.x, py - c.y);
    if (dist <= c.r && dist < bestDist) {
      best = c.id;
      bestDist = dist;
    }
  }
  return best;
}
