'use client';

// ─── Talent poaching: the OUTGOING launcher (reusable) ──────────────────────
//
// Lifted out of WorkforcePanel (lever-discoverability pass, 2026-09) so the
// Rivals panel and the Competitive Posture strip can open the SAME form
// pre-targeted at a specific corporation. Nothing about the mechanic lives
// here — every rule (10%-of-roster cap, 48h counteroffer window, 30-day
// per-target cooldown, Frontier shield both ways, $200M offense floor) is
// enforced by POST /api/space-tycoon/poach and every failure string rendered
// is the server's own.
//
// Two modes:
//   • With `state` (Crew tab): the block only renders when the tool is
//     genuinely available to this corporation and the cost preview uses the
//     SAME pure functions the route charges with, at the synced indices.
//   • Without `state` (Rivals tab, which is self-fetching): the form always
//     renders and the server prices the offer at declare time.
//
// The counterparty list is the public leaderboard (profile ids are already
// public via /space-tycoon/corp/[id]); `initialTargetName` pre-selects by
// company name, which is the only handle the rivals API exposes.

import { useEffect, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { WORKER_TYPES } from '@/lib/game/workforce';
import type { WorkerType } from '@/lib/game/workforce';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { getWageIndex } from '@/lib/game/labor-market';
import { computeSigningBonus, computePoachActionFee } from '@/lib/game/talent-poaching';
import { getFeeIndexFactor } from '@/lib/game/fee-index';
import { COMPETITIVE_TOOL_MAP } from '@/lib/game/competitive-posture';
import { consumeSubViewRequest } from '@/lib/game/sub-view';
import { Concept } from './HoloTip';

interface LeaderboardLite {
  profileId?: string;
  companyName: string;
  netWorth: number;
  allianceTag?: string | null;
}

export interface PoachLauncherProps {
  /** Synced game state — enables the availability gate and the cost preview. */
  state?: GameState;
  /** Pre-select a target by profile id. */
  initialTargetId?: string;
  /** Pre-select a target by company name (rivals API exposes names only). */
  initialTargetName?: string;
  /** Start expanded (a rival card's "Poach talent" button). */
  defaultOpen?: boolean;
  /** Honour the `workforce:poach` sub-view request (Crew tab only). */
  listenForSubView?: boolean;
  /** Rendered when the launcher is embedded in another card. */
  onClose?: () => void;
}

export default function PoachLauncher({
  state, initialTargetId, initialTargetName, defaultOpen = false, listenForSubView = false, onClose,
}: PoachLauncherProps) {
  const [targets, setTargets] = useState<LeaderboardLite[] | null>(null);
  const [targetId, setTargetId] = useState(initialTargetId || '');
  const [crewType, setCrewType] = useState<WorkerType>('engineer');
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultOpen);

  const tool = COMPETITIVE_TOOL_MAP.get('talent_poaching');
  const available = !state || (!!tool && tool.isAvailable(state, Date.now()));

  // PvP Discoverability pass: a `workforce:poach` request (from a posture
  // signal, a Situation Log row, or the tool-unlock briefing) opens the
  // launcher directly. The DEFENCE token 'workforce:poach-defend' is
  // deliberately not honoured here — a player sent to answer a raid must not
  // have an attack form spring open in front of them.
  useEffect(() => {
    if (listenForSubView && consumeSubViewRequest('workforce') === 'poach') setOpen(true);
  }, [listenForSubView]);

  useEffect(() => {
    if (!open || targets !== null) return;
    let cancelled = false;
    fetch('/api/space-tycoon/leaderboard?limit=50')
      .then(r => r.json())
      .then((d: { entries?: LeaderboardLite[] }) => {
        if (cancelled) return;
        const list = (d.entries || []).filter(e => !!e.profileId);
        setTargets(list);
        if (!initialTargetId && initialTargetName) {
          const match = list.find(e => e.companyName === initialTargetName);
          if (match?.profileId) setTargetId(match.profileId);
        }
      })
      .catch(() => { if (!cancelled) setTargets([]); });
    return () => { cancelled = true; };
  }, [open, targets, initialTargetId, initialTargetName]);

  if (!available) return null;

  const wageIndex = state ? getWageIndex(state.laborMarket, crewType) : null;
  const bonus = wageIndex !== null ? computeSigningBonus(crewType, count, wageIndex) : null;
  const actionFee = state ? computePoachActionFee(getFeeIndexFactor(state)) : null;
  const crewDef = WORKER_TYPES.find(w => w.type === crewType);
  const targetNotOnBoard = !!initialTargetName && targets !== null && !targetId
    && !targets.some(e => e.companyName === initialTargetName);

  const submit = async () => {
    if (!targetId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/space-tycoon/poach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'offer', targetProfileId: targetId, crewType, count }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false && !data.error) {
        playSound('notification');
        setMessage('Offer filed. Signing bonuses are escrowed; the target has 48 hours to counteroffer. The action fee is burned either way.');
      } else {
        // The server's string verbatim — it is the one that teaches the rules
        // (10% roster cap, 30-day cooldown, Frontier shield, funds).
        setMessage(data.error || 'The offer was refused.');
      }
    } catch {
      setMessage('Network error — try again.');
    } finally {
      setBusy(false);
    }
  };

  const headingId = `poach-launcher-heading-${initialTargetName ? 'rival' : 'crew'}`;
  const bodyId = `poach-launcher-body-${initialTargetName ? 'rival' : 'crew'}`;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-[11px] font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
          <span aria-hidden="true">🧲</span>
          <Concept id="talent-poaching">Talent poaching</Concept>
          <span className="text-[9px] px-1 py-0.5 rounded border border-white/15 text-slate-400">Offense</span>
          {initialTargetName && <span className="normal-case tracking-normal text-slate-300">· {initialTargetName}</span>}
        </h3>
        <button
          type="button"
          onClick={() => {
            playSound('click');
            if (onClose && open) { onClose(); return; }
            setOpen(v => !v);
          }}
          aria-expanded={open}
          aria-controls={bodyId}
          className="min-h-[44px] px-2 text-[10px] uppercase tracking-wider text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded transition-colors"
        >
          {open ? 'Close' : 'Open'}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
        Offer signing bonuses to up to 10% of one crew type inside a rival corporation. They get 48
        hours to match 75% and keep them. Your escrow is refunded if they do; the action fee is
        burned either way, and every successful head pushes the global wage index up — including
        your own payroll. Protected Frontier corporations cannot be targeted.
      </p>

      <div id={bodyId} hidden={!open} className="mt-2.5 space-y-2">
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="block">
            <span className="game-label block mb-1">Target corporation</span>
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              aria-label={initialTargetName ? `Target corporation (pre-selected: ${initialTargetName})` : 'Target corporation'}
              className="w-full min-h-[44px] rounded-lg bg-black/40 border border-white/10 text-[11px] text-slate-200 px-2"
            >
              <option value="">{targets === null ? 'Loading…' : 'Select a corporation'}</option>
              {(targets || []).map(t => (
                <option key={t.profileId} value={t.profileId}>
                  {t.companyName}{t.allianceTag ? ` [${t.allianceTag}]` : ''}
                </option>
              ))}
            </select>
            {targetNotOnBoard && (
              <span className="block mt-1 text-[10px] text-slate-500">
                {initialTargetName} is not on the public leaderboard right now — pick them from the list when they appear.
              </span>
            )}
          </label>
          <label className="block">
            <span className="game-label block mb-1">Crew type</span>
            <select
              value={crewType}
              onChange={e => setCrewType(e.target.value as WorkerType)}
              className="w-full min-h-[44px] rounded-lg bg-black/40 border border-white/10 text-[11px] text-slate-200 px-2"
            >
              {WORKER_TYPES.map(w => (
                <option key={w.type} value={w.type}>{w.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="game-label block mb-1">Heads (server caps at 10% of their roster)</span>
            <input
              type="number"
              min={1}
              max={25}
              value={count}
              onChange={e => setCount(Math.max(1, Math.min(25, Math.floor(Number(e.target.value) || 1))))}
              className="w-full min-h-[44px] rounded-lg bg-black/40 border border-white/10 text-[11px] text-slate-200 px-2"
            />
          </label>
        </div>

        {bonus !== null && actionFee !== null && wageIndex !== null ? (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Estimated cost at the current {crewDef?.name.toLowerCase() || crewType} wage index of{' '}
            <span className="font-mono text-slate-200">{wageIndex.toFixed(2)}×</span>:{' '}
            <span className="font-mono text-amber-300">{formatMoney(bonus)}</span> escrowed in signing
            bonuses plus a <span className="font-mono text-amber-300">{formatMoney(actionFee)}</span>{' '}
            burned action fee. The server prices the offer at its own live index, so the charged figure
            may differ slightly.
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The server prices the offer at the live {crewDef?.name.toLowerCase() || crewType} wage index
            when you file it: signing bonuses are escrowed, the action fee is burned. Offense unlocks after
            the Protected Frontier and above $200M net worth — the server refuses anything else.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !targetId}
            aria-label={initialTargetName ? `File the poach offer against ${initialTargetName}` : 'File the poach offer'}
            className="min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
          >
            File the offer
          </button>
        </div>
        {message && <p className="text-[11px] text-slate-200 leading-relaxed" role="status">{message}</p>}
      </div>
    </section>
  );
}
