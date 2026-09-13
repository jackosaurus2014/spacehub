// ─── Space Tycoon: HQ stage manifests (CC-1) ────────────────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §4 — each HQ stage is a 2.5D
// layered scene rendered by art/blender/ and published under
// public/game/hq/<stage>/ with a manifest.json. This module types the
// manifest and reads it GENERICALLY: variants (day/dusk/night/…) and actors
// (plume/padlights/weather/…) are iterated, never hardcoded, so the art
// pipeline can add a `sunrise` variant or a `vehicle` actor without a code
// change here. Anything the parser cannot make sense of is dropped rather
// than thrown — a bad manifest degrades to fewer layers, never a crash.

import earthManifestRaw from '../../../public/game/hq/earth/manifest.json';
import type { HqStageId } from './headquarters';

export interface HqLayerFile { file: string; bytes?: number; height?: number; width?: number }

export interface HqLayerDef {
  name: string;
  order: number;
  /** 0 = pinned to the far distance, 1 = moves with the window frame. */
  parallax: number;
  alpha: boolean;
}

export interface HqVariant {
  name: string;
  /** Pad/complex light intensity (0 = none; ≥1 = lit). Drives how strongly
   *  the `padlights` actor blends in for this variant. */
  lights: number;
  /** layer name → width → file */
  layers: Record<string, Record<string, HqLayerFile>>;
}

export interface HqActor {
  name: string;
  blend: 'normal' | 'screen' | string;
  /** The game trigger that animates it (bridge-events.ts BridgeTrigger). */
  trigger: string;
  /** Layer OR actor name this actor is composited beneath (e.g. 'near' =
   *  under the window frame; 'vehicle' = under the vehicle actor). */
  below: string;
  /** Optional: layer or actor this one sits above (used when `below` does
   *  not resolve). */
  above?: string;
  /** Stacking hint within the actors (lower first). */
  order: number;
  /** Always drawn at rest at its anchor (the vehicle on the pad); the
   *  trigger only animates it. */
  idle: boolean;
  /** Files are keyed by variant first (`files[variant][width]`) — the actor
   *  was rendered under each variant's light. */
  perVariant: boolean;
  /** Normalized stage box (x, y top-left; w, h size), 0..1 of the plate. */
  anchor: { x: number; y: number; w: number; h: number };
  widths: number[];
  /** width → file (non-perVariant), or the first variant's map. */
  files: Record<string, HqLayerFile>;
  /** variant → width → file (perVariant only). */
  filesByVariant?: Record<string, Record<string, HqLayerFile>>;
}

export interface HqManifest {
  stage: string;
  title: string;
  aspect: [number, number];
  widths: number[];
  /** URL directory the files live under (trailing slash). */
  baseUrl: string;
  composition: { horizonY: number; consoleClearBottom: number; overscan: number; padCenterX?: number };
  layers: HqLayerDef[];
  variants: Record<string, HqVariant>;
  actors: Record<string, HqActor>;
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asFiles(v: unknown): Record<string, HqLayerFile> {
  const out: Record<string, HqLayerFile> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [w, f] of Object.entries(v as Record<string, unknown>)) {
    if (f && typeof f === 'object' && typeof (f as HqLayerFile).file === 'string') out[w] = f as HqLayerFile;
  }
  return out;
}

/** Type and sanity-check a raw manifest. Returns null only when the shape is
 *  unusable (no layers or no variants). */
