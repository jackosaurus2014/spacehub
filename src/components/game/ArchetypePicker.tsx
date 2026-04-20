'use client';

import { useState } from 'react';
import { ARCHETYPES, type StartingArchetype } from '@/lib/game/archetypes';
import { formatMoney } from '@/lib/game/formulas';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Props {
  onSelect: (id: StartingArchetype) => void;
  onCancel: () => void;
}

/**
 * Modal that shows after the player clicks "New Game" on the start menu.
 * Presents the three starting archetypes and lets the player commit.
 */
export default function ArchetypePicker({ onSelect, onCancel }: Props) {
  const [selected, setSelected] = useState<StartingArchetype | null>(null);
  useEscapeKey(onCancel);

  const chosen = selected ? ARCHETYPES.find(a => a.id === selected) : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archetype-title"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onCancel} aria-hidden="true" />

      <div className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col" style={{ background: '#0a0a1a' }}>
        <div className="h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500" aria-hidden="true" />

        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-start justify-between gap-3">
          <div>
            <h2 id="archetype-title" className="text-white text-xl font-bold">Choose Your Heritage</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-2xl">
              Three corporations are hiring a new director. Each comes with different infrastructure,
              cash, and strategic angle. Your pick shapes your first hours of play — and the first
              contracts you can chase.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel and return to start menu"
            className="w-9 h-9 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 flex items-center justify-center text-sm shrink-0"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Archetype cards */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {ARCHETYPES.map(a => {
              const isSelected = selected === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected(a.id)}
                  className={`text-left rounded-2xl border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isSelected
                      ? `${a.accent.border} shadow-2xl`
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                  style={{ background: isSelected ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)' }}
                  aria-pressed={isSelected}
                >
                  <div className={`p-4 ${isSelected ? a.accent.bg : ''}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-3xl" aria-hidden="true">{a.icon}</span>
                      <div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${a.accent.text}`}>{a.flavor}</div>
                        <h3 className="text-white text-lg font-bold leading-tight">{a.name}</h3>
                        <p className="text-slate-400 text-[11px] italic mt-0.5">{a.tagline}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <KeyStat label="Starting cash" value={formatMoney(a.startingMoney)} accent={a.accent.text} />
                    <KeyStat
                      label="Starting infrastructure"
                      value={`${a.startingBuildings.length} building${a.startingBuildings.length === 1 ? '' : 's'}, ${a.startingServices.length} active service${a.startingServices.length === 1 ? '' : 's'}`}
                      accent={a.accent.text}
                    />
                    <KeyStat
                      label="Starting resources"
                      value={
                        Object.keys(a.startingResources).length === 0
                          ? '—'
                          : Object.entries(a.startingResources)
                              .map(([k, v]) => `${v} ${RESOURCE_MAP.get(k as ResourceId)?.name || k}`)
                              .join(', ')
                      }
                      accent={a.accent.text}
                    />

                    <p className="text-slate-400 text-[11px] leading-relaxed pt-1.5 border-t border-white/[0.04]">
                      {a.narrative}
                    </p>

                    <div className={`text-[11px] p-2 rounded ${a.accent.bg}`}>
                      <div className={`text-[9px] uppercase tracking-wider font-bold ${a.accent.text} mb-0.5`}>Strategic hint</div>
                      <p className="text-slate-300 leading-relaxed">{a.strategicHint}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Commit bar */}
        <div className="p-4 border-t border-white/[0.06] flex items-center justify-between gap-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-xs text-slate-500">
            {chosen
              ? <>You're founding <span className="text-white font-semibold">{chosen.company}</span>.</>
              : 'Select an archetype to continue.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              Back
            </button>
            <button
              onClick={() => chosen && onSelect(chosen.id)}
              disabled={!chosen}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                chosen
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400 shadow-lg'
                  : 'bg-white/[0.04] text-slate-500 cursor-not-allowed'
              }`}
            >
              Found {chosen?.company.split(' ')[0] || 'Company'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-bold ${accent}`}>{value}</div>
    </div>
  );
}
