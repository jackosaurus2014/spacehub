'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameState, LocationType } from '@/lib/game/types';
import { LOCATIONS } from '@/lib/game/solar-system';
import { LANES } from '@/lib/game/spatial-strategy';
import { laneKey } from '@/lib/game/trade-lanes';
import { SHIP_MAP } from '@/lib/game/ships';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';
import { ZONE_MAP } from '@/lib/game/zone-influence';
import { playSound } from '@/lib/game/sound-engine';
import { useWorldState } from '@/hooks/useWorldState';
import { onMapPing, getPingVisual, hexToRgba, PING_COLOR, type MapPingEvent } from '@/lib/game/map-ping';
import { computeModeVisuals, type MapMode } from '@/lib/game/map-modes';
// Wave A2 (map as command theater) — zoom tiers, body presentation data and
// orbital-slot ring math, all shared with SolarMap3D so the two renderers can
// never disagree (same precedent as map-modes.ts).
import {
  zoomTierFromCanvasZoom,
  isMajorLocation,
  nameVisibleAt,
  lensVisibleAt,
  detailVisibleAt,
  reticleLockState,
  MAP_ZOOM_TIER_LABEL,
  type MapZoomTier,
} from '@/lib/game/map-zoom';
import { getAtmosphere, computeSlotRing, getBodyPalette, SLOT_SEGMENT_STYLE, type SlotRingModel, type BodyKind } from '@/lib/game/map-bodies';
// Zoom & close-cluster pass — pure camera math (cursor-centred wheel zoom,
// pinch, nearest-hit picking with touch-target floors) shared with the unit
// tests. See map-camera.ts for why: the near-Earth cluster (leo / geo /
// lunar_orbit / lunar_surface) was effectively unclickable, worst on phones.
import {
  DEFAULT_MAP_CAMERA,
  BUTTON_ZOOM_FACTOR,
  DRAG_CLICK_SLOP_PX,
  KEY_PAN_STEP_PX,
  zoomAboutPoint,
  wheelZoom,
  pinchCamera,
  hitRadius,
  pickNearest,
  MIN_HIT_RADIUS_PX,
  type MapCamera,
  type PinchState,
  type HitCandidate,
} from '@/lib/game/map-camera';
import GameIcon from './GameIcon';
import { ConsolePanel, DataChip } from './chrome';
// Graphics review 2026-09-12: Lanes/Ships/World visibility may be owned by
// the shell (phone icon strip); 512px sprite variants on phones (item 11).
import { DEFAULT_MAP_LAYERS, toggleMapLayer, type MapLayerVisibility, type MapLayerKey } from '@/lib/game/map-layers';
// Ship traffic layer (2026-09-13): other corporations' ships as anonymised
// contacts (+ NPC backdrop); same placement maths as the 3D renderer.
// Flight mode part (b) — 2D parity for the hull silhouettes (item 7): the
// canvas keeps dots and chevrons, but the chevron varies by hull class so
// freighter / miner / survey / flagship are distinguishable here too.
import { hullGlyphFor, hullGlyphPoints, type HullGlyph } from '@/lib/game/map-hulls';
import {
  hullClassOf,
  placeContacts,
  contactLabel,
  contactDetail,
  corpRingColor,
  FACTION_CONTACT_TINT,
  ANON_CONTACT_COLOR,
  type TrafficContact,
  type ContactAnchor,
} from '@/lib/game/ship-traffic';
import { getArtVariant } from '@/lib/game/assets';
import { MAP_GLYPHS } from '@/lib/game/map-glyphs';
// Flight mode part (a) — the 2D orbit diagram: the same LocalSceneModel the
// 3D local scene draws (body, rings, pips, glints, ships), laid out by
// layoutLocalDiagram(). Enter/exit rules match the 3D map (a selection
// enters; System chip / Escape / zooming out leaves); flight degrades to a
// cut, which is also the reduced-motion answer.
import {
  buildLocalSceneModel,
  localBodyForLocation,
  layoutLocalDiagram,
  localAnchorsAt,
  localMoonOffset,
  glintAngle,
  bodyName,
  SLOT_PIP_STYLE,
  countContactsByBody,
  contactCountText,
  type LocalSceneModel,
  type LocalShell,
} from '@/lib/game/map-flight';
// Graphics Phase 2 (item 4): the region tint the 2D stage washes with —
// the SAME table the 3D skybox / particles read (map-regions.ts), keyed by
// the local body or the selected location. 2D parity for region identity.
import { MAP_REGION_SKY, regionForBody, regionForLocation } from '@/lib/game/map-regions';
import { ORBITAL_BODY_MAP } from '@/lib/game/orbital-elements';

/** Quadratic-bezier point at parameter u — shared by the ship-transit
 *  polyline and its engine-trail sample points (Wave V7). */
function quadPoint(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, u: number): { x: number; y: number } {
  const mu = Math.max(0, Math.min(1, u));
  const inv = 1 - mu;
  return {
    x: inv * inv * x0 + 2 * inv * mu * cx + mu * mu * x1,
    y: inv * inv * y0 + 2 * inv * mu * cy + mu * mu * y1,
  };
}

// Friendly group labels for the keyboard-accessible Location List, keyed by
// SolarSystemLocation.type. Mirrors the bodies actually present in LOCATIONS.
export const REGION_LABELS: Record<LocationType, string> = {
  earth_surface: 'Earth',
  earth_orbit: 'Earth Orbit',
  moon: 'Lunar System',
  mars: 'Mars System',
  asteroid_belt: 'Asteroid Belt',
  jupiter: 'Jovian System',
  saturn: 'Saturnian System',
  outer_system: 'Outer System',
  mercury: 'Mercury',
  venus: 'Venus',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

// Group LOCATIONS by region once at module load — the list is static.
// Exported so the WebGL renderer (SolarMap3D) can present the identical
// keyboard-accessible Location List — one grouping, two renderers.
export const LOCATIONS_BY_REGION: { type: LocationType; locations: typeof LOCATIONS }[] = (() => {
  const order: LocationType[] = [];
  const groups = new Map<LocationType, typeof LOCATIONS>();
  for (const loc of LOCATIONS) {
    if (!groups.has(loc.type)) {
      groups.set(loc.type, []);
      order.push(loc.type);
    }
    groups.get(loc.type)!.push(loc);
  }
  return order.map(type => ({ type, locations: groups.get(type)! }));
})();

interface SolarSystemCanvasProps {
  state: GameState;
  onUnlock: (locId: string) => void;
  /** Notify the parent shell when the user focuses a location, so the region
   *  backdrop + any ambient ops can follow the player's attention. Passing
   *  null means the user deselected (clicked empty space).
   *  Wave A2: an optional `anchor` (container-relative px) accompanies map
   *  clicks / context requests so the parent can open the radial command
   *  menu AT the body. Omitted (Location List, external focus) = open the
   *  full context panel instead, which is the keyboard-friendly path. */
  onSelectLocation?: (locId: string | null, anchor?: { x: number; y: number }) => void;
  /** Wave A2 — accessibility override for zoom-based information layering:
   *  when true every label/badge renders at every zoom level, so no value is
   *  ever zoom-only. */
  alwaysLabels?: boolean;
  /** Wave A2 — report the live zoom tier so the shell HUD can name it. */
  onZoomTierChange?: (tier: MapZoomTier) => void;
  /** Map-first command mode (Wave 9): canvas fills its container's full
   *  height instead of a fixed 460px, the inline "Selected Location Details"
   *  card is suppressed (the parent's MapContextPanel takes over that job),
   *  and the keyboard-accessible Location List becomes a collapsible overlay
   *  instead of a stacked block, so the canvas keeps the whole viewport. */
  embedded?: boolean;
  /** Controlled selection — lets the parent (map command center) drive the
   *  highlighted location from the Order Queue HUD or the context panel's
   *  close button, staying in sync with clicks/keyboard selection made here. */
  selectedLocationId?: string | null;
  /** Wave V4 — active map lens (Standard / Economy / Hazard / Territory /
   *  Logistics). Pure recolor + re-badge of existing data, derived by the
   *  SAME map-modes.ts functions the 3D renderer uses (parity requirement —
   *  this canvas is the a11y renderer). */
  mapMode?: MapMode;
  /** Wave V4 — freeze rendering entirely (desktop map-as-stage: the map is
   *  fully covered by a panel overlay; parity with SolarMap3D's `active`).
   *  The last painted frame is retained — no per-frame work while covered. */
  active?: boolean;
  /** Flow-map lane-volume layer (GAME_DESIGN_REVIEW_2026-09 §2 row 3):
   *  laneKey → { v: 0..1 normalised dispatches, n: dispatches }. Lanes with
   *  an entry draw thicker, amber, and labelled with their count. Static —
   *  reduced-motion safe. */
  laneVolumes?: Record<string, { v: number; n: number }> | null;
  /** Graphics review 2026-09-12 item 5 — controlled Lanes/Ships/World
   *  visibility. When the shell passes these, the renderer's own toggle
   *  column is hidden on phones (the shell's icon strip carries the
   *  switches) and shown from md up; when absent the renderer keeps
   *  private state exactly as before. */
  layers?: MapLayerVisibility;
  onToggleLayer?: (key: MapLayerKey) => void;
  /** Ship traffic layer — other corporations' anonymised contacts + NPC
   *  backdrop (shell-polled /api/space-tycoon/traffic). Empty when the
   *  layer is off or the feed is unavailable. */
  contacts?: TrafficContact[];
  contactsAsOfMs?: number;
  /** Flight mode (part a): shell requests — enter a body's local diagram,
   *  return to the system, or re-frame the selection (same contract as the
   *  3D renderer; here every transition is a cut). */
  cameraRequest?: { kind: 'local' | 'system' | 'frame'; bodyId?: string | null; token: number } | null;
  onLocalBodyChange?: (bodyId: string | null) => void;
}

/** Local-diagram zoom bounds. Zooming out past the floor leaves the local
 *  view — the 2D answer to "back out past the local sphere". */
const LOCAL_ZOOM_MIN = 0.7;
const LOCAL_ZOOM_MAX = 2.6;

interface LocalHit { id: string; x: number; y: number; r: number; kind: 'body' | 'moon' | 'ring' }

// Visual layout: positions per location (this flat projection's own geometry).
// y values intentionally spread to give the belt + moons some visual depth.
// Wave A2.2: colour / kind / radius moved to map-bodies.BODY_PALETTE so the
// location detail console renders the SAME body — merged back in below, so
// every `layout.color` / `layout.radius` read site is unchanged.
const LOCATION_POSITION: Record<string, { x: number; y: number }> = {
  earth_surface: { x: 0.18, y: 0.50 },
  leo:           { x: 0.215, y: 0.36 },
  geo:           { x: 0.25,  y: 0.66 },
  lunar_orbit:   { x: 0.32,  y: 0.40 },
  lunar_surface: { x: 0.33,  y: 0.58 },
  mars_orbit:    { x: 0.48,  y: 0.40 },
  mars_surface:  { x: 0.48,  y: 0.60 },
  asteroid_belt: { x: 0.60,  y: 0.50 },
  jupiter_system:{ x: 0.73,  y: 0.45 },
  saturn_system: { x: 0.85,  y: 0.55 },
  outer_system:  { x: 0.94,  y: 0.50 },
  // Colony locations — share body positions with orbits for visual proximity
  mercury_surface: { x: 0.10, y: 0.52 },
  venus_orbit:     { x: 0.14, y: 0.48 },
  ceres_surface:   { x: 0.58, y: 0.47 },
  io_surface:      { x: 0.70, y: 0.44 },
  europa_surface:  { x: 0.72, y: 0.42 },
  ganymede_surface:{ x: 0.74, y: 0.46 },
  callisto_surface:{ x: 0.76, y: 0.48 },
  titan_surface:   { x: 0.84, y: 0.58 },
  enceladus_surface:{ x: 0.86, y: 0.53 },
  titania_surface: { x: 0.93, y: 0.48 },
  triton_surface:  { x: 0.95, y: 0.52 },
  pluto_surface:   { x: 0.97, y: 0.50 },
};

const LOCATION_LAYOUT: Record<string, {
  x: number; y: number; radius: number; color: string; glowColor: string; type: BodyKind;
}> = Object.fromEntries(
  Object.entries(LOCATION_POSITION).map(([id, pos]) => {
    const p = getBodyPalette(id);
    return [id, { x: pos.x, y: pos.y, radius: p.baseRadius, color: p.color, glowColor: p.glowColor, type: p.kind }];
  }),
);

// Role → color for ship rendering (fallback chevron color when sprite unloaded)
const SHIP_COLOR: Record<string, string> = {
  transport: '#22d3ee',
  tanker: '#60a5fa',
  mining: '#fbbf24',
  survey: '#c084fc',
};

// Location → planet sprite WebP. Uses the Phase-0 art library.
const LOCATION_SPRITE: Record<string, string> = {
  earth_surface:    '/game/texture-earth.webp',
  leo:              '/game/planet-colony.webp',
  geo:              '/game/planet-colony.webp',
  lunar_orbit:      '/game/texture-moon.webp',
  lunar_surface:    '/game/texture-moon.webp',
  mars_orbit:       '/game/texture-mars.webp',
  mars_surface:     '/game/texture-mars.webp',
  asteroid_belt:    '/game/planet-asteroid-field.webp',
  jupiter_system:   '/game/texture-gas-giant.webp',
  saturn_system:    '/game/texture-gas-giant.webp',
  outer_system:     '/game/planet-nebula.webp',
  mercury_surface:  '/game/planet-lava.webp',
  venus_orbit:      '/game/planet-desert.webp',
  ceres_surface:    '/game/planet-asteroid-field.webp',
  io_surface:       '/game/planet-lava.webp',
  europa_surface:   '/game/planet-ice.webp',
  ganymede_surface: '/game/planet-ice.webp',
  callisto_surface: '/game/planet-ice.webp',
  titan_surface:    '/game/planet-colony.webp',
  enceladus_surface:'/game/planet-ice.webp',
  titania_surface:  '/game/planet-ice.webp',
  triton_surface:   '/game/planet-ice.webp',
  pluto_surface:    '/game/planet-ice.webp',
};

// Ship role → sprite. The existing art has per-role ship files already.
const SHIP_SPRITE: Record<string, string> = {
  transport: '/game/ship-space-freighter.webp',
  tanker:    '/game/ship-fuel-tanker.webp',
  mining:    '/game/ship-mining-drone.webp',
  survey:    '/game/ship-scout.webp',
};

const BG_NEBULA = '/game/bg-space-nebula.webp';

interface StarField {
  x: number;
  y: number;
  size: number;
  speed: number;   // twinkle speed
  phase: number;
  layer: 0 | 1 | 2;  // parallax layer — 0 = farthest, 2 = closest
}

/** Load a set of image URLs once and cache the resulting HTMLImageElements
 *  in a ref. Returns the cache and a loaded flag so the draw loop can skip
 *  sprite rendering until they're ready. */
function useImageCache(urls: string[]): { cache: Map<string, HTMLImageElement>; loaded: boolean } {
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unique = Array.from(new Set(urls));
    let remaining = unique.length;
    if (remaining === 0) { setLoaded(true); return; }
    for (const url of unique) {
      if (cacheRef.current.has(url)) { remaining--; continue; }
      const img = new Image();
      img.src = url;
      img.onload = () => {
        if (cancelled) return;
        cacheRef.current.set(url, img);
        remaining--;
        if (remaining <= 0) setLoaded(true);
      };
      img.onerror = () => {
        remaining--;
        if (remaining <= 0) setLoaded(true);
      };
    }
    return () => { cancelled = true; };
  }, [urls.join('|')]);  // eslint-disable-line react-hooks/exhaustive-deps

  return { cache: cacheRef.current, loaded };
}

