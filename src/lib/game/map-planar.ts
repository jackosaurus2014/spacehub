// ─── 2D planar projection of the scene (graphics Phase 3, item 1 parity) ────
// The parity contract in docs/GRAPHICS_REVIEW_2026-09-12.md (d): "every 3D
// feature needs a 2D counterpart or an explicit decorative-only ruling, or
// the two renderers will drift." Phase 3 puts the planets on real orbits, so
// the 2D canvas has to move with them — otherwise scrubbing the timeline (the
// ONLY renderer phones ever get) would do nothing.
//
// Before Phase 3 SolarSystemCanvas carried a private hand-written table of
// normalised positions — a left-to-right strip with the Sun pinned at x=0.04,
// frozen in place. This module replaces the heliocentric half of that table
// with a top-down projection of the SAME ScenePositions the 3D renderer uses:
//
//   direction — taken EXACTLY from the scene position, so the two renderers
//                agree on every angle, conjunction and alignment;
//   radius    — softened once more (see planarRadius) before it is normalised
//                to the stage.
//
// i.e. the ecliptic plane seen from above, Sun at the centre. The canvas then
// multiplies x by the stage width and y by the stage height, so a circular
// orbit lands on screen as an ellipse — the same oblique read the 3D camera
// gives.
//
// WHY A SECOND RADIAL SOFTENING. The 3D map's log scale (sceneOrbitRadius) is
// tuned for a camera that can dolly in: the inner system is a tight knot you
// fly into. The 2D canvas opens at a FIXED frame with no fit-to-view, so that
// knot would land as a 100 px huddle at the centre of a 390 px phone stage
// with every inner-system label on top of the next. planarRadius spreads the
// radii over the stage; angles, ordering and ratios are untouched, and the
// remap is radially symmetric so orbits stay orbits.
//
// WHAT IS NOT PROJECTED, and why (the honest caveat, stated in the UI too):
// sub-body clusters. In scene units LEO sits 1.2 units from Earth and Io 1.3
// units from Jupiter; projected, that is 12 screen px on a phone — the exact
// unclickable near-Earth cluster map-camera.ts was written to fix. So every
// location that orbits a BODY rather than the Sun keeps a hand-tuned offset
// from its parent and rides along with the parent's real position. The
// cluster geometry is a legibility exaggeration; the heliocentric geometry
// is real.
//
// Pure module (no canvas, no React) so both the renderer and the tests share
// one derivation.

import type { ScenePositions, Vec3 } from './orbital-elements';

export interface PlanarPoint { x: number; y: number }

/** Scene radius that maps to the edge of the stage. Pluto's aphelion reaches
 *  ~49.6 scene units, so 52 keeps the whole system (and its labels) inside
 *  the canvas at zoom 1. */
export const PLANAR_SCENE_EXTENT = 52;

/** Knee of the radial softening, in scene units. Lower spreads the inner
 *  system further at the outer system's expense; 6 puts Earth at about a
 *  quarter of the stage half-width and Pluto just inside the edge. */
export const PLANAR_RADIAL_SOFTENING = 6;
const PLANAR_RADIAL_DENOM = Math.log(1 + PLANAR_SCENE_EXTENT / PLANAR_RADIAL_SOFTENING);

/** Scene radius → normalised radius on the stage, 0 at the Sun and 0.5 at
 *  PLANAR_SCENE_EXTENT. Monotonic, so ordering is never scrambled. */
export function planarRadius(sceneRadius: number): number {
  const r = Math.max(0, Number.isFinite(sceneRadius) ? sceneRadius : 0);
  return 0.5 * Math.log(1 + r / PLANAR_RADIAL_SOFTENING) / PLANAR_RADIAL_DENOM;
}

/** The Sun sits at the centre of the plan view (it used to be pinned to the
 *  left edge of the strip). Orbit guide rings are drawn around this point. */
export const PLANAR_SUN: PlanarPoint = { x: 0.5, y: 0.5 };

/** Scene-space (x, y, z) → normalised stage coordinates. The scene's y axis
 *  is ecliptic north and is dropped: this is a plan view. */
export function planarFromScene(pos: Vec3): PlanarPoint {
  const r = Math.hypot(pos[0], pos[2]);
  if (!(r > 1e-9)) return { x: PLANAR_SUN.x, y: PLANAR_SUN.y };
  const k = planarRadius(r) / r;
  return { x: PLANAR_SUN.x + pos[0] * k, y: PLANAR_SUN.y + pos[2] * k };
}

/** A location that rides a parent body at a hand-tuned screen offset. */
interface ClusterOffset {
  /** Orbital body id whose real position the offset is measured from. */
  anchorBody: string;
  dx: number;
  dy: number;
}

/**
 * The cluster offsets, inherited from SolarSystemCanvas's pre-Phase-3
 * LOCATION_POSITION table (each entry started as that table's position minus
 * its parent's) and then tightened to about 60 % now that the bodies they
 * hang off no longer sit on a left-to-right strip. They still clear the
 * minimum separation the near-Earth cluster needs to be individually
 * tappable at 390 px — see map-camera.ts's header for that history.
 */
export const PLANAR_CLUSTER_OFFSETS: Readonly<Record<string, ClusterOffset>> = {
  leo:               { anchorBody: 'earth',   dx: 0.030,  dy: -0.085 },
  geo:               { anchorBody: 'earth',   dx: 0.055,  dy: 0.095 },
  lunar_orbit:       { anchorBody: 'earth',   dx: 0.085,  dy: -0.055 },
  lunar_surface:     { anchorBody: 'earth',   dx: 0.095,  dy: 0.050 },
  mars_orbit:        { anchorBody: 'mars',    dx: 0.0,    dy: -0.070 },
  io_surface:        { anchorBody: 'jupiter', dx: -0.045, dy: -0.012 },
  europa_surface:    { anchorBody: 'jupiter', dx: -0.015, dy: -0.042 },
  ganymede_surface:  { anchorBody: 'jupiter', dx: 0.018,  dy: 0.015 },
  callisto_surface:  { anchorBody: 'jupiter', dx: 0.048,  dy: 0.045 },
  titan_surface:     { anchorBody: 'saturn',  dx: -0.015, dy: 0.042 },
  enceladus_surface: { anchorBody: 'saturn',  dx: 0.015,  dy: -0.030 },
  titania_surface:   { anchorBody: 'uranus',  dx: 0.0,    dy: -0.030 },
  triton_surface:    { anchorBody: 'neptune', dx: 0.0,    dy: 0.030 },
};

/**
 * Normalised stage position for every game location, from one ScenePositions
 * table. Heliocentric locations (and the two free-floating region pips, which
 * already carry their own scene anchors) are projected; sub-body locations
 * ride their parent at the hand-tuned offset above.
 */
export function planarLayout(positions: ScenePositions): Record<string, PlanarPoint> {
  const out: Record<string, PlanarPoint> = {};
  for (const [locId, anchor] of Object.entries(positions.anchors)) {
    const cluster = PLANAR_CLUSTER_OFFSETS[locId];
    if (cluster) continue; // placed below, from its parent body
    out[locId] = planarFromScene(anchor.pos);
  }
  for (const [locId, cluster] of Object.entries(PLANAR_CLUSTER_OFFSETS)) {
    const parent = positions.bodies[cluster.anchorBody];
    if (!parent) continue;
    const base = planarFromScene(parent);
    out[locId] = { x: base.x + cluster.dx, y: base.y + cluster.dy };
  }
  return out;
}
