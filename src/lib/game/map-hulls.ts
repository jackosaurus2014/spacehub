// ─── Ship hulls — model mapping, instance batching, 2D glyphs ───────────────
// Graphics review 2026-09-12 item 7 (flight mode part b). Ships on the solar
// map are hull SILHOUETTES, not cones: four low-poly glTF hulls authored by
// art/blender/ships.py share one 512 px atlas (albedo in the top half,
// emissive in the bottom half — same UVs, v shifted by -0.5). This module is
// the renderer-neutral half: which hull a ship category gets, how a mixed
// list of own ships and traffic contacts splits into instanced draw groups,
// and the 2D canvas glyph per hull so classes stay distinguishable there.
//
// Visibility rule (docs/POLICY.md "Ship visibility", ship-traffic.ts): only
// YOUR ships and REVEALED contacts get a hull model. Anonymised contacts
// stay the dim generic marker (their exact class is intelligence the viewer
// has not earned — the hull silhouette would leak it); NPC backdrop keeps
// its faction slab. Pure; unit-tested.

import { TRAFFIC_RENDER_CAP, type ContactHullClass, type TrafficContact } from './ship-traffic';

export type HullModelId = 'freighter' | 'miner' | 'survey' | 'flagship';

export const HULL_MODEL_IDS: readonly HullModelId[] = ['freighter', 'miner', 'survey', 'flagship'];

export const HULL_MODEL_URL: Record<HullModelId, string> = {
  freighter: '/game/models/hull-freighter.glb',
  miner: '/game/models/hull-miner.glb',
  survey: '/game/models/hull-survey.glb',
  flagship: '/game/models/hull-flagship.glb',
};

/** The shared atlas. In the IMAGE the albedo is the top half and the
 *  emissive the bottom half; glTF UVs run top-down (the renderer loads the
 *  atlas with flipY = false), so albedo is v ∈ [0, 0.5] and the emissive
 *  twin is the same UV shifted by +0.5. */
export const HULL_ATLAS_URL = '/game/models/ship-atlas.webp';
export const HULL_ATLAS_EMISSIVE_OFFSET_V = 0.5;

/** Hull length is 1.0 unit (nose +Y). Instance scales per context. */
export const HULL_SCALE = {
  /** Your ships in the system view (the old cone was 0.34 tall). */
  ownSystem: 0.42,
  /** Revealed contacts in the system view. */
  revealedSystem: 0.3,
  /** Local scene: multiple of the body's visual radius. */
  ownLocal: 0.16,
  revealedLocal: 0.13,
} as const;

/** Category → hull model. Tankers and arks are haulers in silhouette;
 *  servicers share the survey dart (both are slim utility craft). */
export function hullModelFor(hullClass: ContactHullClass): HullModelId {
  switch (hullClass) {
    case 'miner': return 'miner';
    case 'survey':
    case 'servicer': return 'survey';
    case 'flagship': return 'flagship';
    case 'freighter':
    case 'tanker':
    case 'ark':
    default: return 'freighter';
  }
}

export type HullRenderKind = 'own' | 'revealed' | 'anonymous' | 'npc';

/** How a traffic contact renders: NPC slab, revealed hull, or the dim marker. */
export function contactRenderKind(c: TrafficContact): HullRenderKind {
  if (c.npc) return 'npc';
  return c.intel ? 'revealed' : 'anonymous';
}

export interface HullInstanceInput {
  id: string;
  hullClass: ContactHullClass;
  kind: HullRenderKind;
}

export interface HullBatches<T extends HullInstanceInput> {
  /** Hull-model instances (own + revealed), one group per model. */
  hulls: Record<HullModelId, T[]>;
  /** Anonymised contacts — the generic marker. */
  anonymous: T[];
  /** NPC backdrop — the faction slab. */
  npc: T[];
  /** Revealed contacts — also get the corp-coloured ring. */
  rings: T[];
  /** Everything after the cap (dropped). */
  dropped: number;
}

/**
 * Split a mixed list into instanced draw groups. Order within each group
 * follows the input order (the renderer maps instanceId → item by index).
 */
export function batchHullInstances<T extends HullInstanceInput>(items: readonly T[], cap = TRAFFIC_RENDER_CAP): HullBatches<T> {
  const out: HullBatches<T> = {
    hulls: { freighter: [], miner: [], survey: [], flagship: [] },
    anonymous: [],
    npc: [],
    rings: [],
    dropped: 0,
  };
  const limit = Math.min(items.length, Math.max(0, cap));
  out.dropped = items.length - limit;
  for (let i = 0; i < limit; i++) {
    const it = items[i];
    switch (it.kind) {
      case 'own':
        out.hulls[hullModelFor(it.hullClass)].push(it);
        break;
      case 'revealed':
        out.hulls[hullModelFor(it.hullClass)].push(it);
        out.rings.push(it);
        break;
      case 'npc':
        out.npc.push(it);
        break;
      default:
        out.anonymous.push(it);
    }
  }
  return out;
}

// ─── 2D glyphs (parity: the canvas keeps dots/chevrons, hulls vary shape) ──

export type HullGlyph = 'chevron' | 'barge' | 'dart' | 'delta';

export const HULL_GLYPH: Record<HullModelId, HullGlyph> = {
  freighter: 'chevron',
  miner: 'barge',
  survey: 'dart',
  flagship: 'delta',
};

/** Unit polygon per glyph, nose along +x, roughly 2 units long, closed by
 *  the caller. The freighter keeps the original chevron so nothing that
 *  read as "a ship" before changes shape. */
const GLYPH_POINTS: Record<HullGlyph, ReadonlyArray<readonly [number, number]>> = {
  chevron: [[1.4, 0], [-0.8, -0.8], [-0.3, 0], [-0.8, 0.8]],
  barge: [[1.1, -0.4], [1.1, 0.4], [0.5, 0.75], [-0.95, 0.75], [-0.95, -0.75], [0.5, -0.75]],
  dart: [[1.55, 0], [0.15, -0.3], [-0.2, -1.05], [-0.6, -1.05], [-0.5, -0.3], [-0.9, -0.3], [-0.9, 0.3], [-0.5, 0.3], [-0.6, 1.05], [-0.2, 1.05], [0.15, 0.3]],
  delta: [[1.25, 0], [-0.6, -1.2], [-1.0, -0.5], [-1.0, 0.5], [-0.6, 1.2]],
};

export function hullGlyphPoints(glyph: HullGlyph): ReadonlyArray<readonly [number, number]> {
  return GLYPH_POINTS[glyph];
}

/** Convenience: the 2D glyph for a ship category. */
export function hullGlyphFor(hullClass: ContactHullClass): HullGlyph {
  return HULL_GLYPH[hullModelFor(hullClass)];
}
