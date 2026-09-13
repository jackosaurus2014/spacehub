// ─── Map labels — priority, screen-space declutter, leader lines ────────────
// Graphics review 2026-09-12 item 6 (flight mode part b). The solar map's
// labels are HUD-facing SDF text at a constant pixel size, so two bodies a
// few pixels apart on screen (Lunar Orbit / Moon, the Galilean moons) would
// paint on top of each other. Every 250 ms the renderer projects each shown
// label to a screen rectangle and calls declutterLabels(), which:
//
//   1. sorts by priority — selected > holdings > major bodies > pips > moons
//      (labelPriority), ties broken by id so the result is deterministic;
//   2. keeps the highest-priority label at its natural spot;
//   3. for every lower label that would overlap a kept one, tries a short
//      list of displaced spots (further below, above, beside, diagonal —
//      DECLUTTER_CANDIDATES, in label-height units) and keeps the first
//      free one; a label that moved gets a LEADER LINE back to its anchor;
//   4. suppresses a label only when no candidate is free.
//
// A label's previous placement is tried first among the displaced spots so
// bodies drifting on their orbits do not make labels hop every tick.
//
// Pure — no three.js, no DOM — shared by both solar renderers and unit-
// tested. The 'alwaysLabels' accessibility override bypasses the declutter
// (it promises every label), and the Location List stays canonical.

import { isMajorLocation } from './map-zoom';

export interface LabelBadgeCounts { buildings: number; npc: number; world: number }

/** Declutter priority for a location label (higher wins a collision). */
export function labelPriority(locationId: string | undefined, kind: 'body' | 'pip', badges: LabelBadgeCounts): number {
  let p = kind === 'pip' ? 1 : (locationId && isMajorLocation(locationId)) ? 3 : 2;
  if (badges.buildings > 0) p += 3;
  return p;
}

export interface LabelRectInput {
  id: string;
  /** Natural centre of the label on screen (px). */
  x: number;
  y: number;
  /** Label extent (px). */
  w: number;
  h: number;
  priority: number;
}

export interface LabelPlacement {
  /** Offset (px) from the natural centre; (0, 0) = natural spot. */
  dx: number;
  dy: number;
  /** Draw a leader from the anchor to the displaced label. */
  leader: boolean;
  suppressed: boolean;
}

/** How often the renderers re-run the declutter (ms). */
export const DECLUTTER_INTERVAL_MS = 250;

/** A displaced label closer than this to its natural spot gets no leader. */
export const LEADER_MIN_PX = 8;

/** Displacement candidates as multiples of the label's own (w, h): further
 *  below first (labels hang under their body), then above, beside, the
 *  diagonals and finally two rows out. Steps exceed 1.0 so a same-sized
 *  neighbour clears with the default gap. The natural spot is always tried
 *  first and is not listed here. */
export const DECLUTTER_CANDIDATES: ReadonlyArray<readonly [number, number]> = [
  [0, 1.4],
  [0, -1.4],
  [1.1, 0],
  [-1.1, 0],
  [1.1, 1.4],
  [-1.1, 1.4],
  [1.1, -1.4],
  [-1.1, -1.4],
  [0, 2.8],
  [0, -2.8],
];

const NATURAL: LabelPlacement = { dx: 0, dy: 0, leader: false, suppressed: false };

interface Rect { x: number; y: number; w: number; h: number }

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface DeclutterOptions {
  /** The selected body's label always wins (infinite priority). */
  selectedId?: string | null;
  /** Last tick's placements — a moved label prefers its previous spot. */
  previous?: ReadonlyMap<string, LabelPlacement> | null;
  /** Padding (px) added around every rectangle before testing. */
  gapPx?: number;
}

/**
 * Place every label: natural, displaced (+ leader) or suppressed. The
 * returned map has an entry for every input id.
 */
