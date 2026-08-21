'use client';

// ─── Galactic Map View (Wave 9 shell → Wave A4 restage) ─────────────────────
// The zoomed-out layer: Sol at centre, the five interstellar destinations from
// lib/game/interstellar.ts laid out as selectable star nodes. Plain HTML/CSS +
// SVG — no canvas, no WebGL — so every node is a real <button>, keyboard-
// reachable and screen-reader friendly by construction.
//
// ── Wave A4 (docs/VISUAL_AAA_2026-08.md §A4.1, spec VISUAL_DEPTH §V4.5) ─────
// The V4 audit called this surface "hand-placed nodes on a static starfield
// image; no parallax, no depth, no per-system identity art". Three changes:
//
//   1. PARALLAX DEPTH — four plates (nebula wash, far/mid/near starfields)
//      translated on `transform: translate3d` by galactic-map.parallaxOffsets().
//      The transforms are written IMPERATIVELY to layer refs inside one rAF, so
//      pointer movement causes ZERO React re-renders and the ~180 star dots are
//      never reconciled. Keyboard players get the same depth response because
//      selecting a system also drives the offset — parallax is not mouse-only.
//      Disabled outright (hard zero, not damped) under prefers-reduced-motion,
//      on coarse pointers, and whenever the map is covered by a panel overlay.
//
//   2. PER-SYSTEM IDENTITY — nodes are no longer uniform dots. Colour comes
//      from the star's real spectral class, size from its real radius in solar
//      radii, and the ring/chip from YOUR presence there (colony / on site /
//      en route / ready / locked). Layout radius is now proportional to real
//      distanceLy. All of it derived in galactic-map.deriveSystemIdentity().
//
//   3. INTERACTION PARITY WITH THE SOLAR LAYER — selection lock-on (the same
//      RETICLE_LOCK_MS convergence the solar renderers use) and the radial
//      command menu, opened by click or by `C` on a focused node. The action
//      set is the galactic one (map-radial.deriveSystemRadialActions): the
//      solar arc's verbs — build, dispatch, orbital slots, demand pools — do
//      not exist at a star four light-years away, so forcing them here would
//      have been five disabled items and a lie about the layer.
//
// Retained from W9/W10/V7: expedition progress arcs with ETA chips, colony
// production glyphs, interstellar trade-route flow lines, warp-jump and
// arrival pings. All positions still derive from existing engine state.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { GameState, ExpeditionState } from '@/lib/game/types';
import { INTERSTELLAR_SYSTEMS } from '@/lib/game/interstellar';
import { getExpeditionProgress, getTotalGameMonths } from '@/lib/game/expeditions';
import { SHIP_MAP } from '@/lib/game/ships';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { BG_ASSETS, EFFECT_ASSETS } from '@/lib/game/assets';
import { onMapPing, getPingVisual, PING_COLOR, type MapPingEvent } from '@/lib/game/map-ping';
import { RETICLE_LOCK_MS } from '@/lib/game/map-zoom';
import {
  PARALLAX_LAYERS,
  parallaxOffsets,
  normalizePointer,
  deriveSystemIdentities,
  SYSTEM_POSITIONS,
  SOL_POSITION,
  type SystemIdentity,
} from '@/lib/game/galactic-map';

/** Self-contained reduced-motion flag — this view has no parent-supplied one
 *  (unlike SolarMap3D/SolarSystemCanvas, which track it for orbit/pulse
 *  animation). Consumed by Wave V7's ping effects and Wave A4's parallax. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Fine pointer (mouse/trackpad). Touch devices get the static field — a
 *  parallax that follows a finger is both useless and a scroll hazard. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    setFine(mq.matches);
    const onChange = () => setFine(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return fine;
}

/** Wave V7 — system-targeted map pings (expedition launch warp-flash at Sol,
 *  arrival/return pings at the destination node). Location-targeted pings
 *  from the same bus belong to the solar renderers, not here. */
