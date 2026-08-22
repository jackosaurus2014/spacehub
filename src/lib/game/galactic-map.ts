// ─── Space Tycoon: Galactic layer restage (Wave A4) ─────────────────────────
// docs/VISUAL_AAA_2026-08.md §A4.1, spec'd in VISUAL_DEPTH_2026-08.md §V4.5.
// The V4 audit's verdict on this surface was blunt: "hand-placed nodes on a
// static starfield image; no parallax, no depth, no per-system identity art"
// — a flat diagram sitting next to a lit 3D solar scene.
//
// This module owns the PURE half of the restage so the view and the tests
// share one derivation:
//
//   1. STAR IDENTITY — real stellar classification for the five canonical
//      destinations. Colour comes from spectral class (the standard
//      class→chromaticity mapping), node size from the star's REAL radius in
//      solar radii, and the binary flag from the system's own canon
//      description ("binary star system", "bright binary with a white dwarf
//      companion"). Nothing is invented; every value is checkable against the
//      system's `description` in interstellar.ts.
//
//   2. POSITION — the bearing is the Wave-9 hand-placed layout preserved for
//      continuity and legible spacing, but the RADIUS from Sol is now
//      proportional to the system's real `distanceLy`. Proxima sits closest
//      because it IS closest; Sirius sits furthest because it IS furthest.
//      That was previously not true of the map at all.
//
//   3. PRESENCE — what YOU have there, derived from GameState only: colony,
//      expedition on site, expedition in transit, jump-ready, or locked. Each
//      state carries a distinct glyph AND a word, so the node is never
//      colour-only.
//
//   4. PARALLAX — layer depth math. Motion is a *preference*, so the reduced
//      flag returns a zero offset for every layer rather than a scaled one:
//      under prefers-reduced-motion the field is dead static, not "less
//      wobbly".
//
// No React, no DOM, no three.js.

import type { GameState } from './types';
import { INTERSTELLAR_SYSTEMS, INTERSTELLAR_SYSTEM_MAP, getJumpPrerequisites } from './interstellar';
import { getExpeditionLaunchReadiness } from './expeditions';

// ─── 1. Star identity ────────────────────────────────────────────────────────

export interface StarIdentity {
  /** Morgan-Keenan class of the primary. */
  spectralClass: string;
  /** Plain-language class name — the TEXT twin of the node's colour. */
  classLabel: string;
  /** Photospheric colour for the primary, from its spectral class. */
  color: string;
  /** Corona / halo tint (a lighter wash of `color`). */
  haloColor: string;
  /** Primary's radius in solar radii — drives the node's relative size. */
  solarRadii: number;
  /** True for the two canon binaries (Alpha Centauri A/B, Sirius A/B). */
  binary: boolean;
  /** Companion class where the system is a binary; null otherwise. */
  companionClass: string | null;
  /** True for canon flare stars — the node gets a flare pip (plus the word). */
  flareStar: boolean;
}

/**
 * Real stellar data for the five canonical destinations. Each entry is
 * consistent with the system's own `description` in interstellar.ts:
 *   proxima  "Nearest star system to Sol"           → M5.5Ve red dwarf
 *   barnards "Dim red dwarf"                        → M4.0V red dwarf
 *   wolf_359 "Low-luminosity flare star"            → M6.0V flare star
 *   alpha    "Binary star system"                   → G2V + K1V
 *   sirius   "Bright binary with a white dwarf"     → A1V + DA2
 */
export const STAR_IDENTITY: Readonly<Record<string, StarIdentity>> = {
  proxima_centauri: {
    spectralClass: 'M5.5Ve', classLabel: 'Red dwarf (flare star)',
    color: '#ff7b54', haloColor: '#ffb08a',
    solarRadii: 0.15, binary: false, companionClass: null, flareStar: true,
  },
  barnards_star: {
    spectralClass: 'M4.0V', classLabel: 'Red dwarf',
    color: '#ff9563', haloColor: '#ffc39c',
    solarRadii: 0.19, binary: false, companionClass: null, flareStar: false,
  },
  wolf_359: {
    spectralClass: 'M6.0V', classLabel: 'Red dwarf (flare star)',
    color: '#ff6a45', haloColor: '#ffa07a',
    solarRadii: 0.16, binary: false, companionClass: null, flareStar: true,
  },
  alpha_centauri: {
    spectralClass: 'G2V', classLabel: 'Sun-like binary',
    color: '#fff4d6', haloColor: '#ffe8b0',
    solarRadii: 1.22, binary: true, companionClass: 'K1V', flareStar: false,
  },
  sirius: {
    spectralClass: 'A1V', classLabel: 'Blue-white binary (white-dwarf companion)',
    color: '#cfe1ff', haloColor: '#9dc0ff',
    solarRadii: 1.71, binary: true, companionClass: 'DA2', flareStar: false,
  },
};

