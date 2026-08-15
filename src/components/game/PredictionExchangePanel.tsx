'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { PREDICTION_STAKE_MIN, PREDICTION_STAKE_MAX, PREDICTION_PAYOUT_MULTIPLIER } from '@/lib/game/prediction-exchange';

// ─── Types (mirrors the API response shape) ─────────────────────────────────

interface PredictionOptionPayload {
  id: string;
  label: string;
}

interface YourStakePayload {
  optionId: string;
  stake: number;
  payout: number | null;
}

interface PredictionQuestionPayload {
  id: string;
  question: string;
  options: PredictionOptionPayload[];
  category: string;
  closesAt: string;
  resolvesAt: string | null;
  sourceHref: string | null;
  status: 'open' | 'pending' | 'resolved';
  poolByOption: Record<string, number>;
  stakeCount: number;
  outcomeOptionId: string | null;
  resolvedAt: string | null;
  yourStake: YourStakePayload | null;
}

interface PredictionsResponse {
  open: PredictionQuestionPayload[];
  resolved: PredictionQuestionPayload[];
}

interface PredictionExchangePanelProps {
  state: GameState;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  launch: { icon: '🚀', label: 'Launch' },
  stocks: { icon: '📈', label: 'Market' },
  milestone: { icon: '🎯', label: 'Milestone' },
};

