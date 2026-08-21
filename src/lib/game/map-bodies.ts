// ─── Space Tycoon: Body presentation data + orbital-slot ring math ──────────
// Wave A2 ("map as command theater", item 3 — Sins-of-a-Solar-Empire body
// presentation). Two concerns, both shared by BOTH map renderers so the 3D
// scene and the 2D accessibility canvas can never disagree:
//
//   1. ATMOSPHERES — a data table (not per-body branching in the renderer)
//      describing which locations get an atmospheric rim/haze treatment and
//      how strong it is. Values track real surface pressure so Venus reads
//      thick, Mars reads barely-there, and airless rock gets nothing.
//
//   2. ORBITAL SLOT RINGS — the arc math that turns the REAL, sync-delivered
//      occupancy snapshot (state.orbitalSlotOccupancy, populated from the
//      server OrbitalSlotOccupancy cache — see spatial-strategy.ts) into
//      yours / other corporations / free arc segments around the body.
//      "Orbital slots are finite" is a core design pillar (CLAUDE.md
//      §Spatial strategy) that until now was visible only inside a popover
//      table; this makes it a property of the world.
//
// Pure functions + data only. No three.js, no canvas, no React.

import type { GameState } from './types';
import {
  ORBITAL_SLOT_MAP,
  countPlayerBuildingsAt,
  occupancyBucket,
  hasActiveSlotLease,
  type OrbitalSlotPool,
} from './spatial-strategy';

// ─── 1. Atmospheres ──────────────────────────────────────────────────────────

export interface AtmosphereDef {
  /** Rim/haze tint. */
  color: string;
  /** 0..1 — peak alpha of the haze shell (3D) / rim arc (2D). */
  opacity: number;
  /** Shell radius as a multiple of the body radius (3D BackSide sphere and
   *  the 2D rim stroke both use this). */
  shellScale: number;
  /** Short text description — used in the location list / screen-reader copy
   *  so the atmosphere is never a purely visual signal. */
  label: string;
}

/**
 * Atmospheric bodies, keyed by GAME LOCATION id (both renderers address
 * bodies by location id, and ORBITAL_BODIES entries all carry one).
 *
 * Opacity is scaled from real surface pressure on a log-ish feel, not a
 * literal mapping: Venus (92 bar) reads as the thickest, Titan (1.5 bar) and
 * Earth (1 bar) as substantial, Mars (0.006 bar) and Io (~nbar SO2) as the
 * faintest wisp. The gas giants get a banded-limb haze rather than a
 * "surface" atmosphere. Airless bodies (the Moon, Europa, Ganymede,
 * Callisto, Enceladus, Ceres, Mercury, every orbital pip) are absent from
 * this table and render with no rim treatment at all — the presence or
 * absence of the glow is itself information.
 */
export const ATMOSPHERES: Readonly<Record<string, AtmosphereDef>> = {
  earth_surface:  { color: '#7dd3fc', opacity: 0.17, shellScale: 1.075, label: 'Breathable nitrogen–oxygen atmosphere (1 bar)' },
  venus_orbit:    { color: '#fde68a', opacity: 0.27, shellScale: 1.115, label: 'Crushing carbon-dioxide atmosphere (92 bar)' },
  mars_surface:   { color: '#fdba74', opacity: 0.08, shellScale: 1.045, label: 'Thin carbon-dioxide atmosphere (0.006 bar)' },
  titan_surface:  { color: '#fbbf24', opacity: 0.23, shellScale: 1.10,  label: 'Thick nitrogen–methane atmosphere (1.5 bar)' },
  jupiter_system: { color: '#fcd34d', opacity: 0.15, shellScale: 1.055, label: 'Deep hydrogen–helium envelope' },
  saturn_system:  { color: '#fde68a', opacity: 0.14, shellScale: 1.055, label: 'Deep hydrogen–helium envelope' },
  outer_system:   { color: '#67e8f9', opacity: 0.16, shellScale: 1.065, label: 'Hydrogen–helium–methane ice-giant envelope' },
  pluto_surface:  { color: '#e2e8f0', opacity: 0.06, shellScale: 1.035, label: 'Tenuous seasonal nitrogen haze' },
  io_surface:     { color: '#fde047', opacity: 0.06, shellScale: 1.035, label: 'Tenuous volcanic sulphur-dioxide envelope' },
};

