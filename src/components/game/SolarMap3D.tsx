'use client';

// ─── SolarMap3D (4X wave W7 — the WebGL solar map) ──────────────────────────
// R3F scene that replaces SolarSystemCanvas as the DEFAULT desktop renderer
// inside MapCommandCenter. Physically-truthful presentation: real orbital
// elements, log-scaled distances and periods (see orbital-elements.ts),
// NASA-derived equirectangular textures under /textures/.
//
// Interaction parity with the 2D canvas (which REMAINS the fallback for
// mobile / reduced-motion / no-WebGL / user preference):
//   - click a body or orbital pip → same selectLocation flow → MapContextPanel
//   - controlled selection via selectedLocationId (Order Queue HUD, close btn)
//   - keyboard-accessible Location List overlay (same grouping, same buttons)
//   - lanes / ships / world layer toggles, building + NPC + world badges
//   - ship transit arcs interpolated from real departure/arrival times
//   - hazard rings for recent hazards (<60 s)
//
// 4X wave W9 (overlay deepening — read-only state consumption):
//   - ETA countdown labels on in-transit ships (canvas-sprite, 1 Hz refresh)
//   - hazard FORECAST telegraphs (state.hazardWarnings): slow-pulse amber
//     ring + ⚠ glyph, visually distinct from the expanding active-hazard
//     rings; detail lives in MapContextPanel's existing warning chips
//   - zone standing tint (state.zoneStandings): governor gold / stakeholder
//     cyan glow behind every location in the zone, PLUS a ♛/◆ text glyph in
//     the label so standing is never conveyed by color alone
//   - science-mission presence: 🔬 instrument glyph on program target bodies
//
// Performance: single instanced mesh for the belt, sprite labels (no DOM, no
// font network fetch), frameloop paused when the tab/page is hidden, DPR
// capped at 2. Text labels are canvas sprites with sizeAttenuation:false so
// they stay readable at Pluto range without DOM overlays.

import { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect, lazy, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Billboard } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { GameState } from '@/lib/game/types';
import { LANES } from '@/lib/game/spatial-strategy';
import { SHIP_MAP } from '@/lib/game/ships';
import { formatCountdown } from '@/lib/game/formulas';
import { ZONE_MAP } from '@/lib/game/zone-influence';
import { getActiveScienceMissions, SCIENCE_PROGRAM_MAP } from '@/lib/game/science-missions';
import { playSound } from '@/lib/game/sound-engine';
import { useWorldState } from '@/hooks/useWorldState';
import { onMapPing, getPingVisual, PING_COLOR, type MapPingEvent } from '@/lib/game/map-ping';
import { EFFECT_ASSETS, SKYBOX_ASSETS } from '@/lib/game/assets';
import { computeModeVisuals, type MapMode, type ModeVisual } from '@/lib/game/map-modes';
// Wave A2 (map as command theater) — zoom tiers, body presentation data and
// orbital-slot ring math, shared verbatim with the 2D canvas (map-modes.ts
// precedent: one derivation, two renderers, never disagreeing).
import {
  zoomTierFromCameraDistance,
  isMajorLocation,
  nameVisibleAt,
  lensVisibleAt,
  detailVisibleAt,
  reticleLockState,
  MAP_ZOOM_TIER_LABEL,
  type MapZoomTier,
} from '@/lib/game/map-zoom';
import { getAtmosphere, computeSlotRings, SLOT_SEGMENT_STYLE, type SlotRingModel } from '@/lib/game/map-bodies';
import { REGION_LABELS, LOCATIONS_BY_REGION } from './SolarSystemCanvas';
import {
  ORBITAL_BODIES,
  ORBITAL_PIPS,
  computeScenePositions,
  sceneBodyRadius,
  sceneOrbitRadius,
  SUN_VISUAL_RADIUS,
  BELT_SCENE_RADIUS,
  type OrbitalBody,
  type OrbitalPip,
  type ScenePositions,
} from '@/lib/game/orbital-elements';

// Role → color, mirrored from the 2D canvas so ships read identically.
const SHIP_COLOR: Record<string, string> = {
  transport: '#22d3ee',
  tanker: '#60a5fa',
  mining: '#fbbf24',
  survey: '#c084fc',
};

type PositionsRef = React.MutableRefObject<ScenePositions>;

interface SolarMap3DProps {
  state: GameState;
  /** Wave A2: an optional `anchor` (container-relative px) accompanies scene
   *  clicks / context requests so the shell can open the radial command menu
   *  AT the body. Omitted = open the full context panel (keyboard path). */
  onSelectLocation?: (locId: string | null, anchor?: { x: number; y: number }) => void;
  selectedLocationId?: string | null;
  /** Wave A2 — force every label/badge at every zoom (accessibility override
   *  for the zoom-based information layering). */
  alwaysLabels?: boolean;
  /** Wave A2 — report the live zoom tier to the shell HUD. */
  onZoomTierChange?: (tier: MapZoomTier) => void;
  /** Freeze rendering entirely (page hidden / map covered by the desktop
   *  panels-as-overlays stage — Wave V4). frameloop drops to 'never'; the
   *  retained framebuffer is the only cost. */
  active?: boolean;
  /** Wave V4 — active map lens. Derived by the SAME map-modes.ts functions
   *  the 2D canvas uses (parity requirement). */
  mapMode?: MapMode;
}

// Wave V4 feature flag — flip false if the bloom pass ever busts the perf
// budget on min-spec desktops (spec: "feature-flag/off if perf budget
// exceeded"). The pass itself is a lazy chunk (SolarMapBloom.tsx) that only
// downloads when every gate passes, so mobile never fetches it.
const BLOOM_FEATURE_ENABLED = true;
const MAP_FX_KEY = 'tycoon-map-fx'; // '1' | '0' — user quality toggle

const SolarMapBloom = lazy(() => import('./SolarMapBloom'));

// ── Wave V4: nebula skybox (V6 asset, previously unused) ────────────────────
// Equirect background at deliberately low intensity — the NASA body textures
// stay the visual focus (spec's brightness bound). Loads non-suspending; the
// existing CSS gradient remains the fallback until (or if never) loaded.

function NebulaSkybox() {
  const scene = useThree(s => s.scene);
  const tex = useSafeTexture(SKYBOX_ASSETS.nebulaEquirect);
  useEffect(() => {
    if (!tex) return;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const prevBg = scene.background;
    const prevIntensity = scene.backgroundIntensity;
    scene.background = tex;
    scene.backgroundIntensity = 0.18;
    return () => {
      scene.background = prevBg;
      scene.backgroundIntensity = prevIntensity;
    };
  }, [tex, scene]);
  return null;
}

// ── Texture + label helpers ──────────────────────────────────────────────────

/** Non-suspending texture loader — resolves to null until loaded, and stays
 *  null on failure so a missing file degrades to the body's solid color
 *  instead of breaking the scene. */
