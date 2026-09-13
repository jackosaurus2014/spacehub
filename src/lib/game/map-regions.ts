// ─── Space Tycoon: Map regions — skybox, particles and 2D tint per region ────
// Graphics review 2026-09-12 item 4 ("volumetric region identity"). Eight
// regions of the solar map, each with a procedural equirect skybox
// (art/blender/skyboxes.py → public/game/sky/), an additive particle field
// (belt dust, Jovian radiation haze, Saturnian ice glitter, outer violet …)
// and the tint pair the 2D canvas washes its stage with. One table, two
// renderers (map-modes.ts precedent): the 3D scene crossfades the skybox and
// swaps the particle field, the 2D canvas tints from the SAME rows, so the
// region a player is "in" is never a 3D-only signal — the region label is
// also text in the HUD readout and the Location List headings.
//
// Which region the camera is in is a PURE derivation:
//   • system view — from where the camera is looking (the orbit target's
//     distance from the Sun, log-scaled like every orbit) and how far out it
//     is (a system-tier camera sees the heliopause; the far clamp is
//     interstellar dark), with Earth's neighbourhood as its own region when
//     the target sits beside Earth;
//   • local scenes — the body's region (a moon takes its parent's).
//
// Colour tokens here are existing ones (RegionBackdrop.tsx washes, the pip
// / body colours in orbital-elements.ts, the label tokens) — no new hex.
// Pure data + functions. No three.js, no canvas, no React.

import { ORBITAL_BODY_MAP, ORBITAL_BODIES, ORBITAL_PIPS, sceneOrbitRadius } from './orbital-elements';
import { ZOOM_3D_SYSTEM_MIN_DIST } from './map-zoom';

export type MapRegionId =
  | 'inner_system'
  | 'earth_environs'
  | 'asteroid_belt'
  | 'jovian'
  | 'saturnian'
  | 'outer_system'
  | 'heliopause'
  | 'interstellar';

export const MAP_REGION_IDS: readonly MapRegionId[] = [
  'inner_system', 'earth_environs', 'asteroid_belt', 'jovian', 'saturnian', 'outer_system', 'heliopause', 'interstellar',
];

export type RegionParticleShape =
  /** Flat annulus in the ecliptic (belt dust). `radius` = ring radius, `spread` = half-width. */
  | 'ring'
  /** Spherical shell around a body: `radius`..`radius + spread`, in body radii. */
  | 'shell'
  /** Flat disc around the Sun (zodiacal dust): out to `radius`, thickness `spread`. */
  | 'disc'
  /** Cube around the camera target (deep-space motes): half-size `radius`. */
  | 'field';

export interface RegionParticles {
  shape: RegionParticleShape;
  /** Existing colour token (never a new hex). */
  color: string;
  count: number;
  /** Point size, scene units (size-attenuated). */
  size: number;
  radius: number;
  spread: number;
  /** Peak material opacity (additive). */
  opacity: number;
  /** Slow group spin, rad/s (0 = still). Always 0 under reduced motion —
   *  the field is not drawn at all there. */
  drift: number;
}

export interface MapRegionSky {
  id: MapRegionId;
  /** HUD / screen-reader name — the region is always text somewhere. */
  label: string;
  /** Equirect backdrop, 2048×1024 WebP. */
  skybox: string;
  /** Backdrop brightness multiplier for the 3D stage. */
  intensity: number;
  /** 2D canvas wash: `a` top-left, `b` bottom-right (RegionBackdrop tokens). */
  tint: { a: string; b: string };
  particles: RegionParticles | null;
}

const SKY_BASE = '/game/sky';

