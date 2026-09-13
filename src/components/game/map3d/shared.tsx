'use client';

// ─── SolarMap3D shared scene helpers ─────────────────────────────────────────
// Flight mode part (a), 2026-09-13: the texture loader, canvas-sprite label
// system (with the Phase 1 screen-space declutter), the zoom-tier tracker,
// the selection reticle and the body sphere used to be private to
// SolarMap3D.tsx. The local scene (SolarMapLocal.tsx) draws the same bodies,
// labels and reticle inside the SAME Canvas, so they live here now — one
// implementation, two scenes, never diverging. Nothing here creates a
// WebGL context; every component is a child of SolarMap3D's single Canvas.

import { useRef, useState, useEffect, useMemo, useContext, createContext } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import {
  zoomTierFromCameraDistance,
  isMajorLocation,
  nameVisibleAt,
  lensVisibleAt,
  detailVisibleAt,
  reticleLockState,
  type MapZoomTier,
} from '@/lib/game/map-zoom';
import type { ModeVisual } from '@/lib/game/map-modes';
import { getAtmosphere } from '@/lib/game/map-bodies';
import { MAP_GLYPHS } from '@/lib/game/map-glyphs';
import type { ScenePositions } from '@/lib/game/orbital-elements';

export type PositionsRef = React.MutableRefObject<ScenePositions>;

/** Where the selection reticle sits for a location id. The system scene
 *  answers from the live position table; a local scene answers from its own
 *  frame (rings, moons, the body). */
export type AnchorResolver = (locationId: string) => { pos: readonly number[]; r: number } | null | undefined;

// Three's TextureLoader goes through ImageLoader, which honours THREE.Cache:
// with it on, the system view's Earth and the local scene's Earth share one
// decoded image instead of fetching and decoding twice.
THREE.Cache.enabled = true;

// ── Texture + label helpers ──────────────────────────────────────────────────

/** Non-suspending texture loader — resolves to null until loaded, and stays
 *  null on failure so a missing file degrades to the body's solid color
 *  instead of breaking the scene. */
export function useSafeTexture(url?: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) { setTex(null); return; }
    let disposed = false;
    let loadedTex: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      url,
      t => {
        if (disposed) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        loadedTex = t;
        setTex(t);
      },
      undefined,
      () => { /* 404 → keep solid-color fallback */ },
    );
    return () => {
      disposed = true;
      loadedTex?.dispose();
    };
  }, [url]);
  return tex;
}

/** Label typeface. The review found labels asked for "Inter" — a face the
 *  site never loads — so they fell back to system-ui while the HUD is DM
 *  Sans / Orbitron. next/font exposes the body face under a hashed family
 *  name, so read the resolved family off <body> once and draw with it. */
let labelFontCache: string | null = null;
export function labelFontFamily(): string {
  if (labelFontCache) return labelFontCache;
  let fam = '';
  try { fam = getComputedStyle(document.body).fontFamily; } catch { /* SSR / detached */ }
  labelFontCache = fam && fam.length < 200 ? fam : 'system-ui, sans-serif';
  return labelFontCache;
}

export interface BadgeCounts { buildings: number; npc: number; world: number }

/** W9: zone standing per location — never conveyed by color alone (text
 *  glyph crown/diamond rides in the label; the tint sprite is reinforcement only). */
export type ZoneStandingKind = 'governor' | 'stakeholder' | null;

/** Wave V4 — mode-lens annotation baked into the label texture: a text glyph
 *  after the name plus an optional second text row (never color alone). */
export interface ModeLabel { glyph: string; badge: string | null; color: string }

/** Draw a name + badge row into a canvas and return a sprite texture. Labels
 *  are self-contained (no font fetch, no DOM) and match the 2D map's badge
 *  colors: cyan = your buildings, red = NPC presence, purple = other corps.
 *  W9: an optional standing glyph (crown governor gold / diamond stakeholder cyan)
 *  prefixes the name. V4: an optional mode glyph suffixes it, and a mode
 *  badge text row renders under the count badges. */