const NO_CONTACTS: TrafficContact[] = [];

export default function SolarSystemCanvas({ state, onUnlock, onSelectLocation, embedded, selectedLocationId, mapMode = 'standard', active = true, alwaysLabels = false, onZoomTierChange, laneVolumes, layers, onToggleLayer, contacts = NO_CONTACTS, contactsAsOfMs = 0, cameraRequest, onLocalBodyChange }: SolarSystemCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);

  // Stay in sync with an externally-driven selection (e.g. the Order Queue
  // HUD or the map context panel's close button in embedded mode).
  //
  // A jump from outside the renderer (map jump hotkeys, Order Queue chip,
  // Outliner deep-link) has to bring the camera with it. Without this the
  // reticle lands on a body that is off-screen or a few pixels wide and the
  // jump reads as "nothing happened". Held in a ref because the focus helper
  // is defined further down, after the layout maths it depends on; the ref is
  // assigned during render, so it is always set before any effect runs.
  const focusExternalRef = useRef<((locId: string) => void) | null>(null);
  useEffect(() => {
    if (selectedLocationId !== undefined && selectedLocationId !== selectedLoc) {
      setSelectedLoc(selectedLocationId);
      if (selectedLocationId) focusExternalRef.current?.(selectedLocationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);
  // Camera = zoom + pan offset. React state drives the draw loop; camRef
  // mirrors it synchronously so native/pointer handlers (which can fire
  // several times between renders — wheel, pinch) always compose against the
  // latest camera instead of a stale closure. ALL camera mutations go through
  // applyCamera so the two can never diverge.
  const [offset, setOffset] = useState({ x: DEFAULT_MAP_CAMERA.x, y: DEFAULT_MAP_CAMERA.y });
  const [zoom, setZoom] = useState(DEFAULT_MAP_CAMERA.zoom);
  const camRef = useRef<MapCamera>(DEFAULT_MAP_CAMERA);
  const applyCamera = useCallback((next: MapCamera) => {
    camRef.current = next;
    setZoom(next.zoom);
    setOffset({ x: next.x, y: next.y });
  }, []);
  const [dragging, setDragging] = useState(false);
  // Pointer-gesture state (refs — no re-render per move). Pointer events
  // unify mouse and touch: the previous mouse-only handlers left phones —
  // which are FORCED onto this renderer by the 3D gating — with no way to
  // pan or zoom at all.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null);
  const movedRef = useRef(0); // px travelled since pointerdown — click-vs-drag guard
  // Lanes / Ships / World — controlled by the shell when it passes `layers`
  // (graphics review item 5: the phone icon strip owns the switches), else
  // private state as before.
  const [localLayers, setLocalLayers] = useState<MapLayerVisibility>(DEFAULT_MAP_LAYERS);
  const layerVis = layers ?? localLayers;
  const showLanes = layerVis.lanes;
  const showShips = layerVis.ships;
  const showContacts = layerVis.contacts;
  const showWorld = layerVis.world;
  const toggleLayer = useCallback((key: MapLayerKey) => {
    if (onToggleLayer) onToggleLayer(key);
    else setLocalLayers(prev => toggleMapLayer(prev, key));
  }, [onToggleLayer]);
  const animRef = useRef(0);
  // Ship traffic: last-drawn contact pixels (for the tap hit-test) and the
  // tapped contact's tag. Written by draw(), read by handleClick.
  const contactPxRef = useRef<{ x: number; y: number; contact: TrafficContact }[]>([]);
  const [contactTag, setContactTag] = useState<{ contact: TrafficContact; x: number; y: number } | null>(null);
  useEffect(() => { if (!showContacts || contacts.length === 0) setContactTag(null); }, [showContacts, contacts.length]);

  // ── Flight mode (part a): the local orbit diagram ─────────────────────────
  const [localBody, setLocalBody] = useState<string | null>(null);
  const [localZoom, setLocalZoom] = useState(1);
  const localZoomRef = useRef(1);
  const localHitsRef = useRef<LocalHit[]>([]);
  const localShipPxRef = useRef<{ x: number; y: number; title: string; detail: string }[]>([]);
  const [localTag, setLocalTag] = useState<{ title: string; detail: string; x: number; y: number } | null>(null);
  const onLocalBodyChangeRef = useRef(onLocalBodyChange);
  onLocalBodyChangeRef.current = onLocalBodyChange;
  useEffect(() => { onLocalBodyChangeRef.current?.(localBody); }, [localBody]);
  const setLocalZoomBoth = useCallback((z: number) => {
    const c = Math.max(LOCAL_ZOOM_MIN, Math.min(LOCAL_ZOOM_MAX, z));
    localZoomRef.current = c;
    setLocalZoom(c);
  }, []);
  const enterLocal = useCallback((bodyId: string) => {
    playSound('click');
    setLocalTag(null);
    setLocalZoomBoth(1);
    setLocalBody(bodyId);
  }, [setLocalZoomBoth]);
  const exitLocal = useCallback(() => {
    setLocalTag(null);
    setLocalBody(null);
  }, []);

  // World presence (audit Change #3 / D1) — other corporations' colony
  // claims per location, shared/cached across every consumer of the hook.
  const { world, available: worldAvailable } = useWorldState();
  const worldLayerActive = showWorld && worldAvailable;

  // Keyboard-accessible Location List — collapsed by default on desktop, but
  // defaults open for prefers-reduced-motion users (see effect below) since
  // the canvas's drag/zoom/animated-pulse interactions are the least
  // accessible part of this component for them. The toggle button itself is
  // always in the normal tab order regardless of collapsed state, so it's
  // reachable by keyboard either way.
  const [listExpanded, setListExpanded] = useState(false);

  // Track prefers-reduced-motion so the render loop can skip/flatten purely
  // decorative motion (starfield twinkle, sun pulse, lane traffic pulses,
  // orbiting satellite/ship dots) while keeping functional motion — ship
  // transit interpolation reflects real travel time and stays untouched.
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    if (mq.matches) setListExpanded(true);
    const onChange = () => {
      reducedMotionRef.current = mq.matches;
      if (mq.matches) setListExpanded(true);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Wave V7 (docs/VISUAL_DEPTH_2026-08.md §V7) — order-ack / completion pings.
  // Subscribed once; only location-targeted pings are relevant to this
  // renderer (system-targeted pings belong to GalacticMapView). Pruned every
  // draw() frame against a fixed lifetime — bounded list, no accumulation.
  const pingsRef = useRef<MapPingEvent[]>([]);
  useEffect(() => onMapPing(ping => {
    if (ping.target.kind !== 'location') return;
    pingsRef.current = [...pingsRef.current, ping];
  }), []);

  // Narrow-viewport flag for the phone perf budget (engine trails capped at
  // 3 concurrent ships on <768px — spec V7). Updated in the canvas-sizing
  // resize effect below, not window.innerWidth, since that's the actual
  // rendering surface width.
  const narrowRef = useRef(false);

  // Preload every planet sprite + every ship role sprite + nebula bg. Safe to
  // render before these resolve — we fall back to procedural circles/chevrons.
  // Graphics review 2026-09-12 item 11: phones (<768px — the viewports this
  // renderer is forced on to) load the 512px sprite siblings emitted by
  // scripts/resize-art.ts instead of the 1024px originals (~1.6 MB → ~0.3
  // MB). Resolved synchronously in the lazy initializer so the FIRST
  // preload already asks for the small files — an effect would have kicked
  // off the full-size fetches one render earlier. The value does not reach
  // the markup, so SSR (false) cannot cause a hydration mismatch.
  const [phoneSprites] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const spriteUrlFor = useCallback((base: string) => (phoneSprites ? getArtVariant(base, 512) : base), [phoneSprites]);
  const assetUrls = useMemo<string[]>(
    () => Array.from(new Set<string>([
      ...Object.values(LOCATION_SPRITE).map(spriteUrlFor),
      ...Object.values(SHIP_SPRITE).map(spriteUrlFor),
      BG_NEBULA,
    ])),
    [spriteUrlFor],
  );
  const imgs = useImageCache(assetUrls);

  // Pre-generate a stable starfield, 3 depth layers for parallax effect.
  const starfield = useMemo<StarField[]>(() => {
    const stars: StarField[] = [];
    for (let i = 0; i < 360; i++) {
      const seed = i * 7 + 42;
      const layerRoll = ((Math.sin(seed * 29) * 10000) % 1 + 1) % 1;
      const layer: 0 | 1 | 2 = layerRoll < 0.55 ? 0 : layerRoll < 0.85 ? 1 : 2;
      stars.push({
        x: ((Math.sin(seed) * 10000) % 1 + 1) % 1,
        y: ((Math.sin(seed * 3 + 5) * 10000) % 1 + 1) % 1,
        size: (layer === 0 ? 0.4 : layer === 1 ? 0.7 : 1.2) + ((Math.sin(seed * 17) * 10000) % 1 + 1) % 1 * 0.8,
        speed: 0.3 + ((Math.sin(seed * 11) * 10000) % 1 + 1) % 1 * 0.8,
        phase: ((Math.sin(seed * 23) * 10000) % 1 + 1) % 1 * Math.PI * 2,
        layer,
      });
    }
    return stars;
  }, []);

  // Resolve a location id to its layout, if present.
  const layoutOf = useCallback((locationId: string) => LOCATION_LAYOUT[locationId], []);

  // W9 parity subset: zone standing glyph per location (crown governor / diamond
  // stakeholder — text glyph, not color-only) and severe-hazard forecast
  // locations for the amber telegraph markers below.
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
  const warningLocs = useMemo(
    () => new Set((state.hazardWarnings || []).map(w => w.locationId)),
    [state.hazardWarnings],
  );

  // Wave V4 — mode lens derivation (pure, shared with SolarMap3D). Recomputed
  // only on state/mode change; the draw loop does per-draw color lookups
  // against this record — no extra passes (60Hz phone budget).
  const modeVisuals = useMemo(
    () => computeModeVisuals(state, mapMode, Date.now()),
    [state, mapMode],
  );

  // ── Wave A2 ────────────────────────────────────────────────────────────────
  // Zoom tier: derived from the canvas zoom multiplier by the SAME module the
  // 3D renderer feeds camera distance into. Kept in a ref for the draw loop
  // (no re-render at 60Hz) and mirrored to the parent HUD via a state echo.
  const zoomTier = useMemo(() => zoomTierFromCanvasZoom(zoom), [zoom]);
  useEffect(() => { onZoomTierChange?.(zoomTier); }, [zoomTier, onZoomTierChange]);

  // Orbital-slot rings (item 3): REAL sync-delivered occupancy, fail-soft to
  // your-footprint-only when the save has never synced.
  const slotRings = useMemo(() => {
    const out: Record<string, SlotRingModel> = {};
    for (const loc of LOCATIONS) {
      const ring = computeSlotRing(state, loc.id);
      if (ring) out[loc.id] = ring;
    }
    return out;
  }, [state]);

  // The local scene model, cached per body and rebuilt on data change.
  const localCacheRef = useRef<Map<string, LocalSceneModel>>(new Map());
  useEffect(() => { localCacheRef.current.clear(); }, [state, contacts, world]);
  const localModel = useMemo(() => {
    if (!localBody) return null;
    const cached = localCacheRef.current.get(localBody);
    if (cached) return cached;
    const built = buildLocalSceneModel(state, localBody, { contacts, nowMs: Date.now(), worldNames: world?.world.colonies ?? null });
    if (built) localCacheRef.current.set(localBody, built);
    return built;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localBody, state, contacts, world]);
  useEffect(() => { if (localBody && !localModel) setLocalBody(null); }, [localBody, localModel]);
  // Phase 2 (item 4): region wash — inside a local view the body's region,
  // otherwise the selected location's (the inner system by default).
  const regionTint = useMemo(() => {
    const region = localBody ? regionForBody(localBody) : selectedLoc ? regionForLocation(selectedLoc) : 'inner_system';
    return MAP_REGION_SKY[region].tint;
  }, [localBody, selectedLoc]);
  // Addendum (c): contacts per body for the Location List + the local chip.
  const contactCounts = useMemo(() => countContactsByBody(contacts), [contacts]);

  // Selection lock-on (item 4): the reticle converges on to the body when a
  // new selection is acquired. Timestamped in a ref so the draw loop can ease
  // it without re-rendering.
  const selectionAtRef = useRef<number>(0);
  useEffect(() => { selectionAtRef.current = performance.now(); }, [selectedLoc]);

  const draw = useCallback((timestampMs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Clear with space gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#030310');
    bgGrad.addColorStop(1, '#05051a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Nebula backdrop — tinted low-opacity wash across the canvas.
    const nebula = imgs.cache.get(BG_NEBULA);
    if (nebula) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.drawImage(nebula, 0, 0, w, h);
      ctx.restore();
    }
    // Region wash (Phase 2 item 4, 2D parity): two radial tints from the
    // shared region table — top-left `a`, bottom-right `b`.
    const washR = Math.max(w, h) * 0.85;
    const washA = ctx.createRadialGradient(w * 0.2, h * 0.15, 0, w * 0.2, h * 0.15, washR);
    washA.addColorStop(0, regionTint.a);
    washA.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = washA;
    ctx.fillRect(0, 0, w, h);
    const washB = ctx.createRadialGradient(w * 0.85, h * 0.9, 0, w * 0.85, h * 0.9, washR);
    washB.addColorStop(0, regionTint.b);
    washB.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = washB;
    ctx.fillRect(0, 0, w, h);

    // ─── Stars (twinkling, 3-layer parallax) ─────────────────────
    // Farthest layer (0) barely shifts with pan; closest (2) tracks full offset.
    const tSec = timestampMs * 0.001;
    const reducedMotion = reducedMotionRef.current;
    const PARALLAX = [0.3, 0.6, 1.0] as const;
    for (const s of starfield) {
      const p = PARALLAX[s.layer];
      const sx = (s.x * w + offset.x * p) % w;
      const sy = (s.y * h + offset.y * p) % h;
      const wx = sx < 0 ? sx + w : sx;
      const wy = sy < 0 ? sy + h : sy;
      // Reduced motion: hold stars at a fixed brightness instead of twinkling.
      const alpha = reducedMotion ? 0.45 : 0.15 + Math.abs(Math.sin(tSec * s.speed + s.phase)) * 0.55;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(wx, wy, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flight mode (part a): inside a local view the diagram replaces the
    // system entirely (the same swap the 3D map makes at the local sphere).
    if (localModel) {
      drawLocalDiagram(ctx, w, h, localModel, {
        zoom: localZoom,
        tSec,
        reducedMotion,
        selectedLoc,
        showShips,
        showContacts,
        contactsAsOfMs,
        sprites: imgs.cache,
        spriteUrlFor,
        lockElapsedMs: timestampMs - selectionAtRef.current,
        hits: localHitsRef.current,
        shipPx: localShipPxRef.current,
      });
      contactPxRef.current = [];
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    // Zoom pass: BOTH axes scale with zoom. The original transform scaled x
    // only, so zooming never spread the near-Earth cluster vertically — the
    // root cause of leo/geo/lunar_orbit/lunar_surface being unclickable.
    const sunX = 0.04 * w * zoom + offset.x;
    const sunY = 0.5 * h * zoom + offset.y;

    // ─── Shipping lane overlays (with animated traffic pulses) ───
    if (showLanes) {
      ctx.lineWidth = 1;
      for (const lane of LANES) {
        const fromLayout = layoutOf(lane.from);
        const toLayout = layoutOf(lane.to);
        if (!fromLayout || !toLayout) continue;
        const unlockedBoth = state.unlockedLocations.includes(lane.from) && state.unlockedLocations.includes(lane.to);
        const fx = fromLayout.x * w * zoom + offset.x;
        const fy = fromLayout.y * h * zoom + offset.y;
        const tx = toLayout.x * w * zoom + offset.x;
        const ty = toLayout.y * h * zoom + offset.y;
        const vol = laneVolumes ? laneVolumes[laneKey(lane.from, lane.to)] : undefined;
        ctx.lineWidth = vol ? 1 + 3 * vol.v : 1;
        ctx.strokeStyle = vol ? `rgba(251,191,36,${0.25 + 0.5 * vol.v})` : unlockedBoth ? 'rgba(34,211,238,0.12)' : 'rgba(100,116,139,0.05)';
        ctx.setLineDash(unlockedBoth || vol ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (vol) {
          // Volume label — the count in text, so width is never the only cue.
          ctx.save();
          ctx.font = `600 ${9 * zoom}px Inter, sans-serif`;
          ctx.fillStyle = 'rgba(253,230,138,0.95)';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(vol.n)} runs`, (fx + tx) / 2, (fy + ty) / 2 - 4 * zoom);
          ctx.restore();
        }

        // Animated flow pulses on active lanes (both endpoints unlocked).
        // 3 dots staggered across the chord; t cycles every 4s.
        // Reduced motion: show one static midpoint dot (lane is active) instead
        // of continuously traveling pulses.
        if (unlockedBoth && reducedMotion) {
          const mx = (fx + tx) / 2;
          const my = (fy + ty) / 2;
          ctx.fillStyle = 'rgba(34,211,238,0.5)';
          ctx.beginPath();
          ctx.arc(mx, my, 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (unlockedBoth) {
          const laneSeed = (lane.from.charCodeAt(0) + lane.to.charCodeAt(0)) * 0.13;
          for (let k = 0; k < 3; k++) {
            const t = (((tSec * 0.25) + laneSeed + k / 3) % 1 + 1) % 1;
            const px = fx + (tx - fx) * t;
            const py = fy + (ty - fy) * t;
            const fade = Math.sin(t * Math.PI);
            ctx.fillStyle = `rgba(34,211,238,${0.55 * fade})`;
            ctx.beginPath();
            ctx.arc(px, py, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }

    // ─── Sun ──────────────────────────────────────────────────────
    const sunPulse = reducedMotion ? 1 : 1 + Math.sin(tSec * 0.5) * 0.04;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 70 * zoom * sunPulse);
    sunGrad.addColorStop(0, 'rgba(254,240,138,0.9)');
    sunGrad.addColorStop(0.25, 'rgba(251,191,36,0.5)');
    sunGrad.addColorStop(0.6, 'rgba(245,158,11,0.15)');
    sunGrad.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70 * zoom * sunPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 13 * zoom * sunPulse, 0, Math.PI * 2);
    ctx.fill();

    // ─── Orbit lines (subtle) ─────────────────────────────────────
    ctx.strokeStyle = 'rgba(100,116,139,0.08)';
    ctx.lineWidth = 0.5;
    const drawnOrbits = new Set<number>();
    for (const loc of LOCATIONS) {
      const layout = layoutOf(loc.id);
      if (!layout) continue;
      const lx = layout.x * w * zoom + offset.x;
      const ly = layout.y * h * zoom + offset.y;
      const dist = Math.round(Math.sqrt(Math.pow(lx - sunX, 2) + Math.pow(ly - sunY, 2)));
      if (drawnOrbits.has(dist)) continue;
      drawnOrbits.add(dist);
      ctx.beginPath();
      ctx.arc(sunX, sunY, dist, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ─── Locations ────────────────────────────────────────────────
    const locationPx: Record<string, { x: number; y: number }> = {};
    for (const loc of LOCATIONS) {
      const layout = layoutOf(loc.id);
      if (!layout) continue;
      const lx = layout.x * w * zoom + offset.x;
      const ly = layout.y * h * zoom + offset.y;
      const r = layout.radius * zoom;
      locationPx[loc.id] = { x: lx, y: ly };

      const unlocked = state.unlockedLocations.includes(loc.id);
      const isSelected = selectedLoc === loc.id;
      const buildingsHere = state.buildings.filter(b => b.locationId === loc.id);
      const completedHere = buildingsHere.filter(b => b.isComplete).length;
      const npcCount = (state.npcCompanies || []).filter(n => n.unlockedLocations.includes(loc.id)).length;

      // Wave A2 — zoom-based information layering. Allocation-free predicates
      // shared with SolarMap3D (map-zoom.ts); `alwaysLabels` forces the full
      // detail answer so information is never zoom-only.
      const showName = nameVisibleAt(zoomTier, isMajorLocation(loc.id), completedHere > 0, alwaysLabels);
      const showLens = lensVisibleAt(zoomTier, alwaysLabels);
      const showDetail = detailVisibleAt(zoomTier, alwaysLabels);

      // Outer glow for unlocked locations
      if (unlocked) {
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 3);
        glow.addColorStop(0, `${layout.glowColor}70`);
        glow.addColorStop(0.4, `${layout.glowColor}20`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Selection reticle (Wave V4, upgraded to a lock-on in Wave A2) — the
      // ring converges from a wide radius on to the body over ~420ms, then
      // settles into the V4 idle spin. Corner brackets make the acquisition
      // read as a target lock rather than a highlight. Reduced motion snaps
      // straight to the locked state (reticleLockState handles that).
      if (isSelected) {
        const lock = reticleLockState(timestampMs - selectionAtRef.current, reducedMotion);
        const pulse = reducedMotion || !lock.locked ? 1 : 1 + Math.sin(tSec * 3) * 0.08;
        const ringR = (r + 6) * pulse * lock.radiusScale;
        ctx.save();
        ctx.globalAlpha = lock.opacity;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = reducedMotion ? 0 : -tSec * 14;
        ctx.beginPath();
        ctx.arc(lx, ly, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(34,211,238,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(lx, ly, ringR + 5, 0, Math.PI * 2);
        ctx.stroke();
        // Four corner brackets at the diagonals — shape, not colour, is what
        // says "locked", so the state survives a colourblind palette.
        const bracketR = ringR + 5;
        const tick = 5 * zoom;
        ctx.strokeStyle = 'rgba(103,232,249,0.95)';
        ctx.lineWidth = 1.6;
        for (let q = 0; q < 4; q++) {
          const a0 = Math.PI / 4 + q * (Math.PI / 2);
          ctx.beginPath();
          ctx.arc(lx, ly, bracketR, a0 - 0.22, a0 + 0.22);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(lx + Math.cos(a0) * bracketR, ly + Math.sin(a0) * bracketR);
          ctx.lineTo(lx + Math.cos(a0) * (bracketR + tick), ly + Math.sin(a0) * (bracketR + tick));
          ctx.stroke();
        }
        ctx.restore();
      }

      // Wave V4 — mode-lens ring (Economy / Hazard / Territory / Logistics).
      // Color is reinforcement only: the glyph/badge text rows below carry
      // the information (colorblind-safe, per-draw lookup — no extra pass).
      const modeVis = modeVisuals[loc.id];
      if (modeVis && showLens) {
        ctx.save();
        ctx.strokeStyle = hexToRgba(modeVis.tint, 0.35 + modeVis.intensity * 0.6);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(lx, ly, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        const modeGlow = ctx.createRadialGradient(lx, ly, r, lx, ly, r * 2.4 + 8);
        modeGlow.addColorStop(0, hexToRgba(modeVis.tint, 0.18 * modeVis.intensity + 0.06));
        modeGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = modeGlow;
        ctx.beginPath();
        ctx.arc(lx, ly, r * 2.4 + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Body — prefer sprite (circular-clipped) when loaded, else gradient sphere.
      const spriteUrl = LOCATION_SPRITE[loc.id];
      const sprite = spriteUrl ? imgs.cache.get(spriteUrlFor(spriteUrl)) : undefined;
      ctx.globalAlpha = unlocked ? 1 : 0.45;
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(sprite, lx - r, ly - r, r * 2, r * 2);
        // Limb-darkening overlay: subtle inner-shadow gradient to preserve the "sphere" illusion
        const darken = ctx.createRadialGradient(lx - r * 0.35, ly - r * 0.35, r * 0.2, lx, ly, r);
        darken.addColorStop(0, 'rgba(255,255,255,0.08)');
        darken.addColorStop(0.55, 'rgba(0,0,0,0)');
        darken.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = darken;
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const bodyGrad = ctx.createRadialGradient(lx - r * 0.3, ly - r * 0.3, 0, lx, ly, r);
        if (unlocked) {
          bodyGrad.addColorStop(0, lightenColor(layout.color, 30));
          bodyGrad.addColorStop(0.6, layout.color);
          bodyGrad.addColorStop(1, darkenColor(layout.color, 40));
        } else {
          bodyGrad.addColorStop(0, '#334155');
          bodyGrad.addColorStop(1, '#1e293b');
        }
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Saturn's rings (special-case)
      if (loc.id === 'saturn_system' && unlocked) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(0.3);
        ctx.strokeStyle = `${layout.glowColor}50`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.8, r * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `${layout.glowColor}30`;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.1, r * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Body outline
      ctx.strokeStyle = unlocked ? `${layout.color}a0` : '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
      ctx.stroke();

      // Wave A2 (item 3) — atmospheric rim. Data-driven from ATMOSPHERES
      // (map-bodies.ts), keyed by location id and scaled from real surface
      // pressure; airless bodies are absent from the table and get nothing,
      // so the presence of the glow is itself information. The 3D renderer
      // reads the SAME table for its BackSide haze shell.
      const atmo = getAtmosphere(loc.id);
      if (atmo && unlocked) {
        const inner = r * 0.94;
        const outer = r * (atmo.shellScale + 0.06);
        const rim = ctx.createRadialGradient(lx, ly, inner, lx, ly, outer);
        rim.addColorStop(0, `${atmo.color}00`);
        rim.addColorStop(0.55, hexToRgba(atmo.color, atmo.opacity));
        rim.addColorStop(1, `${atmo.color}00`);
        ctx.save();
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(lx, ly, outer, 0, Math.PI * 2);
        ctx.fill();
        // Terminator: the sun sits to the LEFT of every body in this layout,
        // so darken the anti-sunward limb to keep the sphere illusion.
        const term = ctx.createLinearGradient(lx - r, ly, lx + r, ly);
        term.addColorStop(0, 'rgba(0,0,0,0)');
        term.addColorStop(0.62, 'rgba(0,0,0,0)');
        term.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = term;
        ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
        ctx.restore();
      }

      // Wave A2 (item 3) — orbital-slot occupancy ring. Only locations with a
      // finite ORBITAL_SLOT_POOL have one; arcs are yours / other
      // corporations / free from the REAL sync-delivered snapshot. Line
      // pattern distinguishes the three kinds so colour is never the only
      // carrier, and the numeric badge below states the counts in text.
      const slotRing = slotRings[loc.id];
      if (slotRing && showLens) {
        const ringR = r + 9 * zoom;
        ctx.save();
        ctx.lineCap = 'butt';
        for (const seg of slotRing.segments) {
          const style = SLOT_SEGMENT_STYLE[seg.kind];
          const a0 = -Math.PI / 2 + seg.startFrac * Math.PI * 2;
          const a1 = -Math.PI / 2 + seg.endFrac * Math.PI * 2;
          ctx.strokeStyle = style.color;
          ctx.lineWidth = Math.max(1, 3.2 * style.weight * zoom);
          ctx.setLineDash(style.dash.map(d => d * zoom));
          ctx.globalAlpha = seg.kind === 'free' ? 0.55 : 0.95;
          ctx.beginPath();
          ctx.arc(lx, ly, ringR, a0, a1);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        if (slotRing.saturated) {
          // Saturation gets a second, unmistakable shape: a full hairline
          // ring outside the segments.
          ctx.strokeStyle = 'rgba(248,113,113,0.85)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(lx, ly, ringR + 3 * zoom, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Label — bigger and bolder. W9: zone-standing text glyph prefix
      // (crown governor / diamond stakeholder) so standing is never color-only.
      const standing = standingByLoc[loc.id];
      // Wave V4 — mode glyph rides IN the label text (shape + text, never
      // color alone), and the mode badge draws as a second text row.
      const modeGlyphSuffix = showLens && modeVis?.glyph ? ` ${modeVis.glyph}` : '';
      const standingPrefix = showLens && standing === 'governor' ? `${MAP_GLYPHS.governor} ` : showLens && standing === 'stakeholder' ? `${MAP_GLYPHS.stakeholder} ` : '';
      const labelText = standingPrefix + loc.name + modeGlyphSuffix;
      let labelRow = ly + r + 14 * zoom;
      if (showName) {
        ctx.fillStyle = unlocked ? '#e2e8f0' : '#64748b';
        ctx.font = `${10 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(labelText, lx, labelRow);
        labelRow += 11 * zoom;
      }
      if (showLens && modeVis?.badge) {
        ctx.save();
        ctx.font = `600 ${9 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = hexToRgba(modeVis.tint, 0.95);
        ctx.fillText(modeVis.badge, lx, labelRow);
        ctx.restore();
        labelRow += 11 * zoom;
      }
      // Slot-pressure readout — the numbers behind the occupancy ring, in
      // text. Lens tier shows the compact badge; detail tier adds the split.
      if (slotRing && showLens) {
        ctx.save();
        ctx.font = `600 ${9 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = slotRing.saturated ? 'rgba(248,113,113,0.95)' : 'rgba(167,139,250,0.95)';
        ctx.fillText(slotRing.badge, lx, labelRow);
        labelRow += 11 * zoom;
        if (showDetail && slotRing.synced) {
          ctx.fillStyle = 'rgba(148,163,184,0.9)';
          ctx.fillText(`you ${slotRing.yours} · rivals ${slotRing.others} · free ${slotRing.free}`, lx, labelRow);
          labelRow += 11 * zoom;
        }
        ctx.restore();
      }

      // Building count badge
      if (showDetail && completedHere > 0) {
        const badgeX = lx + r * 0.7;
        const badgeY = ly - r * 0.7;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 7 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${8 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(completedHere), badgeX, badgeY);
        ctx.textBaseline = 'alphabetic';
      }

      // NPC count badge
      if (showDetail && npcCount > 0) {
        const npcBadgeX = lx - r * 0.7;
        const npcBadgeY = ly - r * 0.7;
        ctx.fillStyle = '#ef444470';
        ctx.beginPath();
        ctx.arc(npcBadgeX, npcBadgeY, 6 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fecaca';
        ctx.font = `bold ${7 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(npcCount), npcBadgeX, npcBadgeY);
        ctx.textBaseline = 'alphabetic';
      }

      // World presence badge — other CORPORATIONS' colony claims here (audit
      // Change #3). Distinct purple/gold from the red NPC badge and cyan
      // building badge so scarcity reads as "other players", not noise.
      const worldCount = worldLayerActive ? (world?.world.colonyCounts[loc.id] || 0) : 0;
      if (showDetail && worldCount > 0) {
        const wBadgeX = lx + r * 0.7;
        const wBadgeY = ly + r * 0.75;
        ctx.fillStyle = '#a855f7c8';
        ctx.beginPath();
        ctx.arc(wBadgeX, wBadgeY, 6.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f3e8ff90';
        ctx.lineWidth = 0.75;
        ctx.stroke();
        ctx.fillStyle = '#f5f3ff';
        ctx.font = `bold ${7 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(worldCount), wBadgeX, wBadgeY);
        ctx.textBaseline = 'alphabetic';
      }

      // Small orbiting dots for player satellites.
      // Reduced motion: hold each dot at a fixed angle instead of orbiting.
      if (showDetail && completedHere > 0) {
        const time = tSec;
        for (let s = 0; s < Math.min(completedHere, 5); s++) {
          const angle = reducedMotion
            ? s * (Math.PI * 2 / 5)
            : time * (0.5 + s * 0.3) + s * (Math.PI * 2 / 5);
          const orbitR = r + 4 + s * 2;
          const sx = lx + Math.cos(angle) * orbitR;
          const sy = ly + Math.sin(angle) * orbitR;
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ─── Ships in transit (player fleet) ──────────────────────────
    if (showShips) {
      const ships = state.ships || [];
      const nowMs = Date.now();
      // Wave V7 — engine trails (EFFECT_ASSETS.engineTrail concept, rendered
      // here as a fading polyline per the spec's 2D treatment). Capped at 3
      // concurrent ships on narrow viewports (phone perf budget); off under
      // reduced motion (functional route-line trail above stays — this is
      // the purely decorative "exhaust" layer).
      let enginetrailsDrawn = 0;
      for (const ship of ships) {
        if (!ship.isBuilt) continue;
        if (!ship.route || ship.status !== 'in_transit') {
          // Stationary ship — render a small chevron orbiting its current location
          const layout = layoutOf(ship.currentLocation);
          const px = locationPx[ship.currentLocation];
          if (!layout || !px) continue;
          const r = layout.radius * zoom;
          const def = SHIP_MAP.get(ship.definitionId);
          const color = def ? SHIP_COLOR[def.role] || '#22d3ee' : '#22d3ee';
          const time = tSec;
          // Reduced motion: hold the ship marker at a fixed position instead
          // of continuously orbiting the location.
          const angle = reducedMotion ? ship.instanceId.charCodeAt(0) * 0.1 : time * 0.8 + ship.instanceId.charCodeAt(0) * 0.1;
          const orbitR = r + 12 + (ship.instanceId.charCodeAt(1) % 6);
          const sx = px.x + Math.cos(angle) * orbitR;
          const sy = px.y + Math.sin(angle) * orbitR;
          const spriteUrl = def ? SHIP_SPRITE[def.role] : undefined;
          const shipSprite = spriteUrl ? imgs.cache.get(spriteUrlFor(spriteUrl)) : undefined;
          drawShip(ctx, sx, sy, angle + Math.PI / 2, color, 3.5 * zoom, shipSprite, hullGlyphFor(hullClassOf(ship.definitionId)));
          continue;
        }
        // Interpolate position from departure → arrival
        const fromLayout = layoutOf(ship.route.from);
        const toLayout = layoutOf(ship.route.to);
        if (!fromLayout || !toLayout) continue;
        const depAt = ship.route.departedAtMs;
        const arrAt = ship.route.arrivalAtMs;
        const total = Math.max(1, arrAt - depAt);
        const t = Math.max(0, Math.min(1, (nowMs - depAt) / total));

        const fx = fromLayout.x * w * zoom + offset.x;
        const fy = fromLayout.y * h * zoom + offset.y;
        const tx = toLayout.x * w * zoom + offset.x;
        const ty = toLayout.y * h * zoom + offset.y;
        // Slight curved trajectory — midpoint lifted perpendicular to the chord
        const midX = (fx + tx) / 2;
        const midY = (fy + ty) / 2;
        const dx = tx - fx;
        const dy = ty - fy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = len > 0 ? -dy / len : 0;
        const perpY = len > 0 ?  dx / len : 0;
        const bendAmount = Math.min(30, len * 0.08);
        const ctrlX = midX + perpX * bendAmount;
        const ctrlY = midY + perpY * bendAmount;
        // Quadratic bezier at parameter t
        const bx = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * ctrlX + t * t * tx;
        const by = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * ctrlY + t * t * ty;
        // Tangent for heading
        const tanX = 2 * (1 - t) * (ctrlX - fx) + 2 * t * (tx - ctrlX);
        const tanY = 2 * (1 - t) * (ctrlY - fy) + 2 * t * (ty - ctrlY);
        const heading = Math.atan2(tanY, tanX);

        // Trail
        ctx.strokeStyle = 'rgba(34,211,238,0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(ctrlX, ctrlY, bx, by);
        ctx.stroke();

        // Wave V7 — engine trail: a short fading polyline immediately behind
        // the ship (distinct from the full-route trail above), sampled
        // directly from the same bezier — no per-frame history buffer, so
        // no accumulation risk.
        if (!reducedMotion && (!narrowRef.current || enginetrailsDrawn < 3)) {
          enginetrailsDrawn++;
          const TRAIL_SEGMENTS = 6;
          const SPACING = 0.018;
          ctx.lineCap = 'round';
          for (let k = 1; k <= TRAIL_SEGMENTS; k++) {
            const u1 = t - (k - 1) * SPACING;
            const u2 = t - k * SPACING;
            if (u2 <= 0) break;
            const p1 = quadPoint(fx, fy, ctrlX, ctrlY, tx, ty, u1);
            const p2 = quadPoint(fx, fy, ctrlX, ctrlY, tx, ty, u2);
            const fade = 1 - k / (TRAIL_SEGMENTS + 1);
            ctx.strokeStyle = `rgba(103,232,249,${0.4 * fade})`;
            ctx.lineWidth = (2 * fade + 0.4) * zoom;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }

        // Ship marker
        const def = SHIP_MAP.get(ship.definitionId);
        const color = def ? SHIP_COLOR[def.role] || '#22d3ee' : '#22d3ee';
        const spriteUrl = def ? SHIP_SPRITE[def.role] : undefined;
        const shipSprite = spriteUrl ? imgs.cache.get(spriteUrlFor(spriteUrl)) : undefined;
        drawShip(ctx, bx, by, heading, color, 4 * zoom, shipSprite, hullGlyphFor(hullClassOf(ship.definitionId)));

        // W9: arrival-countdown label above the transit marker (2D parity
        // with the 3D map's ETA sprites — cheap text draw, no allocation).
        const etaSec = Math.max(0, (arrAt - nowMs) / 1000);
        ctx.save();
        ctx.font = `600 ${9 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = 'rgba(103,232,249,0.95)';
        ctx.fillText(`ETA ${formatCountdown(etaSec)}`, bx, by - 12 * zoom);
        ctx.restore();
      }
    }

    // ─── Ship contacts (other corporations, anonymised; NPC backdrop) ──
    // Same placeContacts() as SolarMap3D: dim dots for anonymised hulls,
    // small diamonds for NPC traffic (shape, not just tint), and a corp-
    // coloured ring around every REVEALED contact.
    contactPxRef.current = [];
    if (showContacts && contacts.length > 0) {
      const anchors: Record<string, ContactAnchor> = {};
      for (const loc of LOCATIONS) {
        const px = locationPx[loc.id];
        const layout = layoutOf(loc.id);
        if (px && layout) anchors[loc.id] = { pos: [px.x, px.y, 0], r: layout.radius * zoom };
      }
      const placed = placeContacts(contacts, anchors, Date.now(), {
        asOfMs: contactsAsOfMs, plane: 'xy', staticOrbit: reducedMotion, orbitGap: 9 + 5 * zoom, bendCap: 30,
      });
      const dotR = Math.max(1.6, 2 * zoom);
      for (const p of placed) {
        const c = p.contact;
        const x = p.pos[0], y = p.pos[1];
        contactPxRef.current.push({ x, y, contact: c });
        if (c.npc) {
          ctx.fillStyle = c.factionHint ? FACTION_CONTACT_TINT[c.factionHint] : ANON_CONTACT_COLOR;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(x, y - dotR * 1.4);
          ctx.lineTo(x + dotR, y);
          ctx.lineTo(x, y + dotR * 1.4);
          ctx.lineTo(x - dotR, y);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (c.intel) {
          // Revealed: the hull-class glyph (item 7 parity — classes are
          // distinguishable by SHAPE) heading along the lane, plus the ring.
          const heading = p.heading ? Math.atan2(p.heading[1], p.heading[0]) : -Math.PI / 2;
          ctx.globalAlpha = 0.95;
          drawShipMarker(ctx, x, y, heading, '#cbd5e1', dotR * 1.15, hullGlyphFor(c.hullClass));
          ctx.globalAlpha = 1;
          ctx.strokeStyle = corpRingColor(c.intel.corpId);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, dotR + 3, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Anonymised: the dim generic dot (class is intelligence not held).
          ctx.fillStyle = ANON_CONTACT_COLOR;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // ─── Wave V7: order-ack / completion pings ─────────────────────
    // Expanding ring at the target location — cyan for a just-issued order,
    // green for a just-finished one. Reduced motion collapses to a single
    // static-radius opacity blink (getPingVisual handles both cases).
    {
      const nowPing = Date.now();
      const stillAlive: MapPingEvent[] = [];
      for (const ping of pingsRef.current) {
        const visual = getPingVisual(ping, nowPing, reducedMotion);
        if (!visual) continue;
        stillAlive.push(ping);
        const px = locationPx[ping.target.id];
        const layout = layoutOf(ping.target.id);
        if (!px || !layout) continue;
        const baseR = layout.radius * zoom;
        const radius = baseR + 6 + visual.radiusProgress * 34;
        ctx.strokeStyle = hexToRgba(PING_COLOR[ping.kind], visual.alpha);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(px.x, px.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      pingsRef.current = stillAlive;
    }

    // ─── Recent hazard indicators ────────────────────────────────
    const recent = (state.recentHazards || []).filter(h => Date.now() - h.occurredAtMs < 60_000);
    for (const h of recent) {
      const px = locationPx[h.locationId];
      if (!px) continue;
      const age = (Date.now() - h.occurredAtMs) / 60_000; // 0-1
      const radius = 10 + age * 30;
      ctx.strokeStyle = h.destroyed ? `rgba(239,68,68,${1 - age})` : `rgba(251,191,36,${1 - age})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px.x, px.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ─── Hazard FORECAST telegraphs (W9 parity subset) ────────────
    // Next-month severe warnings: constant-radius dashed amber ring with a
    // slow pulse (static under reduced motion) + warning glyph — distinct from the
    // expanding active-hazard rings above. Full warning text lives in the
    // context panel / selected-location details.
    const forecastWarnings = state.hazardWarnings || [];
    if (forecastWarnings.length > 0) {
      const drawnWarn = new Set<string>();
      for (const wng of forecastWarnings) {
        if (drawnWarn.has(wng.locationId)) continue;
        drawnWarn.add(wng.locationId);
        const px = locationPx[wng.locationId];
        const layout = layoutOf(wng.locationId);
        if (!px || !layout) continue;
        const wave = reducedMotion ? 0.5 : Math.sin(tSec * 1.8) * 0.5 + 0.5;
        const alpha = 0.35 + wave * 0.35;
        const rr = (layout.radius * zoom + 9) * (reducedMotion ? 1 : 1 + (wave - 0.5) * 0.12);
        ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(px.x, px.y, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = `bold ${10 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(251,191,36,0.95)';
        ctx.fillText(MAP_GLYPHS.warning, px.x, px.y - rr - 4);
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [state, selectedLoc, offset, zoom, starfield, showLanes, showShips, showContacts, contacts, contactsAsOfMs, worldLayerActive, world, layoutOf, imgs.cache, imgs.loaded, standingByLoc, modeVisuals, zoomTier, alwaysLabels, slotRings, laneVolumes, localModel, localZoom, spriteUrlFor, regionTint]);

  // Canvas sizing — re-scale on container resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      narrowRef.current = rect.width < 768;
    };

    resize();
    window.addEventListener('resize', resize);
    // The embedded map-command layout can settle its height after mount
    // (measured shell height, font load, mobile URL-bar changes) — a
    // window-resize listener alone misses those, leaving the scene drawn
    // into a collapsed strip. Observe the container itself.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(container);
    return () => {
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    };
  }, []);

  // Animation loop. Wave V4: fully paused while `active` is false (desktop
  // map-as-stage — the map is covered by a panel overlay; the last frame is
  // retained by the canvas, no per-frame work). Draws once on reactivation.
  useEffect(() => {
    if (!active) return;
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, active]);

  // Shared selection logic — used by both the canvas click handler and the
  // keyboard-focusable Location List buttons below, so the two entry points
  // always stay in sync (same toggle-off behavior, same parent notification).
  /** Pan the viewport so a body sits in the middle. Inverts the same layout
   *  maths the draw loop and hit-test use: lx = layout.x * w * zoom + offset.x
   *  (and ly likewise), solved for the offset that puts lx,ly at the centre. */
  const centreOn = useCallback((locId: string) => {
    // Flight mode (part a): a location that belongs to a body (Earth, LEO →
    // Earth, the Moon …) opens that body's local diagram — the 2D "fly-to",
    // degraded to a cut. Region pips (belt, relay) pan the system as before.
    const bodyId = localBodyForLocation(locId);
    if (bodyId) {
      if (bodyId !== localBody) enterLocal(bodyId);
      return;
    }
    if (localBody) exitLocal();
    const canvas = canvasRef.current;
    const layout = LOCATION_LAYOUT[locId];
    if (!canvas || !layout) return;
    const rect = canvas.getBoundingClientRect();
    const z = camRef.current.zoom;
    // Instant snap, not an animated glide — reduced-motion-safe by default.
    applyCamera({
      zoom: z,
      x: rect.width / 2 - layout.x * rect.width * z,
      y: rect.height / 2 - layout.y * rect.height * z,
    });
  }, [applyCamera, localBody, enterLocal, exitLocal]);
  focusExternalRef.current = centreOn;

  // Shell requests (System / Local chips, Escape, L, G).
  const lastCameraTokenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!cameraRequest || cameraRequest.token === lastCameraTokenRef.current) return;
    lastCameraTokenRef.current = cameraRequest.token;
    if (cameraRequest.kind === 'local' && cameraRequest.bodyId) enterLocal(cameraRequest.bodyId);
    else if (cameraRequest.kind === 'system') exitLocal();
    else if (cameraRequest.kind === 'frame') {
      if (localBody) setLocalZoomBoth(1);
      else if (selectedLoc) centreOn(selectedLoc);
    }
  }, [cameraRequest, enterLocal, exitLocal, localBody, selectedLoc, centreOn, setLocalZoomBoth]);

  /**
   * @param anchor  Screen point to hang the radial command menu on.
   * @param opts.toggle  Whether re-picking the current selection clears it.
   *   Defaults to true for un-anchored picks, preserving click-again-to-
   *   deselect on the map body. The Location List passes false: a list row
   *   that silently deselects reads as "the button did nothing".
   * @param opts.focus  Pan the viewport to centre the body.
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
    if (next && opts?.focus) centreOn(next);
  }, [selectedLoc, onSelectLocation, centreOn]);

  /** Container-relative point for an element (Location List rows opening the
   *  radial menu by keyboard/right-click need an anchor too). */
  const anchorForElement = useCallback((el: HTMLElement | null): { x: number; y: number } | undefined => {
    const root = rootRef.current;
    if (!el || !root) return undefined;
    const r = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    return { x: r.left + r.width / 2 - rr.left, y: r.top + r.height / 2 - rr.top };
  }, []);

  // Click detection. Wave A2: a hit passes the click point up as an anchor so
  // the shell opens the radial command menu AT the body (Sins-style); a miss
  // deselects exactly as before. Zoom pass: nearest-hit with zoom-scaled,
  // touch-target-floored radii (map-camera.ts) — inside the near-Earth
  // cluster the floored targets overlap by design, and nearest-centre picking
  // is what lets leo / geo / lunar_orbit / lunar_surface resolve individually
  // once the player zooms them apart.
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // A drag that happens to end over a body must not read as a click —
    // parity with the 3D renderer's `e.delta > 6` guard.
    if (movedRef.current > DRAG_CLICK_SLOP_PX) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    // Flight mode (part a): inside the local diagram, hit the body, a moon
    // or a shell ring (radial menu for the slot ring); then a ship's tag.
    if (localModel) {
      let best: LocalHit | null = null;
      let bestD = Infinity;
      for (const hit of localHitsRef.current) {
        const d = Math.hypot(hit.x - mx, hit.y - my);
        const inside = hit.kind === 'ring' ? Math.abs(d - hit.r) <= 10 : d <= Math.max(hit.r, MIN_HIT_RADIUS_PX);
        const score = hit.kind === 'ring' ? Math.abs(d - hit.r) : d;
        if (inside && score < bestD) { bestD = score; best = hit; }
      }
      if (best) {
        setLocalTag(null);
        selectLocation(best.id, embedded ? { x: mx, y: my } : undefined);
        return;
      }
      let nearest: { x: number; y: number; title: string; detail: string } | null = null;
      let nearestD = 16 * 16;
      for (const sp of localShipPxRef.current) {
        const d = (sp.x - mx) * (sp.x - mx) + (sp.y - my) * (sp.y - my);
        if (d < nearestD) { nearestD = d; nearest = sp; }
      }
      if (nearest) { setLocalTag({ title: nearest.title, detail: nearest.detail, x: nearest.x, y: nearest.y }); return; }
      setLocalTag(null);
      setSelectedLoc(null);
      onSelectLocation?.(null);
      return;
    }

    const candidates: HitCandidate[] = [];
    for (const loc of LOCATIONS) {
      const layout = LOCATION_LAYOUT[loc.id];
      if (!layout) continue;
      candidates.push({
        id: loc.id,
        x: layout.x * w * zoom + offset.x,
        y: layout.y * h * zoom + offset.y,
        r: hitRadius(layout.radius, zoom),
      });
    }
    const hit = pickNearest(mx, my, candidates);
    if (hit) {
      // The radial menu only exists in the map-command shell; the legacy
      // stacked layout keeps its original click-to-toggle behavior.
      setContactTag(null);
      // A tap on a body enters its local diagram (parity with the 3D
      // renderer, where a click flies into the local scene).
      selectLocation(hit, embedded ? { x: mx, y: my } : undefined, { focus: true });
      return;
    }
    // Ship traffic: a tap on a contact opens its tag (bodies win ties above).
    let nearest: { x: number; y: number; contact: TrafficContact } | null = null;
    let nearestD = 14 * 14;
    for (const c of contactPxRef.current) {
      const d = (c.x - mx) * (c.x - mx) + (c.y - my) * (c.y - my);
      if (d < nearestD) { nearestD = d; nearest = c; }
    }
    if (nearest) {
      setContactTag({ contact: nearest.contact, x: nearest.x, y: nearest.y });
      return;
    }
    setContactTag(null);
    setSelectedLoc(null);
    onSelectLocation?.(null);
  }, [zoom, offset, onSelectLocation, selectLocation, embedded, localModel]);

  // ── Pan / pinch via pointer events (mouse + touch unified) ────────────────
  /** Canvas-relative point from client coords (camera offsets are canvas-space). */
  const canvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }, []);

  /** Centre of the visible canvas — the anchor for button/keyboard zoom, so
   *  zooming never yanks the view toward the top-left origin. */
  const viewCentre = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { x: (rect?.width ?? 0) / 2, y: (rect?.height ?? 0) / 2 };
  }, []);

  /** Current pinch sample from the first two active pointers. */
  const pinchSample = useCallback((): PinchState | null => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) return null;
    const mid = canvasPoint((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
    return { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), x: mid.x, y: mid.y };
  }, [canvasPoint]);

  const beginDrag = useCallback((clientX: number, clientY: number) => {
    dragRef.current = { startX: clientX, startY: clientY, camX: camRef.current.x, camY: camRef.current.y };
    setDragging(true);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = 0;
    if (pointersRef.current.size >= 2) {
      // Second finger down → the gesture becomes a pinch; the drag ends.
      dragRef.current = null;
      setDragging(false);
      pinchRef.current = pinchSample();
    } else {
      beginDrag(e.clientX, e.clientY);
    }
  }, [beginDrag, pinchSample]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const prev = pointersRef.current.get(e.pointerId);
    if (!prev) return; // hover — no button/finger down
    movedRef.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const next = pinchSample();
      if (next) {
        if (localBody) {
          // Local diagram: pinch scales the diagram; pinching out past the
          // floor returns to the system (the 2D "back out past the sphere").
          const ratio = next.dist / Math.max(1, pinchRef.current.dist);
          const z = localZoomRef.current * ratio;
          if (z < LOCAL_ZOOM_MIN * 0.92) exitLocal(); else setLocalZoomBoth(z);
          pinchRef.current = next;
          return;
        }
        // One gesture handles both: zoom by the distance ratio, pan by the
        // midpoint drift (map-camera.pinchCamera keeps the pinched world
        // point under the fingers).
        applyCamera(pinchCamera(camRef.current, pinchRef.current, next));
        pinchRef.current = next;
      }
    } else if (dragRef.current && localBody) {
      // No pan inside the diagram (it is always centred).
    } else if (dragRef.current) {
      const d = dragRef.current;
      applyCamera({ zoom: camRef.current.zoom, x: d.camX + (e.clientX - d.startX), y: d.camY + (e.clientY - d.startY) });
    }
  }, [applyCamera, pinchSample, localBody, exitLocal, setLocalZoomBoth]);

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 1) {
      // Pinch → single finger: continue as a pan from the surviving pointer.
      const rest = Array.from(pointersRef.current.values())[0];
      beginDrag(rest.x, rest.y);
    } else if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setDragging(false);
    }
  }, [beginDrag]);

  // Wheel zoom, centred on the cursor. Attached natively with passive:false —
  // React 17+ registers onWheel as a passive root-level listener, so a
  // synthetic handler's preventDefault() cannot stop the page from scrolling
  // (the old onWheel's preventDefault was silently ignored). ctrl+wheel is
  // the trackpad pinch gesture and gets the hotter coefficient.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (localBodyRef.current) {
        // Local diagram: wheel scales it; scrolling out past the floor
        // returns to the system.
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.0045 : 0.0016));
        const z = localZoomRef.current * factor;
        if (z < LOCAL_ZOOM_MIN * 0.92) exitLocalRef.current(); else setLocalZoomBoth(z);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      applyCamera(wheelZoom(camRef.current, e.deltaY, { x: e.clientX - rect.left, y: e.clientY - rect.top }, e.ctrlKey));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyCamera, setLocalZoomBoth]);
  // Refs so the native wheel listener (attached once) sees live values.
  const localBodyRef = useRef<string | null>(null);
  localBodyRef.current = localBody;
  const exitLocalRef = useRef(exitLocal);
  exitLocalRef.current = exitLocal;

  // Keyboard zoom/pan — CLAUDE.md keyboard-only invariant. `+` / `=` / `-` /
  // `R` work map-wide with the same input-field guards the shell's M/C
  // shortcuts use; arrow-key panning only applies while the canvas itself has
  // focus so list and radiogroup arrow navigation is never hijacked. Every
  // branch is an instant state change — no animated transition, so there is
  // nothing to gate on prefers-reduced-motion.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cam = camRef.current;
      const rect = canvas.getBoundingClientRect();
      const centre = { x: rect.width / 2, y: rect.height / 2 };
      if (localBodyRef.current) {
        // Local diagram: + / − scale it (− past the floor leaves), R/Home
        // re-frames it at 1×. Arrow panning does not apply (always centred).
        if (e.key === '+' || e.key === '=') { e.preventDefault(); setLocalZoomBoth(localZoomRef.current * BUTTON_ZOOM_FACTOR); }
        else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          const z = localZoomRef.current / BUTTON_ZOOM_FACTOR;
          if (z < LOCAL_ZOOM_MIN * 0.92) exitLocalRef.current(); else setLocalZoomBoth(z);
        } else if (e.key === 'r' || e.key === 'R' || e.key === 'Home') { e.preventDefault(); setLocalZoomBoth(1); }
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        applyCamera(zoomAboutPoint(cam, cam.zoom * BUTTON_ZOOM_FACTOR, centre));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        applyCamera(zoomAboutPoint(cam, cam.zoom / BUTTON_ZOOM_FACTOR, centre));
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'Home') {
        // Reset moved off `0` (2026-09-04) so the whole digit row belongs to
        // the map's jump hotkeys. `R` works on compact keyboards that have no
        // Home key; Home is kept for the pan/zoom convention.
        e.preventDefault();
        applyCamera(DEFAULT_MAP_CAMERA);
      } else if (
        document.activeElement === canvas
        && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        e.preventDefault();
        // Panning moves the VIEW in the arrow's direction (world slides the
        // other way), matching scroll conventions.
        const dx = e.key === 'ArrowLeft' ? KEY_PAN_STEP_PX : e.key === 'ArrowRight' ? -KEY_PAN_STEP_PX : 0;
        const dy = e.key === 'ArrowUp' ? KEY_PAN_STEP_PX : e.key === 'ArrowDown' ? -KEY_PAN_STEP_PX : 0;
        applyCamera({ zoom: cam.zoom, x: cam.x + dx, y: cam.y + dy });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, applyCamera, setLocalZoomBoth]);

  // Selected location details
  const selectedLocData = selectedLoc ? LOCATIONS.find(l => l.id === selectedLoc) : null;
  const isUnlocked = selectedLoc ? state.unlockedLocations.includes(selectedLoc) : false;
  const buildingsAtSelected = selectedLoc ? state.buildings.filter(b => b.locationId === selectedLoc) : [];
  const npcCountAtSelected = selectedLoc ? (state.npcCompanies || []).filter(n => n.unlockedLocations.includes(selectedLoc)).length : 0;
  const canUnlock = selectedLocData && !isUnlocked && selectedLocData.requiredResearch.every(r => state.completedResearch.includes(r)) && state.money >= selectedLocData.unlockCost;
  const shipsAtSelected = selectedLoc ? (state.ships || []).filter(s => s.isBuilt && s.currentLocation === selectedLoc) : [];
  const shipsInTransit = (state.ships || []).filter(s => s.isBuilt && s.status === 'in_transit');
  const worldNamesAtSelected = selectedLoc && worldAvailable ? (world?.world.colonies[selectedLoc] || []) : [];
  const worldCountAtSelected = selectedLoc && worldAvailable ? (world?.world.colonyCounts[selectedLoc] || 0) : 0;

  // Shared JSX fragments — the keyboard Location List is used both as a
  // stacked block (standalone/legacy layout) and as a bottom-left overlay
  // (embedded map-command layout). Same markup, same selectLocation() calls.
  const locationListBody = (
    <>
      <button
        type="button"
        onClick={() => setListExpanded(v => !v)}
        aria-expanded={listExpanded}
        aria-controls="solar-system-location-list"
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        <span className="font-hud text-xs font-semibold text-white flex items-center gap-2">
          <GameIcon name="scroll" size={13} /> Location List
          <span className="text-slate-500 font-normal text-[10px] hidden sm:inline">— keyboard-accessible alternative to the map</span>
        </span>
        <span aria-hidden="true" className={`text-slate-400 transition-transform ${listExpanded ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {listExpanded && (
        <div id="solar-system-location-list" className={`px-3 pb-3 space-y-3 ${embedded ? 'max-h-[50vh] overflow-y-auto' : ''}`}>
          {LOCATIONS_BY_REGION.map(({ type, locations }) => (
            <div key={type}>
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                {REGION_LABELS[type] || type}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" role="group" aria-label={`${REGION_LABELS[type] || type} locations`}>
                {locations.map(loc => {
                  const unlocked = state.unlockedLocations.includes(loc.id);
                  const isSelected = selectedLoc === loc.id;
                  const standing = standingByLoc[loc.id];
                  const hasWarning = warningLocs.has(loc.id);
                  const modeVis = modeVisuals[loc.id];
                  const localBodyId = localBodyForLocation(loc.id);
                  return (
                    <div key={loc.id} className="flex items-stretch gap-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => selectLocation(loc.id, undefined, { toggle: false, focus: true })}
                      // Wave A2 — keyboard/right-click route into the radial
                      // command menu: C (or the Context Menu key) opens the
                      // arc anchored on this row, so every verb the mouse can
                      // reach at the body is reachable without a mouse.
                      onContextMenu={e => { e.preventDefault(); selectLocation(loc.id, anchorForElement(e.currentTarget)); }}
                      onKeyDown={e => {
                        if (e.key === 'c' || e.key === 'C' || e.key === 'ContextMenu') {
                          e.preventDefault();
                          selectLocation(loc.id, anchorForElement(e.currentTarget));
                        }
                      }}
                      aria-pressed={isSelected}
                      aria-keyshortcuts="C"
                      className={`flex-1 min-w-0 min-h-[44px] px-2 py-1.5 rounded-lg text-[11px] text-left border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                          : unlocked
                            ? 'bg-white/[0.03] border-white/[0.08] text-slate-200 hover:bg-white/[0.06]'
                            : 'bg-white/[0.01] border-white/[0.04] text-slate-500 hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {!unlocked && <GameIcon name="lock" size={10} />}
                        <span className="truncate">{loc.name}</span>
                        {standing === 'governor' && <GameIcon name="crown" size={12} className="text-amber-300 shrink-0" />}
                        {standing === 'stakeholder' && <span aria-hidden="true" className="text-cyan-300 shrink-0">◆</span>}
                        {hasWarning && <GameIcon name="warning" size={12} className="text-amber-300 shrink-0" />}
                        {modeVis?.glyph && <span aria-hidden="true" className="text-slate-300 shrink-0">{modeVis.glyph}</span>}
                        {/* Addendum (c): contacts in this body's local scene (the body row carries it). */}
                        {showContacts && localBodyId && loc.id === ORBITAL_BODY_MAP.get(localBodyId)?.locationId && (contactCounts[localBodyId]?.total ?? 0) > 0 && (
                          <span aria-hidden="true" className="ml-auto shrink-0 inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                            <GameIcon name="target" size={10} />{contactCounts[localBodyId].total}
                          </span>
                        )}
                      </span>
                      <span className="sr-only">
                        {unlocked ? ', unlocked' : ', locked'}{isSelected ? ', currently selected' : ''}
                        {standing === 'governor' ? ', you govern this zone' : standing === 'stakeholder' ? ', zone stakeholder' : ''}
                        {hasWarning ? ', severe hazard forecast next month' : ''}
                        {modeVis ? `, ${modeVis.srText}` : ''}
                        {slotRings[loc.id] ? `. ${slotRings[loc.id].srText}` : ''}
                        {showContacts && localBodyId && loc.id === ORBITAL_BODY_MAP.get(localBodyId)?.locationId && contactCounts[localBodyId] ? `. ${contactCountText(contactCounts[localBodyId])}` : ''}
                        {localBodyId && localBody === localBodyId ? `. ${localModel?.srText ?? ''}` : ''}
                        . Press C for the command menu.
                      </span>
                    </button>
                    {/* Flight mode (part a): keyboard / screen-reader path
                        into and out of a body's local diagram. */}
                    {localBodyId && (
                      <button
                        type="button"
                        onClick={() => { if (localBody === localBodyId) { playSound('click'); exitLocal(); } else enterLocal(localBodyId); }}
                        aria-pressed={localBody === localBodyId}
                        aria-label={`${localBody === localBodyId ? 'Leave' : 'Enter'} the local view of ${bodyName(localBodyId)}`}
                        title={localBody === localBodyId ? 'Back to the system view' : `Local view: ${bodyName(localBodyId)} with its moons, orbital shells, slots, your satellites and ships`}
                        className={`min-h-[44px] w-8 shrink-0 flex items-center justify-center rounded-lg text-[12px] font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          localBody === localBodyId ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200' : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span aria-hidden="true">{localBody === localBodyId ? '◉' : '○'}</span>
                      </button>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div ref={rootRef} className="relative w-full h-full">
        {/* touchAction:none hands every touch gesture to the pointer
            handlers (one finger pans, two pinch-zoom) — without it the
            browser consumes them as page scroll and the map never sees them.
            tabIndex + role=application: the canvas is now keyboard-operable
            (+ − 0 zoom, arrows pan while focused). */}
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="absolute inset-0 w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          tabIndex={0}
          role="application"
          aria-label="Interactive solar system map showing your unlocked locations, buildings, NPC presence, and ships in transit. Press plus or minus to zoom, 0 to reset, arrow keys to pan."
          aria-describedby="solar-system-canvas-hint"
        />
        <div ref={containerRef} className="absolute inset-0 pointer-events-none" />

        {/* Zoom controls. Same stray-`relative` fix as the layer column
            below (the column used to lay out in normal flow on phones);
            on phones it sits under the shell's icon strip (top-2 is the
            strip's row), from md up it keeps the top-right corner. */}
        <div className="hud-frame flex flex-col gap-1 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm absolute top-[5.5rem] md:top-2 right-2 z-20">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <button onClick={() => { if (localBody) { setLocalZoomBoth(localZoomRef.current * BUTTON_ZOOM_FACTOR); return; } const c = camRef.current; applyCamera(zoomAboutPoint(c, c.zoom * BUTTON_ZOOM_FACTOR, viewCentre())); }} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom in" aria-keyshortcuts="+">+</button>
          <button onClick={() => { if (localBody) { const z = localZoomRef.current / BUTTON_ZOOM_FACTOR; if (z < LOCAL_ZOOM_MIN * 0.92) exitLocal(); else setLocalZoomBoth(z); return; } const c = camRef.current; applyCamera(zoomAboutPoint(c, c.zoom / BUTTON_ZOOM_FACTOR, viewCentre())); }} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom out" aria-keyshortcuts="-">−</button>
          <button onClick={() => { if (localBody) { setLocalZoomBoth(1); return; } applyCamera(DEFAULT_MAP_CAMERA); }} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-[10px] hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Reset view" aria-keyshortcuts="R Home">⟲</button>
          {/* Flight mode (part b): a visible Frame control for the G key (2D parity). */}
          <button
            type="button"
            onClick={() => { if (localBody) setLocalZoomBoth(1); else if (selectedLoc) centreOn(selectedLoc); }}
            disabled={!selectedLoc && !localBody}
            className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-cyan-200 hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Frame the selection"
            aria-keyshortcuts="G"
            title="Frame the selected body — centre the map on it (G)"
          >
            <GameIcon name="frame" size={18} />
          </button>
        </div>

        {/* Layer toggles — moved to bottom-right in map-command mode so the
            top-left corner stays free for the Order Queue HUD strip.
            2026-09-12: the stray `relative` that used to ride next to
            `absolute` won the cascade, so on phones this column laid out in
            normal flow as three full-width bars across the middle of the
            map (graphics review item 5). Removed; and when the shell owns
            the layer state its icon strip carries these switches on phones,
            so the column only renders from md up. */}
        <div className={`hud-frame ${onToggleLayer ? 'hidden md:flex' : 'flex'} flex-col gap-1 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm absolute bottom-2 right-2 z-20`}>
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <button
            onClick={() => toggleLayer('lanes')}
            aria-pressed={showLanes}
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              showLanes ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {showLanes ? '● Lanes' : '○ Lanes'}
          </button>
          <button
            onClick={() => toggleLayer('ships')}
            aria-pressed={showShips}
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              showShips ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {showShips ? '● Ships' : '○ Ships'}
          </button>
          <button
            onClick={() => toggleLayer('contacts')}
            aria-pressed={showContacts}
            title="Toggle other corporations' ships (anonymised contacts; identities need an active Fleet Tracking reveal)"
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              showContacts ? 'bg-slate-500/20 text-slate-200 border-slate-400/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {showContacts ? '● Contacts' : '○ Contacts'}
          </button>
          <button
            onClick={() => toggleLayer('world')}
            aria-pressed={showWorld}
            disabled={!worldAvailable}
            title={worldAvailable ? "Toggle other corporations' colony claims" : 'Sign in to see the live world'}
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed ${
              worldLayerActive ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {worldLayerActive ? '● World' : '○ World'}
          </button>
          {!worldAvailable && (
            <p className="text-[10px] text-slate-600 text-right max-w-[110px] leading-tight">Sign in to see the live world</p>
          )}
        </div>

        {/* Keyboard-accessible Location List — collapsible overlay so it
            doesn't eat into the full-viewport canvas when closed. */}
        <div className="hud-frame absolute bottom-2 left-2 z-20 rounded-xl border border-white/[0.06] bg-[#050510]/90 backdrop-blur-sm w-[min(92vw,380px)]">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          {locationListBody}
        </div>

        {(shipsInTransit.length > 0 || (showContacts && contacts.length > 0)) && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex gap-1.5">
            {shipsInTransit.length > 0 && <DataChip icon="ship-transport" tone="good">{shipsInTransit.length} in transit</DataChip>}
            {showContacts && localBody && (contactCounts[localBody]?.total ?? 0) > 0 && (
              <DataChip icon="target">{contactCountText(contactCounts[localBody])}</DataChip>
            )}
            {showContacts && !localBody && contacts.length > 0 && (
              <DataChip icon="target">{contacts.length} contact{contacts.length === 1 ? '' : 's'}</DataChip>
            )}
          </div>
        )}
        {contactTag && showContacts && (
          <div
            role="tooltip"
            className="absolute z-30 pointer-events-none max-w-[240px] rounded-lg border border-white/[0.14] bg-[#050510]/95 px-2.5 py-1.5 text-[11px] leading-snug text-slate-100 shadow-lg backdrop-blur-sm"
            style={{ left: Math.max(4, contactTag.x + 10), top: Math.max(4, contactTag.y - 6) }}
          >
            <div className="font-hud font-semibold text-cyan-200">{contactLabel(contactTag.contact)}</div>
            <div className="text-slate-400">{contactDetail(contactTag.contact, Date.now(), contactsAsOfMs)}</div>
          </div>
        )}
        {/* Flight mode (part a): a tapped ship in the local diagram. */}
        {localTag && localBody && (
          <div
            role="tooltip"
            className="absolute z-30 pointer-events-none max-w-[240px] rounded-lg border border-white/[0.14] bg-[#050510]/95 px-2.5 py-1.5 text-[11px] leading-snug text-slate-100 shadow-lg backdrop-blur-sm"
            style={{ left: Math.max(4, localTag.x + 10), top: Math.max(4, localTag.y - 6) }}
          >
            <div className="font-hud font-semibold text-cyan-200">{localTag.title}</div>
            <div className="text-slate-400">{localTag.detail}</div>
          </div>
        )}
        {localModel && (
          <p className="sr-only" role="status" aria-live="polite">{localModel.srText} Zoom out, press Escape, or use the System chip to return to the system.</p>
        )}
        {showContacts && contacts.length > 0 && (
          <ul className="sr-only" aria-label="Ship contacts near your holdings (other corporations, anonymised unless you hold a fleet reveal)">
            {contacts.slice(0, 40).map(c => <li key={c.id}>{contactLabel(c)}</li>)}
            {contacts.length > 40 && <li>and {contacts.length - 40} more contacts</li>}
          </ul>
        )}

        <p id="solar-system-canvas-hint" className="sr-only">
          Click a location to open its radial command menu — build, dispatch, demand, standing orders and full detail, at the body.
          Selecting a body opens its local view: the body with its moons, orbital shells, slots, your satellites and the ships coming and going;
          zoom out, press Escape, or use the System chip to return, and each Location List row has a Local button that does the same.
          Drag or use one finger to pan; scroll, pinch with two fingers, or press plus and minus to zoom (R or Home resets the view) —
          zooming in spreads the close-packed Earth-orbit locations apart so each is easy to pick.
          Zoom controls how much per-location detail is drawn; the Location List always shows everything,
          and the Labels toggle forces full labels at every zoom. Focus the map and use the arrow keys to pan by keyboard,
          or use the Location List overlay (bottom-left) to browse and select every location, and press C on a row for its command menu.
          Number keys jump straight to a body: 1 to 9 and 0 select the ten bodies of the active bank, and the backquote key pages between banks. The Jump legend at the bottom of the map names every binding and is clickable. 
          Current zoom tier: {MAP_ZOOM_TIER_LABEL[zoomTier]}.
        </p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-3">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-white/[0.06] overflow-hidden bg-[#050510]"
        style={{ height: '460px', cursor: dragging ? 'grabbing' : 'grab' }}
      >
        {/* Same pointer/keyboard contract as the embedded canvas above —
            touchAction:none is what makes one-finger pan + pinch-zoom work. */}
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          style={{ touchAction: 'none' }}
          tabIndex={0}
          role="application"
          aria-label="Interactive solar system map showing your unlocked locations, buildings, NPC presence, and ships in transit. Press plus or minus to zoom, 0 to reset, arrow keys to pan."
          aria-describedby="solar-system-canvas-hint"
        />

        {/* Zoom controls */}
        <div className="hud-frame relative flex flex-col gap-1 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm absolute top-2 right-2">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <button onClick={() => { const c = camRef.current; applyCamera(zoomAboutPoint(c, c.zoom * BUTTON_ZOOM_FACTOR, viewCentre())); }} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom in" aria-keyshortcuts="+">+</button>
          <button onClick={() => { const c = camRef.current; applyCamera(zoomAboutPoint(c, c.zoom / BUTTON_ZOOM_FACTOR, viewCentre())); }} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom out" aria-keyshortcuts="-">−</button>
          <button onClick={() => applyCamera(DEFAULT_MAP_CAMERA)} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-[10px] hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Reset view" aria-keyshortcuts="R Home">⟲</button>
        </div>

        {/* Layer toggles */}
        <div className="hud-frame flex flex-col gap-1 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm absolute top-2 left-2">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <button
            onClick={() => toggleLayer('lanes')}
            aria-pressed={showLanes}
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              showLanes ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {showLanes ? '● Lanes' : '○ Lanes'}
          </button>
          <button
            onClick={() => toggleLayer('ships')}
            aria-pressed={showShips}
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              showShips ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {showShips ? '● Ships' : '○ Ships'}
          </button>
          <button
            onClick={() => toggleLayer('contacts')}
            aria-pressed={showContacts}
            title="Toggle other corporations' ships (anonymised contacts; identities need an active Fleet Tracking reveal)"
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              showContacts ? 'bg-slate-500/20 text-slate-200 border-slate-400/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {showContacts ? '● Contacts' : '○ Contacts'}
          </button>
          <button
            onClick={() => toggleLayer('world')}
            aria-pressed={showWorld}
            disabled={!worldAvailable}
            title={worldAvailable ? "Toggle other corporations' colony claims" : 'Sign in to see the live world'}
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed ${
              worldLayerActive ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {worldLayerActive ? '● World' : '○ World'}
          </button>
        </div>

        {/* Legend + activity */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
          <DataChip><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Your buildings</DataChip>
          <DataChip><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> NPC presence</DataChip>
          {worldAvailable && (
            <DataChip><span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Other corporations</DataChip>
          )}
          <DataChip><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Mining ship</DataChip>
          <DataChip><span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Survey ship</DataChip>
          {shipsInTransit.length > 0 && (
            <DataChip icon="ship-transport" tone="good">{shipsInTransit.length} in transit</DataChip>
          )}
          {showContacts && contacts.length > 0 && (
            <DataChip icon="target">{contacts.length} contact{contacts.length === 1 ? '' : 's'}</DataChip>
          )}
        </div>
      </div>

      {/* Keyboard-accessible Location List — mouse/touch-drag canvas alternative.
          Every location is a real, tab-reachable <button> grouped by region,
          calling the same selectLocation() the canvas click handler uses. */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        {locationListBody}
      </div>

      {/* Selected Location Details */}
      {selectedLocData && (
        <ConsolePanel
          title={selectedLocData.name}
          subtitle={selectedLocData.description}
          icon="map"
          accent="cyan"
          compact
          right={
            isUnlocked ? (
              <span className="text-green-400 text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">Unlocked</span>
            ) : canUnlock ? (
              <button
                onClick={() => { playSound('location_unlock'); onUnlock(selectedLoc!); }}
                className="min-h-[44px] px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Unlock {formatMoney(selectedLocData.unlockCost)}
              </button>
            ) : (
              <span className="text-slate-500 text-xs px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">Locked</span>
            )
          }
        >
          {isUnlocked && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-cyan-400">{buildingsAtSelected.filter(b => b.isComplete).length} buildings</span>
              {buildingsAtSelected.filter(b => !b.isComplete).length > 0 && (
                <span className="text-amber-400">{buildingsAtSelected.filter(b => !b.isComplete).length} building</span>
              )}
              {shipsAtSelected.length > 0 && (
                <span className="text-purple-300">{shipsAtSelected.length} ship{shipsAtSelected.length === 1 ? '' : 's'}</span>
              )}
            </div>
          )}
          {!isUnlocked && (
            <div className="mt-2 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Requirements to unlock</div>
              <ul className="space-y-0.5 text-slate-400 pl-4" style={{ listStyle: 'disc' }}>
                <li>Pay <span className="text-white font-mono">{formatMoney(selectedLocData.unlockCost)}</span></li>
                {selectedLocData.requiredResearch.length > 0 && (
                  <li>Research: {selectedLocData.requiredResearch.map(r => r.replace(/_/g, ' ')).join(', ')}</li>
                )}
              </ul>
            </div>
          )}
          {npcCountAtSelected > 0 && (
            <div className="mt-2 text-[10px] text-slate-500 italic flex items-center gap-1">
              <GameIcon name="alliance" size={11} /> {npcCountAtSelected} NPC {npcCountAtSelected === 1 ? 'competitor already operates' : 'competitors already operate'} here — informational only, not a gate
            </div>
          )}
          {worldCountAtSelected > 0 && (
            <div className="mt-2 text-[10px] text-purple-300/90 flex items-center gap-1">
              <GameIcon name="globe" size={11} /> {worldCountAtSelected} corporation{worldCountAtSelected === 1 ? '' : 's'} operating here{worldNamesAtSelected[0] ? ` — first mover: ${worldNamesAtSelected[0]}` : ''}
            </div>
          )}
          {!worldAvailable && (
            <div className="mt-2 text-[10px] text-slate-600 italic flex items-center gap-1">
              <GameIcon name="globe" size={11} /> Sign in to see the live world
            </div>
          )}
        </ConsolePanel>
      )}

      <p id="solar-system-canvas-hint" className="text-slate-600 text-[10px] text-center">Click a location to see details. Drag (or one finger) to pan; scroll, pinch, or press + / − to zoom, 0 to reset. Toggle lanes and ships with the top-left buttons. Focus the map for arrow-key panning, or use the Location List below to browse and select every location by keyboard.</p>
    </div>
  );
}

// ─── Flight mode (part a): the local orbit diagram ───────────────────────────
// Body + moons + shell rings + slot pips + glints + ships, from the SAME
// LocalSceneModel the 3D local scene renders. Pure canvas drawing; the hit
// list and the ship pixel list are written for the click handler.

interface LocalDrawOpts {
  zoom: number;
  tSec: number;
  reducedMotion: boolean;
  selectedLoc: string | null;
  showShips: boolean;
  showContacts: boolean;
  contactsAsOfMs: number;
  sprites: Map<string, HTMLImageElement>;
  spriteUrlFor: (base: string) => string;
  lockElapsedMs: number;
  hits: LocalHit[];
  shipPx: { x: number; y: number; title: string; detail: string }[];
}

function drawBodyDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, locationId: string | undefined, color: string, unlocked: boolean, sprite: HTMLImageElement | undefined) {
  ctx.globalAlpha = unlocked ? 1 : 0.5;
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
    const darken = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.2, x, y, r);
    darken.addColorStop(0, 'rgba(255,255,255,0.08)');
    darken.addColorStop(0.55, 'rgba(0,0,0,0)');
    darken.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = darken;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, lightenColor(color, 30));
    g.addColorStop(0.6, color);
    g.addColorStop(1, darkenColor(color, 40));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const atmo = getAtmosphere(locationId);
  if (atmo && unlocked) {
    const rim = ctx.createRadialGradient(x, y, r * 0.94, x, y, r * (atmo.shellScale + 0.06));
    rim.addColorStop(0, `${atmo.color}00`);
    rim.addColorStop(0.55, hexToRgba(atmo.color, atmo.opacity));
    rim.addColorStop(1, `${atmo.color}00`);
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(x, y, r * (atmo.shellScale + 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = unlocked ? `${color}a0` : '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawShellRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, unitR: number, shell: LocalShell, selected: boolean, tSec: number, hits: LocalHit[], labelIndex = 0) {
  // Ring (selected: bright + a soft halo ring).
  ctx.save();
  ctx.strokeStyle = shell.color;
  ctx.globalAlpha = selected ? 0.95 : 0.45;
  ctx.lineWidth = selected ? 2.2 : 1.1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  if (selected) {
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  if (shell.locationId) hits.push({ id: shell.locationId, x: cx, y: cy, r: R, kind: 'ring' });
  // Slot pips: yours filled bright, others filled dim, free hollow.
  const pipR = Math.max(1.4, 0.03 * unitR);
  for (const p of shell.pips) {
    const a = -Math.PI / 2 + p.frac * Math.PI * 2;
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    const style = SLOT_PIP_STYLE[p.kind];
    ctx.globalAlpha = style.alpha;
    ctx.beginPath();
    ctx.arc(x, y, p.kind === 'yours' ? pipR * 1.35 : pipR, 0, Math.PI * 2);
    if (style.hollow) { ctx.strokeStyle = style.color; ctx.lineWidth = 1; ctx.stroke(); }
    else { ctx.fillStyle = style.color; ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // Glints: yours bright just outside the ring, others dim just inside,
  // stations as small squares outside.
  const glint = (n: number, radius: number, size: number, color: string, alpha: number, phase: number, square: boolean) => {
    if (n <= 0) return;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < Math.min(n, 2000); i++) {
      const a = glintAngle(i + phase, n, tSec);
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      if (square) ctx.fillRect(x - size, y - size * 0.6, size * 2, size * 1.2);
      else { ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  };
  glint(shell.satellites, R + 4, Math.max(1.4, 0.022 * unitR), '#a5f3fc', 1, 0.25, false);
  glint(shell.otherSatellites, R - 4, Math.max(1, 0.016 * unitR), '#a08a55', 0.55, 0.6, false);
  glint(shell.stations, R + 7, Math.max(1.6, 0.03 * unitR), '#e2e8f0', 1, 0.5, true);
  // Label at the top of the ring: name + slot badge (text, never colour alone).
  ctx.save();
  ctx.font = `600 ${Math.max(9, 0.2 * unitR)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = selected ? '#e0f2fe' : 'rgba(203,213,225,0.9)';
  // Alternate the anchor angle per shell (top, lower-left, lower-right, …)
  // so three concentric rings never stack their labels.
  const la = -Math.PI / 2 + labelIndex * (Math.PI * 2 / 3);
  const lx = cx + Math.cos(la) * (R + 6);
  const ly = cy + Math.sin(la) * (R + 6) + (Math.sin(la) > 0.3 ? 10 : Math.sin(la) < -0.3 ? -2 : 4);
  ctx.textAlign = Math.cos(la) > 0.3 ? 'left' : Math.cos(la) < -0.3 ? 'right' : 'center';
  ctx.fillText(shell.slots ? `${shell.label} · ${shell.slots.badge}` : shell.label, lx, ly);
  ctx.restore();
}

function drawLocalDiagram(ctx: CanvasRenderingContext2D, w: number, h: number, model: LocalSceneModel, o: LocalDrawOpts) {
  const base = layoutLocalDiagram(model, w, h);
  const R = base.R * o.zoom;
  const { cx, cy } = base;
  const t = o.reducedMotion ? 0 : o.tSec;
  o.hits.length = 0;
  o.shipPx.length = 0;

  // Local-sphere backdrop: a faint disc so the diagram reads as "inside".
  const halo = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * (model.extentScale + 0.9));
  halo.addColorStop(0, 'rgba(34,211,238,0.06)');
  halo.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, R * (model.extentScale + 0.9), 0, Math.PI * 2);
  ctx.fill();

  // Shells (inner → outer), then moons and their shells.
  model.shells.forEach((shell, i) => {
    drawShellRing(ctx, cx, cy, shell.scale * R, R, shell, !!shell.locationId && o.selectedLoc === shell.locationId, t, o.hits, i);
  });
  // Ships — placed by the shared placeContacts() against the local anchor
  // tables (xz → canvas xy), exits toward the external location's layout
  // position.
  const exitDirs: Record<string, [number, number]> = {};
  const home = LOCATION_POSITION[model.locationId];
  for (const id of model.externalIds) {
    const p = LOCATION_POSITION[id];
    if (!p || !home) continue;
    const dx = p.x - home.x, dy = p.y - home.y;
    const len = Math.hypot(dx, dy) || 1;
    exitDirs[id] = [dx / len, dy / len];
  }
  const local = localAnchorsAt(model, t, R, exitDirs);
  const toXY = (table: Record<string, ContactAnchor>): Record<string, ContactAnchor> => {
    const out: Record<string, ContactAnchor> = {};
    for (const [id, a] of Object.entries(table)) out[id] = { pos: [cx + a.pos[0], cy + a.pos[2], 0], r: a.r };
    return out;
  };
  const laneXY = toXY(local.lane);
  const holdXY = toXY(local.hold);
  const now = Date.now();
  for (const ship of model.ships) {
    if (ship.own && !o.showShips) continue;
    if (!ship.own && !o.showContacts) continue;
    const transit = ship.contact.status === 'transit';
    const placed = placeContacts([ship.contact], transit ? laneXY : holdXY, now, transit
      ? { asOfMs: ship.own ? model.builtAtMs : o.contactsAsOfMs, plane: 'xy', bendCap: 0.6 * R }
      : { plane: 'xy', orbitGap: 0, staticOrbit: o.reducedMotion, orbitRadPerSec: 0.18 });
    const p = placed[0];
    if (!p) continue;
    const x = p.pos[0], y = p.pos[1];
    const arrival = typeof ship.etaMs === 'number' ? model.builtAtMs + ship.etaMs : null;
    const eta = arrival ? `ETA ${formatCountdown(Math.max(0, (arrival - now) / 1000))}` : '';
    if (ship.own) {
      const heading = p.heading ? Math.atan2(p.heading[1], p.heading[0]) : t * 0.18;
      drawShipMarker(ctx, x, y, heading, ship.color, Math.max(2.6, 0.06 * R), hullGlyphFor(ship.contact.hullClass));
      if (transit) {
        ctx.save();
        ctx.font = `600 ${Math.max(9, 0.17 * R)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = 'rgba(103,232,249,0.95)';
        ctx.fillText(`${ship.name} · ${eta}`, x, y - Math.max(10, 0.22 * R));
        ctx.restore();
      }
      o.shipPx.push({ x, y, title: ship.name, detail: `${ship.status}${eta ? ` · ${eta}` : ''}` });
    } else if (ship.contact.intel) {
      // Revealed contact: hull-class glyph + corp ring (item 7 parity).
      const heading = p.heading ? Math.atan2(p.heading[1], p.heading[0]) : t * 0.18;
      const gr = Math.max(2.2, 0.05 * R);
      drawShipMarker(ctx, x, y, heading, '#cbd5e1', gr, hullGlyphFor(ship.contact.hullClass));
      ctx.strokeStyle = corpRingColor(ship.contact.intel.corpId);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, gr + 3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = ship.contact.npc && ship.contact.factionHint ? FACTION_CONTACT_TINT[ship.contact.factionHint] : ANON_CONTACT_COLOR;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.6, 0.04 * R), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      o.shipPx.push({ x, y, title: contactLabel(ship.contact), detail: contactDetail(ship.contact, now, o.contactsAsOfMs) });
    }
  }

  // Moons (with their own shells, e.g. lunar orbit around the Moon).
  for (const moon of model.moons) {
    const off = localMoonOffset(moon, t);
    const mx = cx + off[0] * R;
    const my = cy + off[2] * R;
    const mr = Math.max(3, (moon.r / model.bodyR) * R);
    // faint orbit path
    ctx.strokeStyle = 'rgba(148,163,184,0.16)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, moon.orbitScale * R, 0, Math.PI * 2);
    ctx.stroke();
    moon.shells.forEach((shell, i) => {
      drawShellRing(ctx, mx, my, shell.scale * mr, mr, shell, !!shell.locationId && o.selectedLoc === shell.locationId, t, o.hits, i + 2);
    });
    const spriteUrl = moon.locationId ? LOCATION_SPRITE[moon.locationId] : undefined;
    drawBodyDisc(ctx, mx, my, mr, moon.locationId, moon.color, moon.unlocked, spriteUrl ? o.sprites.get(o.spriteUrlFor(spriteUrl)) : undefined);
    if (moon.locationId) o.hits.push({ id: moon.locationId, x: mx, y: my, r: mr + 4, kind: 'moon' });
    ctx.fillStyle = moon.unlocked ? '#e2e8f0' : '#64748b';
    ctx.font = `${Math.max(9, 0.2 * R)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(moon.name, mx, my + mr + Math.max(10, 0.26 * R));
  }

  // The body itself, on top.
  const spriteUrl = LOCATION_SPRITE[model.locationId];
  drawBodyDisc(ctx, cx, cy, R, model.locationId, model.color, model.unlocked, spriteUrl ? o.sprites.get(o.spriteUrlFor(spriteUrl)) : undefined);
  o.hits.push({ id: model.locationId, x: cx, y: cy, r: R + 4, kind: 'body' });
  ctx.fillStyle = model.unlocked ? '#e2e8f0' : '#64748b';
  ctx.font = `600 ${Math.max(11, 0.26 * R)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(model.name, cx, cy + R + Math.max(12, 0.3 * R));

  // Selection reticle for the body / a moon (rings brighten themselves).
  const sel = o.selectedLoc;
  const target = sel ? o.hits.find(hh => hh.id === sel && hh.kind !== 'ring') : null;
  if (target) {
    const lock = reticleLockState(o.lockElapsedMs, o.reducedMotion);
    const ringR = (target.r + 6) * lock.radiusScale;
    ctx.save();
    ctx.globalAlpha = lock.opacity;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = o.reducedMotion ? 0 : -o.tSec * 14;
    ctx.beginPath();
    ctx.arc(target.x, target.y, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

/** Render a ship — sprite (rotated to heading) when loaded, hull-class glyph
 *  fallback otherwise. Size is the glyph "unit" radius; sprite is drawn at
 *  ~6×size so it reads clearly. */
function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  color: string,
  size: number,
  sprite: HTMLImageElement | undefined,
  glyph: HullGlyph = 'chevron',
) {
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    const spriteSize = Math.max(18, size * 5.5);
    ctx.save();
    ctx.translate(x, y);
    // Sprites are drawn pointing "up" in the art; rotate so nose aligns with heading.
    ctx.rotate(heading + Math.PI / 2);
    // Soft glow behind the sprite for visibility over dark backgrounds
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
    ctx.restore();
    return;
  }
  drawShipMarker(ctx, x, y, heading, color, size, glyph);
}

/** Hull-class glyph (map-hulls.ts hullGlyphPoints): chevron = freighter /
 *  hauler, barge = miner, dart = survey / servicer, delta = flagship. Nose
 *  along the heading. */
function drawShipMarker(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, color: string, size: number, glyph: HullGlyph = 'chevron') {
  const pts = hullGlyphPoints(glyph);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  const trace = () => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      if (i === 0) ctx.moveTo(px * size, py * size); else ctx.lineTo(px * size, py * size);
    }
    ctx.closePath();
  };
  ctx.fillStyle = color;
  trace();
  ctx.fill();
  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  trace();
  ctx.fill();
  ctx.restore();
}

function lightenColor(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * pct / 100));
  const lg = Math.min(255, Math.round(g + (255 - g) * pct / 100));
  const lb = Math.min(255, Math.round(b + (255 - b) * pct / 100));
  return `rgb(${lr},${lg},${lb})`;
}

function darkenColor(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lr = Math.max(0, Math.round(r * (1 - pct / 100)));
  const lg = Math.max(0, Math.round(g * (1 - pct / 100)));
  const lb = Math.max(0, Math.round(b * (1 - pct / 100)));
  return `rgb(${lr},${lg},${lb})`;
}
