'use client';

// ─── Region identity: skybox crossfade + particle field (review item 4) ──────
// Graphics Phase 2 (docs/GRAPHICS_REVIEW_2026-09-12.md §b item 4). Three
// frame-loop children of the ONE solar Canvas — no second context, no
// second scene:
//
//   • RegionTracker  — writes the region the camera is in into a shared ref
//                      (lib/game/map-regions.ts systemRegionAt / regionForBody:
//                      the orbit target's distance from the Sun in the system
//                      view, the body's region inside a local scene), with a
//                      short settle so a target parked on a band edge never
//                      flickers. Mirrors it to React only on change (the HUD
//                      chip + screen-reader text).
//   • RegionSky      — a BackSide sphere well inside the far plane carrying
//                      two equirects and a mix uniform; a region change loads
//                      the new backdrop (public/game/sky, ≤ 45 KB each) and
//                      crossfades over REGION_FADE_MS (a cut under reduced
//                      motion). Late textures go through the same recompile
//                      rule as every other map (syncSkyUniforms → needsUpdate).
//   • RegionParticles — one THREE.Points (≤ 2,500 additive sprites, one draw
//                      call) shaped per region: belt dust on the belt ring,
//                      Jovian radiation haze / Saturnian ice glitter as a
//                      shell around the body, zodiacal disc, deep-space
//                      field around the orbit target. Fades out, rebuilds,
//                      fades in on a region change. NOT mounted under
//                      reduced motion (SolarMap3D gates it).
//
// 2D parity: SolarSystemCanvas tints its stage from MAP_REGION_SKY[..].tint
// (the same table); the skybox art and the particles themselves are
// decorative-only (the region is text in the chip and the list headings).

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  MAP_REGION_SKY,
  regionForBody,
  systemRegionAt,
  regionFadeMix,
  syncSkyUniforms,
  type MapRegionId,
  type SkyUniformsLike,
  type RegionParticles as RegionParticleDef,
} from '@/lib/game/map-regions';
import { SKY_VERTEX, SKY_FRAGMENT } from '@/lib/game/map-shading';
import { rootBodyId } from '@/lib/game/map-flight';
import { ORBITAL_BODY_MAP, sceneBodyRadius } from '@/lib/game/orbital-elements';
import type { PositionsRef } from './shared';

export type RegionRef = React.MutableRefObject<MapRegionId>;
type ControlsRef = React.MutableRefObject<OrbitControlsImpl | null>;
type LocalRef = React.MutableRefObject<string | null>;

/** A candidate region must hold this long before the sky follows it. */
export const REGION_SETTLE_MS = 250;

// ── Tracker ─────────────────────────────────────────────────────────────────

export function RegionTracker({ controlsRef, posRef, localRef, regionRef, onChange }: {
  controlsRef: ControlsRef; posRef: PositionsRef; localRef: LocalRef; regionRef: RegionRef; onChange?: (r: MapRegionId) => void;
}) {
  const pending = useRef<{ id: MapRegionId; since: number } | null>(null);
  useFrame(({ camera }) => {
    const local = localRef.current;
    let next: MapRegionId;
    if (local) {
      next = regionForBody(local);
    } else {
      const t = controlsRef.current?.target;
      const tx = t ? t.x : 0, ty = t ? t.y : 0, tz = t ? t.z : 0;
      const earth = posRef.current.bodies.earth;
      const earthDist = earth ? Math.hypot(tx - earth[0], ty - earth[1], tz - earth[2]) : Infinity;
      next = systemRegionAt(Math.hypot(tx, ty, tz), camera.position.length(), earthDist);
    }
    if (next === regionRef.current) { pending.current = null; return; }
    const now = performance.now();
    if (!pending.current || pending.current.id !== next) { pending.current = { id: next, since: now }; return; }
    if (now - pending.current.since < REGION_SETTLE_MS) return;
    regionRef.current = next;
    pending.current = null;
    onChange?.(next);
  });
  return null;
}

