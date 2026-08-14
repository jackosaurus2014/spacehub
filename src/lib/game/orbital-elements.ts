// ─── Orbital elements + scene layout math for the WebGL solar map (4X W7) ────
// Real orbital data (semi-major axis, sidereal period, inclination, radius)
// for every body the 3D map renders, plus the pure math that converts them
// into readable scene coordinates:
//
//   - Radial distance is LOG-scaled — a linear AU scale would make Mercury
//     invisible or Saturn a pixel. r = 10·ln(1 + a/0.387) preserves ordering
//     and ratio "feel" while keeping the whole system on screen.
//   - Orbital periods are LOG-compressed real periods — Earth completes an
//     orbit in ~10 real minutes, Mercury visibly laps it, Jupiter takes ~37
//     minutes. Moons use a gentler curve with a readability floor so the
//     Galilean moons don't blur into rings.
//   - Body radii are log-scaled from real km so Jupiter reads huge and
//     Enceladus reads tiny without either breaking the layout.
//
// This module is pure data + math (no three.js, no React) so it can be unit
// tested and tree-shaken. It deliberately does NOT touch the game engine —
// positions here are presentation-only; travel times, delta-v and the
// economy still come from solar-system.ts / ships.ts.

export interface OrbitalBody {
  id: string;
  name: string;
  /** Parent body id for moons — orbit center. Absent = orbits the Sun. */
  parent?: string;
  /** Semi-major axis in AU (heliocentric bodies only). */
  aAU?: number;
  /** Visual orbit radius around the parent, as a multiple of the parent's
   *  visual radius (moons only — real aKm ordering preserved by hand). */
  orbitScale?: number;
  /** Real sidereal orbital period in days. Negative = retrograde (Triton). */
  periodDays: number;
  /** Real orbital inclination to the ecliptic, degrees (heliocentric only). */
  inclinationDeg?: number;
  /** Real mean radius in km. */
  radiusKm: number;
  /** Equirectangular texture under /textures/ (webp). Absent = solid color. */
  texture?: string;
  /** Fallback / tint color while the texture streams in (or if it fails). */
  color: string;
  /** Extra transparent cloud layer texture (Earth). */
  cloudsTexture?: string;
  /** Emissive night-lights texture (Earth). */
  nightTexture?: string;
  /** Ring system (Saturn). Scales are multiples of the body's visual radius. */
  ring?: { texture: string; innerScale: number; outerScale: number };
  /** Game location selected when this body is clicked. */
  locationId?: string;
  /** Deterministic starting phase, degrees — spreads bodies around the Sun. */
  phaseDeg: number;
}

/** Fixed marker locations that are not celestial bodies — orbital slots and
 *  deep-space stations. Anchored to a parent body (or the belt/outer ring). */
export interface OrbitalPip {
  locationId: string;
  label: string;
  /** Parent body id, or 'belt' / 'deep' for free-floating ring anchors. */
  parent: string;
  /** Orbit radius: multiple of parent's visual radius (body parents) or an
   *  absolute scene radius (belt/deep anchors). */
  orbitScale: number;
  /** Display orbit period in seconds (readability-tuned, not physical). */
  displayPeriodSec: number;
  color: string;
  phaseDeg: number;
}

// ── Scale mapping ────────────────────────────────────────────────────────────

const MERCURY_AU = 0.387;

/** Log-scaled heliocentric scene radius. Mercury ≈ 6.9, Earth ≈ 12.8,
 *  Jupiter ≈ 26.7, Pluto ≈ 46.3 scene units. */
export function sceneOrbitRadius(aAU: number): number {
  return 10 * Math.log(1 + aAU / MERCURY_AU);
}

/** Log-scaled visual body radius from real km. */
export function sceneBodyRadius(radiusKm: number): number {
  const r = 0.32 + 0.42 * Math.log10(Math.max(1, radiusKm) / 1000);
  return Math.min(1.5, Math.max(0.2, r));
}

/** Heliocentric display period in seconds: Earth ≈ 600 s (10 min). */
export function planetDisplayPeriodSec(periodDays: number): number {
  return 600 * (Math.log(1 + Math.abs(periodDays) / 365.25) / Math.LN2) * Math.sign(periodDays);
}

/** Moon display period in seconds — gentler curve + floor for readability. */
export function moonDisplayPeriodSec(periodDays: number): number {
  return (60 + 25 * Math.log(1 + Math.abs(periodDays))) * Math.sign(periodDays);
}

export const SUN_VISUAL_RADIUS = 2.4;
export const BELT_SCENE_RADIUS = sceneOrbitRadius(2.77); // ≈ 21 — Ceres' orbit

// ── Body catalog (real values; NASA fact sheets) ─────────────────────────────

