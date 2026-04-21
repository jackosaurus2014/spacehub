'use client';

import { useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { INTERSTELLAR_SYSTEMS, getJumpPrerequisites, FIRST_CONTACT_EVENTS, JUMP_DRIVE_RESEARCH, EXOTIC_MATTER_REFINING_RESEARCH } from '@/lib/game/interstellar';
import { FACTION_MAP, getFactionArtUrl, type FactionId } from '@/lib/game/factions';
import { formatMoney } from '@/lib/game/formulas';
import Image from 'next/image';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Props {
  state: GameState;
}

export default function InterstellarPanel({ state }: Props) {
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const hasJumpDrive = state.completedResearch.includes('jump_drive');
  const hasExoticRefining = state.completedResearch.includes('exotic_matter_refining');
  const exoticFuel = state.resources?.exotic_fuel || 0;

  const selectedSystem = selectedSystemId ? INTERSTELLAR_SYSTEMS.find(s => s.id === selectedSystemId) : null;
  const firstContact = selectedSystemId ? FIRST_CONTACT_EVENTS[selectedSystemId] : null;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-white text-base font-bold flex items-center gap-2">
              <span className="text-indigo-400">✴</span> Interstellar Gateway
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              End-game frontier. Once you have an Alcubierre-class jump drive and exotic-matter fuel,
              five nearby star systems open up — each with unique resources, first-contact events, and the
              beginning of humanity's galactic era.
            </p>
          </div>
        </div>

        {/* Prerequisites readout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <PrereqChip
            label="Jump Drive research"
            met={hasJumpDrive}
            help={`T${JUMP_DRIVE_RESEARCH.tier} propulsion; requires fusion_drive + metallic_hydrogen first.`}
          />
          <PrereqChip
            label="Exotic Matter Refining"
            met={hasExoticRefining}
            help={`T${EXOTIC_MATTER_REFINING_RESEARCH.tier} materials; unlocks exotic_fuel production.`}
          />
          <PrereqChip
            label={`Exotic fuel reserve (have ${Math.floor(exoticFuel)})`}
            met={exoticFuel >= 500}
            help="Exotic-matter fuel units. Minimum 500 for the nearest system (Proxima)."
          />
        </div>
      </div>

      {/* Destination list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INTERSTELLAR_SYSTEMS.map(system => {
          const missing = getJumpPrerequisites(system.id, state.completedResearch);
          const fuelMissing = exoticFuel < system.jumpFuelRequired;
          const anyBlockers = missing.length > 0 || fuelMissing;
          const fc = FIRST_CONTACT_EVENTS[system.id];
          const faction = fc?.factionId ? FACTION_MAP.get(fc.factionId as FactionId) : null;

          return (
            <button
              key={system.id}
              type="button"
              onClick={() => setSelectedSystemId(system.id)}
              className={`text-left rounded-2xl border overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                anyBlockers
                  ? 'border-white/[0.06] hover:border-white/15'
                  : 'border-indigo-500/40 hover:border-indigo-500/60 shadow-lg shadow-indigo-500/20'
              }`}
              style={{ background: '#0a0a1a' }}
            >
              {/* Faction banner if first-contact applicable */}
              {faction && (
                <div className="relative h-16 overflow-hidden">
                  <Image src={getFactionArtUrl(fc!.factionId as FactionId)} alt="" fill className="object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <div className={`text-[9px] uppercase tracking-wider ${faction.theme.accent}`}>First contact: {faction.name}</div>
                  </div>
                </div>
              )}

              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-white text-base font-bold">{system.name}</h3>
                    <div className="text-[10px] text-slate-500">
                      {system.distanceLy.toFixed(2)} ly · Signal round-trip ~{Math.round(system.signalRoundTripMinutes / 60)}h
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[10px] uppercase tracking-wider font-bold ${
                      anyBlockers ? 'text-red-300' : 'text-emerald-300'
                    }`}>
                      {anyBlockers ? 'LOCKED' : 'READY'}
                    </div>
                  </div>
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed mb-2">{system.description}</p>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2">
                  <div className="rounded bg-white/[0.03] p-1.5">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">Fuel needed</div>
                    <div className={`font-mono font-bold ${fuelMissing ? 'text-red-300' : 'text-cyan-300'}`}>
                      {system.jumpFuelRequired.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded bg-white/[0.03] p-1.5">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">Known resources</div>
                    <div className="text-slate-300 truncate" title={system.knownResources.join(', ')}>
                      {system.knownResources.length} types
                    </div>
                  </div>
                </div>

                {anyBlockers && (
                  <div className="rounded bg-red-500/5 border border-red-500/20 p-2 text-[10px] text-red-200">
                    <div className="font-bold mb-0.5">Blocked by:</div>
                    <ul className="pl-4 space-y-0.5" style={{ listStyle: 'disc' }}>
                      {missing.map(r => <li key={r}>Research: {r.replace(/_/g, ' ')}</li>)}
                      {fuelMissing && <li>Exotic fuel: need {system.jumpFuelRequired} (have {Math.floor(exoticFuel)})</li>}
                    </ul>
                  </div>
                )}

                {!anyBlockers && (
                  <div className="text-[10px] text-emerald-300 italic mt-1">
                    Jump ready. Click for first-contact briefing.
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedSystem && firstContact && (
        <FirstContactModal
          system={selectedSystem}
          event={firstContact}
          onClose={() => setSelectedSystemId(null)}
        />
      )}
    </div>
  );
}

function PrereqChip({ label, met, help }: { label: string; met: boolean; help: string }) {
  return (
    <div
      className={`rounded-lg p-2 border ${met ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}
      title={help}
    >
      <div className="flex items-center gap-1.5">
        <span className={met ? 'text-emerald-300' : 'text-slate-500'} aria-hidden="true">{met ? '✓' : '○'}</span>
        <span className={`text-[11px] font-medium ${met ? 'text-emerald-200' : 'text-slate-400'}`}>{label}</span>
      </div>
    </div>
  );
}

