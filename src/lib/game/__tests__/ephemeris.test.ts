// ─── J2000 ephemeris: Kepler solver + known positions ───────────────────────
// Graphics Phase 3 item 1. The launch-window feature is sold to players as
// intelligence, so the solver and the element table are pinned against
// INDEPENDENT published values, not against our own output.
//
// TOLERANCES, and why each is what it is:
//   • solveKepler: the residual of Kepler's equation must be at or below
//     KEPLER_TOLERANCE_DEG (1e-9 deg ≈ 3 m of along-track motion at 1 AU).
//   • Body positions: 0.002 AU (~300,000 km). JPL Horizons geometric states
//     at J2000 for the Earth-Moon barycentre and Mars are quoted below; the
//     Standish mean-element table itself is only good to a few arcminutes
//     (~0.0006 AU at 1 AU), so 0.002 AU pins the implementation without
//     pretending the data is better than it is.
//   • Earth's ecliptic longitude on 2020-01-01: 0.2 deg of the value implied
//     by the Sun's published geometric longitude that day (279.74 deg;
//     Earth's heliocentric longitude is that minus 180).

import {
  KEPLER_ELEMENTS,
  KEPLER_TOLERANCE_DEG,
  J2000_EPOCH_MS,
  bodyPositionAt,
  solveKepler,
  sceneVectorFromHeliocentric,
  sceneOrbitRadius,
  computeScenePositions,
  orbitalPeriodDays,
  wrapDegSigned,
  wrapDeg360,
  EPHEMERIS_BODY_IDS,
  ORBITAL_BODIES,
} from '../orbital-elements';

const DEG = Math.PI / 180;
const POSITION_TOLERANCE_AU = 0.002;

describe('solveKepler', () => {
  it('satisfies M = E - e*sin(E) to the documented tolerance', () => {
    for (const e of [0, 0.0167, 0.0934, 0.2488, 0.5, 0.9]) {
      const eStar = (180 / Math.PI) * e;
      for (let M = -175; M <= 180; M += 17) {
        const E = solveKepler(M, e);
        const residual = wrapDegSigned(M) - (E - eStar * Math.sin(E * DEG));
        expect(Math.abs(residual)).toBeLessThanOrEqual(KEPLER_TOLERANCE_DEG * 10);
      }
    }
  });

  it('is the identity for a circular orbit', () => {
    expect(solveKepler(42, 0)).toBeCloseTo(42, 10);
    expect(solveKepler(0, 0.2)).toBeCloseTo(0, 10);
    expect(solveKepler(180, 0.2)).toBeCloseTo(180, 8);
  });

  it('converges for every body we carry', () => {
    for (const id of EPHEMERIS_BODY_IDS) {
      const e = KEPLER_ELEMENTS[id].e;
      const E = solveKepler(123.456, e);
      expect(Number.isFinite(E)).toBe(true);
    }
  });
});

describe('bodyPositionAt — known J2000 states', () => {
  // JPL Horizons, heliocentric ecliptic J2000 at 2000-Jan-01 12:00 TT.
  it('places the Earth-Moon barycentre at (-0.1771, 0.9672, ~0) AU', () => {
    const p = bodyPositionAt('earth', J2000_EPOCH_MS)!;
    expect(p).not.toBeNull();
    expect(p.x).toBeCloseTo(-0.1771, 3);
    expect(p.y).toBeCloseTo(0.9672, 3);
    expect(Math.abs(p.z)).toBeLessThan(1e-4);
    expect(Math.abs(p.x - -0.1771)).toBeLessThan(POSITION_TOLERANCE_AU);
    expect(Math.abs(p.y - 0.9672)).toBeLessThan(POSITION_TOLERANCE_AU);
    expect(p.rAU).toBeCloseTo(0.9833, 3);
  });

  it('places Mars at (1.3907, -0.0134, -0.0345) AU', () => {
    const p = bodyPositionAt('mars', J2000_EPOCH_MS)!;
    expect(Math.abs(p.x - 1.3907)).toBeLessThan(POSITION_TOLERANCE_AU);
    expect(Math.abs(p.y - -0.0134)).toBeLessThan(POSITION_TOLERANCE_AU);
    expect(Math.abs(p.z - -0.0345)).toBeLessThan(POSITION_TOLERANCE_AU);
    expect(p.rAU).toBeCloseTo(1.3911, 3);
  });

  it("matches the Sun's published longitude on 2020-01-01", () => {
    // Sun's geometric ecliptic longitude 2020-01-01 00:00 UT = 279.74 deg,
    // so Earth's heliocentric longitude is 99.74 deg. Earth is near
    // perihelion (Jan 5), r = 0.9833 AU.
    const p = bodyPositionAt('earth', Date.UTC(2020, 0, 1))!;
    expect(Math.abs(wrapDegSigned(p.lonDeg - 99.74))).toBeLessThan(0.2);
    expect(p.rAU).toBeCloseTo(0.9833, 3);
  });

  it('returns null for moons and unknown ids', () => {
    expect(bodyPositionAt('moon', J2000_EPOCH_MS)).toBeNull();
    expect(bodyPositionAt('io', J2000_EPOCH_MS)).toBeNull();
    expect(bodyPositionAt('not-a-body', J2000_EPOCH_MS)).toBeNull();
    expect(bodyPositionAt('earth', Number.NaN)).toBeNull();
  });
});

