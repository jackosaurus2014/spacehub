// ─── orbital-elements (4X W7 WebGL solar map) — layout math tests ────────────

import {
  ORBITAL_BODIES,
  ORBITAL_BODY_MAP,
  ORBITAL_PIPS,
  computeScenePositions,
  sceneOrbitRadius,
  sceneBodyRadius,
  planetDisplayPeriodSec,
  moonDisplayPeriodSec,
} from '../game/orbital-elements';
import { ALL_LOCATIONS } from '../game/solar-system';

describe('orbital-elements scene math', () => {
  it('log radial scale preserves ordering (Mercury → Pluto)', () => {
    const helio = ORBITAL_BODIES.filter(b => !b.parent);
    const sorted = [...helio].sort((a, b) => a.aAU! - b.aAU!);
    let prev = 0;
    for (const b of sorted) {
      const r = sceneOrbitRadius(b.aAU!);
      expect(r).toBeGreaterThan(prev);
      prev = r;
    }
    // and keeps the whole system in a workable envelope
    expect(sceneOrbitRadius(0.387)).toBeGreaterThan(5);
    expect(sceneOrbitRadius(39.48)).toBeLessThan(50);
  });

  it('body radii are clamped and ordered sensibly', () => {
    for (const b of ORBITAL_BODIES) {
      const r = sceneBodyRadius(b.radiusKm);
      expect(r).toBeGreaterThanOrEqual(0.2);
      expect(r).toBeLessThanOrEqual(1.5);
    }
    expect(sceneBodyRadius(69911)).toBeGreaterThan(sceneBodyRadius(6371)); // Jupiter > Earth
    expect(sceneBodyRadius(6371)).toBeGreaterThan(sceneBodyRadius(1737)); // Earth > Moon
  });

  it('display periods: Earth ≈ 10 real minutes, ordering preserved, retrograde sign kept', () => {
    expect(planetDisplayPeriodSec(365.25)).toBeCloseTo(600, 0);
    expect(planetDisplayPeriodSec(87.97)).toBeLessThan(planetDisplayPeriodSec(365.25));
    expect(planetDisplayPeriodSec(4333)).toBeGreaterThan(planetDisplayPeriodSec(687));
    expect(moonDisplayPeriodSec(1.77)).toBeLessThan(moonDisplayPeriodSec(27.32));
    expect(moonDisplayPeriodSec(-5.88)).toBeLessThan(0); // Triton is retrograde
    // readability floor — no moon orbit faster than a minute
    expect(Math.abs(moonDisplayPeriodSec(1.37))).toBeGreaterThanOrEqual(60);
  });

  it('every game location (base + colony) has a selection anchor', () => {
    const { anchors } = computeScenePositions(0);
    for (const loc of ALL_LOCATIONS) {
      expect(anchors[loc.id]).toBeDefined();
      const [x, y, z] = anchors[loc.id].pos;
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
    }
  });

  it('is deterministic at t=0 (reduced-motion static layout)', () => {
    const a = computeScenePositions(0);
    const b = computeScenePositions(0);
    expect(a).toEqual(b);
  });

  it('bodies actually move over time, moons stay near their parents', () => {
    const t0 = computeScenePositions(0);
    const t1 = computeScenePositions(60);
    expect(t0.bodies.earth).not.toEqual(t1.bodies.earth);
    // moon-parent distance stays fixed at the configured orbit radius
    for (const b of ORBITAL_BODIES) {
      if (!b.parent) continue;
      const p = t1.bodies[b.parent];
      const m = t1.bodies[b.id];
      const d = Math.hypot(m[0] - p[0], m[1] - p[1], m[2] - p[2]);
      const parentDef = ORBITAL_BODY_MAP.get(b.parent)!;
      const expected = sceneBodyRadius(parentDef.radiusKm) * (b.orbitScale || 2);
      expect(d).toBeCloseTo(expected, 5);
    }
  });

  it('pip anchors override body anchors where ids collide (outer_system)', () => {
    const { anchors, bodies } = computeScenePositions(0);
    // outer_system must resolve to the deep-space relay pip, not Uranus/Neptune
    const outer = anchors.outer_system;
    expect(outer.r).toBeLessThan(0.3); // pip-sized, not planet-sized
    const dUranus = Math.hypot(
      outer.pos[0] - bodies.uranus[0],
      outer.pos[1] - bodies.uranus[1],
      outer.pos[2] - bodies.uranus[2],
    );
    expect(dUranus).toBeGreaterThan(0.5);
  });

  it('every declared texture file exists on disk — no broken paths ship', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    const exists = (publicPath: string) =>
      fs.existsSync(path.join(process.cwd(), 'public', publicPath.replace(/^\//, '')));
    for (const b of ORBITAL_BODIES) {
      for (const t of [b.texture, b.cloudsTexture, b.nightTexture, b.ring?.texture]) {
        if (!t) continue;
        expect(t.startsWith('/textures/')).toBe(true);
        expect({ texture: t, exists: exists(t) }).toEqual({ texture: t, exists: true });
      }
    }
    // Legacy DB-seeded paths from the site's solar-exploration module — the
    // 404 fix this wave ships (baseline doc Part 3.1 / defect #4).
    for (const legacy of ['/textures/mars_texture.jpg', '/textures/moon_texture.jpg', '/textures/titan_texture.jpg', '/textures/venus_texture.jpg']) {
      expect({ texture: legacy, exists: exists(legacy) }).toEqual({ texture: legacy, exists: true });
    }
    expect(ORBITAL_PIPS.length).toBeGreaterThan(0);
  });
});