export function makeLabelTexture(name: string, unlocked: boolean, badges: BadgeCounts, standing: ZoneStandingKind = null, mode: ModeLabel | null = null): { tex: THREE.CanvasTexture; aspect: number } {
  const scale = 2; // supersample for crispness
  const font = `600 ${13 * scale}px ${labelFontFamily()}`;
  const badgeFont = `700 ${11 * scale}px ${labelFontFamily()}`;
  const modeFont = `600 ${11 * scale}px ${labelFontFamily()}`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  const glyph = standing === 'governor' ? `${MAP_GLYPHS.governor} ` : standing === 'stakeholder' ? `${MAP_GLYPHS.stakeholder} ` : '';
  const glyphColor = standing === 'governor' ? '#fbbf24' : '#22d3ee';
  const glyphW = glyph ? ctx.measureText(glyph).width : 0;
  const nameW = ctx.measureText(name).width;
  const modeGlyph = mode?.glyph ? ` ${mode.glyph}` : '';
  const modeGlyphW = modeGlyph ? ctx.measureText(modeGlyph).width : 0;
  const textRowW = glyphW + nameW + modeGlyphW;
  const badgeEntries: { n: number; color: string }[] = [];
  if (badges.buildings > 0) badgeEntries.push({ n: badges.buildings, color: '#06b6d4' });
  if (badges.npc > 0) badgeEntries.push({ n: badges.npc, color: '#ef4444' });
  if (badges.world > 0) badgeEntries.push({ n: badges.world, color: '#a855f7' });
  const badgeR = 9 * scale;
  const badgeRowW = badgeEntries.length * (badgeR * 2 + 6 * scale);
  ctx.font = modeFont;
  const modeBadgeW = mode?.badge ? ctx.measureText(mode.badge).width : 0;
  const baseH = badgeEntries.length > 0 ? 42 : 22;
  const modeRowH = mode?.badge ? 18 : 0;
  const w = Math.ceil(Math.max(textRowW, badgeRowW, modeBadgeW) + 16 * scale);
  const h = Math.ceil((baseH + modeRowH) * scale);
  canvas.width = w;
  canvas.height = h;
  // text — composed left-to-right so the standing glyph keeps its own color
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4 * scale;
  let tx = w / 2 - textRowW / 2;
  if (glyph) {
    ctx.fillStyle = glyphColor;
    ctx.fillText(glyph, tx, 11 * scale);
    tx += glyphW;
  }
  ctx.fillStyle = unlocked ? '#e2e8f0' : '#64748b';
  ctx.fillText(name, tx, 11 * scale);
  tx += nameW;
  if (modeGlyph) {
    ctx.fillStyle = mode!.color;
    ctx.fillText(modeGlyph, tx, 11 * scale);
  }
  ctx.textAlign = 'center';
  // badges
  if (badgeEntries.length > 0) {
    ctx.shadowBlur = 0;
    let x = w / 2 - badgeRowW / 2 + badgeR;
    for (const b of badgeEntries) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(x, 30 * scale, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = badgeFont;
      ctx.fillText(String(Math.min(99, b.n)), x, 30 * scale + scale);
      x += badgeR * 2 + 6 * scale;
    }
  }
  // mode badge text row (V4) — bottom of the canvas
  if (mode?.badge) {
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4 * scale;
    ctx.font = modeFont;
    ctx.fillStyle = mode.color;
    ctx.fillText(mode.badge, w / 2, (baseH + 8) * scale);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / h };
}

// ── Zoom-level information layering (V4 LOD bands → Wave A2 zoom tiers) ─────
// The V4 wave introduced three camera-distance bands here; Wave A2 promotes
// the thresholds and the visibility rules into map-zoom.ts so the 2D canvas
// answers identically, and adds the accessibility override (`alwaysLabels`).
// The tier lives in a shared ref written once per frame (ZoomTierTracker) and
// read by each LabelSprite's own useFrame — no React state churn at 60Hz.
// A throttled callback mirrors it to the shell HUD (state, but ≤1 set/tier
// change, not per frame).