/** Atmosphere for a location, or null for airless bodies and orbital pips. */
export function getAtmosphere(locationId: string | undefined | null): AtmosphereDef | null {
  if (!locationId) return null;
  return ATMOSPHERES[locationId] ?? null;
}

// ─── 2. Orbital slot rings ───────────────────────────────────────────────────

export type SlotRingSegmentKind = 'yours' | 'others' | 'free';

export interface SlotRingSegment {
  kind: SlotRingSegmentKind;
  count: number;
  /** Fraction of the full circle where this segment starts / ends (0..1,
   *  measured clockwise from the top). Segments are contiguous and sum to 1
   *  whenever the pool has any slots at all. */
  startFrac: number;
  endFrac: number;
}

export interface SlotRingModel {
  locationId: string;
  pool: OrbitalSlotPool;
  total: number;
  /** Your operational buildings here (mothballed/decommissioning excluded —
   *  spatial-strategy.isSlotOccupant is the shared definition). */
  yours: number;
  /** Everybody else, from the server snapshot. 0 when unsynced. */
  others: number;
  free: number;
  /** Server-wide occupied count (or `yours` when unsynced). */
  occupied: number;
  bucket: 'low' | 'medium' | 'high' | 'saturated';
  /** False when no sync-delivered snapshot exists for this pool — the ring
   *  then shows only YOUR footprint and says so, rather than inventing a
   *  system-wide figure. Mirrors checkOrbitalSlotGate's fail-open honesty. */
  synced: boolean;
  saturated: boolean;
  /** True when you hold an unexpired lease here (saturation does not block
   *  you). Drives the ring's "leased" text marker. */
  leased: boolean;
  segments: SlotRingSegment[];
  /** Compact text badge for the map label (never colour alone). */
  badge: string;
  /** Full sentence for the Location List / screen readers. */
  srText: string;
}

/** Minimum arc a non-zero segment may occupy, as a fraction of the circle.
 *  1.2% ≈ 4.3°, so a single slot out of 180 at GEO is still a visible tick
 *  instead of a sub-pixel sliver. */
export const MIN_SLOT_SEGMENT_FRAC = 0.012;

/**
 * Allocate circle fractions to the three segment counts, guaranteeing that
 * every NON-ZERO count gets at least MIN_SLOT_SEGMENT_FRAC and that the
 * fractions still sum to exactly 1. The deficit created by boosting tiny
 * segments is taken proportionally from the segments that have slack above
 * the minimum (so the big "free" arc absorbs it, never the 1-slot arcs).
 */
export function allocateSlotFractions(counts: number[], total: number): number[] {
  const safe = counts.map(c => Math.max(0, c));
  const sum = safe.reduce((a, b) => a + b, 0);
  const denom = total > 0 ? total : sum;
  if (denom <= 0) return safe.map(() => 0);

  // Normalise against the actual sum so rounding / over-count never spills
  // past a full circle (the server count can briefly exceed the pool size).
  const base = sum > 0 ? safe.map(c => c / sum) : safe.map(() => 0);
  const boosted = base.map(v => (v > 0 && v < MIN_SLOT_SEGMENT_FRAC ? MIN_SLOT_SEGMENT_FRAC : v));
  const deficit = boosted.reduce((a, b) => a + b, 0) - 1;
  if (deficit <= 1e-9) return boosted;

  const slack = boosted.map(v => Math.max(0, v - MIN_SLOT_SEGMENT_FRAC));
  const slackSum = slack.reduce((a, b) => a + b, 0);
  if (slackSum <= 1e-9) {
    const scale = 1 / (1 + deficit);
    return boosted.map(v => v * scale);
  }
  return boosted.map((v, i) => v - deficit * (slack[i] / slackSum));
}

/** Turn the three counts into contiguous clockwise arc segments. */
export function slotRingSegments(yours: number, others: number, free: number, total: number): SlotRingSegment[] {
  const fracs = allocateSlotFractions([yours, others, free], total);
  const kinds: SlotRingSegmentKind[] = ['yours', 'others', 'free'];
  const counts = [yours, others, free];
  const out: SlotRingSegment[] = [];
  let cursor = 0;
  for (let i = 0; i < 3; i++) {
    if (fracs[i] <= 0) continue;
    const start = cursor;
    const end = Math.min(1, cursor + fracs[i]);
    out.push({ kind: kinds[i], count: counts[i], startFrac: start, endFrac: end });
    cursor = end;
  }
  return out;
}

