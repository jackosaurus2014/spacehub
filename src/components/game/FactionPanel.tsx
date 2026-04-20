'use client';

import Image from 'next/image';
import type { GameState } from '@/lib/game/types';
import {
  FACTIONS,
  FACTION_MAP,
  getFactionArtUrl,
  getFactionRep,
  getStanding,
  STANDING_LABEL,
  STANDING_ACCENT,
  getEnvoyCost,
  type FactionId,
} from '@/lib/game/factions';
import { formatMoney } from '@/lib/game/formulas';

interface Props {
  state: GameState;
  onSendEnvoy: (id: FactionId) => void;
}

export default function FactionPanel({ state, onSendEnvoy }: Props) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-white text-base font-bold">Factions</h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Six powers shape the lanes and outlaw worlds. Raise standing to unlock exclusive contracts and tech; rivals lose half the ground you gain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FACTIONS.map(f => {
          const rep = getFactionRep(state, f.id);
          const standing = getStanding(rep);
          const envoyCost = getEnvoyCost(rep);
          const canAfford = state.money >= envoyCost && rep < 100;
          const rival = FACTION_MAP.get(f.rivalId);

          return (
            <div
              key={f.id}
              className={`rounded-xl overflow-hidden border ${f.theme.border}`}
              style={{ background: '#0a0a1a' }}
            >
              <div className="relative aspect-[16/9] bg-black/40 overflow-hidden">
                <Image
                  src={getFactionArtUrl(f.id)}
                  alt={f.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-bold ${f.theme.accent}`}>{f.name}</h3>
                      <p className="text-slate-400 text-[11px] italic">{f.tagline}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide backdrop-blur-sm ${STANDING_ACCENT[standing]}`} style={{ background: 'rgba(0,0,0,0.65)' }}>
                      {STANDING_LABEL[standing]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <p className="text-slate-400 text-xs leading-relaxed mb-3">{f.description}</p>

                {/* Reputation bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="text-slate-500" id={`rep-label-${f.id}`}>Reputation</span>
                    <span className={`font-mono font-bold ${rep >= 0 ? 'text-cyan-300' : 'text-red-300'}`} aria-live="polite">
                      {rep > 0 ? `+${rep}` : rep} — {STANDING_LABEL[standing]}
                    </span>
                  </div>
                  <div
                    className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden"
                    role="progressbar"
                    aria-labelledby={`rep-label-${f.id}`}
                    aria-valuenow={rep}
                    aria-valuemin={-100}
                    aria-valuemax={100}
                    aria-valuetext={`${rep > 0 ? '+' : ''}${rep}, ${STANDING_LABEL[standing]}`}
                  >
                    {/* Center tick mark */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" aria-hidden="true" />
                    {/* Rep fill */}
                    {rep >= 0 ? (
                      <div
                        className="absolute top-0 bottom-0 left-1/2 bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-r-full"
                        style={{ width: `${(rep / 100) * 50}%` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <div
                        className="absolute top-0 bottom-0 right-1/2 bg-gradient-to-l from-amber-500 to-red-500 rounded-l-full"
                        style={{ width: `${(Math.abs(rep) / 100) * 50}%` }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  {rival && (
                    <div className="text-[9px] text-slate-500 mt-1">
                      Rival: <span className="text-slate-400">{rival.name}</span> — loses ½ rep when you gain here
                    </div>
                  )}
                </div>

                {/* Envoy action */}
                <button
                  onClick={canAfford ? () => onSendEnvoy(f.id) : undefined}
                  disabled={!canAfford}
                  className={`w-full px-3 py-2 rounded text-xs font-bold transition-colors ${
                    canAfford
                      ? `${f.theme.bg} ${f.theme.accent} hover:brightness-125 border ${f.theme.border}`
                      : 'bg-white/[0.03] text-slate-600 cursor-not-allowed border border-white/[0.05]'
                  }`}
                >
                  {rep >= 100
                    ? 'Maximum Standing Reached'
                    : `Send Envoy · ${formatMoney(envoyCost)} · +10 rep`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
