'use client';

// ─── Galactic Map View (Wave 9 — map-first command interface) ──────────────
// The zoomed-out layer: Sol at center, the five interstellar destinations
// from lib/game/interstellar.ts laid out as selectable star nodes. Plain
// HTML/CSS + a static starfield image — no canvas, no WebGL — so every node
// is a real <button>, keyboard-reachable and screen-reader friendly by
// construction (unlike the solar canvas, which needed the wave-8 keyboard
// list bolted on as an alternative).

import Image from 'next/image';
import type { GameState } from '@/lib/game/types';
import { INTERSTELLAR_SYSTEMS, getJumpPrerequisites } from '@/lib/game/interstellar';
import { BG_ASSETS } from '@/lib/game/assets';

// Fixed layout (percent of container), hand-placed for readable spacing —
// same pattern as SolarSystemCanvas's LOCATION_LAYOUT table.
const SYSTEM_LAYOUT: Record<string, { x: number; y: number }> = {
  proxima_centauri: { x: 0.30, y: 0.32 },
  alpha_centauri:   { x: 0.22, y: 0.58 },
  barnards_star:    { x: 0.50, y: 0.22 },
  wolf_359:         { x: 0.66, y: 0.62 },
  sirius:           { x: 0.80, y: 0.38 },
};

interface GalacticMapViewProps {
  state: GameState;
  selectedSystemId: string | null;
  onSelectSystem: (systemId: string | null) => void;
}

export default function GalacticMapView({ state, selectedSystemId, onSelectSystem }: GalacticMapViewProps) {
  const exoticFuel = state.resources?.exotic_fuel || 0;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020208]">
      <Image src={BG_ASSETS.starfield} alt="" fill className="object-cover opacity-30" priority={false} />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/70" />

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

        return (
          <button
            key={sys.id}
            type="button"
            onClick={() => onSelectSystem(isSelected ? null : sys.id)}
            aria-pressed={isSelected}
            className="absolute flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center focus:outline-none group"
            style={{ left: `${layout.x * 100}%`, top: `${layout.y * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            <span
              className={`w-4 h-4 rounded-full transition-transform group-hover:scale-125 ${isSelected ? 'scale-125' : ''}`}
              style={{
                background: ready ? '#22d3ee' : '#64748b',
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
              <span className={`ml-1 text-[8px] font-bold uppercase ${ready ? 'text-emerald-300' : 'text-red-300'}`}>
                {ready ? 'READY' : 'LOCKED'}
              </span>
            </span>
          </button>
        );
      })}

      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
        Galactic Layer — select a system for prerequisites &amp; first-contact briefing
      </p>
    </div>
  );
}