export type TierRef = React.MutableRefObject<MapZoomTier>;

export function ZoomTierTracker({ tierRef, onChange }: { tierRef: TierRef; onChange?: (t: MapZoomTier) => void }) {
  useFrame(({ camera }) => {
    const next = zoomTierFromCameraDistance(camera.position.length());
    if (next !== tierRef.current) {
      tierRef.current = next;
      onChange?.(next);
    }
  });
  return null;
}

/** Screen-constant label sprite under a body/pip.
 *
 *  Three textures, one per zoom tier — regenerated only on DATA change, never
 *  on camera motion, and de-duplicated when two tiers would render the same
 *  pixels (the common case: a location with no badges and no lens badge uses
 *  one texture for all three tiers):
 *    detail   — name + standing + mode glyph + count badges + mode badge
 *    location — name + standing + mode glyph + mode badge  (no counts)
 *    system   — name + standing + mode glyph               (no badge rows)
 *  Visibility is chosen per frame by the allocation-free predicates in
 *  map-zoom.ts. `alwaysLabels` pins everything to the detail texture. */
// ── Graphics review 2026-09-12 item 9 — screen-space label declutter ────────
// Labels are screen-constant sprites, so two bodies that sit a few pixels
// apart on screen (Lunar Orbit / Moon, the Galilean moons) paint on top of
// each other. Every LabelSprite registers its group + per-tier sprite size
// here; LabelDeclutter (rendered inside the Canvas) projects each visible
// label every 250 ms, keeps the higher-priority label of any overlapping
// pair and lists the losers in `suppressed`, which the sprites consult in
// their own per-frame visibility pass — so the result never depends on
// useFrame ordering. Priority: selected body > holdings > major body >
// pip > moon (see labelPriority). The 'alwaysLabels' accessibility override
// bypasses the declutter entirely (it promises every label), and the
// Location List stays the canonical, always-complete list.
export interface LabelRegistryEntry {
  group: THREE.Object3D;
  yOffset: number;
  priority: number;
  /** Sprite scale (x = width, y = height) per zoom tier, in the
   *  sizeAttenuation:false units the sprites use. */
  sizeByTier: Record<MapZoomTier, { w: number; h: number }>;
  /** Written each frame by the sprite's own visibility pass. */
  shown: boolean;
  tier: MapZoomTier;
}
export interface LabelRegistry {
  entries: Map<string, LabelRegistryEntry>;
  suppressed: Set<string>;
}
export const LabelRegistryContext = createContext<LabelRegistry | null>(null);

export const DECLUTTER_INTERVAL_MS = 250;

export function LabelDeclutter({ registry, selectedLocationId, alwaysLabels, enabled = true }: { registry: LabelRegistry; selectedLocationId: string | null; alwaysLabels: boolean; enabled?: boolean }) {
  const lastRef = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    if (!enabled) return; // the scene is hidden — nothing to declutter
    if (alwaysLabels) { if (registry.suppressed.size) registry.suppressed.clear(); return; }
    const now = performance.now();
    if (now - lastRef.current < DECLUTTER_INTERVAL_MS) return;
    lastRef.current = now;
    // Sprite pixel extent for sizeAttenuation:false = scale × P[1][1] × H/2.
    const p11 = (camera as THREE.PerspectiveCamera).projectionMatrix.elements[5];
    const pxPerUnit = p11 * size.height / 2;
    const rects: { id: string; x: number; y: number; w: number; h: number; priority: number }[] = [];
    registry.entries.forEach((entry, id) => {
      if (!entry.shown) return;
      entry.group.getWorldPosition(tmp);
      tmp.y += entry.yOffset;
      tmp.project(camera);
      if (tmp.z > 1 || tmp.z < -1) return; // behind the camera / beyond far plane
      const s = entry.sizeByTier[entry.tier];
      const w = s.w * pxPerUnit;
      const h = s.h * pxPerUnit;
      const cx = (tmp.x + 1) / 2 * size.width;
      const cy = (1 - tmp.y) / 2 * size.height;
      rects.push({ id, x: cx - w / 2, y: cy - h / 2, w, h, priority: id === selectedLocationId ? Number.POSITIVE_INFINITY : entry.priority });
    });
    rects.sort((a, b) => b.priority - a.priority);
    const kept: typeof rects = [];
    const next = new Set<string>();
    for (const r of rects) {
      const collides = kept.some(k => r.x < k.x + k.w && r.x + r.w > k.x && r.y < k.y + k.h && r.y + r.h > k.y);
      if (collides) next.add(r.id); else kept.push(r);
    }
    registry.suppressed.clear();
    next.forEach(id => registry.suppressed.add(id));
  });
  return null;
}

