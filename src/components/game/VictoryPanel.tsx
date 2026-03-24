'use client';

import type { GameState } from '@/lib/game/types';
import { VICTORY_CONDITIONS, getVictoryProgress } from '@/lib/game/victory-conditions';
import type { VictoryDefinition } from '@/lib/game/victory-conditions';

interface VictoryPanelProps {
  state: GameState;
}

function VictoryCard({ victory, state, isEarned }: { victory: VictoryDefinition; state: GameState; isEarned: boolean }) {
  const progress = getVictoryProgress(state, victory.id);
  const percent = progress ? Math.round(progress.percent * 100) : 0;

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
        {isEarned && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            ACHIEVED
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-slate-400 text-xs mb-3">{victory.description}</p>

      {/* Progress bar */}
      {!isEarned && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">Progress</span>
            <span className={`text-[10px] font-mono ${percent >= 100 ? 'text-green-400' : 'text-cyan-400'}`}>
              {percent}%
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percent >= 100 ? 'bg-green-500' : percent >= 50 ? 'bg-cyan-500' : 'bg-cyan-700'
              }`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Detail breakdown */}
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

export default function VictoryPanel({ state }: VictoryPanelProps) {
  const earnedVictories = state.earnedVictories || [];
  const earnedCount = earnedVictories.length;

  // Sort: earned first, then by progress
  const sortedVictories = [...VICTORY_CONDITIONS].sort((a, b) => {
    const aEarned = earnedVictories.includes(a.id);
    const bEarned = earnedVictories.includes(b.id);
    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;
    // Sort unearned by progress (highest first)
    if (!aEarned && !bEarned) {
      const aProgress = getVictoryProgress(state, a.id);
      const bProgress = getVictoryProgress(state, b.id);
      return (bProgress?.percent || 0) - (aProgress?.percent || 0);
    }
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
          <p className="text-yellow-300 text-lg font-bold">{earnedCount}</p>
          <p className="text-slate-500 text-xs">Victories Earned</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="text-white text-lg font-bold">{VICTORY_CONDITIONS.length}</p>
          <p className="text-slate-500 text-xs">Total Victories</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center col-span-2 md:col-span-1">
          <p className="text-cyan-400 text-lg font-bold">
            {earnedCount > 0 ? `${Math.round((earnedCount / VICTORY_CONDITIONS.length) * 100)}%` : '0%'}
          </p>
          <p className="text-slate-500 text-xs">Completion</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-slate-400 text-xs">
          Victories are permanent milestones that grant lasting bonuses. They do not end the game.
          Achieving multiple victories compounds their rewards.
        </p>
      </div>

      {/* Victory Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sortedVictories.map((victory) => (
          <VictoryCard
            key={victory.id}
            victory={victory}
            state={state}
            isEarned={earnedVictories.includes(victory.id)}
          />
        ))}
      </div>
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