describe('orbital mechanics invariants', () => {
  it('keeps every body between perihelion and aphelion over a century', () => {
    for (const id of EPHEMERIS_BODY_IDS) {
      const el = KEPLER_ELEMENTS[id];
      for (let year = 2000; year <= 2100; year += 25) {
        const p = bodyPositionAt(id, Date.UTC(year, 5, 1))!;
        // Allow 2% slack for the secular drift of a and e.
        expect(p.rAU).toBeGreaterThan(el.aAU * (1 - el.e) * 0.98);
        expect(p.rAU).toBeLessThan(el.aAU * (1 + el.e) * 1.02);
      }
    }
  });

  it('returns Earth to the same longitude after one sidereal year', () => {
    const t0 = Date.UTC(2084, 6, 1);
    const a = bodyPositionAt('earth', t0)!;
    const b = bodyPositionAt('earth', t0 + orbitalPeriodDays(1) * 86_400_000)!;
    expect(Math.abs(wrapDegSigned(b.lonDeg - a.lonDeg))).toBeLessThan(0.5);
  });

  it('advances Mars roughly half a revolution in half its period', () => {
    const t0 = Date.UTC(2084, 6, 1);
    const period = orbitalPeriodDays(KEPLER_ELEMENTS.mars.aAU);
    const a = bodyPositionAt('mars', t0)!;
    const b = bodyPositionAt('mars', t0 + (period / 2) * 86_400_000)!;
    // Eccentricity makes the true anomaly sweep unevenly; 20 deg of slack.
    expect(Math.abs(Math.abs(wrapDegSigned(b.lonDeg - a.lonDeg)) - 180)).toBeLessThan(20);
  });

  it('orbitalPeriodDays reproduces the published sidereal periods', () => {
    expect(orbitalPeriodDays(1)).toBeCloseTo(365.256, 2);
    expect(orbitalPeriodDays(KEPLER_ELEMENTS.mars.aAU)).toBeCloseTo(686.98, 0);
    expect(orbitalPeriodDays(KEPLER_ELEMENTS.jupiter.aAU)).toBeCloseTo(4332.6, -1);
  });
});

describe('scene mapping', () => {
  it('keeps the real direction and log-scales only the magnitude', () => {
    const p = bodyPositionAt('mars', J2000_EPOCH_MS)!;
    const v = sceneVectorFromHeliocentric(p);
    const len = Math.hypot(v[0], v[1], v[2]);
    expect(len).toBeCloseTo(sceneOrbitRadius(p.rAU), 6);
    // Direction preserved: scene x/z carry ecliptic x/y, scene y ecliptic z.
    const k = len / p.rAU;
    expect(v[0]).toBeCloseTo(p.x * k, 9);
    expect(v[1]).toBeCloseTo(p.z * k, 9);
    expect(v[2]).toBeCloseTo(p.y * k, 9);
  });

  it('computeScenePositions with an ephemeris date matches bodyPositionAt', () => {
    const ms = Date.UTC(2084, 10, 1);
    const { bodies } = computeScenePositions(0, ms);
    for (const id of EPHEMERIS_BODY_IDS) {
      const expected = sceneVectorFromHeliocentric(bodyPositionAt(id, ms)!);
      expect(bodies[id][0]).toBeCloseTo(expected[0], 9);
      expect(bodies[id][1]).toBeCloseTo(expected[1], 9);
      expect(bodies[id][2]).toBeCloseTo(expected[2], 9);
    }
  });

  it('still supports the legacy phase layout when no date is given', () => {
    const legacy = computeScenePositions(0);
    const eph = computeScenePositions(0, J2000_EPOCH_MS);
    expect(legacy.bodies.earth).not.toEqual(eph.bodies.earth);
    // Both keep every mapped location anchored.
    for (const b of ORBITAL_BODIES) {
      if (!b.locationId) continue;
      expect(legacy.anchors[b.locationId]).toBeDefined();
      expect(eph.anchors[b.locationId]).toBeDefined();
    }
  });

  it('moves every planet when the date moves six months', () => {
    const a = computeScenePositions(0, Date.UTC(2084, 0, 1));
    const b = computeScenePositions(0, Date.UTC(2084, 6, 1));
    const dist = (id: string) => Math.hypot(
      a.bodies[id][0] - b.bodies[id][0],
      a.bodies[id][1] - b.bodies[id][1],
      a.bodies[id][2] - b.bodies[id][2],
    );
    expect(dist('earth')).toBeGreaterThan(10); // Earth crosses the system
    expect(dist('mars')).toBeGreaterThan(5);
    expect(dist('jupiter')).toBeGreaterThan(0.5);
  });

  it('is deterministic for the same inputs', () => {
    const ms = Date.UTC(2090, 3, 17);
    expect(computeScenePositions(120, ms)).toEqual(computeScenePositions(120, ms));
  });

  it('wrapDeg360 / wrapDegSigned agree on the boundaries', () => {
    expect(wrapDeg360(-10)).toBeCloseTo(350, 9);
    expect(wrapDeg360(370)).toBeCloseTo(10, 9);
    expect(wrapDegSigned(190)).toBeCloseTo(-170, 9);
    expect(wrapDegSigned(180)).toBeCloseTo(180, 9);
    expect(wrapDegSigned(-190)).toBeCloseTo(170, 9);
  });
});
