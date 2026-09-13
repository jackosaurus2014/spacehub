// ─── 2D / 3D position parity ────────────────────────────────────────────────
// Graphics Phase 3, parity contract (GRAPHICS_REVIEW_2026-09-12 (d)). The
// 2D canvas and the WebGL map must never disagree about where a body is, so
// both derive from computeScenePositions and the 2D one only projects.

import {
  PLANAR_SCENE_EXTENT,
  PLANAR_SUN,
  PLANAR_CLUSTER_OFFSETS,
  planarFromScene,
  planarLayout,
  planarRadius,
} from '../map-planar';
import { computeScenePositions, ORBITAL_BODIES, bodyPositionAt, sceneVectorFromHeliocentric } from '../orbital-elements';
import { ephemerisMsForGameMonths } from '../map-time';

const EPH = ephemerisMsForGameMonths(703); // Aug 2084

describe('planarFromScene', () => {
  it('puts the Sun at the centre of the stage', () => {
    expect(planarFromScene([0, 0, 0])).toEqual(PLANAR_SUN);
  });

  it('is a plan view — the ecliptic-north axis is dropped', () => {
    expect(planarFromScene([3, 99, -4])).toEqual(planarFromScene([3, -99, -4]));
  });

  it('maps the outer edge of the system to the edge of the stage', () => {
    const p = planarFromScene([PLANAR_SCENE_EXTENT, 0, 0]);
    expect(p.x).toBeCloseTo(1, 9);
    expect(p.y).toBeCloseTo(0.5, 9);
    const q = planarFromScene([0, 0, -PLANAR_SCENE_EXTENT]);
    expect(q.y).toBeCloseTo(0, 9);
  });

  it('softens the radius monotonically and keeps the direction exact', () => {
    expect(planarRadius(0)).toBe(0);
    let prev = -1;
    for (let r = 0; r <= 60; r += 3) {
      const v = planarRadius(r);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
    // The inner system gets more of the stage than a linear map would give it.
    expect(planarRadius(12.8)).toBeGreaterThan(0.5 * (12.8 / PLANAR_SCENE_EXTENT));
    // Direction is untouched: the bearing from the Sun is preserved exactly.
    const scene: [number, number, number] = [3, 7, -4];
    const p = planarFromScene(scene);
    expect(Math.atan2(p.y - PLANAR_SUN.y, p.x - PLANAR_SUN.x))
      .toBeCloseTo(Math.atan2(scene[2], scene[0]), 12);
  });
});

describe('planarLayout', () => {
  const positions = computeScenePositions(0, EPH);
  const layout = planarLayout(positions);

  it('covers every mapped game location', () => {
    for (const b of ORBITAL_BODIES) {
      if (!b.locationId) continue;
      expect(layout[b.locationId]).toBeDefined();
    }
    expect(layout.leo).toBeDefined();
    expect(layout.geo).toBeDefined();
    expect(layout.asteroid_belt).toBeDefined();
    expect(layout.outer_system).toBeDefined();
  });

  it('agrees with the 3D scene position for every heliocentric body', () => {
    for (const b of ORBITAL_BODIES) {
      if (b.parent || !b.locationId) continue;
      if (PLANAR_CLUSTER_OFFSETS[b.locationId]) continue;
      const anchor = positions.anchors[b.locationId];
      // outer_system's anchor is the deep-space relay pip, not Uranus.
      if (b.locationId === 'outer_system') continue;
      expect(layout[b.locationId]).toEqual(planarFromScene(anchor.pos));
    }
  });

  it('derives Earth from the same ephemeris the 3D map uses', () => {
    const helio = bodyPositionAt('earth', EPH)!;
    expect(layout.earth_surface).toEqual(planarFromScene(sceneVectorFromHeliocentric(helio)));
  });

  it('keeps the hand-tuned cluster offsets exactly', () => {
    for (const [locId, off] of Object.entries(PLANAR_CLUSTER_OFFSETS)) {
      const parent = planarFromScene(positions.bodies[off.anchorBody]);
      expect(layout[locId].x).toBeCloseTo(parent.x + off.dx, 12);
      expect(layout[locId].y).toBeCloseTo(parent.y + off.dy, 12);
    }
  });

  it('keeps the whole system on the stage across a game century', () => {
    for (let months = 0; months < 1200; months += 37) {
      const l = planarLayout(computeScenePositions(0, ephemerisMsForGameMonths(months)));
      for (const [locId, p] of Object.entries(l)) {
        expect(p.x).toBeGreaterThan(-0.05);
        expect(p.x).toBeLessThan(1.05);
        expect(p.y).toBeGreaterThan(-0.05);
        expect(p.y).toBeLessThan(1.05);
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(locId.length).toBeGreaterThan(0);
      }
    }
  });

  it('moves the inner planets when the scrubbed date moves', () => {
    const a = planarLayout(computeScenePositions(0, ephemerisMsForGameMonths(703)));
    const b = planarLayout(computeScenePositions(0, ephemerisMsForGameMonths(703 + 6)));
    const moved = Math.hypot(a.earth_surface.x - b.earth_surface.x, a.earth_surface.y - b.earth_surface.y);
    expect(moved).toBeGreaterThan(0.1);
    // The near-Earth cluster travels WITH Earth — its offset is unchanged.
    expect(b.leo.x - b.earth_surface.x).toBeCloseTo(a.leo.x - a.earth_surface.x, 12);
    expect(b.leo.y - b.earth_surface.y).toBeCloseTo(a.leo.y - a.earth_surface.y, 12);
  });
});
