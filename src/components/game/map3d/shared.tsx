'use client';

// ─── SolarMap3D shared scene helpers ─────────────────────────────────────────
// Flight mode part (a), 2026-09-13: the texture loader, the label system,
// the zoom-tier tracker, the selection reticle and the body sphere used to
// be private to SolarMap3D.tsx. The local scene (SolarMapLocal.tsx) draws
// the same bodies, labels and reticle inside the SAME Canvas, so they live
// here now — one implementation, two scenes, never diverging. Nothing here
// creates a WebGL context; every component is a child of SolarMap3D's
// single Canvas.
//
// Flight mode part (b), graphics review item 6 — the label rebuild. Labels
// used to be canvas sprites (a texture per zoom tier, "Inter" falling back
// to system-ui). They are now HUD-facing SDF text (drei <Text>, troika) in
// the HUD's own DM Sans (public/fonts/dm-sans-600.woff), laid out in PIXEL
// units inside a camera-aligned, distance-scaled frame (HudFrame) so they
// read the same at Pluto range and inside Earth's local scene. A screen-
// space declutter (lib/game/map-labels.ts, every 250 ms) keeps priority —
// selected > holdings > major bodies > pips > moons — and, instead of only
// hiding the loser, pushes it to a free spot and draws a short LEADER LINE
// back to its anchor (Luna and the Galilean cluster are the known
// collisions). Symbol glyphs the font lacks (crown, diamond, mode marks)
// stay as small canvas planes beside the text so troika never reaches for
// a CDN fallback face.