function useSystemPings(reduced: boolean): MapPingEvent[] {
  const [pings, setPings] = useState<MapPingEvent[]>([]);
  useEffect(() => onMapPing(ping => {
    if (ping.target.kind !== 'system') return;
    setPings(prev => [...prev, ping]);
  }), []);
  useEffect(() => {
    if (pings.length === 0) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setPings(prev => prev.filter(p => getPingVisual(p, now, reduced) !== null));
    }, 80);
    return () => clearInterval(iv);
  }, [pings.length, reduced]);
  return pings;
}

/** Layout kept exported for continuity; positions now come from
 *  galactic-map.SYSTEM_POSITIONS (authored bearing × REAL distanceLy). */
export const SYSTEM_LAYOUT: Record<string, { x: number; y: number }> = SYSTEM_POSITIONS as Record<string, { x: number; y: number }>;

/** Presentational risk tier per destination — a UI-only readout of the
 *  qualitative hazard cues already in each system's description (flare
 *  star, dangerous binary, etc.); no new engine mechanic, always paired
 *  with text (not color alone) per the accessibility invariant. */
export const SYSTEM_RISK_META: Record<string, { label: string; glyph: string; tone: 'low' | 'moderate' | 'high' | 'severe' }> = {
  proxima_centauri: { label: 'Low risk', glyph: '●', tone: 'low' },
  alpha_centauri:   { label: 'Low risk', glyph: '●', tone: 'low' },
  barnards_star:    { label: 'Moderate risk', glyph: '▲', tone: 'moderate' },
  wolf_359:         { label: 'High risk — flare star', glyph: '▲', tone: 'high' },
  sirius:           { label: 'Severe risk — high radiation', glyph: '✷', tone: 'severe' },
};

export const RISK_TONE_CLASS: Record<string, string> = {
  low: 'text-emerald-300',
  moderate: 'text-amber-300',
  high: 'text-orange-300',
  severe: 'text-red-300',
};

const ACTIVE_PHASES: ExpeditionState['phase'][] = ['outbound', 'exploring', 'returning'];

const SOL_POS = SOL_POSITION;

interface Pt { x: number; y: number }

/** W9: shared curved-route geometry — a quadratic bezier with the control
 *  point lifted perpendicular to the chord, mirroring the solar map's
 *  transit arcs. Everything is in 0-1 layout space (×100 for the SVG). */
function routeCurve(from: Pt, to: Pt): { cx: number; cy: number } {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const k = Math.min(0.055, len * 0.18);
  return { cx: mx - (dy / len) * k, cy: my + (dx / len) * k };
}

function bezierPoint(from: Pt, ctrl: { cx: number; cy: number }, to: Pt, tRaw: number): Pt {
  const t = Math.max(0, Math.min(1, tRaw));
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * ctrl.cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * ctrl.cy + t * t * to.y,
  };
}

function routePathD(from: Pt, ctrl: { cx: number; cy: number }, to: Pt): string {
  return `M ${from.x * 100} ${from.y * 100} Q ${ctrl.cx * 100} ${ctrl.cy * 100} ${to.x * 100} ${to.y * 100}`;
}

// ── Procedural starfield plates ─────────────────────────────────────────────
// Deterministic (fixed seed) so server and client render identical markup —
// a Math.random() field would hydration-mismatch. Generated once at module
// load; the plates are pure decoration and never re-render.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StarDot { x: number; y: number; r: number; o: number }

function makePlate(seed: number, count: number, rMin: number, rMax: number, oMin: number, oMax: number): StarDot[] {
  const rnd = mulberry32(seed);
  const out: StarDot[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rnd() * 100,
      y: rnd() * 100,
      r: rMin + rnd() * (rMax - rMin),
      o: oMin + rnd() * (oMax - oMin),
    });
  }
  return out;
}

const PLATE_MID: StarDot[] = makePlate(0x5EED01, 110, 0.10, 0.28, 0.25, 0.65);
const PLATE_NEAR: StarDot[] = makePlate(0x5EED02, 46, 0.22, 0.50, 0.45, 0.95);

