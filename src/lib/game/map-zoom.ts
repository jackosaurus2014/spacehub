// ─── Space Tycoon: Map zoom tiers (Wave A2 — "map as command theater") ──────
// Stellaris-style zoom-based information layering for the solar map. The V4
// audit flagged that camera distance was tracked and used for nothing: every
// label, badge and lens annotation rendered at every zoom, so a wide shot of
// the system was an unreadable wall of text.
//
// This module is the SINGLE derivation shared by BOTH renderers (SolarMap3D
// and SolarSystemCanvas), following the map-modes.ts precedent — the two
// renderers must never disagree about what is visible at a given zoom.
//
// Three tiers, in the spec's language (system overview → location → detail):
//
//   'system'   far   — major bodies + YOUR holdings only. No badges.
//   'location' mid   — every name, standing glyphs, lens/occupancy data.
//   'detail'   near  — everything: building counts, slot pressure, hazards.
//
// ACCESSIBILITY INVARIANT: information must never be zoom-only. Renderers
// accept an `alwaysLabels` preference (the "Labels: Always" HUD toggle) that
// forces the 'detail' answer at every zoom, and the keyboard Location List in
// both renderers ALWAYS shows the full annotation set regardless of tier —
// screen-reader and keyboard users never have to "zoom in" to read a value.
//
// Pure functions only (no three.js, no React, no DOM) so both renderers and
// the unit tests can share them.

import { ORBITAL_BODIES, ORBITAL_PIPS } from './orbital-elements';

export type MapZoomTier = 'system' | 'location' | 'detail';

/** Ordered far → near. Exported for tests and for HUD readouts. */
export const MAP_ZOOM_TIERS: MapZoomTier[] = ['system', 'location', 'detail'];

/** Human labels for the HUD tier readout (text, never color-only). */
export const MAP_ZOOM_TIER_LABEL: Record<MapZoomTier, string> = {
  system: 'System overview',
  location: 'Locations',
  detail: 'Detail',
};

// ── 3D thresholds (camera distance from the origin, scene units) ─────────────
// OrbitControls is clamped to minDistance 2.5 / maxDistance 160 and the map
// opens at ~53 units, i.e. the 'location' tier. These are the V4 LOD band
// numbers (LOD_FAR_DIST / LOD_NEAR_DIST), promoted from renderer-private
// constants to shared, tested ones — the bands are NOT retuned by this wave.
export const ZOOM_3D_SYSTEM_MIN_DIST = 95;
export const ZOOM_3D_DETAIL_MAX_DIST = 38;

// ── 2D thresholds (SolarSystemCanvas zoom multiplier) ───────────────────────
// The canvas zoom is clamped to MAP_MIN_ZOOM…MAP_MAX_ZOOM (map-camera.ts,
// currently 0.5…4). The 2D map defaults to zoom 1 → 'location', matching the
// 3D default tier.
export const ZOOM_2D_SYSTEM_MAX = 0.8;
export const ZOOM_2D_DETAIL_MIN = 1.6;

/** 3D renderer: camera distance → tier. */
export function zoomTierFromCameraDistance(distance: number): MapZoomTier {
  if (!Number.isFinite(distance)) return 'location';
  if (distance > ZOOM_3D_SYSTEM_MIN_DIST) return 'system';
  if (distance < ZOOM_3D_DETAIL_MAX_DIST) return 'detail';
  return 'location';
}

/** 2D renderer: canvas zoom multiplier → tier (inverse sense to distance). */
export function zoomTierFromCanvasZoom(zoom: number): MapZoomTier {
  if (!Number.isFinite(zoom)) return 'location';
  if (zoom <= ZOOM_2D_SYSTEM_MAX) return 'system';
  if (zoom >= ZOOM_2D_DETAIL_MIN) return 'detail';
  return 'location';
}

// ── "Major body" derivation (data-driven, not a hand-written id list) ────────
// At the 'system' tier only major bodies stay labelled. Rather than hardcode
// which those are, derive from the orbital catalog the 3D map already uses:
//
//   • a heliocentric body (no parent) with a mean radius ≥ 1000 km — the
//     planets and Pluto; Ceres (473 km) and every moon fall out, and
//   • a free-floating region anchor pip (parent 'belt' / 'deep') — the
//     Asteroid Belt and the Deep Space Relay are top-level game regions even
//     though they are not celestial bodies.
//
// Everything else (LEO/GEO/lunar-orbit/Mars-orbit pips, moons, Ceres) is
// minor and only keeps its label at 'system' zoom when you have holdings there.