export const MAP_REGION_SKY: Readonly<Record<MapRegionId, MapRegionSky>> = {
  inner_system: {
    id: 'inner_system', label: 'Inner system', skybox: `${SKY_BASE}/inner_system.webp`, intensity: 0.55,
    tint: { a: 'rgba(234,88,12,0.12)', b: 'rgba(180,83,9,0.08)' },
    // Zodiacal dust: a thin disc of sunlit motes out past Mars.
    particles: { shape: 'disc', color: '#fde68a', count: 900, size: 0.07, radius: 18, spread: 0.5, opacity: 0.28, drift: 0.004 },
  },
  earth_environs: {
    id: 'earth_environs', label: 'Earth environs', skybox: `${SKY_BASE}/earth_environs.webp`, intensity: 0.6,
    tint: { a: 'rgba(56,189,248,0.10)', b: 'rgba(34,197,94,0.06)' },
    // Sparse cyan motes around the home cluster.
    particles: { shape: 'shell', color: '#7dd3fc', count: 420, size: 0.05, radius: 1.6, spread: 4.5, opacity: 0.30, drift: 0.01 },
  },
  asteroid_belt: {
    id: 'asteroid_belt', label: 'Asteroid belt', skybox: `${SKY_BASE}/asteroid_belt.webp`, intensity: 0.7,
    tint: { a: 'rgba(168,162,158,0.10)', b: 'rgba(68,64,60,0.15)' },
    // Grey dust on the belt ring itself (BELT_SCENE_RADIUS ± 3).
    particles: { shape: 'ring', color: '#a8a29e', count: 2400, size: 0.06, radius: sceneOrbitRadius(2.77), spread: 3.2, opacity: 0.42, drift: 0.003 },
  },
  jovian: {
    id: 'jovian', label: 'Jovian system', skybox: `${SKY_BASE}/jovian.webp`, intensity: 0.6,
    tint: { a: 'rgba(251,191,36,0.10)', b: 'rgba(30,64,175,0.08)' },
    // Radiation haze: amber motes in a wide shell around Jupiter.
    particles: { shape: 'shell', color: '#fbbf24', count: 1400, size: 0.06, radius: 1.5, spread: 5.5, opacity: 0.34, drift: 0.02 },
  },
  saturnian: {
    id: 'saturnian', label: 'Saturnian system', skybox: `${SKY_BASE}/saturnian.webp`, intensity: 0.6,
    tint: { a: 'rgba(253,230,138,0.10)', b: 'rgba(217,119,6,0.06)' },
    // Ice glitter: bright, small, tight to the ring plane.
    particles: { shape: 'shell', color: '#e0f2fe', count: 1400, size: 0.045, radius: 1.3, spread: 4.0, opacity: 0.45, drift: 0.015 },
  },
  outer_system: {
    id: 'outer_system', label: 'Outer system', skybox: `${SKY_BASE}/outer_system.webp`, intensity: 0.65,
    tint: { a: 'rgba(129,140,248,0.10)', b: 'rgba(99,102,241,0.08)' },
    // Violet motes drifting around wherever the camera looks.
    particles: { shape: 'field', color: '#818cf8', count: 900, size: 0.07, radius: 9, spread: 0, opacity: 0.30, drift: 0.006 },
  },
  heliopause: {
    id: 'heliopause', label: 'Heliopause', skybox: `${SKY_BASE}/heliopause.webp`, intensity: 0.55,
    tint: { a: 'rgba(6,182,212,0.06)', b: 'rgba(139,92,246,0.04)' },
    particles: { shape: 'field', color: '#67e8f9', count: 500, size: 0.12, radius: 30, spread: 0, opacity: 0.22, drift: 0.003 },
  },
  interstellar: {
    id: 'interstellar', label: 'Interstellar', skybox: `${SKY_BASE}/interstellar.webp`, intensity: 0.5,
    tint: { a: 'rgba(129,140,248,0.10)', b: 'rgba(139,92,246,0.04)' },
    particles: { shape: 'field', color: '#a78bfa', count: 700, size: 0.16, radius: 45, spread: 0, opacity: 0.24, drift: 0.002 },
  },
};

/** Crossfade length between two backdrops (instant under reduced motion). */
export const REGION_FADE_MS = 1400;

// ─── Region by body / location ───────────────────────────────────────────────

/** Heliocentric bodies (moons resolve through their parent). */
const REGION_OF_ROOT_BODY: Readonly<Record<string, MapRegionId>> = {
  mercury: 'inner_system',
  venus: 'inner_system',
  earth: 'earth_environs',
  mars: 'inner_system',
  ceres: 'asteroid_belt',
  jupiter: 'jovian',
  saturn: 'saturnian',
  uranus: 'outer_system',
  neptune: 'outer_system',
  pluto: 'outer_system',
};

/** The region of an orbital body (moons take their parent's). Unknown ids
 *  fall back to the inner system, the default stage. */
export function regionForBody(bodyId: string | null | undefined): MapRegionId {
  if (!bodyId) return 'inner_system';
  let id: string | undefined = bodyId;
  for (let hops = 0; id && hops < 4; hops++) {
    const direct = REGION_OF_ROOT_BODY[id];
    if (direct) return direct;
    id = ORBITAL_BODY_MAP.get(id)?.parent;
  }
  return 'inner_system';
}

