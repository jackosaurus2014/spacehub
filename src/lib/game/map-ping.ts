// ─── Map Ping event bus (Wave V7 — order acknowledgment & world feedback) ───
// docs/VISUAL_DEPTH_2026-08.md §V7. A module-level emitter, same pattern as
// src/lib/toast.ts: emit a ping when the player issues an order (or when the
// tick engine completes one), and every map renderer that's currently
// mounted (2D canvas, 3D WebGL, galactic DOM view) subscribes and paints its
// own visual for it. No renderer "owns" pings — this file only carries the
// event + the pure lifetime/visual math, so it's trivially unit-testable
// without touching Canvas/R3F/DOM.
//
// Accessibility invariant (CLAUDE.md): a ping is NEVER the only signal for an
// event. Every ack/completion this module fires is a pure reaction to state
// that's already logged elsewhere (state.eventLog, existing playSound calls)
// — the ping is reinforcement, not the record.

export type PingKind = 'ack' | 'complete' | 'warp';
export type PingTargetKind = 'location' | 'system';

export interface PingTarget {
  kind: PingTargetKind;
  id: string;
}

export interface MapPingEvent {
  id: string;
  target: PingTarget;
  kind: PingKind;
  /** Unix ms the ping was emitted — drives lifetime/progress math below. */
  atMs: number;
  /** Optional human label (non-visual twin for anything that renders text). */
  label?: string;
}

type PingListener = (ping: MapPingEvent) => void;

const listeners: Set<PingListener> = new Set();
let idCounter = 0;

export function onMapPing(listener: PingListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Emit a ping. Fire-and-forget — renderers that aren't mounted (e.g. the
 *  galactic layer while the player is looking at the solar system) simply
 *  never see it; that's fine, the event log already recorded the underlying
 *  action, so nothing is lost, only the transient visual. */
export function mapPing(target: PingTarget, kind: PingKind, label?: string): MapPingEvent {
  const ping: MapPingEvent = { id: `ping_${++idCounter}_${Date.now()}`, target, kind, atMs: Date.now(), label };
  listeners.forEach(l => l(ping));
  return ping;
}

// ─── Lifetime / visual math (pure — unit tested) ────────────────────────────

/** Normal (motion-on) lifetime per kind, ms. Fixed — never grows, never
 *  accumulates (60Hz phone budget: fire-and-forget, no per-frame allocation
 *  beyond the bounded active-ping list each renderer prunes on its own). */
export const PING_LIFETIME_MS: Record<PingKind, number> = {
  ack: 1200,
  complete: 1600,
  warp: 1400,
};

/** Reduced-motion collapses every ping kind to the same short opacity blink
 *  (spec: "reduced-motion: pings become a single 200ms opacity blink"). */
export const REDUCED_PING_LIFETIME_MS = 200;

/** Colors shared across all three renderers so a given kind always reads the
 *  same regardless of which map is on screen. Shape/label still carry the
 *  meaning (see each renderer's non-visual twin) — color is reinforcement. */
export const PING_COLOR: Record<PingKind, string> = {
  ack: '#22d3ee',      // cyan — "order accepted"
  complete: '#4ade80', // green — "done"
  warp: '#a78bfa',     // purple — matches the interstellar/colony palette
};

/** `#rrggbb` → `rgba(r,g,b,alpha)`. Small shared helper so the 2D canvas and
 *  the DOM galactic view don't each hand-roll the same hex parse. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

export interface PingVisual {
  /** 0..1 opacity. */
  alpha: number;
  /** 0..1 progress through the expanding-ring animation (0 = just emitted). */
  radiusProgress: number;
}

/** Pure function: given a ping and "now", return how it should currently
 *  render, or null if it has expired (renderer should drop it from its
 *  active list). Reduced-motion mode replaces the expanding ring with a
 *  single short blink at a fixed radius (radiusProgress stays 0). */
export function getPingVisual(ping: MapPingEvent, nowMs: number, reducedMotion: boolean): PingVisual | null {
  const lifetime = reducedMotion ? REDUCED_PING_LIFETIME_MS : PING_LIFETIME_MS[ping.kind];
  const elapsed = nowMs - ping.atMs;
  if (elapsed < 0 || elapsed >= lifetime) return null;
  const progress = elapsed / lifetime;
  if (reducedMotion) {
    // Blink up then down within the short window — never a hard pop-in/out,
    // but no continuous animation either (a single triangular fade).
    const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    return { alpha, radiusProgress: 0 };
  }
  return { alpha: 1 - progress, radiusProgress: progress };
}

/** Prune expired pings from a list in one pass — shared helper so every
 *  renderer's per-frame bookkeeping is identical (and testable) instead of
 *  three subtly different filter() calls. */
export function pruneExpiredPings(pings: MapPingEvent[], nowMs: number, reducedMotion: boolean): MapPingEvent[] {
  const lifetime = reducedMotion ? REDUCED_PING_LIFETIME_MS : undefined;
  return pings.filter(p => {
    const life = lifetime ?? PING_LIFETIME_MS[p.kind];
    return nowMs - p.atMs < life;
  });
}

