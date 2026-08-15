'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { GameState } from '@/lib/game/types';
import {
  FACTIONS,
  FACTION_MAP,
  getFactionArtUrl,
  getFactionRep,
  getStanding,
  STANDING_LABEL,
  STANDING_ACCENT,
  STANDING_BROKER_MODIFIER,
  getEnvoyCost,
  getFactionStandingBrokerModifier,
  isEmbargoed,
  FACTION_LICENSES,
  type FactionId,
  type FactionStanding,
} from '@/lib/game/factions';
import { formatMoney } from '@/lib/game/formulas';
// Live-Service Wave LS9 (docs/LIVE_SERVICE_2026-08.md §LS9): this epoch's
// world-shared Realignment posture — a small badge per faction card, not a
// full sub-panel (the /space-tycoon/epoch public page is the detailed
// surface). Pure/DB-free (realignment.ts header), safe to compute client-side.
import { computeFactionPostures, getCurrentRealignmentEpoch, type FactionTrend } from '@/lib/game/realignment';

interface Props {
  state: GameState;
  onSendEnvoy: (id: FactionId) => void;
  onPurchaseLicense?: (licenseId: string) => void;
}

const STANDING_ORDER: FactionStanding[] = ['allied', 'friendly', 'neutral', 'unfriendly', 'hostile'];

function formatModifierPct(mod: number): string {
  const pct = Math.round(Math.abs(mod) * 100);
  return mod >= 0 ? `-${pct}% broker fee` : `+${pct}% broker fee`;
}

// Colorblind-safe: trend is glyph + text label together, never color alone
// (CLAUDE.md accessibility invariant — same rule as the reputation bar's
// center-tick + numeric readout above).
const TREND_ICON: Record<FactionTrend, string> = { ascendant: '▲', retreating: '▼', stable: '▬' };
const TREND_LABEL: Record<FactionTrend, string> = { ascendant: 'Ascendant this epoch', retreating: 'Retreating this epoch', stable: 'Stable this epoch' };
const TREND_ACCENT: Record<FactionTrend, string> = { ascendant: 'text-emerald-300', retreating: 'text-amber-300', stable: 'text-slate-500' };

