// ─── Space Tycoon: Procedural planet shading (graphics review item 3) ────────
// GLSL for the solar map's bodies plus the pure helpers around it. One
// shader source, four variants by define:
//
//   PLANET  the sphere — sharp terminator from the Sun (world origin), a
//           Fresnel atmosphere rim coloured from ATMOSPHERES, ocean specular
//           (Earth), the cloud layer's shadow offset onto the surface, the
//           ring's shadow on Saturn, and a flowing band distortion for the
//           gas giants. Night lights ride in the day texture's ALPHA channel
//           (earth_day_lights.webp) so the whole thing is ≤ 2 texture reads:
//           day+lights and the cloud coverage.
//   CLOUDS  the cloud sphere: coverage from one read, lit by the same
//           terminator, alpha = coverage.
//   HALO    a BackSide shell replacing the two flat atmosphere shells: a
//           limb-bright, day-weighted glow that fades outward.
//   RING    Saturn's ring with the planet's shadow across it (one read).
//
// The renderer (map3d/shared.tsx) builds the drei shaderMaterial from these
// strings; everything here is three-free so the uniform bookkeeping —
// which texture goes where, when the program must recompile (the
// useMapRefresh rule for late-loading maps), the irradiance at each orbit,
// the cloud-shadow offset — is unit-testable.

import { ORBITAL_BODY_MAP, sceneOrbitRadius, type OrbitalBody } from './orbital-elements';

// ─── Lighting constants (mirror the item-8 point light: 170 cd, decay 2) ─────

export const SUN_INTENSITY = 170;
export const SUN_IRRADIANCE_MIN = 0.28;
export const SUN_IRRADIANCE_MAX = 2.4;
/** The inverse-square law is compressed (^0.6) so the outer system reads
 *  as dim rather than black: Earth ≈ 1.0, Jupiter ≈ 0.42, Saturn ≈ 0.33,
 *  Mercury ≈ 2.2 before the clamp. Same ordering as the item-8 light. */
export const SUN_IRRADIANCE_COMPRESSION = 0.6;

/** Irradiance at a heliocentric scene radius (inverse-square from the Sun
 *  at the origin, compressed), clamped so Mercury does not blow out and
 *  Pluto stays a visible dim disc. Moons use their root body's orbit. */
export function sunIrradianceAt(orbitRadius: number): number {
  if (!(orbitRadius > 0)) return SUN_IRRADIANCE_MAX;
  const raw = Math.pow(SUN_INTENSITY / (orbitRadius * orbitRadius), SUN_IRRADIANCE_COMPRESSION);
  return Math.min(SUN_IRRADIANCE_MAX, Math.max(SUN_IRRADIANCE_MIN, raw));
}

/** Irradiance for a body id (a moon takes its parent's orbit). */
export function bodySunIrradiance(bodyId: string | undefined): number {
  let id = bodyId;
  for (let hops = 0; id && hops < 4; hops++) {
    const def = ORBITAL_BODY_MAP.get(id);
    if (!def) break;
    if (typeof def.aAU === 'number') return sunIrradianceAt(sceneOrbitRadius(def.aAU));
    id = def.parent;
  }
  return sunIrradianceAt(sceneOrbitRadius(1));
}

// ─── Per-body shader flags (data-driven, from the orbital catalog) ───────────

export const GAS_GIANT_IDS: ReadonlySet<string> = new Set(['jupiter', 'saturn', 'uranus', 'neptune']);

export interface BodyShaderFlags {
  /** Ocean specular highlight (blue-dominant texels read as water). */
  ocean: boolean;
  /** Flowing latitude-band distortion. */
  gasBands: boolean;
  /** The day texture's alpha channel carries night lights. */
  lightsInAlpha: boolean;
}

export function bodyShaderFlags(def: Pick<OrbitalBody, 'id' | 'texture'> | undefined): BodyShaderFlags {
  if (!def) return { ocean: false, gasBands: false, lightsInAlpha: false };
  return {
    ocean: def.id === 'earth',
    gasBands: GAS_GIANT_IDS.has(def.id),
    lightsInAlpha: /_lights\.webp$/.test(def.texture ?? ''),
  };
}

/** Ring plane tilt: PlanetRing's `rotation-x = -π/2 + 0.18`, so the ring
 *  normal in the body's frame is (0, cos 0.18, sin 0.18). */
export const PLANET_RING_TILT = 0.18;
export const PLANET_RING_NORMAL: readonly [number, number, number] = [0, Math.cos(PLANET_RING_TILT), Math.sin(PLANET_RING_TILT)];