export const DEFAULT_STAR_IDENTITY: StarIdentity = {
  spectralClass: '—', classLabel: 'Uncatalogued star',
  color: '#94a3b8', haloColor: '#cbd5e1',
  solarRadii: 1, binary: false, companionClass: null, flareStar: false,
};

export function getStarIdentity(systemId: string): StarIdentity {
  return STAR_IDENTITY[systemId] ?? DEFAULT_STAR_IDENTITY;
}

/** Node diameter in px from the primary's real radius. Compressed with a
 *  cube-root so a 0.15 R☉ dwarf is still a clickable target and Sirius does
 *  not swallow the map — the ORDERING is real, the scale is legible. */
export const STAR_NODE_MIN_PX = 12;
export const STAR_NODE_MAX_PX = 26;

export function starNodeSizePx(solarRadii: number): number {
  const r = Math.max(0.05, Math.min(3, solarRadii));
  const t = (Math.cbrt(r) - Math.cbrt(0.05)) / (Math.cbrt(3) - Math.cbrt(0.05));
  return Math.round(STAR_NODE_MIN_PX + t * (STAR_NODE_MAX_PX - STAR_NODE_MIN_PX));
}

// ─── 2. Position ─────────────────────────────────────────────────────────────

/** Bearing in degrees clockwise from screen-up, preserved from the Wave-9
 *  hand-placed layout so the map stays familiar and the five labels never
 *  collide. (Real galactic longitude would place Proxima and Alpha Centauri
 *  ~2° apart — they are physically the same system — which is unreadable at
 *  this scale, so the bearing stays authored while the RADIUS goes real.) */
export const SYSTEM_BEARING_DEG: Readonly<Record<string, number>> = {
  proxima_centauri: -132,
  alpha_centauri: -74,
  barnards_star: 0,
  wolf_359: 127,
  sirius: 68,
};

export const SOL_POSITION = { x: 0.5, y: 0.5 };
/** Layout radius (fraction of the container) for the nearest / furthest
 *  destination. Everything in between interpolates on real light-years. */
export const GALACTIC_MIN_RADIUS = 0.17;
export const GALACTIC_MAX_RADIUS = 0.40;

const LY_RANGE = (() => {
  const ds = INTERSTELLAR_SYSTEMS.map(s => s.distanceLy);
  return { min: Math.min(...ds), max: Math.max(...ds) };
})();

/** Layout radius for a real distance in light-years. Linear in ly so the map
 *  reads as a true distance ladder. */
export function radiusForDistanceLy(distanceLy: number): number {
  const span = LY_RANGE.max - LY_RANGE.min;
  if (!(span > 0) || !Number.isFinite(distanceLy)) return GALACTIC_MIN_RADIUS;
  const t = Math.max(0, Math.min(1, (distanceLy - LY_RANGE.min) / span));
  return GALACTIC_MIN_RADIUS + t * (GALACTIC_MAX_RADIUS - GALACTIC_MIN_RADIUS);
}

/** Container-fraction position for a system: authored bearing, real radius. */
export function systemPosition(systemId: string): { x: number; y: number } {
  const sys = INTERSTELLAR_SYSTEM_MAP.get(systemId);
  const bearing = SYSTEM_BEARING_DEG[systemId] ?? 0;
  const r = radiusForDistanceLy(sys?.distanceLy ?? LY_RANGE.min);
  const rad = (bearing - 90) * (Math.PI / 180);
  return {
    x: SOL_POSITION.x + Math.cos(rad) * r,
    y: SOL_POSITION.y + Math.sin(rad) * r,
  };
}

/** All five, precomputed (the catalog is static). */
export const SYSTEM_POSITIONS: Readonly<Record<string, { x: number; y: number }>> =
  Object.fromEntries(INTERSTELLAR_SYSTEMS.map(s => [s.id, systemPosition(s.id)]));

