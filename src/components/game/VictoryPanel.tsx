'use client';

import { useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { VICTORY_CONDITIONS, getVictoryProgress, getVictoryBonuses } from '@/lib/game/victory-conditions';
import type { VictoryDefinition, VictoryProgress } from '@/lib/game/victory-conditions';

interface VictoryPanelProps {
  state: GameState;
}

// ─── Estimation Helper ──────────────────────────────────────────────────────

/**
 * Estimate time remaining based on current progress rate.
 * Uses the game's income per tick as a rough proxy for how fast
 * money-based sub-goals are progressing, and treats non-monetary
 * sub-goals as gated milestones. Returns a human-readable string.
 */
function estimateTimeToCompletion(progress: VictoryProgress): string | null {
  if (progress.percent >= 1) return null;
  if (progress.percent <= 0) return 'Not started';

  // Count how many sub-goals are incomplete
  const incomplete = progress.details.filter(d => d.current < d.target);
  if (incomplete.length === 0) return 'Almost there';

  // Use the lowest individual completion % as bottleneck
  let lowestPct = 1;
  for (const d of incomplete) {
    const pct = d.target > 0 ? d.current / d.target : 0;
    if (pct < lowestPct) lowestPct = pct;
  }

  if (lowestPct <= 0.05) return 'Long way to go';
  if (lowestPct <= 0.25) return 'Early progress';
  if (lowestPct <= 0.50) return 'Halfway there';
  if (lowestPct <= 0.75) return 'Good progress';
  if (lowestPct <= 0.90) return 'Nearly complete';
  return 'Final stretch';
}

// ─── Victory Card ───────────────────────────────────────────────────────────

function VictoryCard({ victory, state, isEarned }: { victory: VictoryDefinition; state: GameState; isEarned: boolean }) {
  const progress = getVictoryProgress(state, victory.id);
  const percent = progress ? Math.round(progress.percent * 100) : 0;
  const estimate = progress && !isEarned ? estimateTimeToCompletion(progress) : null;

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isEarned
        ? 'border-yellow-500/40 bg-yellow-500/10'
        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{victory.icon}</span>
          <div>
            <h3 className={`text-sm font-bold ${isEarned ? 'text-yellow-300' : 'text-white'}`}>
              {victory.name}
            </h3>
            <p className="text-[10px] text-slate-500">Title: &quot;{victory.title}&quot;</p>
          </div>
        </div>
        {isEarned ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            ACHIEVED
          </span>
        ) : estimate ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] text-slate-400 border border-white/[0.08]">
            {estimate}
          </span>
        ) : null}
      </div>

      {/* Description */}
      <p className="text-slate-400 text-xs mb-3">{victory.description}</p>

      {/* Progress bar — shown for ALL cards, earned ones show full green */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500">Progress</span>
          <span className={`text-[10px] font-mono ${isEarned ? 'text-yellow-400' : percent >= 100 ? 'text-green-400' : 'text-cyan-400'}`}>
            {isEarned ? '100%' : `${percent}%`}
          </span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isEarned ? 'bg-yellow-500' : percent >= 100 ? 'bg-green-500' : percent >= 50 ? 'bg-cyan-500' : 'bg-cyan-700'
            }`}
            style={{ width: `${isEarned ? 100 : Math.min(100, percent)}%` }}
          />
        </div>
      </div>

      {/* Detail breakdown — shown for in-progress cards */}
      {progress && !isEarned && (
        <div className="space-y-1 mt-2">
          {progress.details.map((detail) => {
            const detailPercent = detail.target > 0 ? Math.min(100, Math.round((detail.current / detail.target) * 100)) : 0;
            const isDone = detail.current >= detail.target;
            return (
              <div key={detail.label} className="flex items-center gap-2">
                <span className={`text-[10px] w-3 ${isDone ? 'text-green-400' : 'text-slate-600'}`}>
                  {isDone ? '\u2713' : '\u2022'}
                </span>
                <span className="text-[10px] text-slate-400 flex-1">{detail.label}</span>
                <span className={`text-[10px] font-mono ${isDone ? 'text-green-400' : 'text-slate-500'}`}>
                  {formatNumber(detail.current)}/{formatNumber(detail.target)}
                </span>
                <span className={`text-[9px] font-mono w-8 text-right ${isDone ? 'text-green-400' : 'text-slate-600'}`}>
                  {detailPercent}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Earned card: show completion summary */}
      {isEarned && progress && (
        <div className="space-y-1 mt-2">
          {progress.details.map((detail) => (
            <div key={detail.label} className="flex items-center gap-2">
              <span className="text-[10px] w-3 text-yellow-400">{'\u2713'}</span>
              <span className="text-[10px] text-yellow-300/70 flex-1">{detail.label}</span>
              <span className="text-[10px] font-mono text-yellow-400">
                {formatNumber(detail.target)}/{formatNumber(detail.target)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Reward display */}
      <div className="mt-3 pt-2 border-t border-white/[0.04]">
        <p className="text-[10px] text-slate-500 mb-1">Permanent Reward:</p>
        <div className="flex flex-wrap gap-1.5">
          {victory.reward.revenueMultiplier > 1 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              +{Math.round((victory.reward.revenueMultiplier - 1) * 100)}% Revenue
            </span>
          )}
          {victory.reward.buildSpeedMultiplier > 1 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              +{Math.round((victory.reward.buildSpeedMultiplier - 1) * 100)}% Build Speed
            </span>
          )}
          {victory.reward.researchSpeedMultiplier > 1 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              +{Math.round((victory.reward.researchSpeedMultiplier - 1) * 100)}% Research Speed
            </span>
          )}
          {victory.reward.miningMultiplier > 1 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              +{Math.round((victory.reward.miningMultiplier - 1) * 100)}% Mining
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hall of Fame Section ───────────────────────────────────────────────────

function HallOfFame({ earnedVictoryIds }: { earnedVictoryIds: string[] }) {
  if (earnedVictoryIds.length === 0) return null;

  const earned = VICTORY_CONDITIONS.filter(v => earnedVictoryIds.includes(v.id));
  const bonuses = getVictoryBonuses(earnedVictoryIds);

  return (
    <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-b from-yellow-500/[0.06] to-transparent p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{'🏆'}</span>
        <h3 className="text-sm font-bold text-yellow-300">Hall of Fame</h3>
        <span className="text-[10px] text-yellow-300/50 ml-auto">
          {earned.length} / {VICTORY_CONDITIONS.length} victories
        </span>
      </div>

      {/* Earned titles row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {earned.map(v => (
          <div
            key={v.id}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
          >
            <span className="text-base">{v.icon}</span>
            <div>
              <p className="text-[10px] font-bold text-yellow-300">{v.name}</p>
              <p className="text-[9px] text-yellow-300/50">&quot;{v.title}&quot;</p>
            </div>
          </div>
        ))}
      </div>

      {/* Compound bonuses summary */}
      <div className="pt-2 border-t border-yellow-500/10">
        <p className="text-[10px] text-slate-500 mb-1.5">Combined Victory Bonuses:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {bonuses.revenueMultiplier > 1 && (
            <div className="text-center px-2 py-1.5 rounded bg-green-500/[0.06] border border-green-500/10">
              <p className="text-xs font-bold text-green-400">+{Math.round((bonuses.revenueMultiplier - 1) * 100)}%</p>
              <p className="text-[9px] text-slate-500">Revenue</p>
            </div>
          )}
          {bonuses.buildSpeedMultiplier > 1 && (
            <div className="text-center px-2 py-1.5 rounded bg-cyan-500/[0.06] border border-cyan-500/10">
              <p className="text-xs font-bold text-cyan-400">+{Math.round((bonuses.buildSpeedMultiplier - 1) * 100)}%</p>
              <p className="text-[9px] text-slate-500">Build Speed</p>
            </div>
          )}
          {bonuses.researchSpeedMultiplier > 1 && (
            <div className="text-center px-2 py-1.5 rounded bg-purple-500/[0.06] border border-purple-500/10">
              <p className="text-xs font-bold text-purple-400">+{Math.round((bonuses.researchSpeedMultiplier - 1) * 100)}%</p>
              <p className="text-[9px] text-slate-500">Research</p>
            </div>
          )}
          {bonuses.miningMultiplier > 1 && (
            <div className="text-center px-2 py-1.5 rounded bg-amber-500/[0.06] border border-amber-500/10">
              <p className="text-xs font-bold text-amber-400">+{Math.round((bonuses.miningMultiplier - 1) * 100)}%</p>
              <p className="text-[9px] text-slate-500">Mining</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export default function VictoryPanel({ state }: VictoryPanelProps) {
  const earnedVictories = state.earnedVictories || [];
  const earnedCount = earnedVictories.length;

  // Separate earned and in-progress, sort in-progress by progress descending
  const { earnedList, inProgressList } = useMemo(() => {
    const earned: VictoryDefinition[] = [];
    const inProgress: { victory: VictoryDefinition; percent: number }[] = [];

    for (const v of VICTORY_CONDITIONS) {
      if (earnedVictories.includes(v.id)) {
        earned.push(v);
      } else {
        const prog = getVictoryProgress(state, v.id);
        inProgress.push({ victory: v, percent: prog?.percent || 0 });
      }
    }

    // Sort in-progress: highest progress first
    inProgress.sort((a, b) => b.percent - a.percent);

    return { earnedList: earned, inProgressList: inProgress.map(p => p.victory) };
  }, [state, earnedVictories]);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
          <p className="text-yellow-300 text-lg font-bold">{earnedCount}</p>
          <p className="text-slate-500 text-xs">Victories Earned</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="text-white text-lg font-bold">{VICTORY_CONDITIONS.length}</p>
          <p className="text-slate-500 text-xs">Total Victories</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="text-cyan-400 text-lg font-bold">
            {earnedCount > 0 ? `${Math.round((earnedCount / VICTORY_CONDITIONS.length) * 100)}%` : '0%'}
          </p>
          <p className="text-slate-500 text-xs">Completion</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="text-purple-400 text-lg font-bold">
            {inProgressList.length > 0
              ? (() => {
                  const next = inProgressList[0];
                  const prog = getVictoryProgress(state, next.id);
                  return prog ? `${Math.round(prog.percent * 100)}%` : '0%';
                })()
              : '--'}
          </p>
          <p className="text-slate-500 text-xs">Next Victory</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-slate-400 text-xs">
          Victories are permanent milestones that grant lasting bonuses. They do not end the game.
          Achieving multiple victories compounds their rewards. Endgame victories require completing
          megastructures -- massive multi-phase construction projects.
        </p>
      </div>

      {/* Hall of Fame (only if any victories earned) */}
      <HallOfFame earnedVictoryIds={earnedVictories} />

      {/* In-Progress Section */}
      {inProgressList.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            In Progress ({inProgressList.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {inProgressList.map((victory) => (
              <VictoryCard
                key={victory.id}
                victory={victory}
                state={state}
                isEarned={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Section (detailed cards for earned victories) */}
      {earnedList.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-yellow-300/60 uppercase tracking-wider mb-2">
            Completed ({earnedList.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {earnedList.map((victory) => (
              <VictoryCard
                key={victory.id}
                victory={victory}
                state={state}
                isEarned={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
