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

import Image from 'next/image';
import type { GameState, ExpeditionState } from '@/lib/game/types';
import { INTERSTELLAR_SYSTEMS, getJumpPrerequisites } from '@/lib/game/interstellar';
import { getExpeditionProgress } from '@/lib/game/expeditions';
import { SHIP_MAP } from '@/lib/game/ships';
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
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

  // In-transit expeditions (outbound/returning) — position along the Sol↔system line.
  const transitMarkers = expeditions
    .filter(e => e.phase === 'outbound' || e.phase === 'returning')
    .map(e => {
      const layout = SYSTEM_LAYOUT[e.targetSystemId];
      if (!layout) return null;
      const progress = getExpeditionProgress(state, e.id);
      const shipDef = SHIP_MAP.get(e.shipDefinitionId);
      let t: number;
      let from = SOL_POS;
      let to = layout;
      if (e.phase === 'outbound') {
        t = e.outboundMonths > 0 ? e.monthsElapsed / e.outboundMonths : 1;
      } else {
        // returning: reverse direction, clock starts after outbound+explore.
        const legStart = e.outboundMonths + e.exploreMonths;
        t = e.outboundMonths > 0 ? (e.monthsElapsed - legStart) / e.outboundMonths : 1;
        from = layout;
        to = SOL_POS;
      }
      const pos = { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
      return { expedition: e, pos, from, to: layout, shipDef, progress };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020208]">
      <Image src={BG_ASSETS.starfield} alt="" fill className="object-cover opacity-30" priority={false} />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/70" />

      {/* Route lines — one dashed line per system with an in-transit expedition */}
      {transitMarkers.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {transitMarkers.map(m => (
            <line
              key={`route-${m.expedition.id}`}
              x1={SOL_POS.x * 100} y1={SOL_POS.y * 100}
              x2={m.to.x * 100} y2={m.to.y * 100}
              stroke="rgba(34,211,238,0.28)"
              strokeWidth={0.35}
              strokeDasharray="1.6 1.6"
              vectorEffect="non-scaling-stroke"
            />
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

        return (
          <button
            key={sys.id}
            type="button"
            onClick={() => onSelectSystem(isSelected ? null : sys.id)}
            aria-pressed={isSelected}
            aria-label={`${sys.name}${isExploring ? ' — expedition on site' : ''}${isColonized ? ' — colonized' : ''}`}
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
          </button>
        );
      })}

      {/* In-transit expedition glyphs */}
      {transitMarkers.map(m => {
        const icon = m.shipDef?.icon || '🌠';
        const label = m.progress ? `${m.progress.phaseLabel} · ${m.progress.systemName} · ${Math.max(0, Math.round(m.progress.monthsRemaining))} months remaining` : m.expedition.targetSystemId;
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
          </button>
        );
      })}

      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
        Galactic Layer — select a system to plan an expedition or check its dossier
      </p>
    </div>
  );
}