function useSafeTexture(url?: string): THREE.Texture | null {
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

interface BadgeCounts { buildings: number; npc: number; world: number }

/** W9: zone standing per location — never conveyed by color alone (text
 *  glyph ♛/◆ rides in the label; the tint sprite is reinforcement only). */
type ZoneStandingKind = 'governor' | 'stakeholder' | null;

/** Wave V4 — mode-lens annotation baked into the label texture: a text glyph
 *  after the name plus an optional second text row (never color alone). */
interface ModeLabel { glyph: string; badge: string | null; color: string }

/** Draw a name + badge row into a canvas and return a sprite texture. Labels
 *  are self-contained (no font fetch, no DOM) and match the 2D map's badge
 *  colors: cyan = your buildings, red = NPC presence, purple = other corps.
 *  W9: an optional standing glyph (♛ governor gold / ◆ stakeholder cyan)
 *  prefixes the name. V4: an optional mode glyph suffixes it, and a mode
 *  badge text row renders under the count badges. */
function makeLabelTexture(name: string, unlocked: boolean, badges: BadgeCounts, standing: ZoneStandingKind = null, mode: ModeLabel | null = null): { tex: THREE.CanvasTexture; aspect: number } {
  const scale = 2; // supersample for crispness
  const font = `600 ${13 * scale}px Inter, system-ui, sans-serif`;
  const badgeFont = `700 ${11 * scale}px Inter, system-ui, sans-serif`;
  const modeFont = `600 ${11 * scale}px Inter, system-ui, sans-serif`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  const glyph = standing === 'governor' ? '♛ ' : standing === 'stakeholder' ? '◆ ' : '';
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

type TierRef = React.MutableRefObject<MapZoomTier>;

function ZoomTierTracker({ tierRef, onChange }: { tierRef: TierRef; onChange?: (t: MapZoomTier) => void }) {
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
function LabelSprite({ name, unlocked, badges, yOffset, standing = null, mode = null, tierRef, locationId, alwaysLabels = false }: {
  name: string; unlocked: boolean; badges: BadgeCounts; yOffset: number; standing?: ZoneStandingKind;
  mode?: ModeVisual | null; tierRef?: TierRef; locationId?: string; alwaysLabels?: boolean;
}) {
  const modeLabel: ModeLabel | null = mode ? { glyph: mode.glyph, badge: mode.badge, color: mode.tint } : null;
  const isMajor = locationId ? isMajorLocation(locationId) : true;
  const hasHoldings = badges.buildings > 0;

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

  const refs = useRef<Partial<Record<MapZoomTier, THREE.Sprite | null>>>({});
  useFrame(() => {
    const tier = tierRef?.current ?? 'detail';
    const showName = nameVisibleAt(tier, isMajor, hasHoldings, alwaysLabels);
    const showDetail = detailVisibleAt(tier, alwaysLabels);
    const showLens = lensVisibleAt(tier, alwaysLabels);
    const pick: MapZoomTier = showDetail ? 'detail' : showLens ? 'location' : 'system';
    const d = refs.current.detail;
    const l = refs.current.location;
    const s = refs.current.system;
    if (d) d.visible = showName && pick === 'detail';
    if (l) l.visible = showName && pick === 'location';
    if (s) s.visible = showName && pick === 'system';
  });

  const tiers: MapZoomTier[] = ['detail', 'location', 'system'];
  return (
    <group>
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

/** Small self-contained glyph sprite texture (⚠ forecast, 🔬 science). Same
 *  no-DOM/no-font-fetch approach as makeLabelTexture. */
function makeGlyphTexture(text: string, color: string): { tex: THREE.CanvasTexture; aspect: number } {
  const scale = 2;
  const font = `700 ${14 * scale}px Inter, system-ui, sans-serif`;
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

// ── Scene rig — owns scene time and the per-frame position table ─────────────

function SceneClock({ posRef, reduced }: { posRef: PositionsRef; reduced: boolean }) {
  const tRef = useRef(0);
  useFrame((_, delta) => {
    if (!reduced) tRef.current += Math.min(delta, 0.1);
    posRef.current = computeScenePositions(tRef.current);
  });
  return null;
}

// ── Sun ──────────────────────────────────────────────────────────────────────

function Sun({ reduced }: { reduced: boolean }) {
  const tex = useSafeTexture('/textures/sun.webp');
  const meshRef = useRef<THREE.Mesh>(null);
  const glowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(254,240,138,0.9)');
    g.addColorStop(0.3, 'rgba(251,191,36,0.45)');
    g.addColorStop(0.65, 'rgba(245,158,11,0.12)');
    g.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => glowTex.dispose(), [glowTex]);
  useFrame((_, delta) => {
    if (!reduced && meshRef.current) meshRef.current.rotation.y += delta * 0.02;
  });
  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS, 48, 48]} />
        <meshBasicMaterial map={tex ?? undefined} color={tex ? '#ffffff' : '#fde047'} toneMapped={false} />
      </mesh>
      <sprite scale={[SUN_VISUAL_RADIUS * 6, SUN_VISUAL_RADIUS * 6, 1]} renderOrder={-1}>
        <spriteMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <pointLight position={[0, 0, 0]} intensity={2.4} distance={0} decay={0} color="#fff7e0" />
    </group>
  );
}

// ── Orbit guide rings ────────────────────────────────────────────────────────

function OrbitRing({ aAU, inclinationDeg }: { aAU: number; inclinationDeg: number }) {
  const geo = useMemo(() => {
    const R = sceneOrbitRadius(aAU);
    const incl = (inclinationDeg * Math.PI) / 180;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const th = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(R * Math.cos(th), R * Math.sin(th) * Math.sin(incl), R * Math.sin(th) * Math.cos(incl)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [aAU, inclinationDeg]);
  const line = useMemo(
    () => new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.16 })),
    [geo],
  );
  useEffect(() => () => { geo.dispose(); (line.material as THREE.Material).dispose(); }, [geo, line]);
  return <primitive object={line} />;
}

// ── Saturn ring with radial UV remap (the alpha texture is a radial strip) ──

function PlanetRing({ texUrl, innerScale, outerScale, bodyR }: { texUrl: string; innerScale: number; outerScale: number; bodyR: number }) {
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

// ── Celestial body ───────────────────────────────────────────────────────────

interface BodyMeshProps {
  def: OrbitalBody;
  posRef: PositionsRef;
  reduced: boolean;
  unlocked: boolean;
  badges: BadgeCounts;
  standing: ZoneStandingKind;
  mode: ModeVisual | null;
  tierRef: TierRef;
  alwaysLabels: boolean;
  onPick: (locId: string, anchor?: { x: number; y: number }) => void;
}

function BodyMesh({ def, posRef, reduced, unlocked, badges, standing, mode, tierRef, alwaysLabels, onPick }: BodyMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const tex = useSafeTexture(def.texture);
  const clouds = useSafeTexture(def.cloudsTexture);
  const night = useSafeTexture(def.nightTexture);
  const r = sceneBodyRadius(def.radiusKm);
  const seg = r > 0.8 ? 48 : 28;

  useFrame((_, delta) => {
    const p = posRef.current.bodies[def.id];
    if (p && groupRef.current) groupRef.current.position.set(p[0], p[1], p[2]);
    if (!reduced) {
      if (meshRef.current) meshRef.current.rotation.y += delta * 0.06;
      if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.085;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // was a drag, not a click
    if (def.locationId) onPick(def.locationId, { x: e.clientX, y: e.clientY });
  }, [def.locationId, onPick]);

  const setCursor = useCallback((on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = on && def.locationId ? 'pointer' : 'auto';
  }, [def.locationId]);

  // Wave A2 (item 3) — atmospheric shell, data-driven from ATMOSPHERES
  // (map-bodies.ts) instead of the previous hardcoded three-body check. The
  // BackSide sphere reads as a rim glow against the lit limb; the terminator
  // itself is real (a single point light at the Sun).
  const atmo = getAtmosphere(def.locationId);

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} onClick={handleClick} onPointerOver={setCursor(true)} onPointerOut={setCursor(false)}>
        <sphereGeometry args={[r, seg, seg]} />
        <meshStandardMaterial
          map={tex ?? undefined}
          color={tex ? (unlocked ? '#ffffff' : '#8a8f98') : (unlocked ? def.color : '#334155')}
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
      {/* Atmosphere shell (BackSide trick from the site's PlanetarySphere),
          sized + tinted from the shared ATMOSPHERES table. */}
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
      {def.ring && <PlanetRing texUrl={def.ring.texture} innerScale={def.ring.innerScale} outerScale={def.ring.outerScale} bodyR={r} />}
      {def.locationId && <LabelSprite name={def.name} unlocked={unlocked} badges={badges} standing={standing} mode={mode} tierRef={tierRef} locationId={def.locationId} alwaysLabels={alwaysLabels} yOffset={-(r + 0.45)} />}
    </group>
  );
}

// ── Orbital pips (LEO / GEO / belt ops / deep-space relay …) ────────────────

function PipMesh({ pip, posRef, unlocked, badges, standing, mode, tierRef, alwaysLabels, onPick }: {
  pip: OrbitalPip; posRef: PositionsRef; unlocked: boolean; badges: BadgeCounts; standing: ZoneStandingKind;
  mode: ModeVisual | null; tierRef: TierRef; alwaysLabels: boolean;
  onPick: (locId: string, anchor?: { x: number; y: number }) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = posRef.current.anchors[pip.locationId];
    if (a && groupRef.current) groupRef.current.position.set(a.pos[0], a.pos[1], a.pos[2]);
  });
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    onPick(pip.locationId, { x: e.clientX, y: e.clientY });
  }, [pip.locationId, onPick]);
  const setCursor = useCallback((on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = on ? 'pointer' : 'auto';
  }, []);
  return (
    <group ref={groupRef}>
      <mesh onClick={handleClick} onPointerOver={setCursor(true)} onPointerOut={setCursor(false)}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color={unlocked ? pip.color : '#475569'} />
      </mesh>
      {/* Generous invisible hit target for touch/pointer. Radius 0.3, NOT
          bigger: the tightest pip pair (LEO at 1.5× and GEO at 2.0× Earth's
          0.66 visual radius) can close to ~0.33 scene units, so any radius
          below that guarantees one pip's sphere never swallows its
          neighbour's centre — the old 0.5 sphere could steal clicks aimed
          dead-centre at the adjacent pip. */}
      <mesh onClick={handleClick} visible={false}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
      <LabelSprite name={pip.label} unlocked={unlocked} badges={badges} standing={standing} mode={mode} tierRef={tierRef} locationId={pip.locationId} alwaysLabels={alwaysLabels} yOffset={-0.5} />
    </group>
  );
}

