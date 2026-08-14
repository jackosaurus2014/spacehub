'use client';

// ─── Galactic Map View (Wave 9 map-first shell + Wave 10 expedition flow) ───
// The zoomed-out layer: Sol at center, the five interstellar destinations
// from lib/game/interstellar.ts laid out as selectable star nodes. Plain
// HTML/CSS + a static starfield image — no canvas, no WebGL — so every node
// is a real <button>, keyboard-reachable and screen-reader friendly by
// construction (unlike the solar canvas, which needed the wave-8 keyboard
// list bolted on as an alternative).
//
// Wave 10 adds live expedition tracking: ships currently in jump-transit
// render as a moving glyph along a route line from Sol to their target
// system, position driven by the expedition's actual elapsed/outbound
// months (same numbers the engine uses — no invented physics). Expeditions
// holding at their destination ('exploring') show as a pulse ring on the
// system node instead of a duplicate hit-target.
//
// 4X wave W9 (galactic restage — parity with the W7 solar overlays):
//   - expedition routes become curved progress ARCS: faint dashed full
//     route + bright stroke up to the ship's position, ETA chip under the
//     transit glyph (the solar map's transit-arc treatment at galactic scale)
//   - colony markers grow production glyphs (the colony's localResources)
//   - active interstellar trade routes render as amber flow lines with
//     shipment dots positioned by real departure/arrival game-months
// All positions derive from existing engine state — no new mechanics; every
// interactive element remains a real <button> (a11y by construction).

import Image from 'next/image';
import type { GameState, ExpeditionState } from '@/lib/game/types';
import { INTERSTELLAR_SYSTEMS, getJumpPrerequisites } from '@/lib/game/interstellar';
import { getExpeditionProgress, getTotalGameMonths } from '@/lib/game/expeditions';
import { SHIP_MAP } from '@/lib/game/ships';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { BG_ASSETS } from '@/lib/game/assets';

// Fixed layout (percent of container), hand-placed for readable spacing —
// same pattern as SolarSystemCanvas's LOCATION_LAYOUT table.
export const SYSTEM_LAYOUT: Record<string, { x: number; y: number }> = {
  proxima_centauri: { x: 0.30, y: 0.32 },
  alpha_centauri:   { x: 0.22, y: 0.58 },
  barnards_star:    { x: 0.50, y: 0.22 },
  wolf_359:         { x: 0.66, y: 0.62 },
  sirius:           { x: 0.80, y: 0.38 },
};

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

const SOL_POS = { x: 0.5, y: 0.5 };

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

interface GalacticMapViewProps {
  state: GameState;
  selectedSystemId: string | null;
  onSelectSystem: (systemId: string | null) => void;
}

export default function GalacticMapView({ state, selectedSystemId, onSelectSystem }: GalacticMapViewProps) {
  const exoticFuel = state.resources?.exotic_fuel || 0;
  const expeditions = (state.expeditions || []).filter(e => ACTIVE_PHASES.includes(e.phase));
  const exploringSystemIds = new Set(expeditions.filter(e => e.phase === 'exploring').map(e => e.targetSystemId));
  const colonizedSystemIds = new Set((state.interstellarColonies || []).map(c => c.systemId));

  // In-transit expeditions (outbound/returning) — position along a curved
  // Sol↔system arc (W9: bezier progress arcs, parity with the solar map).
  const transitMarkers = expeditions
    .filter(e => e.phase === 'outbound' || e.phase === 'returning')
    .map(e => {
      const layout = SYSTEM_LAYOUT[e.targetSystemId];
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
      const layout = SYSTEM_LAYOUT[r.systemId];
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020208]">
      <Image src={BG_ASSETS.starfield} alt="" fill className="object-cover opacity-30" priority={false} />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/70" />

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
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-200 to-amber-500" style={{ boxShadow: '0 0 24px 8px rgba(251,191,36,0.5)' }} aria-hidden="true" />
        <span className="text-[10px] text-amber-200 font-medium bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">Sol (home)</span>
      </div>

      {INTERSTELLAR_SYSTEMS.map(sys => {
        const layout = SYSTEM_LAYOUT[sys.id] || { x: 0.5, y: 0.5 };
        const missing = getJumpPrerequisites(sys.id, state.completedResearch);
        const fuelMissing = exoticFuel < sys.jumpFuelRequired;
        const ready = missing.length === 0 && !fuelMissing;
        const isSelected = selectedSystemId === sys.id;
        const isExploring = exploringSystemIds.has(sys.id);
        const isColonized = colonizedSystemIds.has(sys.id);
        const colony = colonyBySystem.get(sys.id);
        const inbound = inboundBySystem.get(sys.id) || 0;
        const producesText = colony && colony.localResources.length > 0
          ? ` — colony producing ${colony.localResources.map(r => RESOURCE_MAP.get(r as ResourceId)?.name || r.replace(/_/g, ' ')).join(', ')}`
          : '';

        return (
          <button
            key={sys.id}
            type="button"
            onClick={() => onSelectSystem(isSelected ? null : sys.id)}
            aria-pressed={isSelected}
            aria-label={`${sys.name}${isExploring ? ' — expedition on site' : ''}${isColonized ? ' — colonized' : ''}${producesText}${inbound > 0 ? `, ${inbound} shipment${inbound === 1 ? '' : 's'} inbound to Sol` : ''}`}
            className="absolute flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center focus:outline-none group"
            style={{ left: `${layout.x * 100}%`, top: `${layout.y * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            {isExploring && (
              <span
                className="absolute w-7 h-7 rounded-full glow-pulse-cyan"
                style={{ border: '1.5px solid rgba(34,211,238,0.6)' }}
                aria-hidden="true"
              />
            )}
            <span
              className={`w-4 h-4 rounded-full transition-transform group-hover:scale-125 ${isSelected ? 'scale-125' : ''}`}
              style={{
                background: isColonized ? '#a78bfa' : ready ? '#22d3ee' : '#64748b',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(34,211,238,0.5), 0 0 18px 6px rgba(34,211,238,0.6)'
                  : ready ? '0 0 12px 4px rgba(34,211,238,0.5)' : '0 0 6px 2px rgba(100,116,139,0.3)',
              }}
              aria-hidden="true"
            />
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap ${
              ready ? 'text-cyan-200 bg-black/50' : 'text-slate-400 bg-black/50'
            }`}>
              {sys.name}
              {isColonized && <span className="ml-1 text-[8px] font-bold uppercase text-purple-300">COLONY</span>}
              <span className={`ml-1 text-[8px] font-bold uppercase ${ready ? 'text-emerald-300' : 'text-red-300'}`}>
                {ready ? 'READY' : 'LOCKED'}
              </span>
            </span>
            {/* W9: colony production glyphs + inbound-shipment count (text
                lives in the button's aria-label above) */}
            {colony && colony.localResources.length > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] bg-black/50 px-1 py-0.5 rounded backdrop-blur-sm" aria-hidden="true">
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

      {/* In-transit expedition glyphs — W9: visible ETA chip under the glyph
          (same information the solar map's transit ETA sprites carry) */}
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
                className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono text-cyan-200 bg-black/60 px-1 rounded whitespace-nowrap pointer-events-none"
                aria-hidden="true"
              >
                {monthsLeft} mo
              </span>
            )}
          </button>
        );
      })}

      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
        Galactic Layer — select a system to plan an expedition or check its dossier
      </p>
    </div>
  );
}