// ─── Completion diffing (pure — unit tested) ────────────────────────────────
// Minimal shape of GameState this module actually reads. Kept structural
// (not `import type { GameState }`) so the diff function has zero coupling
// to the rest of the engine and is trivial to unit test with plain fixtures.

interface DiffBuilding {
  instanceId: string;
  locationId: string;
  isComplete: boolean;
}

interface DiffShipRoute {
  to: string;
}

interface DiffShip {
  instanceId: string;
  status: string;
  currentLocation: string;
  route?: DiffShipRoute;
}

interface DiffExpedition {
  id: string;
  phase: string;
  targetSystemId: string;
}

export interface CompletionDiffState {
  buildings?: DiffBuilding[];
  ships?: DiffShip[];
  expeditions?: DiffExpedition[];
}

export interface CompletionEvent {
  target: PingTarget;
  label: string;
}

/** Diff two GameState snapshots and return one completion event per newly-
 *  finished order: a building that just flipped isComplete, a ship that just
 *  arrived (was 'in_transit' with a route, now isn't), or an expedition that
 *  just reached its destination ('outbound' → 'exploring') or made it home
 *  ('returning' → 'completed'). Pure — no DOM, no audio, no engine state
 *  mutation; callers (GlobalEffectsLayer) turn each event into a mapPing +
 *  playSound + haptic. `prev === null` (first mount) yields no events —
 *  nothing "just completed" on the very first render. */
export function deriveCompletionEvents(prev: CompletionDiffState | null, next: CompletionDiffState): CompletionEvent[] {
  if (!prev) return [];
  const events: CompletionEvent[] = [];

  const prevBuildings = new Map((prev.buildings || []).map(b => [b.instanceId, b]));
  for (const b of next.buildings || []) {
    const before = prevBuildings.get(b.instanceId);
    if (b.isComplete && before && !before.isComplete) {
      events.push({ target: { kind: 'location', id: b.locationId }, label: 'Construction complete' });
    }
  }

  const prevShips = new Map((prev.ships || []).map(s => [s.instanceId, s]));
  for (const s of next.ships || []) {
    const before = prevShips.get(s.instanceId);
    if (before?.status === 'in_transit' && before.route && s.status !== 'in_transit') {
      events.push({ target: { kind: 'location', id: s.currentLocation }, label: 'Ship arrived' });
    }
  }

  const prevExpeditions = new Map((prev.expeditions || []).map(e => [e.id, e]));
  for (const e of next.expeditions || []) {
    const before = prevExpeditions.get(e.id);
    if (!before) continue;
    if (before.phase === 'outbound' && e.phase === 'exploring') {
      events.push({ target: { kind: 'system', id: e.targetSystemId }, label: 'Expedition arrived' });
    } else if (before.phase === 'returning' && (e.phase === 'completed' || e.phase === 'colonizing')) {
      events.push({ target: { kind: 'system', id: e.targetSystemId }, label: 'Expedition returned' });
    }
  }

  return events;
}

// ─── Outliner row flash (Wave A4.2, docs/VISUAL_AAA_2026-08.md §A4.2) ───────
// V3 shipped the outliner with a documented row-DOM convention explicitly so
// a consumer could "target a specific row for a transient visual effect", and
// V7 shipped this bus — but nothing ever connected the two, so a completion
// pinged the map and left the outliner inert. These three exports close that
// loop. Kept here rather than in Outliner.tsx because they are pure and
// therefore testable without a DOM tree.
//
// Accessibility: the flash is REINFORCEMENT only. The row's own label, sub-
// line and countdown already changed, the event is in the log, and a sound
// already played — removing the flash removes no information. It is a
// luminance lift first and a tint second, so it survives colourblindness,
// and CSS collapses it to a short blink under prefers-reduced-motion.

export const OUTLINER_FLASH_MS = 900;

/** Class applied to a matching row per ping kind. 'warp' reuses the ack
 *  treatment: from the outliner's point of view a jump is an acknowledgment
 *  that an order was accepted, not a completion. */
export const OUTLINER_FLASH_CLASS: Record<PingKind, string> = {
  ack: 'outliner-row-flash-ack',
  complete: 'outliner-row-flash-complete',
  warp: 'outliner-row-flash-ack',
};

/**
 * Attribute selector matching every outliner row that represents this ping's
 * target, across all three responsive outliner variants.
 *
 * Returns null for an id that cannot be safely embedded in a selector. Real
 * location/system ids are slugs, so this never fires in practice — it exists
 * so that a future id format can never turn a decorative flash into a
 * selector-injection or a thrown TypeError inside a bus listener (which would
 * take down every other subscriber on the same emit).
 */
export function outlinerFlashSelector(target: PingTarget): string | null {
  if (!target?.id || !/^[A-Za-z0-9_\-.:]+$/.test(target.id)) return null;
  return `.outliner-row[data-ping-target="${target.id}"]`;
}