function poolTotal(pool: Record<string, number>): number {
  return Object.values(pool).reduce((sum, v) => sum + v, 0);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PredictionExchangePanel({ state }: PredictionExchangePanelProps) {
  const [data, setData] = useState<PredictionsResponse>({ open: [], resolved: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stakeDrafts, setStakeDrafts] = useState<Record<string, number>>({});
  const [pendingPick, setPendingPick] = useState<Record<string, string>>({}); // questionId -> chosen optionId (pre-confirm)
  const [placing, setPlacing] = useState<string | null>(null); // questionId being staked
  const [now, setNow] = useState(Date.now());

  const fetchQuestions = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/predictions');
      if (!res.ok) throw new Error('Failed to load the Prediction Exchange');
      const json: PredictionsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the Prediction Exchange');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 60_000);
    return () => clearInterval(interval);
  }, [fetchQuestions]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlaceStake = useCallback(async (questionId: string, optionId: string) => {
    if (placing) return;
    const amount = stakeDrafts[questionId] ?? PREDICTION_STAKE_MIN;
    setPlacing(questionId);
    setError(null);
    try {
      const res = await fetch('/api/space-tycoon/predictions/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, optionId, stake: amount }),
      });
      const json = await res.json();
      if (json.success) {
        playSound('trade');
        setPendingPick(prev => { const next = { ...prev }; delete next[questionId]; return next; });
        await fetchQuestions();
      } else {
        setError(json.error || 'Failed to place stake');
        playSound('error');
      }
    } catch {
      setError('Network error. Please try again.');
      playSound('error');
    }
    setPlacing(null);
  }, [placing, stakeDrafts, fetchQuestions]);

  const sortedOpen = useMemo(
    () => [...data.open].sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime()),
    [data.open],
  );
  const sortedResolved = useMemo(
    () => [...data.resolved].sort((a, b) => new Date(b.resolvedAt || 0).getTime() - new Date(a.resolvedAt || 0).getTime()),
    [data.resolved],
  );

  // ─── Loading / Error states ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <div className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-slate-400 text-xs">Loading the Prediction Exchange...</p>
        </div>
      </div>
    );
  }

  if (error && data.open.length === 0 && data.resolved.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-red-400 text-xs mb-2">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchQuestions(); }}
            className="px-4 py-1.5 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="hud-frame relative flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Prediction Exchange</span>
        </div>
        <span className="text-[10px] text-slate-500">Balance: <span className="game-number text-cyan-300 font-mono">{formatMoney(state.money)}</span></span>
      </div>

      <p className="text-slate-500 text-[10px] text-center px-2">
        New questions post every Monday, drawn from real launches and market data we track ourselves.
        Correct calls pay {PREDICTION_PAYOUT_MULTIPLIER}x your stake. Stakes are locked once you place them — one pick per question.
      </p>

      {/* Open Questions */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>🔮</span> Open Questions
        </h3>

        {sortedOpen.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-4">
            No open questions right now. The exchange refreshes every Monday with new launch, market, and milestone
            predictions drawn from our own live trackers — check back soon.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedOpen.map((q) => {
              const meta = CATEGORY_META[q.category] || { icon: '❔', label: q.category };
              const remainingMs = new Date(q.closesAt).getTime() - now;
              const isPending = q.status === 'pending' || remainingMs <= 0;
              const total = poolTotal(q.poolByOption);
              const draft = stakeDrafts[q.id] ?? PREDICTION_STAKE_MIN;
              const chosen = pendingPick[q.id];
              const affordableMax = Math.min(PREDICTION_STAKE_MAX, Math.max(PREDICTION_STAKE_MIN, Math.floor(state.money)));

              return (
                <div key={q.id} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.03]">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5" aria-hidden="true">{meta.icon}</span>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-semibold">{meta.label}</span>
                        <p className="text-white text-xs font-medium leading-snug">{q.question}</p>
                        {q.sourceHref && (
                          <Link href={q.sourceHref} className="text-cyan-400/70 hover:text-cyan-300 text-[10px] underline underline-offset-2">
                            View tracked source
                          </Link>
                        )}
                      </div>
                    </div>
                    <span className={`game-number shrink-0 text-[10px] font-mono ${remainingMs <= 3_600_000 && !isPending ? 'text-red-400' : 'text-slate-500'}`}>
                      {isPending ? 'Awaiting resolution' : formatCountdown(Math.floor(remainingMs / 1000))}
                    </span>
                  </div>

                  {/* Already staked */}
                  {q.yourStake ? (
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-cyan-300 text-[10px]">
                        Your pick: <strong>{q.options.find(o => o.id === q.yourStake!.optionId)?.label || q.yourStake.optionId}</strong>
                      </span>
                      <span className="game-number text-white text-[10px] font-mono">{formatMoney(q.yourStake.stake)} staked</span>
                    </div>
                  ) : isPending ? (
                    <p className="text-slate-500 text-[10px] text-center py-2">Stakes are closed — resolving from our own tracked data.</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {q.options.map((opt) => {
                          const optPool = q.poolByOption[opt.id] || 0;
                          const share = total > 0 ? Math.round((optPool / total) * 100) : 0;
                          const isChosen = chosen === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setPendingPick(prev => ({ ...prev, [q.id]: opt.id }))}
                              aria-pressed={isChosen}
                              className={`min-h-[44px] px-3 py-2 rounded-lg border text-left text-[11px] font-medium transition-colors ${
                                isChosen
                                  ? 'bg-cyan-600/30 border-cyan-400/50 text-white'
                                  : 'bg-white/[0.03] border-white/[0.06] text-slate-300 hover:border-white/[0.15]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{opt.label}</span>
                                <span className="text-slate-500 text-[10px] font-mono shrink-0">{share}%</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {chosen && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label htmlFor={`stake-${q.id}`} className="sr-only">Stake amount for {q.question}</label>
                          <input
                            id={`stake-${q.id}`}
                            type="number"
                            min={PREDICTION_STAKE_MIN}
                            max={affordableMax}
                            step={1000}
                            value={draft}
                            onChange={(e) => {
                              const v = Math.round(Number(e.target.value) || 0);
                              setStakeDrafts(prev => ({ ...prev, [q.id]: v }));
                            }}
                            className="w-28 h-8 rounded bg-white/[0.06] text-white text-xs text-center border border-white/[0.06] focus:outline-none focus:border-cyan-500/40 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setStakeDrafts(prev => ({ ...prev, [q.id]: affordableMax }))}
                            className="min-h-[32px] px-2 text-[10px] text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-md"
                          >
                            Max
                          </button>
                          <span className="text-slate-500 text-[10px]">
                            Pays {formatMoney((stakeDrafts[q.id] ?? PREDICTION_STAKE_MIN) * PREDICTION_PAYOUT_MULTIPLIER)} if correct
                          </span>
                          <button
                            onClick={() => handlePlaceStake(q.id, chosen)}
                            disabled={placing === q.id || draft < PREDICTION_STAKE_MIN || draft > affordableMax}
                            className="ml-auto min-h-[44px] px-4 text-[10px] font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                          >
                            {placing === q.id ? 'Placing...' : `Stake ${formatMoney(draft)}`}
                          </button>
                        </div>
                      )}

                      <p className="text-slate-600 text-[10px]">
                        {q.stakeCount} player{q.stakeCount === 1 ? '' : 's'} staked so far · {formatMoney(total)} in play
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved */}
      {sortedResolved.length > 0 && (
        <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>📜</span> Recently Resolved
          </h3>
          <div className="space-y-1.5">
            {sortedResolved.slice(0, 10).map((q) => {
              const meta = CATEGORY_META[q.category] || { icon: '❔', label: q.category };
              const outcomeLabel = q.options.find(o => o.id === q.outcomeOptionId)?.label || q.outcomeOptionId;
              const yourResult = q.yourStake
                ? (q.yourStake.payout && q.yourStake.payout > 0
                    ? `Won ${formatMoney(q.yourStake.payout)}`
                    : 'No payout')
                : null;
              return (
                <div key={q.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mr-1.5">{meta.icon} {meta.label}</span>
                    <p className="text-slate-300 text-[11px] truncate">{q.question}</p>
                    <p className="text-slate-500 text-[10px]">Outcome: <span className="text-white">{outcomeLabel}</span></p>
                  </div>
                  {yourResult && (
                    <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                      q.yourStake!.payout && q.yourStake!.payout > 0
                        ? 'text-green-400 bg-green-500/10 border-green-500/20'
                        : 'text-slate-500 bg-slate-500/10 border-slate-500/20'
                    }`}>
                      {yourResult}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}