export function declutterLabels(items: readonly LabelRectInput[], opts: DeclutterOptions = {}): Map<string, LabelPlacement> {
  const gap = opts.gapPx ?? 2;
  const selected = opts.selectedId ?? null;
  const sorted = items
    .map(it => ({ it, p: it.id === selected ? Number.POSITIVE_INFINITY : it.priority }))
    .sort((a, b) => (b.p - a.p) || (a.it.id < b.it.id ? -1 : a.it.id > b.it.id ? 1 : 0));
  const kept: Rect[] = [];
  const out = new Map<string, LabelPlacement>();
  const rectAt = (it: LabelRectInput, dx: number, dy: number): Rect => ({
    x: it.x + dx - it.w / 2 - gap,
    y: it.y + dy - it.h / 2 - gap,
    w: it.w + gap * 2,
    h: it.h + gap * 2,
  });
  const free = (r: Rect) => !kept.some(k => overlaps(r, k));
  for (const { it } of sorted) {
    const natural = rectAt(it, 0, 0);
    if (free(natural)) {
      kept.push(natural);
      out.set(it.id, NATURAL);
      continue;
    }
    // Candidate offsets: the previous placement (if it moved) first, then the
    // fixed list — so a label that had to move stays where it went.
    const prev = opts.previous?.get(it.id);
    const candidates: [number, number][] = [];
    if (prev && !prev.suppressed && (prev.dx !== 0 || prev.dy !== 0)) candidates.push([prev.dx, prev.dy]);
    for (const [cx, cy] of DECLUTTER_CANDIDATES) candidates.push([cx * it.w, cy * it.h]);
    let placed: LabelPlacement | null = null;
    for (const [dx, dy] of candidates) {
      const r = rectAt(it, dx, dy);
      if (!free(r)) continue;
      kept.push(r);
      placed = { dx, dy, leader: Math.hypot(dx, dy) >= LEADER_MIN_PX, suppressed: false };
      break;
    }
    out.set(it.id, placed ?? { dx: 0, dy: 0, leader: false, suppressed: true });
  }
  return out;
}

// ─── Typography + colour tokens for the SDF labels ──────────────────────────
// One place for the label look; values are the ones the canvas-sprite
// labels already used (no new colours). Both renderers read these.

/** Same face the HUD body text uses (DM Sans 600, latin subset, 24 KB WOFF
 *  under public/fonts — troika parses WOFF, not WOFF2, so next/font's
 *  hashed WOFF2 cannot be reused). */
export const MAP_LABEL_FONT_URL = '/fonts/dm-sans-600.woff';
export const MAP_LABEL_PX = 13;
export const MAP_BADGE_PX = 11;
export const MAP_MODE_BADGE_PX = 11;
export const MAP_TAG_PX = 11;
/** Pre-warmed glyph set (troika lays these out once at font load). */
export const MAP_LABEL_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;/+-–−·×%$()\'"&';

export const MAP_LABEL_COLORS = {
  name: '#e2e8f0',
  locked: '#64748b',
  badgeBuildings: '#06b6d4',
  badgeNpc: '#ef4444',
  badgeWorld: '#a855f7',
  badgeText: '#ffffff',
  governor: '#fbbf24',
  stakeholder: '#22d3ee',
  leader: '#94a3b8',
  orbitHighlight: '#22d3ee',
  tag: '#67e8f9',
  tagHolding: '#cbd5e1',
} as const;

/**
 * Keep SDF text inside the shipped font's coverage (Google's latin subset:
 * Basic Latin, Latin-1, General Punctuation, minus, up/down arrows). Any
 * other code point would make troika fetch a fallback face from a CDN the
 * CSP blocks, so it is mapped to an ASCII stand-in or dropped. Symbol
 * glyphs (crown, diamond, mode marks) are drawn as small canvas sprites
 * beside the text instead — see shared.tsx.
 */
export function hudSafeText(text: string): string {
  return text
    .replace(/→/g, '>')
    .replace(/←/g, '<')
    .replace(/…/g, '...')
    .replace(/[^\u0009\u000A\u0020-\u007E\u00A0-\u00FF\u2000-\u206F\u2212\u2191\u2193\u20AC\u2122]/g, '');
}