/**
 * Cloud-shadow uv offset: the surface spins at `surfaceRot` and the cloud
 * sphere at `cloudRot` (radians about +y); the cloud texel above surface
 * texel u is u + (surfaceRot − cloudRot) / 2π (SphereGeometry's u runs with
 * the azimuth three's rotation.y advances).
 */
export function cloudShiftFor(surfaceRot: number, cloudRot: number): number {
  const s = (surfaceRot - cloudRot) / (Math.PI * 2);
  return s - Math.floor(s);
}

// ─── Uniform bookkeeping (duck-typed; the renderer passes real uniforms) ────

export interface PlanetMapUniformsLike {
  /** `dayMap`, not `map`: three treats a truthy `material.map` as USE_MAP
   *  on every material, ShaderMaterial included. */
  dayMap: { value: unknown };
  hasMap: { value: number };
  hasLights: { value: number };
  cloudsMap: { value: unknown };
  hasClouds: { value: number };
}

/**
 * Apply the (possibly still-null) textures to a planet material's uniforms.
 * Returns true when a sampler went from empty to bound (or bound to a
 * different texture) — the caller sets `needsUpdate` then, which is what
 * useMapRefresh does for the standard materials: a program compiled before
 * its map arrived must be rebuilt, not just re-uniformed.
 */
export function syncPlanetMaps(u: PlanetMapUniformsLike, maps: { day?: unknown | null; clouds?: unknown | null }, flags: Pick<BodyShaderFlags, 'lightsInAlpha'>): boolean {
  let changed = false;
  const nextMap = maps.day ?? null;
  if (u.dayMap.value !== nextMap) { u.dayMap.value = nextMap; changed = true; }
  const hasMap = nextMap ? 1 : 0;
  if (u.hasMap.value !== hasMap) { u.hasMap.value = hasMap; changed = true; }
  const hasLights = nextMap && flags.lightsInAlpha ? 1 : 0;
  if (u.hasLights.value !== hasLights) { u.hasLights.value = hasLights; changed = true; }
  const nextClouds = maps.clouds ?? null;
  if (u.cloudsMap.value !== nextClouds) { u.cloudsMap.value = nextClouds; changed = true; }
  const hasClouds = nextClouds ? 1 : 0;
  if (u.hasClouds.value !== hasClouds) { u.hasClouds.value = hasClouds; changed = true; }
  return changed;
}

// ─── GLSL ────────────────────────────────────────────────────────────────────

export const PLANET_VERTEX = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying vec3 vCenter;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const PLANET_FRAGMENT = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D cloudsMap;
uniform sampler2D ringMap;
uniform float hasMap;
uniform float hasClouds;
uniform float hasLights;
uniform vec3 baseColor;
uniform vec3 tint;
uniform vec3 atmoColor;
uniform float atmoStrength;
uniform float sunI;
uniform float bodyR;
uniform float ocean;
uniform float gasBands;
uniform float time;
uniform float cloudShift;
uniform vec3 ringN;
uniform float ringInner;
uniform float ringOuter;
uniform float ringOpacity;
uniform vec3 lightsColor;
uniform float lightsStrength;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying vec3 vCenter;
varying vec2 vUv;