export default function FactionPanel({ state, onSendEnvoy, onPurchaseLicense }: Props) {
  // LS9: computed once per render for all six factions (computeFactionPostures
  // walks a bounded senate+season aggregate — cheap, but no reason to repeat
  // it per faction card).
  const postureByFaction = new Map(
    computeFactionPostures(getCurrentRealignmentEpoch()).map(p => [p.factionId, p]),
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-white text-base font-bold">Factions</h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Six powers shape the lanes and outlaw worlds. Raise standing to unlock exclusive contracts and tech; rivals lose half the ground you gain.
        </p>
      </div>

      {/* STATS_DESIGN §12 — standing tiers gate market access/prices */}
      <div className="card p-4">
        <h3 className="text-white text-sm font-bold mb-2">Standing Tier Benefits</h3>
        <p className="text-slate-500 text-[11px] mb-3">
          Your standing with each faction changes what they charge you on the market — allied partners cut their broker fee, hostile ones tack a surcharge on (or refuse to deal at all).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-slate-500 text-left border-b border-white/10">
                <th className="py-1 pr-3 font-hud font-normal">Standing</th>
                <th className="py-1 pr-3 font-hud font-normal">Reputation Range</th>
                <th className="py-1 font-hud font-normal">Market Effect</th>
              </tr>
            </thead>
            <tbody>
              {STANDING_ORDER.map(standing => (
                <tr key={standing} className="border-b border-white/5 last:border-0">
                  <td className={`py-1 pr-3 font-bold ${STANDING_ACCENT[standing]}`}>{STANDING_LABEL[standing]}</td>
                  <td className="py-1 pr-3 text-slate-400 game-number">
                    {standing === 'allied' && '+50 to +100'}
                    {standing === 'friendly' && '+10 to +49'}
                    {standing === 'neutral' && '-9 to +9'}
                    {standing === 'unfriendly' && '-49 to -10'}
                    {standing === 'hostile' && '-100 to -50'}
                  </td>
                  <td className="py-1 text-slate-300 game-number">
                    {standing === 'hostile'
                      ? 'Embargo — licenses unavailable, +25% surcharge'
                      : formatModifierPct(STANDING_BROKER_MODIFIER[standing])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FACTIONS.map(f => {
          const rep = getFactionRep(state, f.id);
          const standing = getStanding(rep);
          const envoyCost = getEnvoyCost(rep);
          const canAfford = state.money >= envoyCost && rep < 100;
          const rival = FACTION_MAP.get(f.rivalId);
          const marketMod = getFactionStandingBrokerModifier(rep);
          const embargoed = isEmbargoed(rep);
          const licenses = FACTION_LICENSES.filter(l => l.factionId === f.id);
          const owned = state.factionLicenses || [];
          const posture = postureByFaction.get(f.id);

          return (
            <div
              key={f.id}
              className={`hud-frame relative rounded-xl overflow-hidden border ${f.theme.border}`}
              style={{ background: '#0a0a1a' }}
            >
              <span className="hud-corner-bl" aria-hidden="true" />
              <span className="hud-corner-br" aria-hidden="true" />
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

                {/* LS9 — Realignment posture badge (world-shared, this epoch) */}
                {posture && (
                  <div className={`flex items-center gap-1.5 text-[10px] mb-3 ${TREND_ACCENT[posture.trend]}`}>
                    <span aria-hidden="true">{TREND_ICON[posture.trend]}</span>
                    <span>{TREND_LABEL[posture.trend]}</span>
                    <span className="text-slate-600">·</span>
                    <Link href="/space-tycoon/epoch" className="text-slate-500 hover:text-slate-300 underline underline-offset-2">
                      Epoch Address
                    </Link>
                  </div>
                )}

                {/* Reputation bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="font-hud text-slate-500" id={`rep-label-${f.id}`}>Reputation</span>
                    <span className={`game-number font-mono font-bold ${rep >= 0 ? 'text-cyan-300' : 'text-red-300'}`} aria-live="polite">
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
                    <div className="text-[10px] text-slate-500 mt-1">
                      Rival: <span className="text-slate-400">{rival.name}</span> — loses ½ rep when you gain here
                    </div>
                  )}
                </div>

                {/* Envoy action */}
                <button
                  onClick={canAfford ? () => onSendEnvoy(f.id) : undefined}
                  disabled={!canAfford}
                  className={`w-full min-h-[44px] px-3 py-2 rounded text-xs font-bold transition-colors ${
                    canAfford
                      ? `${f.theme.bg} ${f.theme.accent} hover:brightness-125 border ${f.theme.border}`
                      : 'bg-white/[0.03] text-slate-600 cursor-not-allowed border border-white/[0.05]'
                  }`}
                >
                  {rep >= 100
                    ? 'Maximum Standing Reached'
                    : <>Send Envoy · <span className="game-number">{formatMoney(envoyCost)}</span> · +10 rep</>}
                </button>

                {/* Market effect readout (STATS_DESIGN §12) */}
                <div className={`mt-2 text-[10px] px-2 py-1 rounded ${embargoed ? 'bg-red-500/10 text-red-300' : marketMod > 0 ? 'bg-emerald-500/10 text-emerald-300' : marketMod < 0 ? 'bg-amber-500/10 text-amber-300' : 'text-slate-600'}`}>
                  {embargoed
                    ? 'Embargoed — this faction will not deal with you'
                    : marketMod !== 0
                      ? `Market: ${formatModifierPct(marketMod)} with this faction`
                      : 'Market: standard broker fee'}
                </div>

                {/* Faction licensing deals (STATS_DESIGN §12 "faction-locked content") */}
                {licenses.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[10px] font-hud text-slate-500 uppercase tracking-wide">Licensing Deals</div>
                    {licenses.map(l => {
                      const isOwned = owned.includes(l.id);
                      const meetsStanding = rep >= l.minStanding && !embargoed;
                      const affordable = state.money >= l.cost;
                      const purchasable = !isOwned && meetsStanding && affordable && !!onPurchaseLicense;
                      return (
                        <div key={l.id} className="rounded border border-white/10 bg-white/[0.02] p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-200">{l.name}</span>
                            {isOwned && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">OWNED</span>}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{l.description}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-slate-500">Requires {STANDING_LABEL[getStanding(l.minStanding)]}+ standing</span>
                            {!isOwned && (
                              <button
                                onClick={purchasable ? () => onPurchaseLicense!(l.id) : undefined}
                                disabled={!purchasable}
                                className={`min-h-[32px] px-2 py-1 rounded text-[10px] font-bold ${
                                  purchasable
                                    ? `${f.theme.bg} ${f.theme.accent} hover:brightness-125 border ${f.theme.border}`
                                    : 'bg-white/[0.03] text-slate-600 cursor-not-allowed border border-white/[0.05]'
                                }`}
                              >
                                <span className="game-number">{formatMoney(l.cost)}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