// ── Asteroid belt (single instanced draw call) ───────────────────────────────

function BeltRocks({ reduced }: { reduced: boolean }) {
  const COUNT = 550;
  const instRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const mesh = instRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    // mulberry32-style deterministic scatter
    let s = 20260813;
    const rand = () => {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < COUNT; i++) {
      const th = rand() * Math.PI * 2;
      const R = BELT_SCENE_RADIUS + (rand() - 0.5) * 3.4;
      const y = (rand() - 0.5) * 1.1;
      e.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      q.setFromEuler(e);
      const sc = 0.035 + rand() * 0.1;
      m.compose(new THREE.Vector3(R * Math.cos(th), y, R * Math.sin(th)), q, new THREE.Vector3(sc, sc, sc));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame((_, delta) => {
    if (!reduced && groupRef.current) groupRef.current.rotation.y += delta * 0.0042;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={instRef} args={[undefined, undefined, COUNT]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#78716c" roughness={1} />
      </instancedMesh>
    </group>
  );
}

// ── Shipping lanes ───────────────────────────────────────────────────────────

function LaneLines({ posRef, state, reduced }: { posRef: PositionsRef; state: GameState; reduced: boolean }) {
  // One 2-point line per lane + one traffic pulse per active lane.
  const pulsesRef = useRef<(THREE.Mesh | null)[]>([]);
  const unlockedSet = useMemo(() => new Set(state.unlockedLocations), [state.unlockedLocations]);
  const lanes = useMemo(
    () => LANES.map(lane => ({ lane, active: unlockedSet.has(lane.from) && unlockedSet.has(lane.to) })),
    [unlockedSet],
  );
  const laneObjs = useMemo(() =>
    lanes.map(({ active }) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: active ? '#22d3ee' : '#64748b',
        transparent: true,
        opacity: active ? 0.18 : 0.06,
      });
      return new THREE.Line(geo, mat);
    }),
  [lanes]);
  useEffect(() => () => { laneObjs.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); }); }, [laneObjs]);

  useFrame(({ clock }) => {
    const anchors = posRef.current.anchors;
    lanes.forEach(({ lane, active }, i) => {
      const line = laneObjs[i];
      const from = anchors[lane.from];
      const to = anchors[lane.to];
      if (!from || !to) { line.visible = false; return; }
      line.visible = true;
      const attr = line.geometry.attributes.position as THREE.BufferAttribute;
      attr.setXYZ(0, from.pos[0], from.pos[1], from.pos[2]);
      attr.setXYZ(1, to.pos[0], to.pos[1], to.pos[2]);
      attr.needsUpdate = true;
      // pulse dots — one per active lane (3 in the 2D map; 1 keeps draw calls low)
      const pulse = pulsesRef.current[i];
      if (pulse) {
        if (!active) { pulse.visible = false; return; }
        pulse.visible = true;
        const seed = (lane.from.charCodeAt(0) + lane.to.charCodeAt(0)) * 0.13;
        const t = reduced ? 0.5 : ((clock.elapsedTime * 0.25 + seed) % 1 + 1) % 1;
        pulse.position.set(
          from.pos[0] + (to.pos[0] - from.pos[0]) * t,
          from.pos[1] + (to.pos[1] - from.pos[1]) * t,
          from.pos[2] + (to.pos[2] - from.pos[2]) * t,
        );
        const fade = Math.sin(t * Math.PI);
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0.55 * fade;
      }
    });
  });

  return (
    <group>
      {laneObjs.map((obj, i) => (
        <primitive key={lanes[i].lane.id} object={obj} />
      ))}
      {lanes.map(({ lane }, i) => (
        <mesh key={`pulse-${lane.id}`} ref={el => { pulsesRef.current[i] = el; }} visible={false}>
          <sphereGeometry args={[0.09, 6, 6]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── Ships ────────────────────────────────────────────────────────────────────

type ShipInstanceLike = NonNullable<GameState['ships']>[number];

// Fixed ETA-label canvas geometry — one size for every transit ship so the
// texture is allocated once per ship and only repainted (1 Hz), never resized.
const ETA_CANVAS_W = 200;
const ETA_CANVAS_H = 44;

// Wave V7 — engine trail: fixed-count sprite ribbon trailing every in-transit
// ship (EFFECT_ASSETS.engineTrail, previously unused in the scene — the
// audit's headline orphaned-asset finding). Sampled directly from the same
// bezier the marker uses (no per-frame history buffer — bounded allocation,
// fixed lifetime by construction).
const ENGINE_TRAIL_COUNT = 6;
const ENGINE_TRAIL_SPACING = 0.014;

/** In-transit ship: curved arc + oriented marker, interpolated from the REAL
 *  departure/arrival timestamps — functional motion, identical to the 2D map.
 *  W9: an arrival-countdown sprite follows the marker (screen-constant size,
 *  repainted once per second outside the frame loop). V7: an engine-trail
 *  sprite ribbon (off under reduced motion — purely decorative). */
function TransitShip({ ship, posRef, reduced }: { ship: ShipInstanceLike; posRef: PositionsRef; reduced: boolean }) {
  const markerRef = useRef<THREE.Mesh>(null);
  const etaSpriteRef = useRef<THREE.Sprite>(null);
  const trailRefs = useRef<(THREE.Sprite | null)[]>(Array(ENGINE_TRAIL_COUNT).fill(null));
  const engineTrailTex = useSafeTexture(EFFECT_ASSETS.engineTrail);
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(33 * 3), 3));
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.3 }));
  }, []);
  useEffect(() => () => { lineObj.geometry.dispose(); (lineObj.material as THREE.Material).dispose(); }, [lineObj]);
  const def = SHIP_MAP.get(ship.definitionId);
  const color = def ? SHIP_COLOR[def.role] || '#22d3ee' : '#22d3ee';

  // ETA countdown texture — persistent canvas repainted at 1 Hz (no per-frame
  // allocation; the frame loop only moves the sprite).
  const etaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const etaTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = ETA_CANVAS_W;
    c.height = ETA_CANVAS_H;
    etaCanvasRef.current = c;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => etaTex.dispose(), [etaTex]);
  const [etaText, setEtaText] = useState('');
  const arrivalAtMs = ship.route?.arrivalAtMs;
  useEffect(() => {
    if (!arrivalAtMs) { setEtaText(''); return; }
    const compute = () => setEtaText(`ETA ${formatCountdown(Math.max(0, (arrivalAtMs - Date.now()) / 1000))}`);
    compute();
    const iv = setInterval(compute, 1000);
    return () => clearInterval(iv);
  }, [arrivalAtMs]);
  useEffect(() => {
    const c = etaCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (etaText) {
      ctx.font = '600 22px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#67e8f9';
      ctx.fillText(etaText, c.width / 2, c.height / 2);
    }
    etaTex.needsUpdate = true;
  }, [etaText, etaTex]);

  useFrame(() => {
    const route = ship.route;
    if (!route) return;
    const anchors = posRef.current.anchors;
    const from = anchors[route.from];
    const to = anchors[route.to];
    const marker = markerRef.current;
    const etaLabel = etaSpriteRef.current;
    if (!from || !to || !marker) {
      if (marker) marker.visible = false;
      if (etaLabel) etaLabel.visible = false;
      lineObj.visible = false;
      return;
    }
    marker.visible = true;
    lineObj.visible = true;
    const f = new THREE.Vector3(...from.pos);
    const t3 = new THREE.Vector3(...to.pos);
    const mid = f.clone().add(t3).multiplyScalar(0.5);
    const chord = t3.clone().sub(f);
    const len = chord.length();
    // lift the control point up + sideways so arcs don't hug the ecliptic
    const perp = new THREE.Vector3().crossVectors(chord, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(Math.min(2.2, len * 0.12));
    const ctrl = mid.add(perp).add(new THREE.Vector3(0, Math.min(2.5, 0.8 + len * 0.08), 0));
    const total = Math.max(1, route.arrivalAtMs - route.departedAtMs);
    const prog = Math.max(0, Math.min(1, (Date.now() - route.departedAtMs) / total));
    // update the trail (departure → current position)
    const attr = lineObj.geometry.attributes.position as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    for (let i = 0; i <= 32; i++) {
      const u = (i / 32) * prog;
      tmp.set(0, 0, 0)
        .addScaledVector(f, (1 - u) * (1 - u))
        .addScaledVector(ctrl, 2 * (1 - u) * u)
        .addScaledVector(t3, u * u);
      attr.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    attr.needsUpdate = true;
    lineObj.geometry.computeBoundingSphere();
    // marker position + heading
    const pos = new THREE.Vector3()
      .addScaledVector(f, (1 - prog) * (1 - prog))
      .addScaledVector(ctrl, 2 * (1 - prog) * prog)
      .addScaledVector(t3, prog * prog);
    const tangent = new THREE.Vector3()
      .addScaledVector(ctrl.clone().sub(f), 2 * (1 - prog))
      .addScaledVector(t3.clone().sub(ctrl), 2 * prog)
      .normalize();
    marker.position.copy(pos);
    marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    if (etaLabel) {
      etaLabel.visible = true;
      etaLabel.position.set(pos.x, pos.y + 0.55, pos.z);
    }
    // V7: engine trail — 6 sprites sampled behind the marker along the same
    // bezier, fading in opacity/scale. Off under reduced motion.
    for (let k = 0; k < ENGINE_TRAIL_COUNT; k++) {
      const spr = trailRefs.current[k];
      if (!spr) continue;
      if (reduced) { spr.visible = false; continue; }
      const u = prog - (k + 1) * ENGINE_TRAIL_SPACING;
      if (u <= 0) { spr.visible = false; continue; }
      spr.visible = true;
      const tp = new THREE.Vector3()
        .addScaledVector(f, (1 - u) * (1 - u))
        .addScaledVector(ctrl, 2 * (1 - u) * u)
        .addScaledVector(t3, u * u);
      spr.position.copy(tp);
      const fade = 1 - (k + 1) / (ENGINE_TRAIL_COUNT + 1);
      (spr.material as THREE.SpriteMaterial).opacity = fade * 0.55;
      const s = 0.16 * fade + 0.05;
      spr.scale.set(s, s, 1);
    }
  });

  return (
    <group>
      <primitive object={lineObj} />
      <mesh ref={markerRef}>
        <coneGeometry args={[0.12, 0.34, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <sprite ref={etaSpriteRef} visible={false} scale={[0.05 * (ETA_CANVAS_W / ETA_CANVAS_H), 0.05, 1]} renderOrder={11}>
        <spriteMaterial map={etaTex} sizeAttenuation={false} transparent depthTest={false} />
      </sprite>
      {Array.from({ length: ENGINE_TRAIL_COUNT }).map((_, k) => (
        <sprite
          key={k}
          ref={el => { trailRefs.current[k] = el; }}
          visible={false}
          renderOrder={9}
        >
          <spriteMaterial map={engineTrailTex ?? undefined} color={color} transparent depthTest={false} opacity={0} />
        </sprite>
      ))}
    </group>
  );
}

/** Stationary ship — small dot orbiting its current location (2D parity). */
function StationShip({ ship, posRef, reduced }: { ship: ShipInstanceLike; posRef: PositionsRef; reduced: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const def = SHIP_MAP.get(ship.definitionId);
  const color = def ? SHIP_COLOR[def.role] || '#22d3ee' : '#22d3ee';
  const seed = ship.instanceId.charCodeAt(0) * 0.1 + (ship.instanceId.charCodeAt(1) || 0) * 0.05;
  useFrame(({ clock }) => {
    const a = posRef.current.anchors[ship.currentLocation];
    const mesh = meshRef.current;
    if (!a || !mesh) { if (mesh) mesh.visible = false; return; }
    mesh.visible = true;
    const angle = reduced ? seed : clock.elapsedTime * 0.5 + seed;
    const orbitR = a.r + 0.32;
    mesh.position.set(a.pos[0] + Math.cos(angle) * orbitR, a.pos[1] + 0.12, a.pos[2] + Math.sin(angle) * orbitR);
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// ── Hazard rings (recent hazards <60 s, expanding + fading — 2D parity) ─────

function HazardRings({ posRef, state }: { posRef: PositionsRef; state: GameState }) {
  const [, force] = useState(0);
  const recent = (state.recentHazards || []).filter(h => Date.now() - h.occurredAtMs < 60_000);
  // prune finished rings once a second without re-rendering every frame
  useEffect(() => {
    if (recent.length === 0) return;
    const iv = setInterval(() => force(n => n + 1), 5_000);
    return () => clearInterval(iv);
  }, [recent.length]);
  return (
    <group>
      {recent.map(h => <HazardRing key={h.id} hazard={h} posRef={posRef} />)}
    </group>
  );
}

function HazardRing({ hazard, posRef }: { hazard: NonNullable<GameState['recentHazards']>[number]; posRef: PositionsRef }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const a = posRef.current.anchors[hazard.locationId];
    const g = groupRef.current;
    if (!a || !g) { if (g) g.visible = false; return; }
    const age = (Date.now() - hazard.occurredAtMs) / 60_000; // 0..1
    if (age >= 1) { g.visible = false; return; }
    g.visible = true;
    g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    const s = a.r + 0.4 + age * 2.6;
    g.scale.set(s, s, s);
    if (matRef.current) matRef.current.opacity = 1 - age;
  });
  return (
    <group ref={groupRef}>
      <Billboard>
        <mesh>
          <ringGeometry args={[0.92, 1, 48]} />
          <meshBasicMaterial ref={matRef} color={hazard.destroyed ? '#ef4444' : '#fbbf24'} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

// ── Wave V7: order-ack / completion map pings ────────────────────────────────
// Same event bus as the 2D canvas (lib/game/map-ping.ts) — only location-
// targeted pings render here (system-targeted pings belong to
// GalacticMapView). Managed as React state (not a ref-only loop like the
// ships above) because pings are rare, bursty events, not per-frame data;
// pruning runs on a slow interval, same precedent as HazardRings above.

function MapPings3D({ posRef, reduced }: { posRef: PositionsRef; reduced: boolean }) {
  const [pings, setPings] = useState<MapPingEvent[]>([]);
  useEffect(() => onMapPing(ping => {
    if (ping.target.kind !== 'location') return;
    setPings(prev => [...prev, ping]);
  }), []);
  useEffect(() => {
    if (pings.length === 0) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setPings(prev => prev.filter(p => getPingVisual(p, now, reduced) !== null));
    }, 250);
    return () => clearInterval(iv);
  }, [pings.length, reduced]);
  return (
    <group>
      {pings.map(p => <MapPingRing key={p.id} ping={p} posRef={posRef} reduced={reduced} />)}
    </group>
  );
}

function MapPingRing({ ping, posRef, reduced }: { ping: MapPingEvent; posRef: PositionsRef; reduced: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const a = posRef.current.anchors[ping.target.id];
    const g = groupRef.current;
    if (!a || !g) { if (g) g.visible = false; return; }
    const visual = getPingVisual(ping, Date.now(), reduced);
    if (!visual) { g.visible = false; return; }
    g.visible = true;
    g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    const s = a.r + 0.35 + visual.radiusProgress * 1.6;
    g.scale.set(s, s, s);
    if (matRef.current) matRef.current.opacity = visual.alpha;
  });
  return (
    <group ref={groupRef}>
      <Billboard>
        <mesh>
          <ringGeometry args={[0.9, 1, 40]} />
          <meshBasicMaterial ref={matRef} color={PING_COLOR[ping.kind]} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

// ── Hazard FORECAST telegraphs (W9) — state.hazardWarnings ──────────────────
// Visually distinct from active-hazard rings: those expand outward and fade
// over 60 s; forecasts hold a constant radius and slow-pulse amber (static
// under reduced motion). Selecting the location shows the full warning text
// in MapContextPanel's existing forecast chips.

function ForecastMarkers({ posRef, state, reduced }: { posRef: PositionsRef; state: GameState; reduced: boolean }) {
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of state.hazardWarnings || []) map.set(w.locationId, (map.get(w.locationId) || 0) + 1);
    return Array.from(map.entries());
  }, [state.hazardWarnings]);
  return (
    <group>
      {grouped.map(([locId, count]) => (
        <ForecastRing key={locId} locId={locId} count={count} posRef={posRef} reduced={reduced} />
      ))}
    </group>
  );
}

function ForecastRing({ locId, count, posRef, reduced }: { locId: string; count: number; posRef: PositionsRef; reduced: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const glyphRef = useRef<THREE.Sprite>(null);
  const glyph = useMemo(() => makeGlyphTexture(count > 1 ? `⚠︎×${count}` : '⚠︎', '#fbbf24'), [count]);
  useEffect(() => () => glyph.tex.dispose(), [glyph]);
  useFrame(({ clock }) => {
    const a = posRef.current.anchors[locId];
    const g = groupRef.current;
    const gs = glyphRef.current;
    if (!a || !g) {
      if (g) g.visible = false;
      if (gs) gs.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    const wave = reduced ? 0.5 : Math.sin(clock.elapsedTime * 1.8) * 0.5 + 0.5;
    const s = (a.r + 0.55) * (reduced ? 1 : 1 + (wave - 0.5) * 0.14);
    g.scale.set(s, s, s);
    if (matRef.current) matRef.current.opacity = 0.3 + wave * 0.3;
    if (gs) {
      gs.visible = true;
      gs.position.set(a.pos[0], a.pos[1] + a.r + 0.75, a.pos[2]);
    }
  });
  return (
    <group>
      <group ref={groupRef} visible={false}>
        <Billboard>
          <mesh renderOrder={4}>
            <ringGeometry args={[0.86, 0.94, 48]} />
            <meshBasicMaterial ref={matRef} color="#fbbf24" transparent opacity={0.45} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
          </mesh>
        </Billboard>
      </group>
      <sprite ref={glyphRef} visible={false} scale={[0.038 * glyph.aspect, 0.038, 1]} renderOrder={11}>
        <spriteMaterial map={glyph.tex} sizeAttenuation={false} transparent depthTest={false} />
      </sprite>
    </group>
  );
}

// ── Zone standing tint (W9) — state.zoneStandings ───────────────────────────
// Soft glow behind every location of a zone the player holds standing in:
// governor gold, stakeholder cyan. Reinforcement only — the ♛/◆ text glyph
// in the location label carries the information (no color-only state).

function makeTintTexture(rgb: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${rgb},0.55)`);
  g.addColorStop(0.5, `rgba(${rgb},0.18)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ZoneTints({ posRef, tinted }: { posRef: PositionsRef; tinted: { locId: string; kind: 'governor' | 'stakeholder' }[] }) {
  const goldTex = useMemo(() => makeTintTexture('251,191,36'), []);
  const cyanTex = useMemo(() => makeTintTexture('34,211,238'), []);
  useEffect(() => () => { goldTex.dispose(); cyanTex.dispose(); }, [goldTex, cyanTex]);
  const spritesRef = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(() => {
    const anchors = posRef.current.anchors;
    for (let i = 0; i < tinted.length; i++) {
      const sp = spritesRef.current[i];
      if (!sp) continue;
      const a = anchors[tinted[i].locId];
      if (!a) { sp.visible = false; continue; }
      sp.visible = true;
      sp.position.set(a.pos[0], a.pos[1], a.pos[2]);
      const s = a.r * 2 + 2.6;
      sp.scale.set(s, s, 1);
    }
  });
  return (
    <group>
      {tinted.map((t, i) => (
        <sprite key={`${t.locId}-${t.kind}`} ref={el => { spritesRef.current[i] = el; }} visible={false} renderOrder={-2}>
          <spriteMaterial
            map={t.kind === 'governor' ? goldTex : cyanTex}
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

// ── Wave V4: mode-lens tints — computeModeVisuals output as glow sprites ────
// Same radial-gradient sprite approach as ZoneTints, generalized to the mode
// palette. Reinforcement only: the label's mode glyph/badge (LabelSprite)
// carries the information in text.

function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function ModeTints({ posRef, visuals }: { posRef: PositionsRef; visuals: Record<string, ModeVisual> }) {
  const entries = useMemo(() => Object.entries(visuals), [visuals]);
  // One texture per unique tint color (modes use ≤3 colors at once).
  const texByColor = useMemo(() => {
    const map = new Map<string, THREE.CanvasTexture>();
    for (const [, v] of entries) {
      if (!map.has(v.tint)) map.set(v.tint, makeTintTexture(hexToRgbTriplet(v.tint)));
    }
    return map;
  }, [entries]);
  useEffect(() => () => { texByColor.forEach(t => t.dispose()); }, [texByColor]);
  const spritesRef = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(() => {
    const anchors = posRef.current.anchors;
    for (let i = 0; i < entries.length; i++) {
      const sp = spritesRef.current[i];
      if (!sp) continue;
      const a = anchors[entries[i][0]];
      if (!a) { sp.visible = false; continue; }
      sp.visible = true;
      sp.position.set(a.pos[0], a.pos[1], a.pos[2]);
      const s = a.r * 2 + 2.2 + entries[i][1].intensity * 1.4;
      sp.scale.set(s, s, 1);
    }
  });
  return (
    <group>
      {entries.map(([locId, v], i) => (
        <sprite key={`${locId}-${v.tint}`} ref={el => { spritesRef.current[i] = el; }} visible={false} renderOrder={-2}>
          <spriteMaterial
            map={texByColor.get(v.tint)}
            transparent
            opacity={0.2 + v.intensity * 0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

// ── Wave A2 (item 3): orbital-slot occupancy rings ──────────────────────────
// "Orbital slots are finite" is a core design pillar (CLAUDE.md §Spatial
// strategy) that until now existed only as rows in a popover table. Every
// location with an ORBITAL_SLOT_POOL now wears its occupancy: contiguous arc
// segments for yours / other corporations / free, read from the REAL
// sync-delivered snapshot (state.orbitalSlotOccupancy) via map-bodies.ts —
// the same model the 2D canvas draws, so the two can't disagree.
//
// Colour is reinforcement only. The three kinds also differ in RADIAL BAND
// THICKNESS (yours thick, rivals medium, free hairline) and the numeric
// badge sprite states the counts in text; a saturated pool adds a separate
// full hairline ring, so "you cannot build here without a lease" is a shape,
// not a hue. Geometry is static per model — the frame loop only repositions.

const SLOT_RING_BASE_INNER = 0.86;

function SlotRings({ posRef, rings, tierRef, alwaysLabels }: {
  posRef: PositionsRef; rings: SlotRingModel[]; tierRef: TierRef; alwaysLabels: boolean;
}) {
  return (
    <group>
      {rings.map(ring => (
        <SlotRing key={ring.locationId} ring={ring} posRef={posRef} tierRef={tierRef} alwaysLabels={alwaysLabels} />
      ))}
    </group>
  );
}

function SlotRing({ ring, posRef, tierRef, alwaysLabels }: {
  ring: SlotRingModel; posRef: PositionsRef; tierRef: TierRef; alwaysLabels: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const badgeRef = useRef<THREE.Sprite>(null);
  const badge = useMemo(
    () => makeGlyphTexture(ring.badge, ring.saturated ? '#fca5a5' : '#c4b5fd'),
    [ring.badge, ring.saturated],
  );
  useEffect(() => () => badge.tex.dispose(), [badge]);

  useFrame(() => {
    const a = posRef.current.anchors[ring.locationId];
    const g = groupRef.current;
    const b = badgeRef.current;
    const visible = lensVisibleAt(tierRef.current, alwaysLabels);
    if (!a || !g) {
      if (g) g.visible = false;
      if (b) b.visible = false;
      return;
    }
    g.visible = visible;
    if (visible) {
      g.position.set(a.pos[0], a.pos[1], a.pos[2]);
      const s = a.r + 0.62;
      g.scale.set(s, s, s);
    }
    if (b) {
      b.visible = visible;
      if (visible) b.position.set(a.pos[0], a.pos[1] + a.r + 1.05, a.pos[2]);
    }
  });

  return (
    <group>
      <group ref={groupRef} visible={false}>
        <Billboard>
          {ring.segments.map(seg => {
            const style = SLOT_SEGMENT_STYLE[seg.kind];
            const band = (1 - SLOT_RING_BASE_INNER) * style.weight;
            const inner = 1 - band;
            // ringGeometry sweeps counter-clockwise from +X; remap so the
            // segments run clockwise from 12 o'clock like the 2D canvas.
            const thetaLength = Math.max(0.001, (seg.endFrac - seg.startFrac) * Math.PI * 2);
            const thetaStart = Math.PI / 2 - seg.endFrac * Math.PI * 2;
            return (
              <mesh key={seg.kind} renderOrder={4}>
                <ringGeometry args={[inner, 1, 64, 1, thetaStart, thetaLength]} />
                <meshBasicMaterial
                  color={style.color}
                  transparent
                  opacity={seg.kind === 'free' ? 0.5 : 0.92}
                  side={THREE.DoubleSide}
                  depthTest={false}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
          {ring.saturated && (
            <mesh renderOrder={4}>
              <ringGeometry args={[1.06, 1.09, 64]} />
              <meshBasicMaterial color="#f87171" transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
          )}
        </Billboard>
      </group>
      <sprite ref={badgeRef} visible={false} scale={[0.036 * badge.aspect, 0.036, 1]} renderOrder={11}>
        <spriteMaterial map={badge.tex} sizeAttenuation={false} transparent depthTest={false} />
      </sprite>
    </group>
  );
}

// ── Science-mission presence (W9) — state.scienceMissions ───────────────────
// Active flagship missions put a 🔬 instrument glyph on their target body.
// Order Queue HUD rows for the same missions focus the same location, and
// MapContextPanel lists mission phase details on selection.

function ScienceMarkers({ posRef, state }: { posRef: PositionsRef; state: GameState }) {
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of getActiveScienceMissions(state)) {
      const program = SCIENCE_PROGRAM_MAP.get(m.programId);
      if (!program) continue;
      map.set(program.locationId, (map.get(program.locationId) || 0) + 1);
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scienceMissions]);
  return (
    <group>
      {grouped.map(([locId, count]) => (
        <ScienceMarker key={locId} locId={locId} count={count} posRef={posRef} />
      ))}
    </group>
  );
}

function ScienceMarker({ locId, count, posRef }: { locId: string; count: number; posRef: PositionsRef }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const glyph = useMemo(() => makeGlyphTexture(count > 1 ? `🔬×${count}` : '🔬', '#a5f3fc'), [count]);
  useEffect(() => () => glyph.tex.dispose(), [glyph]);
  useFrame(() => {
    const sp = spriteRef.current;
    if (!sp) return;
    const a = posRef.current.anchors[locId];
    if (!a) { sp.visible = false; return; }
    sp.visible = true;
    sp.position.set(a.pos[0] + a.r * 0.9 + 0.3, a.pos[1] + a.r + 0.45, a.pos[2]);
  });
  return (
    <sprite ref={spriteRef} visible={false} scale={[0.04 * glyph.aspect, 0.04, 1]} renderOrder={11}>
      <spriteMaterial map={glyph.tex} sizeAttenuation={false} transparent depthTest={false} />
    </sprite>
  );
}

// ── Selection ring ───────────────────────────────────────────────────────────

// Wave V4 — animated selection reticle: rotating dashed ring (8 arc
// segments) + steady outer ring, replacing the color-only pulse ring.
// Rotation and pulse are off under reduced motion (static reticle remains).
const RETICLE_SEGMENTS = 8;
const RETICLE_ARC = (Math.PI * 2) / RETICLE_SEGMENTS * 0.55; // 55% duty cycle

// Wave A2 (item 4) — the reticle now ACQUIRES: it converges from a wide
// radius on to the body over RETICLE_LOCK_MS, brightening as it locks, with
// four corner brackets so "locked" is a shape and not a hue. Reduced motion
// snaps straight to the locked state (reticleLockState returns it directly).
const RETICLE_BRACKETS = 4;
const RETICLE_BRACKET_ARC = 0.30;

function SelectionMarker({ posRef, selectedLocationId, reduced }: { posRef: PositionsRef; selectedLocationId: string | null; reduced: boolean }) {
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
    const a = posRef.current.anchors[selectedLocationId];
    if (!a) { g.visible = false; return; }
    g.visible = true;
    g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    const lock = reticleLockState(performance.now() - lockStartRef.current, reduced);
    const pulse = reduced || !lock.locked ? 1 : 1 + Math.sin(clock.elapsedTime * 3) * 0.08;
    const s = (a.r + 0.42) * pulse * lock.radiusScale;
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

// ── Main component ───────────────────────────────────────────────────────────

export default function SolarMap3D({ state, onSelectLocation, selectedLocationId, active = true, mapMode = 'standard', alwaysLabels = false, onZoomTierChange }: SolarMap3DProps) {
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [showLanes, setShowLanes] = useState(true);
  const [showShips, setShowShips] = useState(true);
  const [showWorld, setShowWorld] = useState(true);
  const [listExpanded, setListExpanded] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const posRef = useRef<ScenePositions>(computeScenePositions(0));
  const rootRef = useRef<HTMLDivElement>(null);
  // Wave A2 — zoom tier shared ref (ZoomTierTracker writes, LabelSprites and
  // SlotRings read). Same "one ref, no 60Hz React state" pattern as the V4
  // LOD bands it replaces.
  const tierRef = useRef<MapZoomTier>('location');
  const [zoomTier, setZoomTier] = useState<MapZoomTier>('location');
  const handleTierChange = useCallback((t: MapZoomTier) => {
    setZoomTier(t);
    onZoomTierChange?.(t);
  }, [onZoomTierChange]);

  // Defensive: MapCommandCenter already falls back to 2D under
  // prefers-reduced-motion, but honor it here too in case of direct use.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Pause rendering when the page is hidden.
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const running = active && pageVisible;

  // Wave V4 — bloom gating (spec: ON only when use3D && dpr>1 && !reduced,
  // user quality toggle in the renderer button group, lazy chunk). dprHigh
  // starts false so SSR/first paint never fetches the chunk speculatively.
  const [dprHigh, setDprHigh] = useState(false);
  useEffect(() => { setDprHigh(window.devicePixelRatio > 1); }, []);
  const [fxPref, setFxPref] = useState(true);
  useEffect(() => {
    try { setFxPref(localStorage.getItem(MAP_FX_KEY) !== '0'); } catch { /* default on */ }
  }, []);
  const toggleFx = useCallback(() => {
    playSound('click');
    setFxPref(prev => {
      const next = !prev;
      try { localStorage.setItem(MAP_FX_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Wave V4 — mode-lens derivation (pure, shared with the 2D canvas).
  const modeVisuals = useMemo(
    () => computeModeVisuals(state, mapMode, Date.now()),
    [state, mapMode],
  );

  // Never leave a pointer cursor behind when the map unmounts mid-hover.
  useEffect(() => () => { document.body.style.cursor = 'auto'; }, []);

  // External selection sync (Order Queue HUD / context-panel close) — same
  // contract as the 2D canvas.
  useEffect(() => {
    if (selectedLocationId !== undefined && selectedLocationId !== selectedLoc) {
      setSelectedLoc(selectedLocationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);

  const { world, available: worldAvailable } = useWorldState();
  const worldLayerActive = showWorld && worldAvailable;

  /** Frame a body in the viewport. The bodies near Earth sit within a few
   *  pixels of each other at the default camera distance, so picking one from
   *  the Location List has to bring the camera to it — otherwise the selection
   *  reticle lands somewhere the player isn't looking. Keeps the current
   *  viewing angle and only changes what the camera orbits and how close. */
  const focusCameraOn = useCallback((locId: string) => {
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    const anchor = posRef.current.anchors[locId];
    if (!controls || !cam || !anchor) return;

    const target = new THREE.Vector3(anchor.pos[0], anchor.pos[1], anchor.pos[2]);
    const dir = new THREE.Vector3().subVectors(cam.position, controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.6, 1); // camera sat on its target
    dir.setLength(Math.max(anchor.r * 8, 6));

    controls.target.copy(target);
    cam.position.copy(target).add(dir);
    controls.update();
  }, []);

  /**
   * @param anchor  Screen point to hang the radial command menu on.
   * @param opts.toggle  Whether re-picking the current selection clears it.
   *   Defaults to true for un-anchored picks, preserving click-again-to-
   *   deselect on the map body. The Location List passes false: a list row
   *   that silently deselects reads as "the button did nothing", which is
   *   exactly how the first-hour "claim your next orbit" step got stuck.
   * @param opts.focus  Move the camera to frame the body.
   */
  const selectLocation = useCallback((
    locId: string,
    anchor?: { x: number; y: number },
    opts?: { toggle?: boolean; focus?: boolean },
  ) => {
    playSound('click');
    // Derive from current state rather than inside the updater — the updater
    // must stay pure, and notifying the parent from inside it can double-fire
    // or be dropped entirely under StrictMode and concurrent rendering.
    const allowToggle = opts?.toggle ?? !anchor;
    const next = allowToggle && selectedLoc === locId ? null : locId;
    setSelectedLoc(next);
    onSelectLocation?.(next, next ? anchor : undefined);
    if (next && opts?.focus) focusCameraOn(next);
  }, [selectedLoc, onSelectLocation, focusCameraOn]);

  /** Scene clicks arrive in client coordinates; the radial menu is positioned
   *  inside this component's container, so translate once here. */
  const pickFromScene = useCallback((locId: string, anchor?: { x: number; y: number }) => {
    const root = rootRef.current;
    if (!anchor || !root) { selectLocation(locId, anchor); return; }
    const r = root.getBoundingClientRect();
    selectLocation(locId, { x: anchor.x - r.left, y: anchor.y - r.top });
  }, [selectLocation]);

  /** Container-relative centre of a DOM element (Location List rows opening
   *  the radial menu by keyboard / right-click). */
  const anchorForElement = useCallback((el: HTMLElement | null): { x: number; y: number } | undefined => {
    const root = rootRef.current;
    if (!el || !root) return undefined;
    const r = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    return { x: r.left + r.width / 2 - rr.left, y: r.top + r.height / 2 - rr.top };
  }, []);

  const deselect = useCallback(() => {
    setSelectedLoc(null);
    onSelectLocation?.(null);
  }, [onSelectLocation]);

  // Badge counts per location id — identical semantics to the 2D canvas.
  const badgesByLoc = useMemo(() => {
    const out: Record<string, BadgeCounts> = {};
    const get = (id: string) => (out[id] ||= { buildings: 0, npc: 0, world: 0 });
    for (const b of state.buildings) {
      if (b.isComplete) get(b.locationId).buildings++;
    }
    for (const n of state.npcCompanies || []) {
      for (const locId of n.unlockedLocations) get(locId).npc++;
    }
    if (worldLayerActive && world) {
      for (const [locId, count] of Object.entries(world.world.colonyCounts)) {
        if (count > 0) get(locId).world = count;
      }
    }
    return out;
  }, [state.buildings, state.npcCompanies, worldLayerActive, world]);

  const NO_BADGES: BadgeCounts = useMemo(() => ({ buildings: 0, npc: 0, world: 0 }), []);
  const unlockedSet = useMemo(() => new Set(state.unlockedLocations), [state.unlockedLocations]);

  // W9: zone standing per location (governor beats stakeholder when zones
  // overlap a location) — drives the label glyph, the tint layer, and the
  // keyboard Location List annotations.
  const standingByLoc = useMemo(() => {
    const out: Record<string, 'governor' | 'stakeholder'> = {};
    for (const zs of state.zoneStandings || []) {
      const kind: 'governor' | 'stakeholder' | null = zs.isGovernor ? 'governor' : zs.sharePct >= 1 ? 'stakeholder' : null;
      if (!kind) continue;
      const zone = ZONE_MAP.get(zs.zoneSlug);
      for (const locId of zone?.locations || []) {
        if (out[locId] !== 'governor') out[locId] = kind;
      }
    }
    return out;
  }, [state.zoneStandings]);
  const tintedLocations = useMemo(
    () => Object.entries(standingByLoc).map(([locId, kind]) => ({ locId, kind })),
    [standingByLoc],
  );

  // W9: locations with a severe-hazard forecast (next game-month telegraphs).
  const warningLocs = useMemo(
    () => new Set((state.hazardWarnings || []).map(w => w.locationId)),
    [state.hazardWarnings],
  );

  // Wave A2 — orbital-slot occupancy rings. Real sync-delivered occupancy;
  // fail-soft to your-footprint-only when the save has never synced.
  const slotRings = useMemo(() => computeSlotRings(state), [state]);
  const slotRingByLoc = useMemo(() => {
    const out: Record<string, SlotRingModel> = {};
    for (const r of slotRings) out[r.locationId] = r;
    return out;
  }, [slotRings]);

  const ships = (state.ships || []).filter(s => s.isBuilt);
  const transitShips = ships.filter(s => s.status === 'in_transit' && s.route);
  const stationShips = ships.filter(s => !(s.status === 'in_transit' && s.route));
  const shipsInTransit = transitShips.length;

  // Zoom controls (OrbitControls has no public zoom setter — dolly the camera
  // along the target axis, mirroring the 2D +/- buttons).
  const zoomBy = useCallback((factor: number) => {
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    if (!controls || !cam) return;
    const target = controls.target;
    cam.position.sub(target).multiplyScalar(factor).add(target);
    controls.update();
  }, []);

  const resetView = useCallback(() => {
    controlsRef.current?.reset();
  }, []);

  // Keyboard zoom — CLAUDE.md keyboard-only invariant, matching the 2D
  // canvas's bindings exactly (`+` / `=` in, `-` / `_` out, `0` reset) with
  // the same input-field guards the shell's M/C shortcuts use. Gated on
  // `active` so keys never fire under a covering panel overlay. zoomBy and
  // reset are instant camera moves (OrbitControls.update clamps distance),
  // so there is no animated transition to gate on reduced motion.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(0.8);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomBy(1.25);
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, zoomBy, resetView]);

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full"
      onPointerDownCapture={e => { pointerDownRef.current = { x: e.clientX, y: e.clientY }; }}
    >
      <div
        className="absolute inset-0"
        role="img"
        aria-label="3D solar system map showing your unlocked locations, buildings, NPC presence, and ships in transit. Bodies orbit the Sun with realistic relative periods."
        aria-describedby="solar-map-3d-hint"
      >
      <Canvas
        camera={{ position: [0, 30, 44], fov: 50, near: 0.1, far: 1200 }}
        dpr={[1, 2]}
        frameloop={running ? 'always' : 'never'}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: 'linear-gradient(180deg, #030310 0%, #05051a 100%)' }}
        onCreated={({ camera }) => { cameraRef.current = camera; }}
        onPointerMissed={e => {
          // Ignore "clicks" that were actually orbit drags.
          const down = pointerDownRef.current;
          if (down && (Math.abs(e.clientX - down.x) > 6 || Math.abs(e.clientY - down.y) > 6)) return;
          deselect();
        }}
      >
        <ambientLight intensity={0.38} />
        <NebulaSkybox />
        <Stars radius={420} depth={80} count={4200} factor={5} saturation={0} fade speed={reduced ? 0 : 0.6} />
        <SceneClock posRef={posRef} reduced={reduced} />
        <ZoomTierTracker tierRef={tierRef} onChange={handleTierChange} />
        <Sun reduced={reduced} />
        {ORBITAL_BODIES.filter(b => !b.parent).map(b => (
          <OrbitRing key={`orbit-${b.id}`} aAU={b.aAU!} inclinationDeg={b.inclinationDeg || 0} />
        ))}
        <BeltRocks reduced={reduced} />
        {tintedLocations.length > 0 && mapMode === 'standard' && <ZoneTints posRef={posRef} tinted={tintedLocations} />}
        {Object.keys(modeVisuals).length > 0 && <ModeTints posRef={posRef} visuals={modeVisuals} />}
        {ORBITAL_BODIES.map(b => (
          <BodyMesh
            key={b.id}
            def={b}
            posRef={posRef}
            reduced={reduced}
            unlocked={b.locationId ? unlockedSet.has(b.locationId) : true}
            badges={(b.locationId && badgesByLoc[b.locationId]) || NO_BADGES}
            standing={(b.locationId && standingByLoc[b.locationId]) || null}
            mode={(b.locationId && modeVisuals[b.locationId]) || null}
            tierRef={tierRef}
            alwaysLabels={alwaysLabels}
            onPick={pickFromScene}
          />
        ))}
        {ORBITAL_PIPS.map(p => (
          <PipMesh
            key={p.locationId}
            pip={p}
            posRef={posRef}
            unlocked={unlockedSet.has(p.locationId)}
            badges={badgesByLoc[p.locationId] || NO_BADGES}
            standing={standingByLoc[p.locationId] || null}
            mode={modeVisuals[p.locationId] || null}
            tierRef={tierRef}
            alwaysLabels={alwaysLabels}
            onPick={pickFromScene}
          />
        ))}
        <SlotRings posRef={posRef} rings={slotRings} tierRef={tierRef} alwaysLabels={alwaysLabels} />
        {showLanes && <LaneLines posRef={posRef} state={state} reduced={reduced} />}
        {showShips && transitShips.map(s => <TransitShip key={s.instanceId} ship={s} posRef={posRef} reduced={reduced} />)}
        {showShips && stationShips.map(s => <StationShip key={s.instanceId} ship={s} posRef={posRef} reduced={reduced} />)}
        <MapPings3D posRef={posRef} reduced={reduced} />
        <HazardRings posRef={posRef} state={state} />
        <ForecastMarkers posRef={posRef} state={state} reduced={reduced} />
        <ScienceMarkers posRef={posRef} state={state} />
        <SelectionMarker posRef={posRef} selectedLocationId={selectedLoc} reduced={reduced} />
        {/* Wave V4 — selective bloom, desktop-only lazy chunk. Never fetched
            unless every gate passes (feature flag × user FX toggle × dpr>1 ×
            not reduced-motion); mobile uses the 2D renderer and never even
            loads SolarMap3D, let alone this chunk. */}
        {BLOOM_FEATURE_ENABLED && fxPref && dprHigh && !reduced && (
          <Suspense fallback={null}>
            <SolarMapBloom />
          </Suspense>
        )}
        {/* Zoom pass: zoomToCursor makes the wheel dolly toward the pointer
            (three-stdlib ≥2.24), so "zoom into the Earth cluster" is one
            scroll instead of scroll + re-aim — the founder-flagged fix for
            telling leo / geo / lunar_orbit / lunar_surface apart. Pinch-zoom
            on touch is native to OrbitControls. minDistance lowered 4 → 2.5
            so the camera can get inside the cluster's angular spread (LEO and
            GEO sit only ~0.33 scene units apart). Damping is an inertial
            glide — decorative easing — so it's off under reduced motion. */}
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableDamping={!reduced}
          dampingFactor={0.08}
          rotateSpeed={0.5}
          zoomSpeed={0.6}
          zoomToCursor
          minDistance={2.5}
          maxDistance={160}
          maxPolarAngle={Math.PI * 0.49}
        />
      </Canvas>
      </div>

      {/* Zoom controls — same placement as the 2D embedded layout */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
        <button onClick={() => zoomBy(0.8)} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom in" aria-keyshortcuts="+">+</button>
        <button onClick={() => zoomBy(1.25)} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom out" aria-keyshortcuts="-">−</button>
        <button onClick={resetView} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-[10px] hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Reset view" aria-keyshortcuts="0">⟲</button>
      </div>

      {/* Layer toggles — bottom-right, same as 2D embedded */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-20">
        <button
          onClick={() => setShowLanes(v => !v)}
          aria-pressed={showLanes}
          className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            showLanes ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
          }`}
        >
          {showLanes ? '● Lanes' : '○ Lanes'}
        </button>
        <button
          onClick={() => setShowShips(v => !v)}
          aria-pressed={showShips}
          className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            showShips ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
          }`}
        >
          {showShips ? '● Ships' : '○ Ships'}
        </button>
        <button
          onClick={() => setShowWorld(v => !v)}
          aria-pressed={showWorld}
          disabled={!worldAvailable}
          title={worldAvailable ? "Toggle other corporations' colony claims" : 'Sign in to see the live world'}
          className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed ${
            worldLayerActive ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
          }`}
        >
          {worldLayerActive ? '● World' : '○ World'}
        </button>
        {BLOOM_FEATURE_ENABLED && dprHigh && !reduced && (
          <button
            onClick={toggleFx}
            aria-pressed={fxPref}
            title={fxPref ? 'Disable bloom post-processing (quality toggle)' : 'Enable bloom post-processing'}
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              fxPref ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {fxPref ? '● FX' : '○ FX'}
          </button>
        )}
      </div>

      {/* Keyboard-accessible Location List — identical grouping + behavior to
          the 2D canvas overlay (wave-8 list drives selection in both modes). */}
      <div className="hud-frame absolute bottom-2 left-2 z-20 rounded-xl border border-white/[0.06] bg-[#050510]/90 backdrop-blur-sm w-[min(92vw,380px)]">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setListExpanded(v => !v)}
          aria-expanded={listExpanded}
          aria-controls="solar-map-3d-location-list"
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <span className="font-hud text-xs font-semibold text-white flex items-center gap-2">
            <span aria-hidden="true">📜</span> Location List
            <span className="text-slate-500 font-normal text-[10px] hidden sm:inline">— keyboard-accessible alternative to the map</span>
          </span>
          <span aria-hidden="true" className={`text-slate-400 transition-transform ${listExpanded ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {listExpanded && (
          <div id="solar-map-3d-location-list" className="px-3 pb-3 space-y-3 max-h-[50vh] overflow-y-auto">
            {LOCATIONS_BY_REGION.map(({ type, locations }) => (
              <div key={type}>
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  {REGION_LABELS[type] || type}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" role="group" aria-label={`${REGION_LABELS[type] || type} locations`}>
                  {locations.map(loc => {
                    const unlocked = unlockedSet.has(loc.id);
                    const isSelected = selectedLoc === loc.id;
                    const standing = standingByLoc[loc.id];
                    const hasWarning = warningLocs.has(loc.id);
                    const modeVis = modeVisuals[loc.id];
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => selectLocation(loc.id, undefined, { toggle: false, focus: true })}
                        // Wave A2 — keyboard/right-click route into the radial
                        // command menu, anchored on this row.
                        onContextMenu={e => { e.preventDefault(); selectLocation(loc.id, anchorForElement(e.currentTarget)); }}
                        onKeyDown={e => {
                          if (e.key === 'c' || e.key === 'C' || e.key === 'ContextMenu') {
                            e.preventDefault();
                            selectLocation(loc.id, anchorForElement(e.currentTarget));
                          }
                        }}
                        aria-pressed={isSelected}
                        aria-keyshortcuts="C"
                        className={`min-h-[44px] px-2 py-1.5 rounded-lg text-[11px] text-left border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                            : unlocked
                              ? 'bg-white/[0.03] border-white/[0.08] text-slate-200 hover:bg-white/[0.06]'
                              : 'bg-white/[0.01] border-white/[0.04] text-slate-500 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <span aria-hidden="true">{unlocked ? '🔓' : '🔒'}</span>
                          <span className="truncate">{loc.name}</span>
                          {standing === 'governor' && <span aria-hidden="true" className="text-amber-300 shrink-0">♛</span>}
                          {standing === 'stakeholder' && <span aria-hidden="true" className="text-cyan-300 shrink-0">◆</span>}
                          {hasWarning && <span aria-hidden="true" className="text-amber-300 shrink-0">⚠</span>}
                          {modeVis?.glyph && <span aria-hidden="true" className="text-slate-300 shrink-0">{modeVis.glyph}</span>}
                        </span>
                        <span className="sr-only">
                          {unlocked ? ', unlocked' : ', locked'}{isSelected ? ', currently selected' : ''}
                          {standing === 'governor' ? ', you govern this zone' : standing === 'stakeholder' ? ', zone stakeholder' : ''}
                          {hasWarning ? ', severe hazard forecast next month' : ''}
                          {modeVis ? `, ${modeVis.srText}` : ''}
                          {slotRingByLoc[loc.id] ? `. ${slotRingByLoc[loc.id].srText}` : ''}
                          . Press C for the command menu.
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {shipsInTransit > 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[10px] text-emerald-300 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
          ⚡ {shipsInTransit} in transit
        </div>
      )}

      <p id="solar-map-3d-hint" className="sr-only">
        Click a planet, moon, or orbital marker to open its radial command menu — build, dispatch, demand,
        standing orders and full detail, right at the body. Drag to orbit the camera; scroll, pinch with two
        fingers, or press plus and minus to zoom (0 resets the view). The wheel zooms toward the cursor, so
        pointing at Earth and scrolling spreads the close-packed orbital markers apart for easy picking.
        Camera distance controls how much per-location detail is drawn; the Location List always shows
        everything, and the Labels toggle forces full labels at every zoom.
        Use the Location List overlay (bottom-left) to browse and select every location by keyboard and press
        C on a row for its command menu, or switch to the 2D map with the 2D/3D toggle.
        Current zoom tier: {MAP_ZOOM_TIER_LABEL[zoomTier]}.
      </p>
    </div>
  );
}
