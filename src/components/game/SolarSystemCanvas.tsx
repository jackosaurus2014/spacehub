'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameState, LocationType } from '@/lib/game/types';
import { LOCATIONS } from '@/lib/game/solar-system';
import { LANES } from '@/lib/game/spatial-strategy';
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
import { getAtmosphere, computeSlotRing, SLOT_SEGMENT_STYLE, type SlotRingModel } from '@/lib/game/map-bodies';
import GameIcon from './GameIcon';
import { ConsolePanel, DataChip } from './chrome';

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
}

// Visual layout: positions, radius, color, emoji per location.
// y values intentionally spread to give the belt + moons some visual depth.
const LOCATION_LAYOUT: Record<string, {
  x: number; y: number; radius: number; color: string; glowColor: string; type: 'star' | 'rocky' | 'gas' | 'orbital' | 'belt' | 'moon';
}> = {
  earth_surface: { x: 0.18, y: 0.50, radius: 22, color: '#38bdf8', glowColor: '#0ea5e9', type: 'rocky' },
  leo:           { x: 0.215, y: 0.36, radius: 7,  color: '#22d3ee', glowColor: '#0891b2', type: 'orbital' },
  geo:           { x: 0.25,  y: 0.66, radius: 7,  color: '#a78bfa', glowColor: '#7c3aed', type: 'orbital' },
  lunar_orbit:   { x: 0.32,  y: 0.40, radius: 6,  color: '#94a3b8', glowColor: '#64748b', type: 'orbital' },
  lunar_surface: { x: 0.33,  y: 0.58, radius: 13, color: '#cbd5e1', glowColor: '#94a3b8', type: 'moon' },
  mars_orbit:    { x: 0.48,  y: 0.40, radius: 6,  color: '#fdba74', glowColor: '#f97316', type: 'orbital' },
  mars_surface:  { x: 0.48,  y: 0.60, radius: 14, color: '#ef4444', glowColor: '#dc2626', type: 'rocky' },
  asteroid_belt: { x: 0.60,  y: 0.50, radius: 11, color: '#a8a29e', glowColor: '#78716c', type: 'belt' },
  jupiter_system:{ x: 0.73,  y: 0.45, radius: 20, color: '#fbbf24', glowColor: '#f59e0b', type: 'gas' },
  saturn_system: { x: 0.85,  y: 0.55, radius: 17, color: '#fde68a', glowColor: '#eab308', type: 'gas' },
  outer_system:  { x: 0.94,  y: 0.50, radius: 11, color: '#818cf8', glowColor: '#6366f1', type: 'rocky' },
  // Colony locations — share body positions with orbits for visual proximity
  mercury_surface: { x: 0.10, y: 0.52, radius: 8,  color: '#d97706', glowColor: '#b45309', type: 'rocky' },
  venus_orbit:     { x: 0.14, y: 0.48, radius: 9,  color: '#fde047', glowColor: '#facc15', type: 'rocky' },
  ceres_surface:   { x: 0.58, y: 0.47, radius: 5,  color: '#78716c', glowColor: '#57534e', type: 'rocky' },
  io_surface:      { x: 0.70, y: 0.44, radius: 4,  color: '#fcd34d', glowColor: '#f59e0b', type: 'moon' },
  europa_surface:  { x: 0.72, y: 0.42, radius: 4,  color: '#e0f2fe', glowColor: '#7dd3fc', type: 'moon' },
  ganymede_surface:{ x: 0.74, y: 0.46, radius: 4,  color: '#f3f4f6', glowColor: '#94a3b8', type: 'moon' },
  callisto_surface:{ x: 0.76, y: 0.48, radius: 4,  color: '#d1d5db', glowColor: '#9ca3af', type: 'moon' },
  titan_surface:   { x: 0.84, y: 0.58, radius: 5,  color: '#fef3c7', glowColor: '#fde68a', type: 'moon' },
  enceladus_surface:{ x: 0.86, y: 0.53, radius: 3, color: '#e0f2fe', glowColor: '#7dd3fc', type: 'moon' },
  titania_surface: { x: 0.93, y: 0.48, radius: 3,  color: '#e0e7ff', glowColor: '#a5b4fc', type: 'moon' },
  triton_surface:  { x: 0.95, y: 0.52, radius: 3,  color: '#bfdbfe', glowColor: '#93c5fd', type: 'moon' },
  pluto_surface:   { x: 0.97, y: 0.50, radius: 3,  color: '#fecaca', glowColor: '#fca5a5', type: 'rocky' },
};

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