export const ORBITAL_BODIES: OrbitalBody[] = [
  { id: 'mercury', name: 'Mercury', aAU: 0.387, periodDays: 87.97, inclinationDeg: 7.0, radiusKm: 2439, texture: '/textures/mercury.webp', color: '#d97706', locationId: 'mercury_surface', phaseDeg: 15 },
  { id: 'venus', name: 'Venus', aAU: 0.723, periodDays: 224.7, inclinationDeg: 3.4, radiusKm: 6052, texture: '/textures/venus.webp', color: '#fde047', locationId: 'venus_orbit', phaseDeg: 85 },
  {
    id: 'earth', name: 'Earth', aAU: 1.0, periodDays: 365.25, inclinationDeg: 0, radiusKm: 6371,
    texture: '/textures/earth_day.webp', cloudsTexture: '/textures/earth_clouds.webp', nightTexture: '/textures/earth_night.webp',
    color: '#38bdf8', locationId: 'earth_surface', phaseDeg: 205,
  },
  { id: 'moon', name: 'Moon', parent: 'earth', orbitScale: 2.6, periodDays: 27.32, radiusKm: 1737, texture: '/textures/moon.webp', color: '#cbd5e1', locationId: 'lunar_surface', phaseDeg: 40 },
  { id: 'mars', name: 'Mars', aAU: 1.524, periodDays: 687, inclinationDeg: 1.85, radiusKm: 3389, texture: '/textures/mars.webp', color: '#ef4444', locationId: 'mars_surface', phaseDeg: 310 },
  { id: 'ceres', name: 'Ceres', aAU: 2.77, periodDays: 1682, inclinationDeg: 10.6, radiusKm: 473, texture: '/textures/ceres.webp', color: '#78716c', locationId: 'ceres_surface', phaseDeg: 50 },
  { id: 'jupiter', name: 'Jupiter', aAU: 5.203, periodDays: 4333, inclinationDeg: 1.3, radiusKm: 69911, texture: '/textures/jupiter.webp', color: '#fbbf24', locationId: 'jupiter_system', phaseDeg: 145 },
  { id: 'io', name: 'Io', parent: 'jupiter', orbitScale: 1.8, periodDays: 1.77, radiusKm: 1821, texture: '/textures/io.webp', color: '#fcd34d', locationId: 'io_surface', phaseDeg: 0 },
  { id: 'europa', name: 'Europa', parent: 'jupiter', orbitScale: 2.3, periodDays: 3.55, radiusKm: 1560, texture: '/textures/europa.webp', color: '#e0f2fe', locationId: 'europa_surface', phaseDeg: 100 },
  { id: 'ganymede', name: 'Ganymede', parent: 'jupiter', orbitScale: 2.8, periodDays: 7.15, radiusKm: 2634, texture: '/textures/ganymede.webp', color: '#f3f4f6', locationId: 'ganymede_surface', phaseDeg: 200 },
  { id: 'callisto', name: 'Callisto', parent: 'jupiter', orbitScale: 3.3, periodDays: 16.69, radiusKm: 2410, texture: '/textures/callisto.webp', color: '#d1d5db', locationId: 'callisto_surface', phaseDeg: 300 },
  {
    id: 'saturn', name: 'Saturn', aAU: 9.537, periodDays: 10759, inclinationDeg: 2.5, radiusKm: 58232,
    texture: '/textures/saturn.webp', ring: { texture: '/textures/saturn_rings.png', innerScale: 1.25, outerScale: 2.2 },
    color: '#fde68a', locationId: 'saturn_system', phaseDeg: 255,
  },
  { id: 'titan', name: 'Titan', parent: 'saturn', orbitScale: 2.9, periodDays: 15.95, radiusKm: 2574, texture: '/textures/titan.webp', color: '#fef3c7', locationId: 'titan_surface', phaseDeg: 70 },
  { id: 'enceladus', name: 'Enceladus', parent: 'saturn', orbitScale: 2.45, periodDays: 1.37, radiusKm: 252, texture: '/textures/enceladus.webp', color: '#e0f2fe', locationId: 'enceladus_surface', phaseDeg: 180 },
  { id: 'uranus', name: 'Uranus', aAU: 19.19, periodDays: 30687, inclinationDeg: 0.77, radiusKm: 25362, texture: '/textures/uranus.webp', color: '#a5f3fc', locationId: 'outer_system', phaseDeg: 30 },
  { id: 'titania', name: 'Titania', parent: 'uranus', orbitScale: 2.2, periodDays: 8.71, radiusKm: 788, color: '#e0e7ff', locationId: 'titania_surface', phaseDeg: 120 },
  { id: 'neptune', name: 'Neptune', aAU: 30.07, periodDays: 60190, inclinationDeg: 1.77, radiusKm: 24622, texture: '/textures/neptune.webp', color: '#60a5fa', locationId: 'outer_system', phaseDeg: 195 },
  { id: 'triton', name: 'Triton', parent: 'neptune', orbitScale: 2.2, periodDays: -5.88, radiusKm: 1353, texture: '/textures/triton.webp', color: '#bfdbfe', locationId: 'triton_surface', phaseDeg: 250 },
  { id: 'pluto', name: 'Pluto', aAU: 39.48, periodDays: 90560, inclinationDeg: 17.2, radiusKm: 1188, texture: '/textures/pluto.webp', color: '#fecaca', locationId: 'pluto_surface', phaseDeg: 105 },
];