/** Declutter priority for a location label (higher wins a collision). */
export function labelPriority(locationId: string | undefined, kind: 'body' | 'pip', badges: BadgeCounts): number {
  let p = kind === 'pip' ? 1 : (locationId && isMajorLocation(locationId)) ? 3 : 2;
  if (badges.buildings > 0) p += 3;
  return p;
}

export function LabelSprite({ name, unlocked, badges, yOffset, standing = null, mode = null, tierRef, locationId, alwaysLabels = false, priority = 2 }: {
  name: string; unlocked: boolean; badges: BadgeCounts; yOffset: number; standing?: ZoneStandingKind;
  mode?: ModeVisual | null; tierRef?: TierRef; locationId?: string; alwaysLabels?: boolean; priority?: number;
}) {
  const modeLabel: ModeLabel | null = mode ? { glyph: mode.glyph, badge: mode.badge, color: mode.tint } : null;
  const isMajor = locationId ? isMajorLocation(locationId) : true;
  const hasHoldings = badges.buildings > 0;
  const registry = useContext(LabelRegistryContext);
  const groupRef = useRef<THREE.Group>(null);
  const registryId = locationId ?? name;

  const variants = useMemo(() => {
    const NO_BADGE_COUNTS: BadgeCounts = { buildings: 0, npc: 0, world: 0 };
    const specs: { tier: MapZoomTier; badges: BadgeCounts; mode: ModeLabel | null }[] = [
      { tier: 'detail', badges, mode: modeLabel },
      { tier: 'location', badges: NO_BADGE_COUNTS, mode: modeLabel },
      { tier: 'system', badges: NO_BADGE_COUNTS, mode: modeLabel ? { ...modeLabel, badge: null } : null },
    ];
    const bySig = new Map<string, { tex: THREE.CanvasTexture; aspect: number; scale: number }>();
    const byTier: Record<MapZoomTier, { tex: THREE.CanvasTexture; aspect: number; scale: number }> = {} as never;
    for (const spec of specs) {
      const sig = `${spec.badges.buildings}|${spec.badges.npc}|${spec.badges.world}|${spec.mode?.badge ?? ''}`;
      let entry = bySig.get(sig);
      if (!entry) {
        const made = makeLabelTexture(name, unlocked, spec.badges, standing, spec.mode);
        const anyBadges = spec.badges.buildings > 0 || spec.badges.npc > 0 || spec.badges.world > 0;
        entry = { ...made, scale: (anyBadges ? 0.085 : 0.05) + (spec.mode?.badge ? 0.028 : 0) };
        bySig.set(sig, entry);
      }
      byTier[spec.tier] = entry;
    }
    return { byTier, unique: Array.from(bySig.values()) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, unlocked, badges.buildings, badges.npc, badges.world, standing, mode?.glyph, mode?.badge, mode?.tint]);

  useEffect(() => () => { variants.unique.forEach(v => v.tex.dispose()); }, [variants]);

  // Register with the declutter (item 9). Sizes are per tier so the check
  // uses the sprite that is actually showing.
  useEffect(() => {
    const group = groupRef.current;
    if (!registry || !group) return;
    const sizeByTier = {} as Record<MapZoomTier, { w: number; h: number }>;
    (['detail', 'location', 'system'] as MapZoomTier[]).forEach(tier => {
      const v = variants.byTier[tier];
      sizeByTier[tier] = { w: v.scale * v.aspect, h: v.scale };
    });
    registry.entries.set(registryId, { group, yOffset, priority, sizeByTier, shown: false, tier: 'detail' });
    return () => { registry.entries.delete(registryId); registry.suppressed.delete(registryId); };
  }, [registry, registryId, variants, yOffset, priority]);

  const refs = useRef<Partial<Record<MapZoomTier, THREE.Sprite | null>>>({});
  useFrame(() => {
    const tier = tierRef?.current ?? 'detail';
    const showName = nameVisibleAt(tier, isMajor, hasHoldings, alwaysLabels);
    const showDetail = detailVisibleAt(tier, alwaysLabels);
    const showLens = lensVisibleAt(tier, alwaysLabels);
    const pick: MapZoomTier = showDetail ? 'detail' : showLens ? 'location' : 'system';
    const entry = registry?.entries.get(registryId);
    if (entry) { entry.shown = showName; entry.tier = pick; }
    const suppressed = !alwaysLabels && !!registry?.suppressed.has(registryId);
    const d = refs.current.detail;
    const l = refs.current.location;
    const s = refs.current.system;
    if (d) d.visible = showName && !suppressed && pick === 'detail';
    if (l) l.visible = showName && !suppressed && pick === 'location';
    if (s) s.visible = showName && !suppressed && pick === 'system';
  });

  const tiers: MapZoomTier[] = ['detail', 'location', 'system'];
  return (
    <group ref={groupRef}>
      {tiers.map(tier => {
        const v = variants.byTier[tier];
        return (
          <sprite
            key={tier}
            ref={el => { refs.current[tier] = el; }}
            visible={tier === 'detail'}
            position={[0, yOffset, 0]}
            scale={[v.scale * v.aspect, v.scale, 1]}
            renderOrder={10}
          >
            <spriteMaterial map={v.tex} sizeAttenuation={false} transparent depthTest={false} />
          </sprite>
        );
      })}
    </group>
  );
}

/** Small self-contained glyph sprite texture (forecast warning, science). Same
 *  no-DOM/no-font-fetch approach as makeLabelTexture. */
export function makeGlyphTexture(text: string, color: string): { tex: THREE.CanvasTexture; aspect: number } {
  const scale = 2;
  const font = `700 ${14 * scale}px ${labelFontFamily()}`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width + 10 * scale);
  const h = Math.ceil(22 * scale);
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4 * scale;
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / h };
}