export default function SolarSystemCanvas({ state, onUnlock, onSelectLocation, embedded, selectedLocationId, mapMode = 'standard', active = true, alwaysLabels = false, onZoomTierChange }: SolarSystemCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);

  // Stay in sync with an externally-driven selection (e.g. the Order Queue
  // HUD or the map context panel's close button in embedded mode).
  useEffect(() => {
    if (selectedLocationId !== undefined && selectedLocationId !== selectedLoc) {
      setSelectedLoc(selectedLocationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showLanes, setShowLanes] = useState(true);
  const [showShips, setShowShips] = useState(true);
  const [showWorld, setShowWorld] = useState(true);
  const animRef = useRef(0);

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
  const assetUrls = useMemo<string[]>(
    () => Array.from(new Set<string>([...Object.values(LOCATION_SPRITE), ...Object.values(SHIP_SPRITE), BG_NEBULA])),
    [],
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

  // W9 parity subset: zone standing glyph per location (♛ governor / ◆
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

    const sunX = 0.04 * w * zoom + offset.x;
    const sunY = 0.5 * h + offset.y;

    // ─── Shipping lane overlays (with animated traffic pulses) ───
    if (showLanes) {
      ctx.lineWidth = 1;
      for (const lane of LANES) {
        const fromLayout = layoutOf(lane.from);
        const toLayout = layoutOf(lane.to);
        if (!fromLayout || !toLayout) continue;
        const unlockedBoth = state.unlockedLocations.includes(lane.from) && state.unlockedLocations.includes(lane.to);
        const fx = fromLayout.x * w * zoom + offset.x;
        const fy = fromLayout.y * h + offset.y;
        const tx = toLayout.x * w * zoom + offset.x;
        const ty = toLayout.y * h + offset.y;
        ctx.strokeStyle = unlockedBoth ? 'rgba(34,211,238,0.12)' : 'rgba(100,116,139,0.05)';
        ctx.setLineDash(unlockedBoth ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

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
      const ly = layout.y * h + offset.y;
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
      const ly = layout.y * h + offset.y;
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
      const sprite = spriteUrl ? imgs.cache.get(spriteUrl) : undefined;
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
      // (♛ governor / ◆ stakeholder) so standing is never color-only.
      const standing = standingByLoc[loc.id];
      // Wave V4 — mode glyph rides IN the label text (shape + text, never
      // color alone), and the mode badge draws as a second text row.
      const modeGlyphSuffix = showLens && modeVis?.glyph ? ` ${modeVis.glyph}` : '';
      const standingPrefix = showLens && standing === 'governor' ? '♛ ' : showLens && standing === 'stakeholder' ? '◆ ' : '';
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
          const shipSprite = spriteUrl ? imgs.cache.get(spriteUrl) : undefined;
          drawShip(ctx, sx, sy, angle + Math.PI / 2, color, 3.5 * zoom, shipSprite);
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
        const fy = fromLayout.y * h + offset.y;
        const tx = toLayout.x * w * zoom + offset.x;
        const ty = toLayout.y * h + offset.y;
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
        const shipSprite = spriteUrl ? imgs.cache.get(spriteUrl) : undefined;
        drawShip(ctx, bx, by, heading, color, 4 * zoom, shipSprite);

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
    // slow pulse (static under reduced motion) + ⚠ glyph — distinct from the
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
        ctx.fillText('⚠', px.x, px.y - rr - 4);
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [state, selectedLoc, offset, zoom, starfield, showLanes, showShips, worldLayerActive, world, layoutOf, imgs.cache, imgs.loaded, standingByLoc, modeVisuals, zoomTier, alwaysLabels, slotRings]);

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
  const selectLocation = useCallback((locId: string, anchor?: { x: number; y: number }) => {
    playSound('click');
    setSelectedLoc(prev => {
      // Wave A2: an anchored request (map click / context key) always SELECTS
      // — it opens the radial command menu at the body rather than toggling
      // the selection off, which would leave the menu pointing at nothing.
      const next = !anchor && prev === locId ? null : locId;
      onSelectLocation?.(next, next ? anchor : undefined);
      return next;
    });
  }, [onSelectLocation]);

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
  // deselects exactly as before.
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    for (const loc of LOCATIONS) {
      const layout = LOCATION_LAYOUT[loc.id];
      if (!layout) continue;
      const lx = layout.x * w * zoom + offset.x;
      const ly = layout.y * h + offset.y;
      const r = layout.radius * zoom + 10;
      const dist = Math.sqrt(Math.pow(mx - lx, 2) + Math.pow(my - ly, 2));
      if (dist < r) {
        // The radial menu only exists in the map-command shell; the legacy
        // stacked layout keeps its original click-to-toggle behavior.
        selectLocation(loc.id, embedded ? { x: mx, y: my } : undefined);
        return;
      }
    }
    setSelectedLoc(null);
    onSelectLocation?.(null);
  }, [zoom, offset, onSelectLocation, selectLocation, embedded]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.001)));
  };

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
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => selectLocation(loc.id)}
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
                      className={`min-h-[44px] px-2 py-1.5 rounded-lg text-[11px] text-left border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
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
                        {slotRings[loc.id] ? `. ${slotRings[loc.id].srText}` : ''}
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
    </>
  );

  if (embedded) {
    return (
      <div ref={rootRef} className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          role="img"
          aria-label="Interactive solar system map showing your unlocked locations, buildings, NPC presence, and ships in transit"
          aria-describedby="solar-system-canvas-hint"
        />
        <div ref={containerRef} className="absolute inset-0 pointer-events-none" />

        {/* Zoom controls */}
        <div className="hud-frame relative flex flex-col gap-1 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm absolute top-2 right-2 z-20">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom in">+</button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom out">−</button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-[10px] hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Reset view">⟲</button>
        </div>

        {/* Layer toggles — moved to bottom-right in map-command mode so the
            top-left corner stays free for the Order Queue HUD strip. */}
        <div className="hud-frame relative flex flex-col gap-1 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm absolute bottom-2 right-2 z-20">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
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

        {shipsInTransit.length > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <DataChip icon="ship-transport" tone="good">{shipsInTransit.length} in transit</DataChip>
          </div>
        )}

        <p id="solar-system-canvas-hint" className="sr-only">
          Click a location to open its radial command menu — build, dispatch, demand, standing orders and full detail, at the body.
          Drag to pan, scroll to zoom. Zoom controls how much per-location detail is drawn; the Location List always shows everything,
          and the Labels toggle forces full labels at every zoom. This canvas is mouse/touch-only — use the Location List overlay
          (bottom-left) to browse and select every location by keyboard, and press C on a row for its command menu.
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
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full"
          role="img"
          aria-label="Interactive solar system map showing your unlocked locations, buildings, NPC presence, and ships in transit"
          aria-describedby="solar-system-canvas-hint"
        />

        {/* Zoom controls */}
        <div className="hud-frame relative flex flex-col gap-1 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm absolute top-2 right-2">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom in">+</button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom out">−</button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-[10px] hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Reset view">⟲</button>
        </div>

        {/* Layer toggles */}
        <div className="hud-frame relative flex flex-col gap-1 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm absolute top-2 left-2">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
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

      <p id="solar-system-canvas-hint" className="text-slate-600 text-[10px] text-center">Click a location to see details. Drag to pan, scroll to zoom. Toggle lanes and ships with the top-left buttons. This canvas is mouse/touch-only — use the Location List below to browse and select every location by keyboard.</p>
    </div>
  );
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

/** Render a ship — sprite (rotated to heading) when loaded, chevron fallback otherwise.
 *  Size is the chevron "unit" radius; sprite is drawn at ~6×size so it reads clearly. */
function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  color: string,
  size: number,
  sprite: HTMLImageElement | undefined,
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
  drawShipMarker(ctx, x, y, heading, color, size);
}

function drawShipMarker(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, color: string, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  // Chevron shape
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size * 1.4, 0);
  ctx.lineTo(-size * 0.8, -size * 0.8);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.8, size * 0.8);
  ctx.closePath();
  ctx.fill();
  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(size * 1.4, 0);
  ctx.lineTo(-size * 0.8, -size * 0.8);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.8, size * 0.8);
  ctx.closePath();
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
