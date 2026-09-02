'use client';

// ─── Space Tycoon: Competitive Races (GAME_DESIGN_REVIEW_2026-09 row 15) ───
// The client that /api/space-tycoon/competitive-contracts never had. Lists
// the shared, slot-limited "first N companies to complete X" prizes and
// exposes the one verb the route already implements: Claim. The server
// verifies the requirement against the synced profile (Wave E1) and pays
// through the ledger; this panel never computes eligibility itself beyond
// the honest "you appear to meet this" hint from local state.
//
// Kept separate from BiddingPanel on purpose — see competitive-contracts.ts
// raceStatusFor() for the fold-vs-wire decision.

import { useCallback, useEffect, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { raceStatusFor } from '@/lib/game/competitive-contracts';
import type { CompetitiveContractView } from '@/hooks/useWorldState';
import GameIcon from './GameIcon';

interface CompetitiveRacesPanelProps {
  state: GameState;
}

interface RacesResponse {
  contracts: CompetitiveContractView[];
  gameMonth: number;
  totalActive: number;
  totalFull: number;
}

function tierLabel(tier: number): string {
  return ['', 'Early', 'Mid', 'Late', 'Endgame', 'Grand'][tier] || `T${tier}`;
}

export default function CompetitiveRacesPanel({ state }: CompetitiveRacesPanelProps) {
  const [data, setData] = useState<RacesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [showFilled, setShowFilled] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/space-tycoon/competitive-contracts');
      if (!res.ok) throw new Error('Failed to load races');
      const json = (await res.json()) as RacesResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load races');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const claim = useCallback(async (contractId: string) => {
    setClaiming(contractId);
    setNotice(null);
    try {
      const res = await fetch('/api/space-tycoon/competitive-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        playSound('milestone');
        const title = json.exclusiveTitle ? ` Title earned: ${json.exclusiveTitle}.` : '';
        setNotice({ id: contractId, ok: true, text: `Slot ${json.slotNumber} claimed — ${formatMoney(json.reward?.money ?? 0)} credited at your next sync.${title}` });
      } else if (res.status === 401) {
        setNotice({ id: contractId, ok: false, text: 'Sign in to claim competitive races.' });
      } else {
        const progress = json?.progress?.details ? ` (${json.progress.details})` : '';
        setNotice({ id: contractId, ok: false, text: `${typeof json?.error === 'string' ? json.error : 'Claim rejected.'}${progress}` });
      }
      await load();
    } catch {
      setNotice({ id: contractId, ok: false, text: 'Network error — could not claim right now.' });
    } finally {
      setClaiming(null);
    }
  }, [load]);

  const myName = state.companyName || null;
  const races = data?.contracts ?? [];
  const open = races.filter(r => raceStatusFor(r, myName) !== 'full');
  const filled = races.filter(r => raceStatusFor(r, myName) === 'full');

  return (
    <section className="hud-frame game-panel p-4" aria-labelledby="competitive-races-heading">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div>
          <h3 id="competitive-races-heading" className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <GameIcon name="target" size={13} /> Competitive Races
          </h3>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Shared, slot-limited prizes — the first companies to complete the requirement win. Verified against your synced state when you claim.
          </p>
        </div>
        {data && (
          <span className="text-[10px] text-slate-500 font-mono">
            {open.length} open{filled.length > 0 ? ` · ${filled.length} filled` : ''}
          </span>
        )}
      </div>

      {loading && !data && (
        <p className="text-slate-500 text-xs" role="status">Loading races…</p>
      )}
      {error && (
        <div className="text-xs text-red-400" role="alert">
          {error}{' '}
          <button type="button" onClick={load} className="underline min-h-[44px] px-1">Retry</button>
        </div>
      )}

      {data && open.length === 0 && (
        <p className="text-slate-500 text-xs">No open races this game month — new ones unlock as the world clock advances.</p>
      )}

      <ul className="space-y-2" aria-label="Open competitive races">
        {open.map(r => {
          const status = raceStatusFor(r, myName);
          const mine = status === 'claimed_by_me';
          return (
            <li key={r.id} className={`rounded-lg border p-3 ${mine ? 'border-amber-500/30 bg-amber-500/[0.06]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    <span aria-hidden="true">{r.icon} </span>{r.title}
                    <span className="ml-2 text-[10px] font-normal text-slate-500 uppercase tracking-wider">{tierLabel(r.tier)} · {r.client}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{r.description}</p>
                  <p className="text-[11px] text-cyan-300 mt-1 font-mono">Requirement: {r.requirement.label}</p>
                  {r.winners.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Claimed by {r.winners.map(w => w.companyName).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-green-400 font-mono text-sm font-bold">{formatMoney(r.reward.money)}</p>
                  <p className="text-[10px] text-slate-500">{r.slotsRemaining}/{r.maxWinners} slots left</p>
                  {r.reward.exclusiveTitle && (
                    <p className="text-[10px] text-amber-300">Title: {r.reward.exclusiveTitle}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => claim(r.id)}
                    disabled={mine || claiming === r.id}
                    aria-label={mine ? `${r.title} already claimed` : `Claim ${r.title}`}
                    className="mt-2 min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mine ? 'Claimed ✓' : claiming === r.id ? 'Verifying…' : 'Claim'}
                  </button>
                </div>
              </div>
              {notice && notice.id === r.id && (
                <p role={notice.ok ? 'status' : 'alert'} className={`text-[11px] mt-2 ${notice.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {notice.text}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {filled.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowFilled(v => !v)}
            aria-expanded={showFilled}
            className="text-[11px] text-slate-400 hover:text-white min-h-[44px] px-1"
          >
            {showFilled ? 'Hide' : 'Show'} {filled.length} filled race{filled.length === 1 ? '' : 's'}
          </button>
          {showFilled && (
            <ul className="space-y-1 mt-1" aria-label="Filled competitive races">
              {filled.map(r => (
                <li key={r.id} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-slate-400 truncate pr-2">{r.title}</span>
                  <span className="text-slate-500 shrink-0">Won by {r.winners.map(w => w.companyName).join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
