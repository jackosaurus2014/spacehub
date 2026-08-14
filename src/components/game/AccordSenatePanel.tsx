'use client';

import { useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  MEASURE_MAP,
  getPublishedOdds,
  computeLobbyShiftPct,
  LOBBY_MONEY_CAP,
  LOBBY_FAVOR_CAP,
  LOBBY_MONEY_PER_PP,
  LOBBY_FAVOR_PER_PP,
  LOBBY_MONEY_MAX_PP,
  LOBBY_FAVOR_MAX_PP,
  type LobbyStance,
} from '@/lib/game/accord-senate';
import { FACTIONS, getFactionRep, type FactionId } from '@/lib/game/factions';
import { formatMoney } from '@/lib/game/formulas';

interface Props {
  state: GameState;
  onLobby: (measureId: string, stance: LobbyStance, moneySpent: number, favorFactionId?: FactionId, favorSpent?: number) => void;
}

/** 4X Wave W11 — Accord Council Senate: docket view + lobbying controls.
 *  docs/4X_BASELINE_2026-08.md W11. The quarterly vote engine reads as a
 *  passive command-center panel (never a blocking modal, per
 *  accord-senate.ts's design note) — the player can commit lobbying any
 *  time the docket is open, see the published odds shift live in the
 *  preview, and review the Council's public vote history below. */