const BUCKET_LABEL: Record<SlotRingModel['bucket'], string> = {
  low: 'plenty free',
  medium: 'filling up',
  high: 'crowded',
  saturated: 'SATURATED — lease auction required',
};

/**
 * The ring model for one location, or null when the location has no finite
 * orbital-slot pool (surfaces, LEO, the belt…).
 *
 * Fail-soft contract: with no sync-delivered snapshot for the pool (offline,
 * solo, or never-synced saves) `synced` is false, `others` is 0, and the
 * badge/srText say "your footprint only" — exactly the same honesty the
 * build-path slot gate applies when it fails open.
 */
export function computeSlotRing(state: GameState, locationId: string, now: number = Date.now()): SlotRingModel | null {
  const pool = ORBITAL_SLOT_MAP.get(locationId);
  if (!pool) return null;

  const yours = countPlayerBuildingsAt(state, locationId);
  const snapshot = state.orbitalSlotOccupancy?.[locationId];
  const synced = !!snapshot && Number.isFinite(snapshot.occupiedCount);

  const occupied = synced
    ? Math.max(yours, Math.round(snapshot!.occupiedCount))
    : yours;
  const others = Math.max(0, occupied - yours);
  const free = Math.max(0, pool.totalSlots - occupied);

  const validBuckets: SlotRingModel['bucket'][] = ['low', 'medium', 'high', 'saturated'];
  const bucket: SlotRingModel['bucket'] = synced && validBuckets.includes(snapshot!.bucket as SlotRingModel['bucket'])
    ? (snapshot!.bucket as SlotRingModel['bucket'])
    : occupancyBucket(occupied, pool.totalSlots) as SlotRingModel['bucket'];

  const leased = hasActiveSlotLease(state, locationId, now);

  const badge = synced
    ? `◍ ${occupied}/${pool.totalSlots}${yours > 0 ? ` · you ${yours}` : ''}${bucket === 'saturated' ? ' · FULL' : ''}`
    : `◍ you ${yours}/${pool.totalSlots} · unsynced`;

  const srText = synced
    ? `${pool.label}: ${occupied} of ${pool.totalSlots} orbital slots occupied — ${yours} yours, ${others} other corporations, ${free} free. Occupancy ${BUCKET_LABEL[bucket]}.${leased ? ' You hold an active slot lease here.' : ''}`
    : `${pool.label}: ${yours} of ${pool.totalSlots} orbital slots taken by your operations. System-wide occupancy has not synced yet.`;

  return {
    locationId,
    pool,
    total: pool.totalSlots,
    yours,
    others,
    free,
    occupied,
    bucket,
    synced,
    saturated: bucket === 'saturated',
    leased,
    segments: slotRingSegments(yours, others, free, pool.totalSlots),
    badge,
    srText,
  };
}

/** All pools' rings for the current save, in ORBITAL_SLOT_POOLS order. */
export function computeSlotRings(state: GameState, now: number = Date.now()): SlotRingModel[] {
  const out: SlotRingModel[] = [];
  ORBITAL_SLOT_MAP.forEach((_pool, locationId) => {
    const ring = computeSlotRing(state, locationId, now);
    if (ring) out.push(ring);
  });
  return out;
}

/**
 * Stroke style per segment kind. Colour is REINFORCEMENT ONLY — each kind is
 * also distinguished by line pattern (2D) / band thickness (3D) and by the
 * numeric badge + srText above, so the ring is readable without colour.
 */
export const SLOT_SEGMENT_STYLE: Record<SlotRingSegmentKind, {
  color: string;
  /** 2D canvas dash pattern; [] = solid. */
  dash: number[];
  /** 2D line width multiplier / 3D radial band thickness multiplier. */
  weight: number;
  label: string;
}> = {
  yours:  { color: '#22d3ee', dash: [],      weight: 1.0,  label: 'Yours' },
  others: { color: '#f59e0b', dash: [5, 3],  weight: 0.62, label: 'Other corporations' },
  free:   { color: '#64748b', dash: [2, 4],  weight: 0.34, label: 'Free' },
};