import { useRef, useState, useEffect, useMemo, useContext, useCallback, createContext, forwardRef, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { configureTextBuilder } from 'troika-three-text';

// troika generates glyph SDFs in a web worker built from a blob URL; the
// production CSP (script-src without blob:) rejects the worker's
// importScripts and it then falls back to the main thread after logging a
// page error on every load (seen on prod 2026-09-13). Generate on the main
// thread from the start: a few hundred glyphs is cheap, and there is no error.
if (typeof window !== 'undefined') configureTextBuilder({ useWorker: false });
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
import {
  declutterLabels,
  hudSafeText,
  MAP_LABEL_FONT_URL,
  MAP_LABEL_PX,
  MAP_BADGE_PX,
  MAP_MODE_BADGE_PX,
  MAP_LABEL_CHARACTERS,
  MAP_LABEL_COLORS,
  DECLUTTER_INTERVAL_MS as LABEL_DECLUTTER_MS,
  type LabelPlacement,
  type LabelRectInput,
} from '@/lib/game/map-labels';

export { labelPriority } from '@/lib/game/map-labels';

export type PositionsRef = React.MutableRefObject<ScenePositions>;

/** Where the selection reticle sits for a location id. The system scene
 *  answers from the live position table; a local scene answers from its own
 *  frame (rings, moons, the body). */
export type AnchorResolver = (locationId: string) => { pos: readonly number[]; r: number } | null | undefined;

// Three's TextureLoader goes through ImageLoader, which honours THREE.Cache:
// with it on, the system view's Earth and the local scene's Earth share one
// decoded image instead of fetching and decoding twice.
THREE.Cache.enabled = true;

// ── Texture + glyph helpers ──────────────────────────────────────────────────

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

/**
 * Recompile a material when a texture map arrives after its first draw.
 * three compiles a material's program on first render and never re-reads
 * `map` / `emissiveMap` afterwards unless `needsUpdate` is set — a material
 * first drawn while its texture was still streaming keeps the map-less
 * program forever and renders flat white (the Sun / Venus regression found
 * in the part (b) review: the SDF labels moved the first drawn frame ahead
 * of the texture loads, a race the old code won only by timing). Every
 * material fed by useSafeTexture routes its late maps through this.
 */
export function useMapRefresh(ref: React.RefObject<THREE.Material | null>, ...maps: (THREE.Texture | null | undefined)[]) {
  useEffect(() => {
    if (ref.current) ref.current.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...maps]);
}

/** Canvas typeface for the SYMBOL glyphs (crown, diamond, warning, mode
 *  marks) that the SDF font does not cover. next/font exposes the body face
 *  under a hashed family name, so read the resolved family off <body> once. */
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

/** Small self-contained glyph texture (forecast warning, science, the
 *  standing and mode marks beside a label). No DOM, no font fetch. */
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

// ── Zoom-level information layering (V4 LOD bands → Wave A2 zoom tiers) ─────
// The tier lives in a shared ref written once per frame (ZoomTierTracker) and
// read by each label's own useFrame — no React state churn at 60Hz. A
// throttled callback mirrors it to the shell HUD.

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

// ── Label registry + declutter (item 6) ─────────────────────────────────────
// Every HudFrame with an id registers its anchor object and per-tier pixel
// size. LabelDeclutter (rendered inside the Canvas) projects each shown
// label every 250 ms and runs the pure declutterLabels(); frames read their
// placement (offset + leader, or suppressed) in their own per-frame pass, so
// the result never depends on useFrame ordering. The 'alwaysLabels'
// accessibility override bypasses the declutter entirely (it promises every
// label), and the Location List stays the canonical, always-complete list.

export interface LabelTierSize {
  /** Label extent, px. */
  w: number;
  h: number;
  /** Rect centre relative to the anchor, HUD-local px (y up). */
  cy: number;
}
export type LabelSizeByTier = Record<MapZoomTier, LabelTierSize>;

export interface LabelRegistryEntry {
  /** The anchor object; its world position is the label's natural anchor. */
  group: THREE.Object3D;
  priority: number;
  /** Live sizes — the frame's owner updates this object in place as text
   *  measurements arrive. */
  size: LabelSizeByTier;
  /** Written each frame by the frame's own visibility pass. */
  shown: boolean;
  tier: MapZoomTier;
}
export interface LabelRegistry {
  entries: Map<string, LabelRegistryEntry>;
  placements: Map<string, LabelPlacement>;
}
export function createLabelRegistry(): LabelRegistry {
  return { entries: new Map(), placements: new Map() };
}
export const LabelRegistryContext = createContext<LabelRegistry | null>(null);

export const DECLUTTER_INTERVAL_MS = LABEL_DECLUTTER_MS;

export function LabelDeclutter({ registry, selectedLocationId, alwaysLabels, enabled = true }: { registry: LabelRegistry; selectedLocationId: string | null; alwaysLabels: boolean; enabled?: boolean }) {
  const lastRef = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    if (!enabled) return; // the scene is hidden — nothing to declutter
    if (alwaysLabels) { if (registry.placements.size) registry.placements = new Map(); return; }
    const now = performance.now();
    if (now - lastRef.current < DECLUTTER_INTERVAL_MS) return;
    lastRef.current = now;
    const items: LabelRectInput[] = [];
    registry.entries.forEach((entry, id) => {
      if (!entry.shown) return;
      entry.group.getWorldPosition(tmp);
      tmp.project(camera);
      if (tmp.z > 1 || tmp.z < -1) return; // behind the camera / beyond far plane
      const s = entry.size[entry.tier];
      if (!(s.w > 0)) return; // not measured yet
      const sx = (tmp.x + 1) / 2 * size.width;
      const sy = (1 - tmp.y) / 2 * size.height;
      items.push({ id, x: sx, y: sy - s.cy, w: s.w, h: s.h, priority: entry.priority });
    });
    registry.placements = declutterLabels(items, { selectedId: selectedLocationId, previous: registry.placements });
  });
  return null;
}

// ── HudFrame — camera-aligned, pixel-scaled anchor for SDF text ─────────────

const HUD_TMP = new THREE.Vector3();

export interface HudFrameProps {
  /** Declutter registry id; omitted = never decluttered (tags). */
  id?: string;
  priority?: number;
  /** Live per-tier size, owned by the caller (updated in place). */
  size?: LabelSizeByTier;
  /** Per-frame visibility + which tier's layout to show. */
  resolve: (tier: MapZoomTier) => { visible: boolean; pick: MapZoomTier };
  /** Fires when the picked tier changes (callers toggle their rows). */
  onPick?: (pick: MapZoomTier) => void;
  tierRef?: TierRef;
  alwaysLabels?: boolean;
  /** Local position of the frame inside its parent (world units). */
  position?: [number, number, number];
  children: React.ReactNode;
}

const NO_SIZE: LabelSizeByTier = { detail: { w: 0, h: 0, cy: 0 }, location: { w: 0, h: 0, cy: 0 }, system: { w: 0, h: 0, cy: 0 } };

/**
 * Root group (the ref) sits at the anchor in world space. Its child "hud"
 * group is re-oriented to the camera and scaled so ONE local unit is ONE
 * screen pixel, whatever the distance; children lay themselves out in px.
 * A declutter placement offsets the content and draws the leader line.
 */
