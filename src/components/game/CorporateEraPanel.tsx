'use client';

import { useEffect, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import type { EraCharterId } from '@/lib/game/types';
import type { CompletedCorporateEra } from '@/lib/game/types';
import {
  ERA_CHARTERS, ERA_MIN_CORPORATION_TIER, formatFocusTerm,
  canCharterEra, getEraProgress,
} from '@/lib/game/corporate-eras';
import { eraKey, ERA_MEDAL_LABEL } from '@/lib/game/corp-era-registry';
import { playSound } from '@/lib/game/sound-engine';
import { toast } from '@/lib/toast';
import GameIcon from '@/components/game/GameIcon';
import { resolveIcon, type IconName } from '@/lib/game/icons';
import HoloTip, { Concept } from '@/components/game/HoloTip';

// V1: medal tiers are shape-distinct (medal vs medal-outline for the
// unearned "filed" state) — color (MEDAL_COLOR below) is reinforcement
// only, never the sole signal, and the tier LABEL (ERA_MEDAL_LABEL) is
// always rendered alongside per the colorblind-safety invariant.
const MEDAL_ICON: Record<string, IconName> = {
  platinum: 'medal', gold: 'medal', silver: 'medal', bronze: 'medal', filed: 'medal-outline',
};

// ─── Live-Service Wave LS4 — Corporate Eras panel ───────────────────────────
// docs/LIVE_SERVICE_2026-08.md §LS4. Lives inside GovernancePanel.tsx per the
// spec's "charter choice lives with board politics — W13 synergy" — era
// chartering is a board-level decision, same section as doctrine policies
// and board directives.

interface CorporateEraPanelProps {
  state: GameState;
  onCharterEra: (charterId: EraCharterId) => void;
}

const MEDAL_COLOR: Record<string, string> = {
  platinum: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
  gold: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  silver: 'text-slate-200 border-slate-400/30 bg-slate-400/10',
  bronze: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
  filed: 'text-slate-500 border-white/10 bg-white/[0.03]',
};

function formatCompactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

// ─── Publish-to-Chronicle button (mirrors ReportsPanel.tsx's
// PublishToRegistry exactly — same opt-in confirm-then-publish flow, same
// per-corp-only GET pre-check, same POST to derive corpId server-side). ────

function PublishEraToChronicle({ era }: { era: CompletedCorporateEra }) {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'publishing' | 'published' | 'error'>('idle');
  const key = eraKey(era.eraIndex);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/space-tycoon/corp-era')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.publishedEras?.includes(key)) setStatus('published');
      })
      .catch(() => { /* non-critical */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const handlePublish = async () => {
    setStatus('publishing');
    try {
      const res = await fetch('/api/space-tycoon/corp-era', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eraIndex: era.eraIndex,
          charterId: era.charterId,
          startedAtMs: era.startedAtMs,
          endedAtMs: era.endedAtMs,
          bracketAtStart: era.bracketAtStart,
          medal: era.medal,
          goalScore: era.goalScore,
          goalActual: era.goalActual,
          goalTarget: era.goalTarget,
          headlineStats: era.headlineStats,
          notableEvents: era.notableEvents,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Publish failed');
      }
      setStatus('published');
      toast.success('This era is now part of your public Chronicle.', 'Published');
    } catch (err) {
      setStatus('error');
      toast.error(err instanceof Error ? err.message : 'Failed to publish era', 'Publish failed');
    }
  };

  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
        <GameIcon name="scroll" size={12} /> On the Chronicle
      </span>
    );
  }

  if (status === 'confirming') {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 space-y-2">
        <p className="text-[10px] text-amber-200/90">
          This era becomes permanently visible on the public Corporate Chronicle, linked from your corp profile.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePublish}
            className="min-h-[32px] px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors"
          >
            Confirm &amp; Publish
          </button>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="min-h-[32px] px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setStatus('confirming')}
      disabled={status === 'publishing'}
      aria-busy={status === 'publishing'}
      className="min-h-[32px] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
    >
      <GameIcon name="scroll" size={12} />
      {status === 'publishing' ? 'Publishing…' : status === 'error' ? 'Retry publish' : 'Publish to Chronicle'}
    </button>
  );
}