function StarPlate({ dots }: { dots: StarDot[] }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#e2e8f0" opacity={d.o} />
      ))}
    </svg>
  );
}
const StarPlateMid = () => <StarPlate dots={PLATE_MID} />;
const StarPlateNear = () => <StarPlate dots={PLATE_NEAR} />;

// Scoped styles — class-prefixed; GameStyles.tsx is owned by another wave.
const GALACTIC_CSS = `
.stc-gal-layer { will-change: transform; transform: translate3d(0,0,0); }
.stc-gal-lock { animation-name: stc-gal-lock; animation-timing-function: cubic-bezier(0.2,0.8,0.3,1); animation-fill-mode: both; }
.stc-gal-spin { animation: stc-gal-spin 14s linear infinite; }
@keyframes stc-gal-lock { from { transform: scale(1.9); opacity: 0.15; } to { transform: scale(1); opacity: 1; } }
@keyframes stc-gal-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .stc-gal-layer { transform: none !important; will-change: auto; }
  .stc-gal-lock { animation: none; }
  .stc-gal-spin { animation: none; }
}
`;

interface GalacticMapViewProps {
  state: GameState;
  selectedSystemId: string | null;
  /** `anchor` present → a node click / `C` keypress: the caller opens the
   *  radial command menu AT the node (parity with the solar layer). Absent →
   *  select and open the full context panel directly. */
  onSelectSystem: (systemId: string | null, anchor?: { x: number; y: number }) => void;
  /** Wave V4 parity — false while a desktop panel overlay covers the map.
   *  Parallax listeners detach entirely (no work behind an overlay). */
  active?: boolean;
}