export const HudFrame = forwardRef<THREE.Group, HudFrameProps>(function HudFrame({ id, priority = 2, size = NO_SIZE, resolve, onPick, tierRef, alwaysLabels = false, position, children }, ref) {
  const registry = useContext(LabelRegistryContext);
  const rootRef = useRef<THREE.Group | null>(null);
  const hudRef = useRef<THREE.Group>(null);
  const offsetRef = useRef<THREE.Group>(null);
  const lastPickRef = useRef<MapZoomTier | null>(null);
  const leader = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: MAP_LABEL_COLORS.leader, transparent: true, opacity: 0.75, depthTest: false, depthWrite: false, toneMapped: false }));
    line.renderOrder = 10;
    line.visible = false;
    line.frustumCulled = false;
    return line;
  }, []);
  useEffect(() => () => { leader.geometry.dispose(); (leader.material as THREE.Material).dispose(); }, [leader]);
  const setRoot = useCallback((g: THREE.Group | null) => {
    rootRef.current = g;
    if (typeof ref === 'function') ref(g);
    else if (ref) ref.current = g;
  }, [ref]);

  useEffect(() => {
    const group = rootRef.current;
    if (!registry || !id || !group) return;
    registry.entries.set(id, { group, priority, size, shown: false, tier: 'detail' });
    return () => { registry.entries.delete(id); registry.placements.delete(id); };
  }, [registry, id, priority, size]);

  useFrame(({ camera, size: viewport }) => {
    const root = rootRef.current;
    const hud = hudRef.current;
    if (!root || !hud) return;
    const tier = tierRef?.current ?? 'detail';
    const { visible, pick } = resolve(tier);
    if (pick !== lastPickRef.current) { lastPickRef.current = pick; onPick?.(pick); }
    const entry = id ? registry?.entries.get(id) : undefined;
    if (entry) { entry.shown = visible; entry.tier = pick; }
    const placement = id && !alwaysLabels ? registry?.placements.get(id) : undefined;
    const show = visible && !placement?.suppressed;
    hud.visible = show;
    if (!show) return;
    root.getWorldPosition(HUD_TMP);
    const d = HUD_TMP.distanceTo(camera.position);
    const p11 = (camera as THREE.PerspectiveCamera).projectionMatrix.elements[5];
    // World units per pixel at this depth: 2·d·tan(fov/2) / H.
    const s = Math.max(1e-6, (2 * d) / (p11 * viewport.height));
    hud.quaternion.copy(camera.quaternion);
    hud.scale.setScalar(s);
    const dx = placement?.dx ?? 0;
    const dy = placement?.dy ?? 0;
    offsetRef.current?.position.set(dx, -dy, 0);
    if (placement?.leader) {
      const sz = size[pick];
      const attr = leader.geometry.attributes.position as THREE.BufferAttribute;
      // From the natural label's top edge (just under the body) to the
      // displaced label's top-centre — a short tick, not a spider leg.
      const top = sz.cy + sz.h / 2;
      attr.setXYZ(0, 0, top, 0);
      attr.setXYZ(1, dx, top - dy, 0);
      attr.needsUpdate = true;
      leader.visible = true;
    } else {
      leader.visible = false;
    }
  });

  return (
    <group ref={setRoot} position={position}>
      <group ref={hudRef} visible={false}>
        <group ref={offsetRef}>
          <Suspense fallback={null}>{children}</Suspense>
        </group>
        <primitive object={leader} />
      </group>
    </group>
  );
});

// ── HudText — one line of SDF text in px units ──────────────────────────────

const OUTLINE_COLOR = '#000000';

export interface HudTextProps {
  text: string;
  px: number;
  color: string;
  x?: number;
  y?: number;
  opacity?: number;
  anchorX?: 'left' | 'center' | 'right';
  /** Measured width (px) once troika has laid the text out. */
  onWidth?: (w: number) => void;
  renderOrder?: number;
}

export function HudText({ text, px, color, x = 0, y = 0, opacity = 1, anchorX = 'center', onWidth, renderOrder = 11 }: HudTextProps) {
  const safe = hudSafeText(text);
  const handleSync = useCallback((t: { textRenderInfo?: { blockBounds?: number[] } | null }) => {
    const b = t.textRenderInfo?.blockBounds;
    if (b && onWidth) onWidth(Math.max(0, b[2] - b[0]));
  }, [onWidth]);
  return (
    <Text
      position={[x, y, 0]}
      font={MAP_LABEL_FONT_URL}
      characters={MAP_LABEL_CHARACTERS}
      fontSize={px}
      color={color}
      fillOpacity={opacity}
      anchorX={anchorX}
      anchorY="middle"
      outlineWidth={px * 0.09}
      outlineColor={OUTLINE_COLOR}
      outlineOpacity={0.9 * opacity}
      renderOrder={renderOrder}
      onSync={handleSync}
    >
      {safe}
      <meshBasicMaterial transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </Text>
  );
}