// ── Scene gate — raycast only into the scene that is showing ────────────────
// The system view and a local scene are sibling groups of one Canvas; the
// hidden one is `visible={false}`, but three's Raycaster does not consult
// visibility, so a click on the local Earth would also hit the system Earth
// underneath. Every interactive mesh routes its raycast through the gate of
// the scene it belongs to.

export type SceneGate = React.MutableRefObject<boolean>;
export const SceneGateContext = createContext<SceneGate | null>(null);

type RaycastFn = (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void;

/** A `raycast` prop for meshes: skips the hit test while the scene's gate is
 *  closed, otherwise defers to the object's own prototype raycast. */
export function useGatedRaycast(proto: RaycastFn): RaycastFn {
  const gate = useContext(SceneGateContext);
  return useMemo(() => function gated(this: THREE.Object3D, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    if (gate && !gate.current) return;
    proto.call(this, raycaster, intersects);
  }, [gate, proto]);
}

export const MESH_RAYCAST: RaycastFn = THREE.Mesh.prototype.raycast as RaycastFn;
export const INSTANCED_RAYCAST: RaycastFn = THREE.InstancedMesh.prototype.raycast as RaycastFn;

// ── Saturn ring with radial UV remap (the alpha texture is a radial strip) ──

export function PlanetRing({ texUrl, innerScale, outerScale, bodyR }: { texUrl: string; innerScale: number; outerScale: number; bodyR: number }) {
  const tex = useSafeTexture(texUrl);
  const geo = useMemo(() => {
    const inner = bodyR * innerScale;
    const outer = bodyR * outerScale;
    const g = new THREE.RingGeometry(inner, outer, 96, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const d = (Math.sqrt(x * x + y * y) - inner) / (outer - inner);
      uv.setXY(i, d, 0.5);
    }
    return g;
  }, [bodyR, innerScale, outerScale]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} rotation-x={-Math.PI / 2 + 0.18} renderOrder={2}>
      <meshBasicMaterial
        map={tex ?? undefined}
        color={tex ? '#ffffff' : '#eab308'}
        transparent
        opacity={tex ? 0.9 : 0.35}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Body sphere — the textured, lit, atmosphere-shelled planet/moon ─────────
// Shared by the system BodyMesh and the local scene so Earth is the same
// Earth in both. Rotation is decorative (off under reduced motion).

export interface BodySphereProps {
  r: number;
  texture?: string;
  cloudsTexture?: string;
  nightTexture?: string;
  color: string;
  locationId?: string;
  unlocked: boolean;
  reduced: boolean;
  ring?: { texture: string; innerScale: number; outerScale: number };
  /** Raycast-gated click surface; omit for a purely visual body. */
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

export function BodySphere({ r, texture, cloudsTexture, nightTexture, color, locationId, unlocked, reduced, ring, onClick, onPointerOver, onPointerOut }: BodySphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const tex = useSafeTexture(texture);
  const clouds = useSafeTexture(cloudsTexture);
  const night = useSafeTexture(nightTexture);
  const seg = r > 0.8 ? 48 : 28;
  const raycast = useGatedRaycast(MESH_RAYCAST);
  useFrame((_, delta) => {
    if (reduced) return;
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.06;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.085;
  });
  // Atmospheric shell, data-driven from ATMOSPHERES (map-bodies.ts). The
  // BackSide sphere reads as a rim glow against the lit limb; the
  // terminator itself is real (a single point light at the Sun).
  const atmo = getAtmosphere(locationId);
  return (
    <group>
      <mesh ref={meshRef} onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut} raycast={raycast}>
        <sphereGeometry args={[r, seg, seg]} />
        <meshStandardMaterial
          map={tex ?? undefined}
          color={tex ? (unlocked ? '#ffffff' : '#8a8f98') : (unlocked ? color : '#334155')}
          roughness={0.92}
          metalness={0.04}
          emissiveMap={night ?? undefined}
          emissive={night ? '#aab4ff' : '#000000'}
          emissiveIntensity={night ? 0.85 : 0}
        />
      </mesh>
      {clouds && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[r * 1.03, seg, seg]} />
          <meshStandardMaterial map={clouds} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      )}
      {atmo && (
        <>
          <mesh>
            <sphereGeometry args={[r * atmo.shellScale, 24, 24]} />
            <meshBasicMaterial color={atmo.color} transparent opacity={atmo.opacity * 0.62} side={THREE.BackSide} depthWrite={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[r * (atmo.shellScale + 0.05), 20, 20]} />
            <meshBasicMaterial color={atmo.color} transparent opacity={atmo.opacity * 0.26} side={THREE.BackSide} depthWrite={false} />
          </mesh>
        </>
      )}
      {ring && <PlanetRing texUrl={ring.texture} innerScale={ring.innerScale} outerScale={ring.outerScale} bodyR={r} />}
    </group>
  );
}