export function parseHqManifest(raw: unknown, baseUrl: string): HqManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const layers: HqLayerDef[] = Array.isArray(r.layers)
    ? (r.layers as Record<string, unknown>[])
        .filter(l => l && typeof l.name === 'string')
        .map(l => ({ name: l.name as string, order: num(l.order, 0), parallax: Math.max(0, Math.min(1, num(l.parallax, 0))), alpha: !!l.alpha }))
        .sort((a, b) => a.order - b.order)
    : [];
  const variants: Record<string, HqVariant> = {};
  if (r.variants && typeof r.variants === 'object') {
    for (const [name, v] of Object.entries(r.variants as Record<string, Record<string, unknown>>)) {
      if (!v || typeof v !== 'object' || !v.layers || typeof v.layers !== 'object') continue;
      const layerFiles: Record<string, Record<string, HqLayerFile>> = {};
      for (const [ln, lv] of Object.entries(v.layers as Record<string, Record<string, unknown>>)) {
        const files = asFiles(lv?.files);
        if (Object.keys(files).length > 0) layerFiles[ln] = files;
      }
      if (Object.keys(layerFiles).length === 0) continue;
      variants[name] = { name, lights: num(v.lights, 0), layers: layerFiles };
    }
  }
  const actors: Record<string, HqActor> = {};
  if (r.actors && typeof r.actors === 'object') {
    for (const [name, a] of Object.entries(r.actors as Record<string, Record<string, unknown>>)) {
      if (!a || typeof a !== 'object') continue;
      // Files are either width → file, or (perVariant) variant → width → file.
      // Detect by shape rather than trusting the flag: a map whose values
      // carry no `file` but whose nested values do is per-variant.
      let files = asFiles(a.files);
      let filesByVariant: Record<string, Record<string, HqLayerFile>> | undefined;
      if (Object.keys(files).length === 0 && a.files && typeof a.files === 'object') {
        const byV: Record<string, Record<string, HqLayerFile>> = {};
        for (const [vn, vf] of Object.entries(a.files as Record<string, unknown>)) {
          const f = asFiles(vf);
          if (Object.keys(f).length > 0) byV[vn] = f;
        }
        const names = Object.keys(byV);
        if (names.length > 0) {
          filesByVariant = byV;
          files = byV[names.find(n => n === 'day') ?? names[0]];
        }
      }
      if (Object.keys(files).length === 0) continue;
      const an = (a.anchor && typeof a.anchor === 'object' ? a.anchor : {}) as Record<string, unknown>;
      actors[name] = {
        name,
        blend: typeof a.blend === 'string' ? a.blend : 'normal',
        trigger: typeof a.trigger === 'string' ? a.trigger : name,
        below: typeof a.below === 'string' ? a.below : (layers[layers.length - 1]?.name ?? 'near'),
        above: typeof a.above === 'string' ? a.above : undefined,
        order: num(a.order, 0),
        idle: !!a.idle,
        perVariant: !!filesByVariant,
        anchor: { x: num(an.x, 0), y: num(an.y, 0), w: num(an.w, 1), h: num(an.h, 1) },
        widths: Array.isArray(a.widths) ? (a.widths as unknown[]).filter((w): w is number => typeof w === 'number') : Object.keys(files).map(Number),
        files,
        filesByVariant,
      };
    }
  }
  if (layers.length === 0 || Object.keys(variants).length === 0) return null;
  const comp = (r.composition && typeof r.composition === 'object' ? r.composition : {}) as Record<string, unknown>;
  const aspect = Array.isArray(r.aspect) && r.aspect.length === 2 ? [num(r.aspect[0], 21), num(r.aspect[1], 9)] as [number, number] : [21, 9] as [number, number];
  return {
    stage: typeof r.stage === 'string' ? r.stage : 'unknown',
    title: typeof r.title === 'string' ? r.title : '',
    aspect,
    widths: Array.isArray(r.widths) ? (r.widths as unknown[]).filter((w): w is number => typeof w === 'number').sort((a, b) => a - b) : [],
    baseUrl: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
    composition: {
      horizonY: num(comp.horizonY, 0.33),
      consoleClearBottom: Math.max(0, Math.min(0.5, num(comp.consoleClearBottom, 0.12))),
      overscan: Math.max(0, Math.min(0.2, num(comp.overscan, 0.03))),
      padCenterX: typeof comp.padCenterX === 'number' ? comp.padCenterX : undefined,
    },
    layers,
    variants,
    actors,
  };
}