export const MAJOR_BODY_RADIUS_KM = 1000;

export const MAJOR_LOCATION_IDS: ReadonlySet<string> = new Set<string>([
  ...ORBITAL_BODIES
    .filter(b => !b.parent && b.radiusKm >= MAJOR_BODY_RADIUS_KM && b.locationId)
    .map(b => b.locationId as string),
  ...ORBITAL_PIPS
    .filter(p => p.parent === 'belt' || p.parent === 'deep')
    .map(p => p.locationId),
]);

export function isMajorLocation(locationId: string): boolean {
  return MAJOR_LOCATION_IDS.has(locationId);
}

// ── Per-entity visibility ────────────────────────────────────────────────────
// Three independent layers, each answered by an allocation-free predicate so
// the renderers can call them inside their frame loops without garbage:
//
//   name   — the location's text label
//   lens   — standing glyph, active map-mode glyph/badge, slot-ring occupancy
//   detail — building / NPC / world count badges, orbiting asset pips,
//            per-location slot pressure + hazard readouts

/** Is the location's NAME drawn at this tier? */
export function nameVisibleAt(
  tier: MapZoomTier,
  isMajor: boolean,
  hasHoldings: boolean,
  alwaysLabels = false,
): boolean {
  if (alwaysLabels) return true;
  if (tier === 'system') return isMajor || hasHoldings;
  return true;
}

/** Are lens annotations (standing / map-mode / occupancy) drawn at this tier? */
export function lensVisibleAt(tier: MapZoomTier, alwaysLabels = false): boolean {
  if (alwaysLabels) return true;
  return tier !== 'system';
}

/** Are per-location detail badges (counts, slot pressure, hazards) drawn? */
export function detailVisibleAt(tier: MapZoomTier, alwaysLabels = false): boolean {
  if (alwaysLabels) return true;
  return tier === 'detail';
}

export interface EntityVisibility {
  /** Text label for the body. */
  name: boolean;
  /** Standing glyph, map-mode glyph/badge, orbital-slot occupancy summary. */
  lens: boolean;
  /** Count badges, orbiting asset pips, slot-segment + hazard detail. */
  detail: boolean;
}

export interface EntityVisibilityInput {
  tier: MapZoomTier;
  isMajor: boolean;
  hasHoldings: boolean;
  alwaysLabels?: boolean;
}

/** Composed answer — the tested contract both renderers implement. Called
 *  once per data change (not per frame); frame loops use the three
 *  predicates above directly so they allocate nothing. */
export function entityVisibility(input: EntityVisibilityInput): EntityVisibility {
  const { tier, isMajor, hasHoldings, alwaysLabels = false } = input;
  return {
    name: nameVisibleAt(tier, isMajor, hasHoldings, alwaysLabels),
    lens: lensVisibleAt(tier, alwaysLabels),
    detail: detailVisibleAt(tier, alwaysLabels),
  };
}

// ── Selection lock-on reticle (item 4) ───────────────────────────────────────
// V4 replaced the color-only selection with a rotating dashed ring. This wave
// adds the *acquisition* moment: the reticle converges from a wide radius on
// to the body, brightening as it locks, then settles into the V4 idle spin.
// Purely cosmetic; reduced motion snaps straight to the locked state.

export const RETICLE_LOCK_MS = 420;

export interface ReticleLockState {
  /** 0 → just requested, 1 → locked. */
  progress: number;
  /** Multiplier on the resting reticle radius (starts wide, converges to 1). */
  radiusScale: number;
  /** Opacity multiplier (dim while converging, full once locked). */
  opacity: number;
  /** True once the lock animation has finished (idle spin from here). */
  locked: boolean;
}

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/**
 * Lock-on state for a selection that began `elapsedMs` ago.
 * Reduced motion returns the locked state immediately — an instant state
 * change, never a converging animation (CLAUDE.md accessibility invariant).
 */
export function reticleLockState(elapsedMs: number, reducedMotion = false): ReticleLockState {
  if (reducedMotion || !Number.isFinite(elapsedMs) || elapsedMs >= RETICLE_LOCK_MS) {
    return { progress: 1, radiusScale: 1, opacity: 1, locked: true };
  }
  const t = Math.max(0, elapsedMs) / RETICLE_LOCK_MS;
  const p = easeOutCubic(t);
  return {
    progress: p,
    radiusScale: 1 + (1 - p) * 0.85,
    opacity: 0.2 + 0.8 * p,
    locked: false,
  };
}