export default function CorporateEraPanel({ state, onCharterEra }: CorporateEraPanelProps) {
  const gate = canCharterEra(state);
  const progress = getEraProgress(state);
  const completedEras = state.corporateEras?.completedEras || [];

  return (
    <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <p className="font-hud text-white text-xs font-bold mb-1 uppercase tracking-wider">
        <Concept id="era-charter">Corporate Eras</Concept>
      </p>
      <p className="text-[10px] text-slate-500 mb-3">
        Charter a 90-real-day epoch with a declared focus. A bonus and a malus, paired — never a free win. Finished
        eras earn a permanent medal and can be published to your public Chronicle.
      </p>

      {progress.active && progress.charter ? (
        <div className="rounded-lg bg-white/[0.03] p-3 mb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="text-[12px] text-white font-semibold flex items-center gap-1.5">
              <GameIcon name={resolveIcon(progress.charter.icon, 'scroll')} size={12} /> {progress.charter.name}
            </span>
            <HoloTip
              underline={false}
              content={{ title: 'Era Medal', icon: 'medal', body: <Concept id="era-medal" /> }}
            >
              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${MEDAL_COLOR[progress.liveMedal]}`}>
                <GameIcon name={MEDAL_ICON[progress.liveMedal] || 'medal'} size={11} /> Currently {ERA_MEDAL_LABEL[progress.liveMedal]}
              </span>
            </HoloTip>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">{progress.charter.tagline}</p>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <HoloTip
              underline={false}
              content={{ title: 'Era Bonus', icon: 'trending-up', iconGlow: 'green', body: 'The upside half of this era\'s charter — always paired with a stated malus below. See Era Charter for the full trade-off design.' }}
            >
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                {formatFocusTerm(progress.charter.bonus)}
              </span>
            </HoloTip>
            <HoloTip
              underline={false}
              content={{ title: 'Era Malus', icon: 'trending-down', iconGlow: 'red', body: 'The stated cost of this era\'s charter — every chartered bonus is paired with a malus, never a free win.' }}
            >
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-300">
                {formatFocusTerm(progress.charter.malus)}
              </span>
            </HoloTip>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-[9px] text-slate-500 mb-1">
              <span>Era progress</span>
              <span>{Math.max(0, Math.round(progress.daysRemaining))}d remaining</span>
            </div>
            <div
              className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Era time elapsed"
              aria-valuenow={Math.round(progress.pctComplete * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-400 rounded-full transition-all" style={{ width: `${progress.pctComplete * 100}%` }} aria-hidden="true" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[9px] text-slate-500 mb-1">
              <span>{progress.charter.goalLabel}</span>
              <span>{formatCompactNumber(progress.goalActual)} / {formatCompactNumber(progress.goalTarget)}</span>
            </div>
            <div
              className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
              role="progressbar"
              aria-label={`${progress.charter.goalLabel} progress`}
              aria-valuenow={Math.round(Math.min(1, progress.goalScore) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(100, progress.goalScore * 100)}%` }} aria-hidden="true" />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          {!gate.allowed && (
            <p className="text-[10px] text-amber-400/90 mb-2">
              {gate.reason || `Requires Corporation Tier ${ERA_MIN_CORPORATION_TIER}+.`}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ERA_CHARTERS.map((charter) => {
              const disabled = !gate.allowed;
              return (
                <button
                  key={charter.id}
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    playSound('build_start');
                    onCharterEra(charter.id);
                  }}
                  disabled={disabled}
                  className={`text-left min-h-[44px] rounded-lg border p-2.5 transition-colors ${
                    disabled
                      ? 'border-white/[0.04] bg-white/[0.01] opacity-50 cursor-not-allowed'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-cyan-400/30 hover:bg-cyan-500/5'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <GameIcon name={resolveIcon(charter.icon, 'scroll')} size={12} />
                    <span className="text-[11px] font-medium text-white">{charter.name}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mb-1.5">{charter.description}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                      {formatFocusTerm(charter.bonus)}
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-300">
                      {formatFocusTerm(charter.malus)}
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-500">Goal: {charter.goalLabel}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {completedEras.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Era History ({completedEras.length})</p>
          {[...completedEras].reverse().map((era) => {
            const charter = ERA_CHARTERS.find(c => c.id === era.charterId);
            return (
              <div key={era.eraIndex} className="rounded-lg bg-white/[0.03] p-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <span className="text-[10px] text-white font-medium flex items-center gap-1.5">
                    <GameIcon name={resolveIcon(charter?.icon, 'governance')} size={12} /> Era {era.eraIndex + 1}: {charter?.name || era.charterId}
                  </span>
                  <HoloTip
                    underline={false}
                    content={{ title: 'Era Medal', icon: 'medal', body: <Concept id="era-medal" /> }}
                  >
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${MEDAL_COLOR[era.medal]}`}>
                      <GameIcon name={MEDAL_ICON[era.medal] || 'medal'} size={11} /> {ERA_MEDAL_LABEL[era.medal]}
                    </span>
                  </HoloTip>
                </div>
                {charter && (
                  <p className="text-[9px] text-slate-500 mb-1.5">
                    {charter.goalLabel}: {formatCompactNumber(era.goalActual)} / {formatCompactNumber(era.goalTarget)}
                  </p>
                )}
                <PublishEraToChronicle era={era} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