/** A symbol glyph the SDF font lacks, as a small canvas plane in px units. */
function GlyphPlane({ text, color, x, y = 0, h = 14 }: { text: string; color: string; x: number; y?: number; h?: number }) {
  const glyph = useMemo(() => makeGlyphTexture(text, color), [text, color]);
  useEffect(() => () => glyph.tex.dispose(), [glyph]);
  const w = h * glyph.aspect;
  return (
    <mesh position={[x, y, 0]} renderOrder={11}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={glyph.tex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Width (px) of a glyph plane of height h. */
function glyphPlaneWidth(text: string, h = 14): number {
  // Mirrors makeGlyphTexture's canvas geometry (text width + 10·scale over
  // 22·scale tall) without allocating a canvas per frame.
  let ctx: CanvasRenderingContext2D | null = null;
  try { ctx = document.createElement('canvas').getContext('2d'); } catch { /* no DOM */ }
  if (!ctx) return h;
  ctx.font = `700 28px ${labelFontFamily()}`;
  const w = ctx.measureText(text).width + 20;
  return h * (w / 44);
}

// ── BodyLabel — name + standing/mode glyphs + count badges + mode badge ────

const ROW_NAME_H = 18;
const ROW_BADGE_H = 22;
const ROW_MODE_H = 16;
const BADGE_R = 9;
const BADGE_GAP = 6;
const GLYPH_H = 14;
const GLYPH_GAP = 3;

export interface BodyLabelProps {
  name: string;
  unlocked: boolean;
  badges: BadgeCounts;
  /** World-space offset from the parent (labels hang under their body). */
  yOffset: number;
  standing?: ZoneStandingKind;
  mode?: ModeVisual | null;
  tierRef?: TierRef;
  locationId?: string;
  alwaysLabels?: boolean;
  priority?: number;
}

/**
 * The location label. Rows (HUD px, y up): the name row at 0 with the
 * standing glyph before and the mode glyph after it; the count badges
 * (cyan = your buildings, red = NPC presence, purple = other corps) under
 * it at the detail tier; the mode badge text under those at the detail and
 * location tiers. Visibility per tier comes from the allocation-free
 * predicates in map-zoom.ts; `alwaysLabels` pins the detail layout.
 */
export function BodyLabel({ name, unlocked, badges, yOffset, standing = null, mode = null, tierRef, locationId, alwaysLabels = false, priority = 2 }: BodyLabelProps) {
  const isMajor = locationId ? isMajorLocation(locationId) : true;
  const hasHoldings = badges.buildings > 0;
  const registryId = locationId ?? name;
  const badgeEntries = useMemo(() => {
    const out: { n: number; color: string }[] = [];
    if (badges.buildings > 0) out.push({ n: badges.buildings, color: MAP_LABEL_COLORS.badgeBuildings });
    if (badges.npc > 0) out.push({ n: badges.npc, color: MAP_LABEL_COLORS.badgeNpc });
    if (badges.world > 0) out.push({ n: badges.world, color: MAP_LABEL_COLORS.badgeWorld });
    return out;
  }, [badges.buildings, badges.npc, badges.world]);
  const standingGlyph = standing === 'governor' ? MAP_GLYPHS.governor : standing === 'stakeholder' ? MAP_GLYPHS.stakeholder : '';
  const standingColor = standing === 'governor' ? MAP_LABEL_COLORS.governor : MAP_LABEL_COLORS.stakeholder;
  const modeGlyph = mode?.glyph ?? '';
  const modeBadge = mode?.badge ?? null;
  const modeColor = mode?.tint ?? MAP_LABEL_COLORS.name;

  // Measured widths (px) → per-tier size object, mutated in place so the
  // registry entry sees updates without re-registering.
  const size = useMemo<LabelSizeByTier>(() => ({ detail: { w: 0, h: 0, cy: 0 }, location: { w: 0, h: 0, cy: 0 }, system: { w: 0, h: 0, cy: 0 } }), []);
  const widths = useRef({ name: 0, modeBadge: 0 });
  const glyphLW = standingGlyph ? glyphPlaneWidth(standingGlyph, GLYPH_H) : 0;
  const glyphRW = modeGlyph ? glyphPlaneWidth(modeGlyph, GLYPH_H) : 0;
  const badgeRowW = badgeEntries.length * (BADGE_R * 2 + BADGE_GAP);
  const recompute = useCallback(() => {
    const nameRowW = widths.current.name + (glyphLW ? glyphLW + GLYPH_GAP : 0) + (glyphRW ? glyphRW + GLYPH_GAP : 0);
    const fill = (tier: MapZoomTier, withBadges: boolean, withMode: boolean) => {
      const rows = [ROW_NAME_H];
      if (withBadges && badgeEntries.length) rows.push(ROW_BADGE_H);
      if (withMode && modeBadge) rows.push(ROW_MODE_H);
      const h = rows.reduce((a, b) => a + b, 0);
      const top = ROW_NAME_H / 2;
      const w = Math.max(nameRowW, withBadges ? badgeRowW : 0, withMode && modeBadge ? widths.current.modeBadge : 0) + 4;
      const s = size[tier];
      s.w = w; s.h = h; s.cy = top - h / 2;
    };
    fill('detail', true, true);
    fill('location', false, true);
    fill('system', false, false);
  }, [size, glyphLW, glyphRW, badgeRowW, badgeEntries.length, modeBadge]);
  useEffect(() => { recompute(); }, [recompute]);
  const onNameWidth = useCallback((w: number) => { if (Math.abs(w - widths.current.name) > 0.5) { widths.current.name = w; recompute(); } }, [recompute]);
  const onModeWidth = useCallback((w: number) => { if (Math.abs(w - widths.current.modeBadge) > 0.5) { widths.current.modeBadge = w; recompute(); } }, [recompute]);

  const badgesRef = useRef<THREE.Group>(null);
  const modeRef = useRef<THREE.Group>(null);
  const resolve = useCallback((tier: MapZoomTier) => {
    const showName = nameVisibleAt(tier, isMajor, hasHoldings, alwaysLabels);
    const showDetail = detailVisibleAt(tier, alwaysLabels);
    const showLens = lensVisibleAt(tier, alwaysLabels);
    const pick: MapZoomTier = showDetail ? 'detail' : showLens ? 'location' : 'system';
    return { visible: showName, pick };
  }, [isMajor, hasHoldings, alwaysLabels]);
  const onPick = useCallback((pick: MapZoomTier) => {
    if (badgesRef.current) badgesRef.current.visible = pick === 'detail';
    if (modeRef.current) modeRef.current.visible = pick !== 'system';
  }, []);

  const nameColor = unlocked ? MAP_LABEL_COLORS.name : MAP_LABEL_COLORS.locked;
  const badgeY = -(ROW_NAME_H / 2 + ROW_BADGE_H / 2);
  const modeY = badgeEntries.length ? badgeY - ROW_BADGE_H / 2 - ROW_MODE_H / 2 : -(ROW_NAME_H / 2 + ROW_MODE_H / 2);
  // Glyph planes hang off the measured name; re-render on width change is
  // avoided by reading the width lazily through a state tick.
  const [nameW, setNameW] = useState(0);
  const onNameWidthState = useCallback((w: number) => { onNameWidth(w); setNameW(prev => (Math.abs(prev - w) > 0.5 ? w : prev)); }, [onNameWidth]);

  return (
    <HudFrame id={registryId} priority={priority} size={size} resolve={resolve} onPick={onPick} tierRef={tierRef} alwaysLabels={alwaysLabels} position={[0, yOffset, 0]}>
      {standingGlyph && <GlyphPlane text={standingGlyph} color={standingColor} x={-(nameW / 2 + GLYPH_GAP + glyphLW / 2)} h={GLYPH_H} />}
      <HudText text={name} px={MAP_LABEL_PX} color={nameColor} onWidth={onNameWidthState} />
      {modeGlyph && <GlyphPlane text={modeGlyph} color={modeColor} x={nameW / 2 + GLYPH_GAP + glyphRW / 2} h={GLYPH_H} />}
      {badgeEntries.length > 0 && (
        <group ref={badgesRef} position={[0, badgeY, 0]}>
          {badgeEntries.map((b, i) => {
            const x = -badgeRowW / 2 + BADGE_R + i * (BADGE_R * 2 + BADGE_GAP);
            return (
              <group key={`${b.color}-${i}`} position={[x, 0, 0]}>
                <mesh renderOrder={10}>
                  <circleGeometry args={[BADGE_R, 20]} />
                  <meshBasicMaterial color={b.color} depthTest={false} depthWrite={false} toneMapped={false} />
                </mesh>
                <HudText text={String(Math.min(99, b.n))} px={MAP_BADGE_PX} color={MAP_LABEL_COLORS.badgeText} y={0.5} renderOrder={12} />
              </group>
            );
          })}
        </group>
      )}
      {modeBadge && (
        <group ref={modeRef} position={[0, modeY, 0]}>
          <HudText text={modeBadge} px={MAP_MODE_BADGE_PX} color={modeColor} onWidth={onModeWidth} />
        </group>
      )}
    </HudFrame>
  );
}

// ── HudTag — a single-line tag (ETA, ship name, slot badge) ─────────────────

export interface HudTagProps {
  text: string;
  px?: number;
  color: string;
  /** Registry id + priority to take part in the declutter (slot badges). */
  id?: string;
  priority?: number;
  /** Visibility per frame (defaults to always). */
  resolve?: (tier: MapZoomTier) => boolean;
  tierRef?: TierRef;
  alwaysLabels?: boolean;
}

/** A one-row SDF tag whose root group the parent positions per frame. */
export const HudTag = forwardRef<THREE.Group, HudTagProps>(function HudTag({ text, px = MAP_BADGE_PX, color, id, priority = 0, resolve, tierRef, alwaysLabels }, ref) {
  const size = useMemo<LabelSizeByTier>(() => ({ detail: { w: 0, h: 0, cy: 0 }, location: { w: 0, h: 0, cy: 0 }, system: { w: 0, h: 0, cy: 0 } }), []);
  const onWidth = useCallback((w: number) => {
    const h = px + 5;
    (['detail', 'location', 'system'] as MapZoomTier[]).forEach(t => { size[t].w = w + 4; size[t].h = h; size[t].cy = 0; });
  }, [size, px]);
  const frameResolve = useCallback((tier: MapZoomTier) => ({ visible: resolve ? resolve(tier) : true, pick: 'detail' as MapZoomTier }), [resolve]);
  return (
    <HudFrame ref={ref} id={id} priority={priority} size={size} resolve={frameResolve} tierRef={tierRef} alwaysLabels={alwaysLabels}>
      <HudText text={text} px={px} color={color} onWidth={onWidth} />
    </HudFrame>
  );
});

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
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useMapRefresh(matRef, tex);
  return (
    <mesh geometry={geo} rotation-x={-Math.PI / 2 + 0.18} renderOrder={2}>
      <meshBasicMaterial
        ref={matRef}
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

// ── Orbit path ring (system view: heliocentric; local scene: a moon) ────────
// Item 6: the selected body's orbit brightens (an orbit highlight ring) so
// "which path is this on" reads at a glance. Colour + opacity change only;
// the selection itself is the reticle shape and the Location List state.

export function OrbitPath({ radius, inclinationDeg = 0, highlighted = false, baseOpacity = 0.16, segments = 128 }: { radius: number; inclinationDeg?: number; highlighted?: boolean; baseOpacity?: number; segments?: number }) {
  const geo = useMemo(() => {
    const incl = (inclinationDeg * Math.PI) / 180;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(radius * Math.cos(th), radius * Math.sin(th) * Math.sin(incl), radius * Math.sin(th) * Math.cos(incl)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius, inclinationDeg, segments]);
  const line = useMemo(
    () => new THREE.Line(geo, new THREE.LineBasicMaterial({ color: MAP_LABEL_COLORS.locked, transparent: true, opacity: baseOpacity })),
    [geo, baseOpacity],
  );
  useEffect(() => () => { geo.dispose(); (line.material as THREE.Material).dispose(); }, [geo, line]);
  useEffect(() => {
    const m = line.material as THREE.LineBasicMaterial;
    m.color.set(highlighted ? MAP_LABEL_COLORS.orbitHighlight : MAP_LABEL_COLORS.locked);
    m.opacity = highlighted ? Math.max(0.55, baseOpacity * 3) : baseOpacity;
    m.toneMapped = !highlighted;
    m.needsUpdate = true;
    line.renderOrder = highlighted ? 3 : 0;
  }, [line, highlighted, baseOpacity]);
  return <primitive object={line} />;
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
  const surfaceMat = useRef<THREE.MeshStandardMaterial>(null);
  useMapRefresh(surfaceMat, tex, night);
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
          ref={surfaceMat}
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