void main() {
  vec3 N = normalize(vNormalW);
  // The Sun sits at the world origin in both the system and local scenes.
  vec3 L = normalize(-vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndl = dot(N, L);
  float ndv = dot(N, V);
  // Sharp terminator: a narrow smoothstep instead of the Lambert roll-off.
  float lit = smoothstep(-0.05, 0.12, ndl);
  float diff = max(ndl, 0.0);
#if defined(HALO)
  // BackSide shell seen from outside: the far hemisphere's limb (ndv → 0)
  // is the outer edge of the glow, ndv ≈ -0.36 touches the planet's disc.
  float band = clamp(-ndv / 0.36, 0.0, 1.0);
  float glow = pow(band, 1.6);
  float side = 0.16 + 0.84 * smoothstep(-0.45, 0.35, ndl);
  gl_FragColor = vec4(atmoColor * (0.9 + 0.5 * glow) * side, glow * side * atmoStrength * 1.6);
#elif defined(CLOUDS)
  float cov = texture2D(cloudsMap, vUv).r * hasClouds;
  vec3 col = vec3(0.98, 0.99, 1.0) * (0.07 + sunI * diff * 0.95);
  gl_FragColor = vec4(col, cov * 0.85);
#elif defined(RING)
  vec4 tex = texture2D(ringMap, vUv);
  // The planet's shadow: ring texels behind the body (relative to the Sun)
  // inside its cylinder are dark; a soft edge at the limb.
  vec3 P = (vWorldPos - vCenter) / bodyR;
  float along = dot(P, L);
  float perp = length(P - L * along);
  float shadow = along < 0.0 ? 1.0 - smoothstep(0.94, 1.06, perp) : 0.0;
  // Rings are bright ice: the strip texture is a dim sRGB grey (mean ≈ 36%),
  // so lift it well above the old unlit-basic look and let the planet's
  // shadow carve the dark arc; a faint dependence on the Sun's distance.
  float light = (1.6 + 0.5 * clamp(sunI, 0.0, 1.0)) * (1.0 - 0.85 * shadow);
  gl_FragColor = vec4(tex.rgb * tint * light, tex.a * ringOpacity);
#else
  vec2 uv = vUv;
  if (gasBands > 0.5) {
    // Flowing bands: a latitude-keyed sinusoidal warp plus differential
    // drift per band (time is 0 under reduced motion — static bands).
    float lat = (uv.y - 0.5) * 2.0;
    uv.x += 0.006 * sin(uv.y * 38.0 + time * 0.12) * (1.0 - lat * lat)
          + time * 0.0015 * cos(uv.y * 21.0);
    uv.x = fract(uv.x);
  }
  vec4 tex = texture2D(dayMap, uv);
  vec3 albedo = mix(baseColor, tex.rgb, hasMap) * tint;
  float lights = tex.a * hasLights;
  // Cloud shadow: the coverage under this texel, offset so the shadow sits
  // a little off its cloud (second and last texture read).
  float cs = 0.0;
  if (hasClouds > 0.5) {
    cs = texture2D(cloudsMap, vec2(fract(uv.x + cloudShift + 0.008), uv.y)).r;
  }
  albedo *= 1.0 - 0.45 * cs * lit;
  // Ring shadow on the planet (Saturn): march the surface point toward the
  // Sun, test where it crosses the ring plane.
  float ringShadow = 0.0;
  if (ringOuter > 0.0) {
    vec3 P = (vWorldPos - vCenter) / bodyR;
    float denom = dot(L, ringN);
    if (abs(denom) > 1e-3) {
      float t = -dot(P, ringN) / denom;
      if (t > 0.0) {
        float rr = length(P + L * t);
        ringShadow = smoothstep(ringInner - 0.06, ringInner + 0.06, rr) * (1.0 - smoothstep(ringOuter - 0.08, ringOuter + 0.08, rr));
      }
    }
  }
  float sun = sunI * diff * (1.0 - 0.72 * ringShadow);
  vec3 col = albedo * (0.12 + sun * 0.95);
  if (ocean > 0.5) {
    // Water is where the day texel is blue-dominant; a tight highlight
    // toward the half-vector, masked by cloud cover and the terminator.
    vec3 H = normalize(L + V);
    float water = smoothstep(0.03, 0.14, tex.b - max(tex.r, tex.g)) * (1.0 - cs);
    float spec = pow(max(dot(N, H), 0.0), 64.0) * water * lit;
    col += vec3(1.0, 0.96, 0.88) * spec * sunI * 0.8;
  }
  // Night lights on the dark side only.
  col += lightsColor * lights * lightsStrength * (1.0 - lit);
  // Fresnel rim: the atmosphere seen edge-on, day-weighted with a warm
  // sliver past the terminator; strength from the ATMOSPHERES table.
  float fres = pow(1.0 - max(ndv, 0.0), 3.0);
  float rimSide = 0.15 + 0.85 * smoothstep(-0.35, 0.3, ndl);
  col = mix(col, atmoColor * (0.6 + 0.6 * lit), clamp(fres * atmoStrength * 2.4 * rimSide, 0.0, 0.85));
  gl_FragColor = vec4(col, 1.0);
#endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Skybox shell: two equirects crossfaded by `mix`, each with its own
 *  intensity; the sphere is BackSide at a radius inside the far plane. */
export const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const SKY_FRAGMENT = /* glsl */ `
uniform sampler2D texA;
uniform sampler2D texB;
uniform float hasA;
uniform float hasB;
uniform float intensityA;
uniform float intensityB;
uniform float mixAB;
varying vec3 vDir;
#define RECIPROCAL_PI2 0.15915494
void main() {
  vec3 d = normalize(vDir);
  // Equirect lookup (three's equirectUv convention).
  vec2 uv = vec2(atan(d.z, d.x) * RECIPROCAL_PI2 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830988 + 0.5);
  vec3 a = texture2D(texA, uv).rgb * intensityA * hasA;
  vec3 b = texture2D(texB, uv).rgb * intensityB * hasB;
  gl_FragColor = vec4(mix(a, b, mixAB), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