// ── Selection ring ───────────────────────────────────────────────────────────

// Wave V4 — animated selection reticle: rotating dashed ring (8 arc
// segments) + steady outer ring, replacing the color-only pulse ring.
// Rotation and pulse are off under reduced motion (static reticle remains).
export const RETICLE_SEGMENTS = 8;
export const RETICLE_ARC = (Math.PI * 2) / RETICLE_SEGMENTS * 0.55; // 55% duty cycle

// Wave A2 (item 4) — the reticle now ACQUIRES: it converges from a wide
// radius on to the body over RETICLE_LOCK_MS, brightening as it locks, with
// four corner brackets so "locked" is a shape and not a hue. Reduced motion
// snaps straight to the locked state (reticleLockState returns it directly).
export const RETICLE_BRACKETS = 4;
export const RETICLE_BRACKET_ARC = 0.30;

export function SelectionMarker({ resolve, selectedLocationId, reduced, pad = 0.42 }: { resolve: AnchorResolver; selectedLocationId: string | null; reduced: boolean; /** Gap between the body and the reticle, scene units (local scenes use a fraction of the body radius). */ pad?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const dashRef = useRef<THREE.Group>(null);
  // Fixed-size, index-keyed material refs (no growing registry — this
  // component re-renders whenever the selection changes).
  const dashMats = useRef<(THREE.MeshBasicMaterial | null)[]>(Array(RETICLE_SEGMENTS).fill(null));
  const bracketMats = useRef<(THREE.MeshBasicMaterial | null)[]>(Array(RETICLE_BRACKETS).fill(null));
  const outerMat = useRef<THREE.MeshBasicMaterial | null>(null);
  const lockStartRef = useRef<number>(0);
  useEffect(() => { lockStartRef.current = performance.now(); }, [selectedLocationId]);
  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    if (!selectedLocationId) { g.visible = false; return; }
    const a = resolve(selectedLocationId);
    if (!a) { g.visible = false; return; }
    g.visible = true;
    g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    const lock = reticleLockState(performance.now() - lockStartRef.current, reduced);
    const pulse = reduced || !lock.locked ? 1 : 1 + Math.sin(clock.elapsedTime * 3) * 0.08;
    const s = (a.r + pad) * pulse * lock.radiusScale;
    g.scale.set(s, s, s);
    if (dashRef.current && !reduced) dashRef.current.rotation.z = clock.elapsedTime * 0.9;
    for (let i = 0; i < dashMats.current.length; i++) {
      const m = dashMats.current[i];
      if (m) m.opacity = 0.95 * lock.opacity;
    }
    for (let i = 0; i < bracketMats.current.length; i++) {
      const m = bracketMats.current[i];
      if (m) m.opacity = 0.95 * lock.opacity;
    }
    if (outerMat.current) outerMat.current.opacity = 0.35 * lock.opacity;
  });
  return (
    <group ref={groupRef} visible={false}>
      <Billboard>
        <group ref={dashRef}>
          {Array.from({ length: RETICLE_SEGMENTS }).map((_, i) => (
            <mesh key={i} renderOrder={5}>
              <ringGeometry args={[0.9, 1, 12, 1, (i / RETICLE_SEGMENTS) * Math.PI * 2, RETICLE_ARC]} />
              <meshBasicMaterial ref={el => { dashMats.current[i] = el; }} color="#22d3ee" transparent opacity={0.95} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
        <mesh renderOrder={5}>
          <ringGeometry args={[1.18, 1.24, 48]} />
          <meshBasicMaterial ref={outerMat} color="#22d3ee" transparent opacity={0.35} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
        </mesh>
        {/* Corner brackets at the diagonals — the "lock acquired" shape. */}
        {Array.from({ length: RETICLE_BRACKETS }).map((_, i) => (
          <mesh key={`bracket-${i}`} renderOrder={6}>
            <ringGeometry args={[1.16, 1.30, 10, 1, Math.PI / 4 + i * (Math.PI / 2) - RETICLE_BRACKET_ARC / 2, RETICLE_BRACKET_ARC]} />
            <meshBasicMaterial ref={el => { bracketMats.current[i] = el; }} color="#67e8f9" transparent opacity={0.95} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
          </mesh>
        ))}
      </Billboard>
    </group>
  );
}

