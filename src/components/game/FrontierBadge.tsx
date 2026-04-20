'use client';

import { useEffect, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  getFrontierSummary,
  FRONTIER_GRADUATION_NET_WORTH,
  FRONTIER_HARD_CAP_NET_WORTH,
  FRONTIER_CONTRACT_PAYOUT_MULTIPLIER,
} from '@/lib/game/frontier';
import { formatMoney } from '@/lib/game/formulas';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Props {
  state: GameState;
  onGraduate: () => void;
}

/**
 * Compact badge in the game header that shows Protected Frontier status.
 * Renders nothing for players who have already graduated or never entered.
 */
export default function FrontierBadge({ state, onGraduate }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(iv);
  }, []);

  const summary = getFrontierSummary(state, now);
  if (summary.status !== 'active' || !summary.inFrontier) {
    return null;
  }

  const urgent = summary.remainingDays <= 3 || summary.autoGraduateReady;

  return (
    <>
      <div
        className={`flex items-center gap-2 px-2 py-1 text-[10px] border-y ${
          urgent
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
        }`}
      >
        <span aria-hidden="true">🛡</span>
        <span className="font-bold uppercase tracking-wider text-[10px] shrink-0">Protected Frontier</span>
        <span className="text-slate-300 shrink-0">·</span>
        <span className="font-mono shrink-0">
          {summary.remainingDays > 0 ? `${summary.remainingDays}d left` : 'grace period'}
        </span>
        <span className="text-slate-400 shrink-0">·</span>
        <span className="font-mono shrink-0 truncate">
          {formatMoney(summary.netWorth)} / {formatMoney(FRONTIER_GRADUATION_NET_WORTH)}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setDetailOpen(true)}
          className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-black/30 hover:bg-black/50 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 shrink-0"
          aria-label="Open Protected Frontier details"
        >
          Details
        </button>
      </div>

      {detailOpen && (
        <FrontierDetailModal
          state={state}
          onClose={() => setDetailOpen(false)}
          onGraduate={() => {
            setDetailOpen(false);
            onGraduate();
          }}
        />
      )}
    </>
  );
}

function FrontierDetailModal({
  state, onClose, onGraduate,
}: {
  state: GameState;
  onClose: () => void;
  onGraduate: () => void;
}) {
  useEscapeKey(onClose);
  const summary = getFrontierSummary(state);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="frontier-title">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-emerald-500/30" style={{ background: '#0a0a1a' }}>
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500" aria-hidden="true" />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 id="frontier-title" className="text-white text-xl font-bold flex items-center gap-2">
                <span aria-hidden="true">🛡</span> Protected Frontier
              </h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                As a new corporation, you're shielded from the worst of the open economy for your first 30 real-world days
                or until your net worth reaches <span className="text-white font-mono">{formatMoney(FRONTIER_GRADUATION_NET_WORTH)}</span>.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Protected Frontier details"
              className="w-9 h-9 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 flex items-center justify-center text-sm shrink-0"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          {/* Time progress */}
          <div className="mb-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-500">Time remaining</span>
              <span className="text-emerald-300 font-mono">{summary.remainingDays} days</span>
            </div>
            <div
              className="h-2 bg-white/[0.06] rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Frontier time progress"
              aria-valuenow={30 - summary.remainingDays}
              aria-valuemin={0}
              aria-valuemax={30}
              aria-valuetext={`${summary.remainingDays} days remaining of 30-day Frontier period`}
            >
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                style={{ width: `${((30 - summary.remainingDays) / 30) * 100}%` }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Net worth progress */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-500">Net worth toward graduation</span>
              <span className="text-cyan-300 font-mono">{formatMoney(summary.netWorth)} / {formatMoney(FRONTIER_GRADUATION_NET_WORTH)}</span>
            </div>
            <div
              className="h-2 bg-white/[0.06] rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Net worth toward Frontier graduation"
              aria-valuenow={summary.netWorth}
              aria-valuemin={0}
              aria-valuemax={FRONTIER_GRADUATION_NET_WORTH}
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                style={{ width: `${summary.netWorthProgressPct}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Hard cap at {formatMoney(FRONTIER_HARD_CAP_NET_WORTH)} — any player above this threshold graduates automatically regardless of time.
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold mb-1.5">While Protected</div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>✓ Rivals cannot target your assets</li>
              <li>✓ Espionage against you is blocked</li>
              <li>✓ NPC piracy and sabotage events are suppressed</li>
              <li>✓ Starter contracts pay +{Math.round((FRONTIER_CONTRACT_PAYOUT_MULTIPLIER - 1) * 100)}% more</li>
            </ul>
          </div>

          {/* Graduate button */}
          <button
            onClick={onGraduate}
            className="w-full px-3 py-2 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors"
          >
            Graduate Early — Enter Open Economy
          </button>
          <p className="text-[9px] text-slate-500 mt-1.5 text-center">
            Early graduation is irreversible. The full competitive economy unlocks immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