// ── Skybox textures (module cache: one decode per file per session) ─────────

const skyCache = new Map<string, THREE.Texture>();
const skyLoading = new Set<string>();

function loadSky(url: string): void {
  if (skyCache.has(url) || skyLoading.has(url)) return;
  skyLoading.add(url);
  new THREE.TextureLoader().load(
    url,
    t => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.mapping = THREE.UVMapping; // the shader does its own equirect lookup
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = 2;
      t.needsUpdate = true;
      skyCache.set(url, t);
      skyLoading.delete(url);
    },
    undefined,
    () => { skyLoading.delete(url); /* 404 → the sky stays black (the CSS gradient) */ },
  );
}

/** Warm the other seven backdrops when the browser is idle (≈ 220 KB). */
function preloadSkies(): void {
  const run = () => { for (const r of Object.values(MAP_REGION_SKY)) loadSky(r.skybox); };
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}

// ── Sky sphere ──────────────────────────────────────────────────────────────

/** Inside the camera far plane (1200) from every reachable position
 *  (OrbitControls maxDistance 160). */
export const SKY_RADIUS = 700;

export function RegionSky({ regionRef, reduced }: { regionRef: RegionRef; reduced: boolean }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      texA: { value: null }, texB: { value: null },
      hasA: { value: 0 }, hasB: { value: 0 },
      intensityA: { value: 0 }, intensityB: { value: 0 },
      mixAB: { value: 0 },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
  }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => { preloadSkies(); }, []);
  const st = useRef<{ shown: MapRegionId | null; fadeFrom: number; fading: boolean }>({ shown: null, fadeFrom: 0, fading: false });

  useFrame(() => {
    const u = mat.uniforms as unknown as SkyUniformsLike;
    const s = st.current;
    if (s.fading) {
      const m = regionFadeMix(performance.now() - s.fadeFrom, reduced);
      u.mixAB.value = m;
      if (m >= 1) {
        // Promote B → A and free the B slot for the next change.
        let recompile = syncSkyUniforms(u, 'A', u.texB.value, u.intensityB.value);
        recompile = syncSkyUniforms(u, 'B', null, 0) || recompile;
        u.mixAB.value = 0;
        s.fading = false;
        if (recompile) mat.needsUpdate = true;
      }
      return;
    }
    const want = regionRef.current;
    if (want === s.shown) return;
    const cfg = MAP_REGION_SKY[want];
    const tex = skyCache.get(cfg.skybox);
    if (!tex) { loadSky(cfg.skybox); return; }
    if (s.shown === null) {
      // First backdrop: no fade, nothing to fade from.
      if (syncSkyUniforms(u, 'A', tex, cfg.intensity)) mat.needsUpdate = true;
      s.shown = want;
      return;
    }
    if (syncSkyUniforms(u, 'B', tex, cfg.intensity)) mat.needsUpdate = true;
    s.fadeFrom = performance.now();
    s.fading = true;
    s.shown = want;
  });

  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[SKY_RADIUS, 32, 16]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

// ── Particle field ──────────────────────────────────────────────────────────

export const REGION_PARTICLE_MAX = 2500;

function makeSoftDisc(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Deterministic scatter for a region's particle definition (unit shapes;
 *  the group transform places and scales them). */