export default function GalacticMapView({ state, selectedSystemId, onSelectSystem, active = true }: GalacticMapViewProps) {
  const reducedMotion = usePrefersReducedMotion();
  const finePointer = useFinePointer();
  const systemPings = useSystemPings(reducedMotion);

  const rootRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rafRef = useRef<number | null>(null);

  const parallaxEnabled = active && !reducedMotion;

  /** Write the plate transforms directly — no React state, so a pointer move
   *  costs four style writes and never a reconciliation pass. */
  const applyOffsets = useCallback((nx: number, ny: number) => {
    const offsets = parallaxOffsets(nx, ny, !parallaxEnabled);
    for (const o of offsets) {
      const el = layerRefs.current[o.id];
      if (el) el.style.transform = `translate3d(${o.dx.toFixed(2)}px, ${o.dy.toFixed(2)}px, 0)`;
    }
  }, [parallaxEnabled]);

  // Pointer-driven parallax (fine pointers only, coalesced into one rAF).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !parallaxEnabled || !finePointer) {
      applyOffsets(0, 0);
      return;
    }
    let pending: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pending = normalizePointer(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pending) applyOffsets(pending.x, pending.y);
      });
    };
    const onLeave = () => applyOffsets(0, 0);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [parallaxEnabled, finePointer, applyOffsets]);

  // Selection-driven parallax — a keyboard-only player gets the identical
  // depth cue when they move the selection, without touching a pointer.
  useEffect(() => {
    if (finePointer) return;
    const pos = selectedSystemId ? SYSTEM_POSITIONS[selectedSystemId] : null;
    if (!pos) { applyOffsets(0, 0); return; }
    applyOffsets(pos.x * 2 - 1, pos.y * 2 - 1);
  }, [selectedSystemId, finePointer, applyOffsets]);

  const nowPing = Date.now();
  type VisualPing = { ping: MapPingEvent; visual: NonNullable<ReturnType<typeof getPingVisual>> };
  const withVisual = (kind: MapPingEvent['kind']): VisualPing[] =>
    systemPings
      .filter(p => p.kind === kind)
      .map(p => ({ ping: p, visual: getPingVisual(p, nowPing, reducedMotion) }))
      .filter((x): x is VisualPing => x.visual !== null);
  const warpPings = withVisual('warp');
  const completePings = withVisual('complete');

  // Per-system identity: star class/colour/size, presence, blockers, sr text.
  const identities: SystemIdentity[] = useMemo(() => deriveSystemIdentities(state), [state]);
  const identityById = useMemo(
    () => new Map(identities.map(i => [i.systemId, i])),
    [identities],
  );

  const expeditions = (state.expeditions || []).filter(e => ACTIVE_PHASES.includes(e.phase));

  // In-transit expeditions (outbound/returning) — position along a curved
  // Sol↔system arc (W9: bezier progress arcs, parity with the solar map).
  const transitMarkers = expeditions
    .filter(e => e.phase === 'outbound' || e.phase === 'returning')
    .map(e => {
      const layout = SYSTEM_POSITIONS[e.targetSystemId];
      if (!layout) return null;
      const progress = getExpeditionProgress(state, e.id);
      const shipDef = SHIP_MAP.get(e.shipDefinitionId);
      let t: number;
      let from: Pt = SOL_POS;
      let to: Pt = layout;
      if (e.phase === 'outbound') {
        t = e.outboundMonths > 0 ? e.monthsElapsed / e.outboundMonths : 1;
      } else {
        // returning: reverse direction, clock starts after outbound+explore.
        const legStart = e.outboundMonths + e.exploreMonths;
        t = e.outboundMonths > 0 ? (e.monthsElapsed - legStart) / e.outboundMonths : 1;
        from = layout;
        to = SOL_POS;
      }
      const ctrl = routeCurve(from, to);
      const tClamped = Math.max(0, Math.min(1, t));
      const pos = bezierPoint(from, ctrl, to, tClamped);
      return { expedition: e, pos, from, to, ctrl, t: tClamped, shipDef, progress };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  // W9: interstellar trade routes — amber flow lines colony → Sol with one
  // dot per shipment, positioned by real departure/arrival game-months.
  const currentMonth = getTotalGameMonths(state.gameDate);
  const colonyBySystem = new Map((state.interstellarColonies || []).map(c => [c.systemId, c]));
  const tradeFlows = (state.interstellarTradeRoutes || [])
    .map(r => {
      const layout = SYSTEM_POSITIONS[r.systemId];
      if (!layout) return null;
      if (r.status !== 'active' && r.inTransit.length === 0) return null;
      const ctrl = routeCurve(layout, SOL_POS);
      const shipments = r.inTransit.map(s => {
        const total = Math.max(1, s.arrivesGameMonth - s.departedGameMonth);
        const t = Math.max(0, Math.min(1, (currentMonth - s.departedGameMonth) / total));
        return { pos: bezierPoint(layout, ctrl, SOL_POS, t), quantity: s.quantity };
      });
      return { route: r, from: layout as Pt, ctrl, shipments };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
  const inboundBySystem = new Map<string, number>();
  for (const f of tradeFlows) {
    inboundBySystem.set(f.route.systemId, (inboundBySystem.get(f.route.systemId) || 0) + f.route.inTransit.length);
  }

  /** Container-relative centre of a node button, for anchoring the radial. */
  const anchorOf = (el: HTMLElement | null): { x: number; y: number } | undefined => {
    const root = rootRef.current;
    if (!el || !root) return undefined;
    const r = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
  };

  return (
    <div ref={rootRef} className="relative w-full h-full overflow-hidden bg-[#020208]">
      <style>{GALACTIC_CSS}</style>

      {/* ── Parallax plates, back → front ─────────────────────────────────── */}
      {/* Nebula wash: a base gradient plus one radial bloom per destination,
          tinted by that star's REAL spectral colour, so the backdrop encodes
          the same identity the nodes do. */}
      <div
        ref={el => { layerRefs.current['nebula'] = el; }}
        className="stc-gal-layer absolute pointer-events-none"
        style={{ inset: '-6%' }}
        aria-hidden="true"
      >
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(56,189,248,0.10), rgba(2,2,8,0) 62%)',
        }} />
        {identities.map(id => (
          <div
            key={id.systemId}
            className="absolute rounded-full"
            style={{
              left: `${id.position.x * 100}%`,
              top: `${id.position.y * 100}%`,
              width: 210, height: 210,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${id.star.haloColor}22 0%, ${id.star.haloColor}0A 45%, transparent 70%)`,
            }}
          />
        ))}
      </div>

      <div
        ref={el => { layerRefs.current['stars-far'] = el; }}
        className="stc-gal-layer absolute pointer-events-none"
        style={{ inset: '-4%' }}
        aria-hidden="true"
      >
        <Image src={BG_ASSETS.starfield} alt="" fill className="object-cover opacity-25" priority={false} />
      </div>

      <div
        ref={el => { layerRefs.current['stars-mid'] = el; }}
        className="stc-gal-layer absolute pointer-events-none"
        style={{ inset: '-5%' }}
        aria-hidden="true"
      >
        <StarPlateMid />
      </div>

      <div
        ref={el => { layerRefs.current['stars-near'] = el; }}
        className="stc-gal-layer absolute pointer-events-none"
        style={{ inset: '-7%' }}
        aria-hidden="true"
      >
        <StarPlateNear />
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-black/15 to-black/65" aria-hidden="true" />

      {/* Route arcs — expedition progress arcs + trade flow lines (W9) */}
      {(transitMarkers.length > 0 || tradeFlows.length > 0) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {/* Trade flow lines first — under the expedition arcs */}
          {tradeFlows.map(f => (
            <g key={`trade-${f.route.id}`}>
              <path
                d={routePathD(f.from, f.ctrl, SOL_POS)}
                fill="none"
                stroke={f.route.status === 'active' ? 'rgba(251,191,36,0.28)' : 'rgba(251,191,36,0.12)'}
                strokeWidth={0.3}
                vectorEffect="non-scaling-stroke"
              />
              {f.shipments.map((s, i) => (
                <circle
                  key={i}
                  cx={s.pos.x * 100}
                  cy={s.pos.y * 100}
                  r={0.7}
                  fill="rgba(251,191,36,0.9)"
                />
              ))}
            </g>
          ))}
          {/* Expedition arcs: faint dashed full route + bright progress stroke */}
          {transitMarkers.map(m => (
            <g key={`route-${m.expedition.id}`}>
              <path
                d={routePathD(m.from, m.ctrl, m.to)}
                fill="none"
                stroke="rgba(34,211,238,0.2)"
                strokeWidth={0.35}
                strokeDasharray="1.6 1.6"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={routePathD(m.from, m.ctrl, m.to)}
                fill="none"
                stroke="rgba(34,211,238,0.65)"
                strokeWidth={0.45}
                pathLength={1}
                strokeDasharray={`${m.t} 1`}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
      )}

      {/* Sol — home reference point, not selectable (no gameplay there) */}
      <div
        className="absolute flex flex-col items-center gap-1"
        style={{ left: `${SOL_POS.x * 100}%`, top: `${SOL_POS.y * 100}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-200 to-amber-500" style={{ boxShadow: '0 0 24px 8px rgba(251,191,36,0.5)' }} aria-hidden="true" />
        <span className="text-[10px] text-amber-200 font-medium bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">Sol (home) · G2V</span>
        {/* Wave V7 — warp-jump flash on expedition launch (EFFECT_ASSETS.warpJump).
            Non-visual twin: the launch already plays 'milestone' + appends an
            eventLog entry (handleLaunchExpedition, page.tsx). */}
        {warpPings.map(({ ping, visual }) => (
          <div
            key={ping.id}
            className="absolute pointer-events-none"
            style={{
              width: 64, height: 64, left: '50%', top: '50%',
              transform: `translate(-50%, -50%) scale(${0.7 + visual.radiusProgress * 0.9})`,
              opacity: visual.alpha,
            }}
            aria-hidden="true"
          >
            <Image src={EFFECT_ASSETS.warpJump} alt="" fill className="object-contain" />
          </div>
        ))}
      </div>

      {INTERSTELLAR_SYSTEMS.map(sys => {
        const id = identityById.get(sys.id);
        if (!id) return null;
        const isSelected = selectedSystemId === sys.id;
        const colony = colonyBySystem.get(sys.id);
        const inbound = inboundBySystem.get(sys.id) || 0;
        const size = id.nodeSizePx;
        const ready = id.presence === 'ready' || id.presence === 'colonized';

        return (
          <button
            key={sys.id}
            type="button"
            onClick={e => onSelectSystem(sys.id, anchorOf(e.currentTarget))}
            onKeyDown={e => {
              if (e.key !== 'c' && e.key !== 'C' && e.key !== 'ContextMenu') return;
              if (e.metaKey || e.ctrlKey || e.altKey) return;
              e.preventDefault();
              e.stopPropagation();
              onSelectSystem(sys.id, anchorOf(e.currentTarget));
            }}
            onContextMenu={e => { e.preventDefault(); onSelectSystem(sys.id, anchorOf(e.currentTarget)); }}
            aria-pressed={isSelected}
            aria-keyshortcuts="C"
            aria-label={`${id.srText} Press C for the command menu.`}
            className="absolute flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg group"
            style={{ left: `${id.position.x * 100}%`, top: `${id.position.y * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            {/* Selection lock-on — the reticle converges once on selection
                (RETICLE_LOCK_MS, the same constant the solar renderers use)
                then holds as a slowly rotating dashed ring. Reduced motion
                snaps straight to the held state (scoped @media above). */}
            {isSelected && (
              <span
                key={`lock-${sys.id}`}
                className="stc-gal-lock absolute rounded-full pointer-events-none"
                style={{
                  width: size + 18, height: size + 18,
                  animationDuration: `${RETICLE_LOCK_MS}ms`,
                }}
                aria-hidden="true"
              >
                <span
                  className="stc-gal-spin absolute inset-0 rounded-full block"
                  style={{ border: '1.5px dashed rgba(34,211,238,0.85)' }}
                />
              </span>
            )}
            {/* Expedition-on-site ring (persistent, distinct from lock-on). */}
            {id.presence === 'expedition_onsite' && (
              <span
                className="absolute rounded-full glow-pulse-cyan"
                style={{ width: size + 10, height: size + 10, border: '1.5px solid rgba(34,211,238,0.6)' }}
                aria-hidden="true"
              />
            )}
            {/* Wave V7 — expedition arrival/return completion ping. */}
            {completePings.filter(cp => cp.ping.target.id === sys.id).map(({ ping, visual }) => (
              <span
                key={ping.id}
                className="absolute rounded-full"
                style={{
                  width: `${size + 12 + visual.radiusProgress * 40}px`,
                  height: `${size + 12 + visual.radiusProgress * 40}px`,
                  border: `2px solid ${PING_COLOR.complete}`,
                  opacity: visual.alpha,
                }}
                aria-hidden="true"
              />
            ))}

            {/* The star itself — real spectral colour, real relative radius. */}
            <span
              className="rounded-full transition-transform group-hover:scale-110 block"
              style={{
                width: size, height: size,
                background: `radial-gradient(circle at 38% 34%, #ffffff 0%, ${id.star.color} 42%, ${id.star.haloColor} 100%)`,
                boxShadow: `0 0 ${Math.round(size * 0.7)}px ${Math.round(size * 0.25)}px ${id.star.haloColor}66`,
                opacity: id.presence === 'locked' ? 0.62 : 1,
              }}
              aria-hidden="true"
            />
            {/* Binary companion pip — canon: Alpha Centauri A/B, Sirius A/B. */}
            {id.star.binary && (
              <span
                className="absolute rounded-full"
                style={{
                  width: Math.max(4, Math.round(size * 0.32)),
                  height: Math.max(4, Math.round(size * 0.32)),
                  background: id.star.haloColor,
                  transform: `translate(${Math.round(size * 0.72)}px, -${Math.round(size * 0.5)}px)`,
                }}
                aria-hidden="true"
              />
            )}

            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap ${
              ready ? 'text-cyan-200 bg-black/55' : 'text-slate-400 bg-black/55'
            }`}>
              {sys.name}
              <span className="ml-1 text-[10px] font-bold uppercase text-slate-300" aria-hidden="true">
                {id.presenceMeta.glyph} {id.presenceMeta.chip}
              </span>
            </span>
            {/* Star-class chip — the TEXT twin of the node's colour, so class
                is never conveyed by hue alone. */}
            <span className="text-[10px] text-slate-500 bg-black/45 px-1 rounded backdrop-blur-sm whitespace-nowrap" aria-hidden="true">
              {id.star.spectralClass} · {id.distanceLy.toFixed(2)} ly
            </span>

            {/* W9: colony production glyphs + inbound-shipment count (text
                lives in the button's aria-label above) */}
            {colony && colony.localResources.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] bg-black/50 px-1 py-0.5 rounded backdrop-blur-sm" aria-hidden="true">
                <span>🏙️</span>
                {colony.localResources.slice(0, 4).map(r => (
                  <span key={r}>{RESOURCE_MAP.get(r as ResourceId)?.icon || '▪'}</span>
                ))}
                {inbound > 0 && <span className="ml-0.5 text-amber-300 font-mono">→{inbound}</span>}
              </span>
            )}
          </button>
        );
      })}

      {/* In-transit expedition glyphs — W9: visible ETA chip under the glyph.
          These are informational markers, so they open the DOSSIER directly
          rather than the command arc (no anchor passed). */}
      {transitMarkers.map(m => {
        const icon = m.shipDef?.icon || '🌠';
        const monthsLeft = m.progress ? Math.max(0, Math.round(m.progress.monthsRemaining)) : null;
        const label = m.progress ? `${m.progress.phaseLabel} · ${m.progress.systemName} · ${monthsLeft} months remaining` : m.expedition.targetSystemId;
        return (
          <button
            key={m.expedition.id}
            type="button"
            onClick={() => onSelectSystem(m.expedition.targetSystemId)}
            aria-label={`Expedition — ${label}`}
            title={label}
            className="absolute flex items-center justify-center min-w-[28px] min-h-[28px] w-7 h-7 rounded-full bg-[#050510]/90 border border-cyan-400/50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 hover:scale-125 transition-transform"
            style={{ left: `${m.pos.x * 100}%`, top: `${m.pos.y * 100}%`, transform: 'translate(-50%, -50%)', boxShadow: '0 0 10px 2px rgba(34,211,238,0.35)' }}
          >
            <span aria-hidden="true">{icon}</span>
            {monthsLeft !== null && (
              <span
                className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-200 bg-black/60 px-1 rounded whitespace-nowrap pointer-events-none"
                aria-hidden="true"
              >
                {monthsLeft} mo
              </span>
            )}
          </button>
        );
      })}

      {/* Legend — every node signal named in TEXT: the glyph set, and the fact
          that colour encodes spectral class and size encodes stellar radius. */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[min(96vw,540px)] text-center pointer-events-none">
        <p className="text-[11px] text-slate-400 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
          Galactic Layer — select a system for its dossier, or press <kbd className="font-mono text-cyan-300">C</kbd> on a system for its command menu
        </p>
        <p className="text-[10px] text-slate-500 bg-black/45 px-2 py-0.5 rounded backdrop-blur-sm mt-0.5">
          ⌂ colony · ◎ on site · ➜ en route · ● jump ready · ○ locked. Node colour = spectral class, size = stellar radius, distance from Sol = real light-years.
        </p>
      </div>
    </div>
  );
}