// ─── 3. Presence ─────────────────────────────────────────────────────────────

export type SystemPresence =
  | 'colonized'
  | 'expedition_onsite'
  | 'expedition_transit'
  | 'ready'
  | 'locked';

export interface SystemPresenceMeta {
  /** Distinct SHAPE per state — the colourblind-safe carrier. */
  glyph: string;
  /** Short uppercase chip text. */
  chip: string;
  /** Sentence for screen readers. */
  label: string;
}

export const PRESENCE_META: Record<SystemPresence, SystemPresenceMeta> = {
  colonized:          { glyph: '⌂', chip: 'COLONY',   label: 'you hold a permanent colony here' },
  expedition_onsite:  { glyph: '◎', chip: 'ON SITE',  label: 'your expedition is surveying on site' },
  expedition_transit: { glyph: '➜', chip: 'EN ROUTE', label: 'your expedition is in jump transit' },
  ready:              { glyph: '●', chip: 'READY',    label: 'jump ready — prerequisites and fuel are met' },
  locked:             { glyph: '○', chip: 'LOCKED',   label: 'jump blocked — prerequisites or fuel are missing' },
};

export interface SystemIdentity {
  systemId: string;
  name: string;
  distanceLy: number;
  star: StarIdentity;
  position: { x: number; y: number };
  nodeSizePx: number;
  presence: SystemPresence;
  presenceMeta: SystemPresenceMeta;
  /** Missing jump-drive prerequisites (research ids). Empty when satisfied. */
  missingResearch: string[];
  /**
   * True when the player cannot pay for this system's fuel — NOT when
   * inventory is empty.
   *
   * E3.1: `exotic_fuel` has no Sol-side source, so an inventory test made
   * every system permanently `locked`. `planExpedition` procures the
   * shortfall at a 1.25x premium, so the real question is affordability.
   */
  fuelShort: boolean;
  /** Colony population when colonized, else null. */
  colonyPopulation: number | null;
  /** Shipments currently inbound to Sol from this system. */
  inboundShipments: number;
  /** One sentence carrying every state above in TEXT. */
  srText: string;
}

const TRANSIT_PHASES = new Set(['outbound', 'returning']);

/**
 * Everything the galactic node needs, derived from GameState + real stellar
 * data. Never invents: a system with no expedition and no colony simply
 * reports ready/locked from the SAME gate the expedition planner uses —
 * which, since E3.1, means running `getExpeditionLaunchReadiness` (i.e. the
 * planner itself) rather than a hand-copied predicate that could drift.
 */
export function deriveSystemIdentity(state: GameState, systemId: string): SystemIdentity | null {
  const sys = INTERSTELLAR_SYSTEM_MAP.get(systemId);
  if (!sys) return null;

  const star = getStarIdentity(systemId);
  const missingResearch = getJumpPrerequisites(systemId, state.completedResearch);
  const readiness = getExpeditionLaunchReadiness(state, systemId);
  // "Fuel short" now means "cannot pay for the fuel", not "inventory empty".
  const fuelShort = !!readiness && readiness.fuelUnitsPurchased > 0 && state.money < readiness.fuelPurchaseCost;

  const colony = (state.interstellarColonies || []).find(c => c.systemId === systemId) || null;
  const expeditions = (state.expeditions || []).filter(
    e => e.targetSystemId === systemId && e.phase !== 'completed' && e.phase !== 'lost',
  );
  const onSite = expeditions.some(e => e.phase === 'exploring');
  const inTransit = expeditions.some(e => TRANSIT_PHASES.has(e.phase));

  // A system is 'ready' when the research is done and the fuel bill is
  // payable. Having no idle hull is a fleet problem, not a locked system —
  // the node stays 'ready' and the blocker text says why (matching how the
  // radial and the dossier now read).
  const presence: SystemPresence = colony
    ? 'colonized'
    : onSite
      ? 'expedition_onsite'
      : inTransit
        ? 'expedition_transit'
        : (missingResearch.length === 0 && !fuelShort)
          ? 'ready'
          : 'locked';

  const inboundShipments = (state.interstellarTradeRoutes || [])
    .filter(r => r.systemId === systemId)
    .reduce((n, r) => n + (r.inTransit?.length || 0), 0);

  const meta = PRESENCE_META[presence];
  const blockers: string[] = [];
  if (missingResearch.length > 0) blockers.push(`research required: ${missingResearch.map(r => r.replace(/_/g, ' ')).join(', ')}`);
  if (fuelShort && readiness) {
    blockers.push(`fuel procurement costs ${Math.round(readiness.fuelPurchaseCost).toLocaleString()} dollars — more than the treasury holds`);
  }

  const srText = [
    `${sys.name}, ${sys.distanceLy.toFixed(2)} light-years from Sol`,
    `${star.classLabel} (${star.spectralClass})`,
    meta.label,
    colony ? `colony population ${Math.floor(colony.population).toLocaleString()}` : null,
    inboundShipments > 0 ? `${inboundShipments} shipment${inboundShipments === 1 ? '' : 's'} inbound to Sol` : null,
    presence === 'locked' && blockers.length > 0 ? blockers.join('; ') : null,
  ].filter(Boolean).join('. ') + '.';

  return {
    systemId,
    name: sys.name,
    distanceLy: sys.distanceLy,
    star,
    position: SYSTEM_POSITIONS[systemId] ?? systemPosition(systemId),
    nodeSizePx: starNodeSizePx(star.solarRadii),
    presence,
    presenceMeta: meta,
    missingResearch,
    fuelShort,
    colonyPopulation: colony ? colony.population : null,
    inboundShipments,
    srText,
  };
}