/** Location id → region: the body carrying the location, a pip's parent
 *  body, or the belt / deep-space ring anchors. */
export function regionForLocation(locationId: string | null | undefined): MapRegionId {
  if (!locationId) return 'inner_system';
  const pip = ORBITAL_PIPS.find(p => p.locationId === locationId);
  if (pip) {
    if (pip.parent === 'belt') return 'asteroid_belt';
    if (pip.parent === 'deep') return 'outer_system';
    return regionForBody(pip.parent);
  }
  const body = ORBITAL_BODIES.find(b => b.locationId === locationId);
  return body ? regionForBody(body.id) : 'inner_system';
}

// ─── Region by camera (system view) ──────────────────────────────────────────
// Bands are on the orbit TARGET's distance from the Sun (log-scaled scene
// units, orbital-elements.ts): Mars sits at 16.0, Ceres/belt at 21.0,
// Jupiter at 26.7, Saturn at 32.5, Uranus at 39.2 and beyond. The camera's
// own distance only decides the two far tiers.

export const REGION_BAND_INNER_MAX = 18.5;
export const REGION_BAND_BELT_MAX = 24;
export const REGION_BAND_JOVIAN_MAX = 29.5;
export const REGION_BAND_SATURN_MAX = 36;
/** Camera distance (from the origin) past which the sky is the heliopause —
 *  the system zoom tier's threshold, so the readout and the sky agree. */
export const REGION_HELIOPAUSE_CAMERA_DIST = ZOOM_3D_SYSTEM_MIN_DIST;
/** Camera distance past which the sky is interstellar dark (just inside the
 *  OrbitControls maxDistance of 160). */
export const REGION_INTERSTELLAR_CAMERA_DIST = 150;
/** Target within this many scene units of Earth = Earth environs. */
export const REGION_EARTH_ENVIRONS_DIST = 3.2;

export function systemRegionAt(targetRadius: number, cameraDistance: number, earthDistance = Infinity): MapRegionId {
  if (!Number.isFinite(targetRadius) || !Number.isFinite(cameraDistance)) return 'inner_system';
  if (cameraDistance >= REGION_INTERSTELLAR_CAMERA_DIST) return 'interstellar';
  if (cameraDistance > REGION_HELIOPAUSE_CAMERA_DIST) return 'heliopause';
  if (earthDistance <= REGION_EARTH_ENVIRONS_DIST) return 'earth_environs';
  if (targetRadius < REGION_BAND_INNER_MAX) return 'inner_system';
  if (targetRadius < REGION_BAND_BELT_MAX) return 'asteroid_belt';
  if (targetRadius < REGION_BAND_JOVIAN_MAX) return 'jovian';
  if (targetRadius < REGION_BAND_SATURN_MAX) return 'saturnian';
  return 'outer_system';
}

// ─── Crossfade (pure timing) ─────────────────────────────────────────────────

/** 0..1 crossfade weight at `elapsedMs` (1 immediately under reduced motion). */
export function regionFadeMix(elapsedMs: number, reducedMotion = false): number {
  if (reducedMotion || REGION_FADE_MS <= 0) return 1;
  const t = Math.max(0, Math.min(1, elapsedMs / REGION_FADE_MS));
  return t * t * (3 - 2 * t);
}

/**
 * Sky material uniforms as the renderer keeps them — a duck-typed shape so
 * this stays testable without three. `syncSkyUniforms` applies a loaded
 * texture to the slot that is waiting for it and reports whether the
 * material must recompile (a null → texture sampler is a program change;
 * the useMapRefresh rule for late-loading maps).
 */
export interface SkyUniformsLike {
  texA: { value: unknown };
  texB: { value: unknown };
  hasA: { value: number };
  hasB: { value: number };
  intensityA: { value: number };
  intensityB: { value: number };
  mixAB: { value: number };
}

export function syncSkyUniforms(u: SkyUniformsLike, slot: 'A' | 'B', texture: unknown | null, intensity: number): boolean {
  const tex = slot === 'A' ? u.texA : u.texB;
  const has = slot === 'A' ? u.hasA : u.hasB;
  const inten = slot === 'A' ? u.intensityA : u.intensityB;
  const prevTex = tex.value;
  const prevHas = has.value;
  tex.value = texture ?? null;
  has.value = texture ? 1 : 0;
  inten.value = intensity;
  return prevHas !== has.value || prevTex !== tex.value;
}
