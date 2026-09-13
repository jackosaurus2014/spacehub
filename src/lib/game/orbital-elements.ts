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
  /** Emissive night-lights texture. Earth no longer uses one — its lights
   *  ride in `texture`'s alpha (map-shading.ts bodyShaderFlags). */
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

/** Visual body radius clamp (scene units). Graphics review 2026-09-12
 *  item 9 raised the floor and the curve: Earth 0.66 → 0.81 (16.5 px in
 *  diameter at the old 1366×900 default view instead of 13), Jupiter 1.09 →
 *  1.31, Enceladus/Ceres 0.20 → 0.28. Moon orbits and pip rings are
 *  multiples of the parent's radius, so clusters spread proportionally and
 *  the LEO/GEO pip separation stays above the 0.3 pick-sphere radius. */
export const BODY_RADIUS_MIN = 0.28;
export const BODY_RADIUS_MAX = 1.8;

/** Log-scaled visual body radius from real km. */
export function sceneBodyRadius(radiusKm: number): number {
  const r = 0.42 + 0.48 * Math.log10(Math.max(1, radiusKm) / 1000);
  return Math.min(BODY_RADIUS_MAX, Math.max(BODY_RADIUS_MIN, r));
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
    // Day albedo with the night lights packed in the ALPHA channel (item 3:
    // the planet shader reads day+lights in one fetch, clouds in the other).
    texture: '/textures/earth_day_lights.webp', cloudsTexture: '/textures/earth_clouds.webp',
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

// ── J2000 Keplerian elements + Kepler solver (graphics Phase 3, item 1) ─────
// Until Phase 3 the heliocentric bodies rode a cosmetic constant-rate circle
// from a hand-picked `phaseDeg` on a free-running wall clock: pretty, but the
// planets were never where the game calendar said they were, so "is there a
// window to Mars?" was unanswerable. These are the real elements.
//
// SOURCE: E. M. Standish, "Keplerian Elements for Approximate Positions of
// the Major Planets" (JPL Solar System Dynamics), the 1800 AD – 2050 AD
// table: six elements at the J2000 epoch plus their linear rates per Julian
// century. Earth uses the Earth–Moon barycentre row, as that table does.
// Ceres is not a major planet and is not in that table — its row is the JPL
// Small-Body Database osculating element set at the same epoch, and is the
// least precise row here.
//
// ACCURACY, stated plainly because launch windows are sold to players as
// INTELLIGENCE: inside the table's own window the heliocentric longitudes
// are good to a few arcminutes for the inner planets and ~10 arcminutes for
// the outer ones. Space Tycoon's calendar runs 2026 → 2199 (server-time.ts),
// so most game dates are an EXTRAPOLATION past 2050. Mean motion — the `L`
// rate, which is what phase angles and synodic periods are made of — stays
// accurate; the slowly drifting terms have secular rates below a degree per
// century. Everything derived from this is labelled an estimate in the UI,
// and nothing derived from it touches game state.

export interface KeplerElements {
  /** Semi-major axis: AU at J2000, AU per Julian century. */
  aAU: number; aRate: number;
  /** Eccentricity: value at J2000, change per Julian century. */
  e: number; eRate: number;
  /** Inclination to the ecliptic: degrees at J2000, degrees per century. */
  incDeg: number; incRate: number;
  /** Mean longitude L: degrees at J2000, degrees per century. */
  meanLonDeg: number; meanLonRate: number;
  /** Longitude of perihelion (curly pi): degrees at J2000, deg per century. */
  periLonDeg: number; periLonRate: number;
  /** Longitude of the ascending node: degrees at J2000, deg per century. */
  nodeLonDeg: number; nodeLonRate: number;
}

/** J2000.0 = 2000 January 1.5 TT (JD 2451545.0). We treat the game's UTC
 *  timestamps as TT; the ~70 s difference is far below this table's error. */
export const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
export const DAYS_PER_JULIAN_CENTURY = 36525;
export const MS_PER_DAY = 86_400_000;
/** A sidereal year in days (Earth's actual orbital period), used for the
 *  a^3/2 period law so Earth comes back out at 365.256 d, not 365.25. */
export const SIDEREAL_YEAR_DAYS = 365.25636;

export const KEPLER_ELEMENTS: Readonly<Record<string, KeplerElements>> = {
  mercury: { aAU: 0.38709927, aRate: 0.00000037, e: 0.20563593, eRate: 0.00001906, incDeg: 7.00497902, incRate: -0.00594749, meanLonDeg: 252.25032350, meanLonRate: 149472.67411175, periLonDeg: 77.45779628, periLonRate: 0.16047689, nodeLonDeg: 48.33076593, nodeLonRate: -0.12534081 },
  venus:   { aAU: 0.72333566, aRate: 0.00000390, e: 0.00677672, eRate: -0.00004107, incDeg: 3.39467605, incRate: -0.00078890, meanLonDeg: 181.97909950, meanLonRate: 58517.81538729, periLonDeg: 131.60246718, periLonRate: 0.00268329, nodeLonDeg: 76.67984255, nodeLonRate: -0.27769418 },
  earth:   { aAU: 1.00000261, aRate: 0.00000562, e: 0.01671123, eRate: -0.00004392, incDeg: -0.00001531, incRate: -0.01294668, meanLonDeg: 100.46457166, meanLonRate: 35999.37244981, periLonDeg: 102.93768193, periLonRate: 0.32327364, nodeLonDeg: 0.0, nodeLonRate: 0.0 },
  mars:    { aAU: 1.52371034, aRate: 0.00001847, e: 0.09339410, eRate: 0.00007882, incDeg: 1.84969142, incRate: -0.00813131, meanLonDeg: -4.55343205, meanLonRate: 19140.30268499, periLonDeg: -23.94362959, periLonRate: 0.44441088, nodeLonDeg: 49.55953891, nodeLonRate: -0.29257343 },
  // JPL SBDB osculating elements at J2000 (a, e, i, node, argument of
  // perihelion, M0); longitude of perihelion = node + argument, and
  // L = that + M0. Only the mean longitude advances (n = 360/period).
  ceres:   { aAU: 2.7658, aRate: 0, e: 0.078, eRate: 0, incDeg: 10.593, incRate: 0, meanLonDeg: 249.980, meanLonRate: 7825.5, periLonDeg: 153.991, periLonRate: 0, nodeLonDeg: 80.393, nodeLonRate: 0 },
  jupiter: { aAU: 5.20288700, aRate: -0.00011607, e: 0.04838624, eRate: -0.00013253, incDeg: 1.30439695, incRate: -0.00183714, meanLonDeg: 34.39644051, meanLonRate: 3034.74612775, periLonDeg: 14.72847983, periLonRate: 0.21252668, nodeLonDeg: 100.47390909, nodeLonRate: 0.20469106 },
  saturn:  { aAU: 9.53667594, aRate: -0.00125060, e: 0.05386179, eRate: -0.00050991, incDeg: 2.48599187, incRate: 0.00193609, meanLonDeg: 49.95424423, meanLonRate: 1222.49362201, periLonDeg: 92.59887831, periLonRate: -0.41897216, nodeLonDeg: 113.66242448, nodeLonRate: -0.28867794 },
  uranus:  { aAU: 19.18916464, aRate: -0.00196176, e: 0.04725744, eRate: -0.00004397, incDeg: 0.77263783, incRate: -0.00242939, meanLonDeg: 313.23810451, meanLonRate: 428.48202785, periLonDeg: 170.95427630, periLonRate: 0.40805281, nodeLonDeg: 74.01692503, nodeLonRate: 0.04240589 },
  neptune: { aAU: 30.06992276, aRate: 0.00026291, e: 0.00859048, eRate: 0.00005105, incDeg: 1.77004347, incRate: 0.00035372, meanLonDeg: -55.12002969, meanLonRate: 218.45945325, periLonDeg: 44.96476227, periLonRate: -0.32241464, nodeLonDeg: 131.78422574, nodeLonRate: -0.00508664 },
  pluto:   { aAU: 39.48211675, aRate: -0.00031596, e: 0.24882730, eRate: 0.00005170, incDeg: 17.14001206, incRate: 0.00004818, meanLonDeg: 238.92903833, meanLonRate: 145.20780515, periLonDeg: 224.06891629, periLonRate: -0.04062942, nodeLonDeg: 110.30393684, nodeLonRate: -0.01183482 },
};

/** Body ids that carry real elements — the heliocentric set the ephemeris,
 *  the orbit rings and the transfer-window maths all work over. */
export const EPHEMERIS_BODY_IDS: readonly string[] = Object.keys(KEPLER_ELEMENTS);

export function julianCenturiesSinceJ2000(dateMs: number): number {
  return (dateMs - J2000_EPOCH_MS) / (DAYS_PER_JULIAN_CENTURY * MS_PER_DAY);
}

/** Degrees wrapped into [0, 360). */
export function wrapDeg360(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** Degrees wrapped into (-180, 180] — the convention every phase angle in
 *  launch-windows.ts uses. */
export function wrapDegSigned(deg: number): number {
  const d = wrapDeg360(deg);
  return d > 180 ? d - 360 : d;
}

/** Newton-Raphson iteration cap. Convergence for e < 0.3 (every body we
 *  carry; Pluto is the worst at 0.249) takes 3-4 passes. */
export const KEPLER_MAX_ITERATIONS = 60;
/** Convergence tolerance on the eccentric anomaly, in DEGREES. 1e-9 degrees
 *  is ~3 metres of along-track position at 1 AU — orders of magnitude finer
 *  than the element table's own few-arcminute accuracy, so the solver is
 *  never the limiting error term. */
export const KEPLER_TOLERANCE_DEG = 1e-9;

/**
 * Solve Kepler's equation  M = E - e*sin(E)  for the eccentric anomaly E.
 * Degrees in, degrees out (Standish's formulation: the eccentricity is
 * carried in degrees so the sine term and the anomalies share units).
 * Newton-Raphson from the standard first guess E0 = M + e*sin(M); stops when
 * the correction falls below KEPLER_TOLERANCE_DEG or after
 * KEPLER_MAX_ITERATIONS passes.
 */
export function solveKepler(meanAnomalyDeg: number, e: number): number {
  const M = wrapDegSigned(meanAnomalyDeg);
  const eStar = (180 / Math.PI) * e;
  let E = M + eStar * Math.sin(M * DEG);
  for (let i = 0; i < KEPLER_MAX_ITERATIONS; i++) {
    const dM = M - (E - eStar * Math.sin(E * DEG));
    const dE = dM / (1 - e * Math.cos(E * DEG));
    E += dE;
    if (Math.abs(dE) <= KEPLER_TOLERANCE_DEG) break;
  }
  return E;
}

export interface HeliocentricPosition {
  /** J2000 ecliptic coordinates in AU: +x toward the vernal equinox, +z
   *  toward ecliptic north. */
  x: number; y: number; z: number;
  /** Heliocentric distance, AU. */
  rAU: number;
  /** Ecliptic longitude, degrees in [0, 360). */
  lonDeg: number;
  /** Ecliptic latitude, degrees. */
  latDeg: number;
}

/** Heliocentric position from an element set at a real UTC timestamp. */
export function heliocentricFromElements(el: KeplerElements, dateMs: number): HeliocentricPosition {
  const T = julianCenturiesSinceJ2000(dateMs);
  const a = el.aAU + el.aRate * T;
  const e = el.e + el.eRate * T;
  const inc = (el.incDeg + el.incRate * T) * DEG;
  const meanLon = el.meanLonDeg + el.meanLonRate * T;
  const periLon = el.periLonDeg + el.periLonRate * T;
  const nodeLonDeg = el.nodeLonDeg + el.nodeLonRate * T;
  const nodeLon = nodeLonDeg * DEG;
  const argPeri = (periLon - nodeLonDeg) * DEG;
  const E = solveKepler(meanLon - periLon, e) * DEG;
  // Perifocal plane.
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
  // Rotate perifocal -> J2000 ecliptic (argument of perihelion, inclination,
  // then longitude of the ascending node).
  const cw = Math.cos(argPeri), sw = Math.sin(argPeri);
  const co = Math.cos(nodeLon), so = Math.sin(nodeLon);
  const ci = Math.cos(inc), si = Math.sin(inc);
  const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
  const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
  const z = (sw * si) * xp + (cw * si) * yp;
  const rAU = Math.hypot(x, y, z);
  return {
    x, y, z, rAU,
    lonDeg: wrapDeg360(Math.atan2(y, x) / DEG),
    latDeg: rAU > 0 ? Math.asin(Math.max(-1, Math.min(1, z / rAU))) / DEG : 0,
  };
}

/**
 * Heliocentric position of a mapped body at a date. `date` is a REAL UTC
 * instant — callers hand it the game calendar's date (map-time.ts's
 * `ephemerisMsForGameMonths`), never the wall clock, so a body is where the
 * HUD's game date says it is. Returns null for moons and for ids with no
 * element set (moons ride their parent — see computeScenePositions).
 */
export function bodyPositionAt(bodyId: string, date: Date | number): HeliocentricPosition | null {
  const el = KEPLER_ELEMENTS[bodyId];
  if (!el) return null;
  const ms = typeof date === 'number' ? date : date.getTime();
  if (!Number.isFinite(ms)) return null;
  return heliocentricFromElements(el, ms);
}

/**
 * Map a real heliocentric position into the scene's LOG-SCALED coordinates:
 * the direction is exactly the real one, the magnitude is squashed by
 * sceneOrbitRadius so Mercury and Pluto can share a stage. Scene axes match
 * the pre-Phase-3 layout — ecliptic x maps to scene x, ecliptic y to scene z,
 * ecliptic north to scene +y.
 */
export function sceneVectorFromHeliocentric(p: HeliocentricPosition): Vec3 {
  const k = sceneOrbitRadius(p.rAU) / Math.max(1e-9, p.rAU);
  return [p.x * k, p.z * k, p.y * k];
}

/** Orbital period in days from the semi-major axis (Kepler's third law,
 *  referenced to Earth's sidereal year). */
export function orbitalPeriodDays(aAU: number): number {
  return SIDEREAL_YEAR_DAYS * Math.pow(Math.max(1e-9, aAU), 1.5);
}

/**
 * Compute every body + location-anchor world position.
 *
 * `tSec` drives the HAND-TUNED orbits — the moons' readability-curve periods
 * (moonDisplayPeriodSec) and the orbital pips' display periods. Pass 0 for a
 * deterministic static layout (reduced motion).
 *
 * `ephemerisMs` (graphics Phase 3) is the REAL UTC instant of the GAME
 * calendar date — map-time.ts's `ephemerisMsForGameMonths(...)`. When given,
 * every heliocentric body is placed from its J2000 elements by solving
 * Kepler's equation, so the planets are where the game date says they are and
 * scrubbing the timeline walks them along their real orbits. Omit it and the
 * legacy cosmetic constant-rate circle from `phaseDeg` is used instead — that
 * path is kept working for the existing unit tests and for any caller that
 * only wants a deterministic layout.
 */
export function computeScenePositions(tSec: number, ephemerisMs?: number): ScenePositions {
  const bodies: Record<string, Vec3> = {};
  const anchors: Record<string, { pos: Vec3; r: number }> = {};
  const useEphemeris = typeof ephemerisMs === 'number' && Number.isFinite(ephemerisMs);

  // Heliocentric bodies first (moons need their parents resolved).
  for (const b of ORBITAL_BODIES) {
    if (b.parent) continue;
    if (useEphemeris) {
      const helio = bodyPositionAt(b.id, ephemerisMs as number);
      if (helio) {
        bodies[b.id] = sceneVectorFromHeliocentric(helio);
        continue;
      }
      // No element set for this body — fall through to the legacy circle.
    }
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
