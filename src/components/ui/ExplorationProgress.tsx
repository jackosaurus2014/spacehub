'use client';

import { useState, useEffect } from 'react';
import { getExplorationStats, type ExplorationStats } from '@/lib/exploration-tracker';

interface ExplorationProgressProps {
  /** Display variant: 'card' renders inside a dashboard card, 'inline' renders compact */
  variant?: 'card' | 'inline';
}

export default function ExplorationProgress({ variant = 'card' }: ExplorationProgressProps) {
  const [stats, setStats] = useState<ExplorationStats | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStats(getExplorationStats());
  }, []);

  if (!mounted || !stats) {
    return (
      <div className={variant === 'card' ? 'h-24 bg-white/[0.04] rounded animate-pulse' : 'h-6 w-32 bg-white/[0.04] rounded animate-pulse'} />
    );
  }

  const { totalModulesVisited, totalModulesAvailable, percentage } = stats;

  // Color based on progress
  const getProgressColor = () => {
    if (percentage >= 75) return 'from-emerald-500 to-emerald-400';
    if (percentage >= 40) return 'from-white to-slate-400';
    if (percentage >= 15) return 'from-purple-500 to-purple-400';
    return 'from-slate-500 to-slate-400';
  };

  const getProgressGlow = () => {
    if (percentage >= 75) return '0 0 8px rgba(16, 185, 129, 0.4)';
    if (percentage >= 40) return '0 0 8px rgba(255, 255, 255, 0.2)';
    if (percentage >= 15) return '0 0 8px rgba(139, 92, 246, 0.4)';
    return 'none';
  };

  const getMilestoneMessage = () => {
    if (percentage >= 90) return 'Space veteran! Almost every module explored.';
    if (percentage >= 75) return 'Deep explorer! Keep discovering new modules.';
    if (percentage >= 50) return 'Halfway through! Great progress.';
    if (percentage >= 25) return 'Getting started! Many modules await.';
    return 'Begin your exploration journey across SpaceNexus.';
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 rounded-full bg-white/[0.06] border border-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${percentage}%`, boxShadow: getProgressGlow() }}
          />
        </div>
        <span className="text-xs text-slate-400 tabular-nums">{percentage}%</span>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Exploration Progress
        </h2>
        <span className="text-xs font-mono text-slate-400 tabular-nums">
          {totalModulesVisited}/{totalModulesAvailable}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2.5 rounded-full bg-white/[0.06] border border-white/[0.06] overflow-hidden mb-3"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Exploration progress: ${percentage}%`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%`, boxShadow: getProgressGlow() }}
        />
      </div>

      {/* Milestone message */}
      <p className="text-xs text-slate-400">
        {getMilestoneMessage()}
      </p>
    </div>
  );
}