function FirstContactModal({
  system, event, onClose,
}: {
  system: typeof INTERSTELLAR_SYSTEMS[number];
  event: typeof FIRST_CONTACT_EVENTS[string];
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const faction = event.factionId ? FACTION_MAP.get(event.factionId as FactionId) : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fc-title"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl overflow-hidden border border-indigo-500/40"
        style={{ background: '#0a0a1a' }}
      >
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" aria-hidden="true" />

        {faction && (
          <div className="relative aspect-[3/1] overflow-hidden">
            <Image src={getFactionArtUrl(event.factionId as FactionId)} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className={`text-[10px] uppercase tracking-wider font-bold ${faction.theme.accent}`}>First Contact: {faction.name}</div>
              <h3 id="fc-title" className="text-white text-2xl font-bold mt-1">{event.title}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{system.name} · {system.distanceLy.toFixed(2)} ly</p>
            </div>
          </div>
        )}

        <div className="p-5">
          {!faction && (
            <div className="mb-3">
              <h3 id="fc-title" className="text-white text-2xl font-bold">{event.title}</h3>
              <p className="text-slate-400 text-xs">{system.name} · {system.distanceLy.toFixed(2)} ly</p>
            </div>
          )}

          <p className="text-slate-300 text-sm leading-relaxed mb-4">{event.description}</p>

          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Available responses</div>
          <div className="space-y-2">
            {event.choices.map((choice, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:border-indigo-500/30 transition-colors"
              >
                <div className="text-white text-sm font-bold mb-0.5">{choice.label}</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{choice.summary}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-[10px] text-slate-500 italic text-center">
            Command jumps to interstellar systems land in a future wave — this is a preview of the first-contact event.
          </div>

          <button
            onClick={onClose}
            className="mt-3 w-full px-4 py-2 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            Close briefing
          </button>
        </div>
      </div>
    </div>
  );
}