function fillParticles(attr: THREE.BufferAttribute, cfg: RegionParticleDef, seed: number): number {
  let s = seed | 0;
  const rand = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const n = Math.min(REGION_PARTICLE_MAX, cfg.count);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    switch (cfg.shape) {
      case 'ring': {
        const th = rand() * Math.PI * 2;
        const R = cfg.radius + (rand() - 0.5) * 2 * cfg.spread;
        x = R * Math.cos(th); z = R * Math.sin(th); y = (rand() - 0.5) * cfg.spread * 0.5;
        break;
      }
      case 'disc': {
        const th = rand() * Math.PI * 2;
        const R = Math.sqrt(rand()) * cfg.radius;
        x = R * Math.cos(th); z = R * Math.sin(th); y = (rand() - 0.5) * 2 * cfg.spread;
        break;
      }
      case 'shell': {
        // Uniform on a sphere, flattened toward the ring plane.
        const u = rand() * 2 - 1;
        const th = rand() * Math.PI * 2;
        const rr = Math.sqrt(1 - u * u);
        const R = cfg.radius + rand() * cfg.spread;
        x = rr * Math.cos(th) * R; z = rr * Math.sin(th) * R; y = u * R * 0.6;
        break;
      }
      default: {
        x = (rand() - 0.5) * 2 * cfg.radius; y = (rand() - 0.5) * 2 * cfg.radius; z = (rand() - 0.5) * 2 * cfg.radius;
      }
    }
    attr.setXYZ(i, x, y, z);
  }
  attr.needsUpdate = true;
  return n;
}

/** The body a shell field centres on: the local scene's root body, else the
 *  region's own planet. */
function shellBodyFor(region: MapRegionId, local: string | null): string | null {
  if (local) return rootBodyId(local);
  switch (region) {
    case 'earth_environs': return 'earth';
    case 'jovian': return 'jupiter';
    case 'saturnian': return 'saturn';
    default: return null;
  }
}

const REGION_SEED: Record<MapRegionId, number> = {
  inner_system: 11, earth_environs: 23, asteroid_belt: 37, jovian: 41, saturnian: 53, outer_system: 67, heliopause: 71, interstellar: 89,
};

export function RegionParticles({ regionRef, posRef, controlsRef, localRef }: {
  regionRef: RegionRef; posRef: PositionsRef; controlsRef: ControlsRef; localRef: LocalRef;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(REGION_PARTICLE_MAX * 3), 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const sprite = useMemo(() => makeSoftDisc(), []);
  const mat = useMemo(() => new THREE.PointsMaterial({
    size: 0.06,
    map: sprite,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), [sprite]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); sprite.dispose(); }, [geo, mat, sprite]);
  const groupRef = useRef<THREE.Group>(null);
  const st = useRef<{ built: MapRegionId | null; spin: number }>({ built: null, spin: 0 });

  useFrame((_, delta) => {
    const want = regionRef.current;
    const cfg = MAP_REGION_SKY[want].particles;
    const s = st.current;
    if (want !== s.built) {
      // Fade the old field out, then rebuild for the new region.
      mat.opacity = Math.max(0, mat.opacity - delta * 1.4);
      if (mat.opacity <= 0) {
        if (cfg) {
          const n = fillParticles(geo.attributes.position as THREE.BufferAttribute, cfg, REGION_SEED[want]);
          geo.setDrawRange(0, n);
          mat.color.set(cfg.color);
          mat.size = cfg.size;
          mat.needsUpdate = true;
        } else {
          geo.setDrawRange(0, 0);
        }
        s.built = want;
      }
    } else if (cfg) {
      mat.opacity = Math.min(cfg.opacity, mat.opacity + delta * 0.5);
    }
    const g = groupRef.current;
    if (!cfg || !g) return;
    s.spin += delta * cfg.drift;
    g.rotation.y = s.spin;
    switch (cfg.shape) {
      case 'shell': {
        const bodyId = shellBodyFor(want, localRef.current);
        const p = bodyId ? posRef.current.bodies[bodyId] : undefined;
        const def = bodyId ? ORBITAL_BODY_MAP.get(bodyId) : undefined;
        if (p) g.position.set(p[0], p[1], p[2]); else g.position.set(0, 0, 0);
        g.scale.setScalar(def ? sceneBodyRadius(def.radiusKm) : 1);
        break;
      }
      case 'field': {
        const t = controlsRef.current?.target;
        if (t) g.position.copy(t);
        g.scale.setScalar(1);
        break;
      }
      default:
        g.position.set(0, 0, 0);
        g.scale.setScalar(1);
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-1} />
    </group>
  );
}