/** All five identities in catalog order. */
export function deriveSystemIdentities(state: GameState): SystemIdentity[] {
  return INTERSTELLAR_SYSTEMS
    .map(s => deriveSystemIdentity(state, s.id))
    .filter((x): x is SystemIdentity => x !== null);
}

// ─── 4. Parallax ─────────────────────────────────────────────────────────────
// Three starfield plates plus the nebula wash, each translated by a depth-
// scaled fraction of the pointer/focus offset. Far plates barely move, near
// plates move most — the standard depth cue, done on transform: translate3d
// so it stays on the compositor and never touches layout.

export interface ParallaxLayerDef {
  id: string;
  /** 0 = infinitely far (static), 1 = at the interaction plane. */
  depth: number;
  /** Max travel in px at |offset| = 1. */
  travelPx: number;
}

/** Ordered back → front. The nebula wash is the deepest plate, so it reads as
 *  the backdrop the stars sit inside rather than a sticker over them. */
export const PARALLAX_LAYERS: ParallaxLayerDef[] = [
  { id: 'nebula', depth: 0.12, travelPx: 8 },
  { id: 'stars-far', depth: 0.28, travelPx: 14 },
  { id: 'stars-mid', depth: 0.55, travelPx: 26 },
  { id: 'stars-near', depth: 1.0, travelPx: 44 },
];

export interface ParallaxOffset { id: string; dx: number; dy: number }

/**
 * Layer translations for a normalized interaction offset.
 *
 * `x` / `y` are −1…1, measured from the container centre. They come from the
 * pointer on a fine-pointer device AND from the selected system's own position
 * (so a keyboard-only player gets the identical depth response on selection —
 * parallax is not a mouse-only feature here).
 *
 * `reducedMotion` returns a hard zero for every layer: under the OS
 * preference the field is static, not merely damped.
 */
export function parallaxOffsets(x: number, y: number, reducedMotion = false): ParallaxOffset[] {
  if (reducedMotion) return PARALLAX_LAYERS.map(l => ({ id: l.id, dx: 0, dy: 0 }));
  const cx = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
  const cy = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
  return PARALLAX_LAYERS.map(l => ({
    id: l.id,
    // Layers translate OPPOSITE the pointer, which is what reads as depth.
    dx: -cx * l.travelPx * l.depth,
    dy: -cy * l.travelPx * l.depth,
  }));
}

/** Convert a container-relative point to the −1…1 offset the layers expect. */
export function normalizePointer(px: number, py: number, width: number, height: number): { x: number; y: number } {
  if (!(width > 0) || !(height > 0)) return { x: 0, y: 0 };
  return {
    x: Math.max(-1, Math.min(1, (px / width) * 2 - 1)),
    y: Math.max(-1, Math.min(1, (py / height) * 2 - 1)),
  };
}