/** The width → file map an actor uses under a given variant. */
export function actorFiles(actor: HqActor, variant: string | null | undefined): Record<string, HqLayerFile> {
  if (actor.filesByVariant && variant && actor.filesByVariant[variant]) return actor.filesByVariant[variant];
  return actor.files;
}

export type HqStackEntry =
  | { kind: 'layer'; layer: HqLayerDef; parallax: number }
  | { kind: 'actor'; actor: HqActor; parallax: number };

/** The composite order, back to front: layers by `order`, each actor
 *  slotted directly beneath the layer or actor its `below` names (or
 *  above its `above`), processed by `order` and resolved iteratively so an
 *  actor may sit below another actor. Unresolvable actors go on top. An
 *  actor's parallax is that of the nearest layer behind it. */
export function computeStackOrder(manifest: Pick<HqManifest, 'layers' | 'actors'>): HqStackEntry[] {
  const stack: Array<{ name: string; entry: HqStackEntry }> = manifest.layers.map(layer => ({ name: layer.name, entry: { kind: 'layer', layer, parallax: layer.parallax } }));
  let pending = Object.values(manifest.actors).slice().sort((a, b) => a.order - b.order);
  for (let pass = 0; pass < 8 && pending.length > 0; pass++) {
    const next: HqActor[] = [];
    for (const actor of pending) {
      const iBelow = stack.findIndex(s => s.name === actor.below);
      const iAbove = actor.above ? stack.findIndex(s => s.name === actor.above) : -1;
      if (iBelow >= 0) stack.splice(iBelow, 0, { name: actor.name, entry: { kind: 'actor', actor, parallax: 0 } });
      else if (iAbove >= 0) stack.splice(iAbove + 1, 0, { name: actor.name, entry: { kind: 'actor', actor, parallax: 0 } });
      else next.push(actor);
    }
    if (next.length === pending.length) break;
    pending = next;
  }
  for (const actor of pending) stack.push({ name: actor.name, entry: { kind: 'actor', actor, parallax: 0 } });
  // Parallax: nearest layer behind.
  let p = 0;
  return stack.map(({ entry }) => {
    if (entry.kind === 'layer') { p = entry.parallax; return entry; }
    return { ...entry, parallax: p };
  });
}

/** `srcset` for a layer or actor from its width → file map. */
export function buildSrcSet(baseUrl: string, files: Record<string, HqLayerFile>): string {
  return Object.entries(files)
    .map(([w, f]) => [Number(w), f.file] as const)
    .filter(([w]) => Number.isFinite(w) && w > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([w, file]) => `${baseUrl}${file} ${w}w`)
    .join(', ');
}

/** The file to use as the plain `src` fallback: the largest width at or
 *  below `preferWidth`, else the smallest available. */
export function pickFile(files: Record<string, HqLayerFile>, preferWidth: number): HqLayerFile | null {
  const entries = Object.entries(files).map(([w, f]) => [Number(w), f] as const).filter(([w]) => Number.isFinite(w)).sort((a, b) => a[0] - b[0]);
  if (entries.length === 0) return null;
  let best = entries[0][1];
  for (const [w, f] of entries) if (w <= preferWidth) best = f;
  return best;
}

// ─── Stage → manifest registry ───────────────────────────────────────────────
// Static imports so the manifests ship with the bundle (≈12 KB each) and
// the Bridge never waits on a fetch before it knows which layers to draw.
// Only stages with plates appear here; headquarters.ts marks the rest
// `comingSoon`.

const REGISTRY: Partial<Record<HqStageId, HqManifest | null>> = {
  earth_ops: parseHqManifest(earthManifestRaw, '/game/hq/earth/'),
};

export function getHqManifest(stage: HqStageId): HqManifest | null {
  return REGISTRY[stage] ?? null;
}