export const ORBITAL_BODY_MAP = new Map(ORBITAL_BODIES.map(b => [b.id, b]));

// Orbital-slot / station markers for game locations that are not bodies.
export const ORBITAL_PIPS: OrbitalPip[] = [
  { locationId: 'leo', label: 'LEO', parent: 'earth', orbitScale: 1.5, displayPeriodSec: 18, color: '#22d3ee', phaseDeg: 0 },
  { locationId: 'geo', label: 'GEO', parent: 'earth', orbitScale: 2.0, displayPeriodSec: 42, color: '#a78bfa', phaseDeg: 140 },
  { locationId: 'lunar_orbit', label: 'Lunar Orbit', parent: 'moon', orbitScale: 1.9, displayPeriodSec: 26, color: '#94a3b8', phaseDeg: 60 },
  { locationId: 'mars_orbit', label: 'Mars Orbit', parent: 'mars', orbitScale: 1.8, displayPeriodSec: 30, color: '#fdba74', phaseDeg: 220 },
  { locationId: 'asteroid_belt', label: 'Belt Operations', parent: 'belt', orbitScale: BELT_SCENE_RADIUS, displayPeriodSec: planetDisplayPeriodSec(1682), color: '#a8a29e', phaseDeg: 290 },
  { locationId: 'outer_system', label: 'Deep Space Relay', parent: 'deep', orbitScale: 41.5, displayPeriodSec: 3200, color: '#818cf8', phaseDeg: 330 },
];

// ── Position computation ─────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

export interface ScenePositions {
  /** World position per body id (Sun at origin, not included). */
  bodies: Record<string, Vec3>;
  /** Selection/ship/hazard anchor per game location id: position + the visual
   *  radius of whatever it is anchored to (for ring sizing / ship orbits). */
  anchors: Record<string, { pos: Vec3; r: number }>;
}

const DEG = Math.PI / 180;

/** Compute every body + location-anchor world position at scene time tSec.
 *  Pass tSec = 0 for a deterministic static layout (reduced motion). */
export function computeScenePositions(tSec: number): ScenePositions {
  const bodies: Record<string, Vec3> = {};
  const anchors: Record<string, { pos: Vec3; r: number }> = {};

  // Heliocentric bodies first (moons need their parents resolved).
  for (const b of ORBITAL_BODIES) {
    if (b.parent) continue;
    const R = sceneOrbitRadius(b.aAU!);
    const period = planetDisplayPeriodSec(b.periodDays);
    const theta = b.phaseDeg * DEG + (period !== 0 ? (tSec / Math.abs(period)) * Math.PI * 2 * Math.sign(period) : 0);
    const incl = (b.inclinationDeg || 0) * DEG;
    bodies[b.id] = [
      R * Math.cos(theta),
      R * Math.sin(theta) * Math.sin(incl),
      R * Math.sin(theta) * Math.cos(incl),
    ];
  }
  // Moons.
  for (const b of ORBITAL_BODIES) {
    if (!b.parent) continue;
    const p = bodies[b.parent];
    if (!p) continue;
    const parentDef = ORBITAL_BODY_MAP.get(b.parent)!;
    const orbitR = sceneBodyRadius(parentDef.radiusKm) * (b.orbitScale || 2);
    const period = moonDisplayPeriodSec(b.periodDays);
    const theta = b.phaseDeg * DEG + (tSec / Math.abs(period)) * Math.PI * 2 * Math.sign(period);
    bodies[b.id] = [p[0] + orbitR * Math.cos(theta), p[1], p[2] + orbitR * Math.sin(theta)];
  }

  // Body-backed location anchors.
  for (const b of ORBITAL_BODIES) {
    if (!b.locationId) continue;
    const existing = anchors[b.locationId];
    // outer_system maps to both Uranus and Neptune — keep the first (Uranus)
    // as the canonical anchor; the pip below overrides with the relay station.
    if (existing) continue;
    anchors[b.locationId] = { pos: bodies[b.id], r: sceneBodyRadius(b.radiusKm) };
  }

  // Pip anchors (orbital slots + stations). These OVERRIDE body anchors where
  // ids collide (outer_system → Deep Space Relay marker).
  for (const pip of ORBITAL_PIPS) {
    const period = pip.displayPeriodSec;
    const theta = pip.phaseDeg * DEG + (tSec / Math.abs(period)) * Math.PI * 2;
    if (pip.parent === 'belt' || pip.parent === 'deep') {
      const R = pip.orbitScale;
      anchors[pip.locationId] = { pos: [R * Math.cos(theta), 0, R * Math.sin(theta)], r: 0.24 };
    } else {
      const p = bodies[pip.parent];
      const parentDef = ORBITAL_BODY_MAP.get(pip.parent);
      if (!p || !parentDef) continue;
      const orbitR = sceneBodyRadius(parentDef.radiusKm) * pip.orbitScale;
      anchors[pip.locationId] = {
        pos: [p[0] + orbitR * Math.cos(theta), p[1], p[2] + orbitR * Math.sin(theta)],
        r: 0.14,
      };
    }
  }

  return { bodies, anchors };
}