export default function AccordSenatePanel({ state, onLobby }: Props) {
  const docket = state.accordDocket;
  const lobbying = state.accordLobbying || [];
  const history = state.accordVoteHistory || [];

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-white text-base font-bold">Accord Council Senate</h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Every quarter the Council votes on binding measures. Lobby with money or a faction favor to shift the odds — published in advance, capped by influence limits, never a guarantee.
        </p>
      </div>

      {!docket || docket.resolved ? (
        <div className="card p-4 text-slate-500 text-sm">No docket is currently open. The next session convenes at the coming quarter boundary.</div>
      ) : (
        <div className="space-y-3">
          {docket.measureIds.map(measureId => (
            <MeasureCard
              key={measureId}
              state={state}
              measureId={measureId}
              quarterIndex={docket.quarterIndex}
              commitment={lobbying.find(l => l.measureId === measureId)}
              onLobby={onLobby}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="card p-4">
          <h3 className="text-white text-sm font-bold mb-2">Council Record</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {history.map((r, i) => (
              <div key={`${r.quarterIndex}-${r.measureId}-${i}`} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span aria-hidden="true">{r.icon}</span>
                  <span className="text-slate-300 truncate">{r.measureName}</span>
                  {r.playerStance && (
                    <span className="text-[9px] text-slate-500 uppercase">({r.playerStance})</span>
                  )}
                </div>
                <span className={`font-bold shrink-0 ${r.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                  {r.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeasureCard({
  state, measureId, quarterIndex, commitment, onLobby,
}: {
  state: GameState;
  measureId: string;
  quarterIndex: number;
  commitment?: { stance: LobbyStance; moneySpent: number; favorFactionId?: string; favorSpent: number };
  onLobby: Props['onLobby'];
}) {
  const def = MEASURE_MAP.get(measureId);
  const [stance, setStance] = useState<LobbyStance>('support');
  const [moneyPct, setMoneyPct] = useState(0); // 0-100 slider of LOBBY_MONEY_CAP
  const [favorFaction, setFavorFaction] = useState<FactionId | ''>('');
  const [favorPct, setFavorPct] = useState(0); // 0-100 slider of LOBBY_FAVOR_CAP

  if (!def) return null;
  const publishedOdds = getPublishedOdds(measureId, quarterIndex);
  const moneySpent = Math.round((moneyPct / 100) * LOBBY_MONEY_CAP);
  const favorSpent = Math.round((favorPct / 100) * LOBBY_FAVOR_CAP);
  const shiftPct = computeLobbyShiftPct(moneySpent, favorSpent);
  const previewOdds = Math.max(0.05, Math.min(0.95, publishedOdds + (stance === 'support' ? shiftPct : -shiftPct) / 100));
  const canAffordMoney = state.money >= moneySpent;
  const favorRep = favorFaction ? getFactionRep(state, favorFaction) : 0;
  const canAffordFavor = !favorFaction || favorSpent === 0 || (favorRep - favorSpent >= -100);

  return (
    <div className="hud-frame rounded-xl border border-white/10 p-3" style={{ background: '#0a0a1a' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true">{def.icon}</span>
            <h3 className="text-white text-sm font-bold">{def.name}</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400 uppercase">{def.category.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-slate-400 text-[11px] mt-1">{def.description}</p>
        </div>
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        Published odds: <span className="game-number font-bold text-cyan-300">{Math.round(publishedOdds * 100)}%</span> to pass
      </div>

      {commitment ? (
        <div className="mt-2 text-[11px] px-2 py-1.5 rounded bg-cyan-500/10 text-cyan-300">
          Lobbying committed: {commitment.stance} · <span className="game-number">{formatMoney(commitment.moneySpent)}</span>
          {commitment.favorSpent > 0 && commitment.favorFactionId && <> · {commitment.favorSpent} standing with {commitment.favorFactionId.replace('the-', '').replace(/-/g, ' ')}</>}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setStance('support')}
              className={`flex-1 min-h-[36px] rounded text-[11px] font-bold ${stance === 'support' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/[0.03] text-slate-500 border border-white/[0.05]'}`}
            >
              Support
            </button>
            <button
              onClick={() => setStance('oppose')}
              className={`flex-1 min-h-[36px] rounded text-[11px] font-bold ${stance === 'oppose' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-white/[0.03] text-slate-500 border border-white/[0.05]'}`}
            >
              Oppose
            </button>
          </div>

          <label className="block">
            <span className="text-[10px] text-slate-500">Money lobbying — <span className="game-number">{formatMoney(moneySpent)}</span> (max {LOBBY_MONEY_MAX_PP}pp @ {formatMoney(LOBBY_MONEY_PER_PP)}/pp)</span>
            <input
              type="range" min={0} max={100} value={moneyPct}
              onChange={e => setMoneyPct(Number(e.target.value))}
              className="w-full"
              aria-label="Money lobbying spend"
            />
          </label>

          <label className="block">
            <span className="text-[10px] text-slate-500">Call in a favor — faction</span>
            <select
              value={favorFaction}
              onChange={e => setFavorFaction(e.target.value as FactionId | '')}
              className="w-full mt-0.5 bg-black/40 border border-white/10 rounded text-[11px] text-slate-300 px-2 py-1.5 min-h-[36px]"
            >
              <option value="">None</option>
              {FACTIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          {favorFaction && (
            <label className="block">
              <span className="text-[10px] text-slate-500">Favor spend — <span className="game-number">{favorSpent}</span> standing (max {LOBBY_FAVOR_MAX_PP}pp @ {LOBBY_FAVOR_PER_PP}/pp)</span>
              <input
                type="range" min={0} max={100} value={favorPct}
                onChange={e => setFavorPct(Number(e.target.value))}
                className="w-full"
                aria-label="Faction favor spend"
              />
            </label>
          )}

          <div className="text-[11px] text-slate-400">
            Projected odds: <span className={`game-number font-bold ${previewOdds >= publishedOdds ? 'text-emerald-300' : 'text-amber-300'}`}>{Math.round(previewOdds * 100)}%</span>
          </div>

          <button
            onClick={() => onLobby(measureId, stance, moneySpent, favorFaction || undefined, favorFaction ? favorSpent : 0)}
            disabled={!canAffordMoney || !canAffordFavor}
            className={`w-full min-h-[40px] rounded text-xs font-bold border ${
              canAffordMoney && canAffordFavor
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:brightness-125'
                : 'bg-white/[0.03] text-slate-600 border-white/[0.05] cursor-not-allowed'
            }`}
          >
            Commit Lobbying Position
          </button>
        </div>
      )}
    </div>
  );
}
