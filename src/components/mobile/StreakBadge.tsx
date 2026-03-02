'use client';

import { useEffect, useState } from 'react';
import { recordVisit, getStreak, getMilestone, type StreakData, type MilestoneInfo } from '@/lib/streak';
import { toast } from '@/lib/toast';

interface StreakBadgeProps {
  variant?: 'compact' | 'full';
  className?: string;
}

const TIER_GRADIENTS: Record<string, string> = {
  bronze: 'from-amber-700 via-amber-500 to-amber-700',
  silver: 'from-slate-400 via-slate-200 to-slate-400',
  gold: 'from-yellow-500 via-yellow-300 to-yellow-500',
  platinum: 'from-cyan-400 via-cyan-200 to-cyan-400',
  diamond: 'from-blue-400 via-purple-300 to-blue-400',
  master: 'from-purple-500 via-pink-400 to-purple-500',
  legend: 'from-emerald-400 via-teal-300 to-emerald-400',
};

const DEFAULT_GRADIENT = 'from-slate-600 via-slate-500 to-slate-600';

export default function StreakBadge({ variant = 'compact', className = '' }: StreakBadgeProps) {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [milestone, setMilestone] = useState<MilestoneInfo | null>(null);

  useEffect(() => {
    // Capture streak state BEFORE recording the visit
    const before = getStreak();
    const milestoneBefore = getMilestone(before.currentStreak);

    // Record the visit (may increment streak)
    const after = recordVisit();
    const milestoneAfter = getMilestone(after.currentStreak);

    setStreakData(after);
    setMilestone(milestoneAfter);

    // Check if a NEW milestone was reached
    if (
      milestoneAfter &&
      (!milestoneBefore || milestoneAfter.threshold > milestoneBefore.threshold)
    ) {
      toast.success(
        `${milestoneAfter.emoji} ${milestoneAfter.label} -- ${after.currentStreak} day streak!`,
        'Milestone Reached!',
        6000
      );
    }
  }, []);

  // Nothing to render until data loads
  if (!streakData) return null;

  if (variant === 'compact') {
    return <CompactBadge streak={streakData.currentStreak} className={className} />;
  }

  return (
    <FullBadge
      streakData={streakData}
      milestone={milestone}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// Compact variant: pill "🔥 7" for nav/header
// ---------------------------------------------------------------------------

function CompactBadge({ streak, className }: { streak: number; className: string }) {
  // Don't show anything for streaks below 2
  if (streak < 2) return null;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full
        bg-slate-800/50 px-2.5 py-0.5
        text-sm font-semibold text-cyan-400
        backdrop-blur-sm border border-cyan-400/20
        ${className}
      `}
      aria-label={`${streak} day visit streak`}
    >
      <span className="streak-flame" aria-hidden="true">
        {'\u{1F525}'}
      </span>
      <span>{streak}</span>

      <style jsx>{`
        .streak-flame {
          display: inline-block;
          animation: flameFlicker 1.5s ease-in-out infinite;
        }

        @keyframes flameFlicker {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
          25% {
            transform: scale(1.1) rotate(-3deg);
            filter: brightness(1.2);
          }
          50% {
            transform: scale(0.95) rotate(2deg);
            filter: brightness(0.9);
          }
          75% {
            transform: scale(1.08) rotate(-1deg);
            filter: brightness(1.15);
          }
        }
      `}</style>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Full variant: card with streak details, milestone, and gradient border
// ---------------------------------------------------------------------------

function FullBadge({
  streakData,
  milestone,
  className,
}: {
  streakData: StreakData;
  milestone: MilestoneInfo | null;
  className: string;
}) {
  const gradient = milestone
    ? TIER_GRADIENTS[milestone.tier] || DEFAULT_GRADIENT
    : DEFAULT_GRADIENT;

  return (
    <div className={`relative rounded-xl p-[1px] ${className}`}>
      {/* Gradient border */}
      <div
        className={`absolute inset-0 rounded-xl bg-gradient-to-r ${gradient} opacity-60`}
        aria-hidden="true"
      />

      {/* Card body */}
      <div className="relative rounded-xl bg-slate-900/95 backdrop-blur-sm p-4">
        {/* Header row: flame + streak number */}
        <div className="flex items-center gap-3 mb-3">
          <span className="streak-flame-full text-3xl" aria-hidden="true">
            {'\u{1F525}'}
          </span>
          <div>
            <div className="text-2xl font-bold text-cyan-400">
              {streakData.currentStreak}
              <span className="text-sm font-normal text-slate-400 ml-1">
                {streakData.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="text-xs text-slate-500">Current streak</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg bg-slate-800/60 px-3 py-2">
            <div className="text-xs text-slate-500">Longest streak</div>
            <div className="text-sm font-semibold text-slate-200">
              {streakData.longestStreak} {streakData.longestStreak === 1 ? 'day' : 'days'}
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/60 px-3 py-2">
            <div className="text-xs text-slate-500">Total visits</div>
            <div className="text-sm font-semibold text-slate-200">
              {streakData.totalVisits}
            </div>
          </div>
        </div>

        {/* Milestone badge */}
        {milestone && (
          <div
            className={`
              flex items-center gap-2 rounded-lg
              bg-gradient-to-r ${gradient} bg-opacity-10
              px-3 py-2
            `}
          >
            <span className="text-lg">{milestone.emoji}</span>
            <div>
              <div className="text-sm font-semibold text-white">
                {milestone.label}
              </div>
              <div className="text-xs text-slate-300">
                {milestone.threshold}-day milestone
              </div>
            </div>
          </div>
        )}

        {/* No milestone yet */}
        {!milestone && streakData.currentStreak > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2">
            <span className="text-lg">{'\u{1F331}'}</span>
            <div className="text-xs text-slate-400">
              {3 - streakData.currentStreak > 0
                ? `${3 - streakData.currentStreak} more ${3 - streakData.currentStreak === 1 ? 'day' : 'days'} until your first milestone!`
                : 'Keep visiting daily!'}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .streak-flame-full {
          display: inline-block;
          animation: flameFlickerFull 1.5s ease-in-out infinite;
        }

        @keyframes flameFlickerFull {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1) drop-shadow(0 0 4px rgba(251, 146, 60, 0.4));
          }
          25% {
            transform: scale(1.12) rotate(-4deg);
            filter: brightness(1.25) drop-shadow(0 0 8px rgba(251, 146, 60, 0.6));
          }
          50% {
            transform: scale(0.93) rotate(3deg);
            filter: brightness(0.85) drop-shadow(0 0 3px rgba(251, 146, 60, 0.3));
          }
          75% {
            transform: scale(1.1) rotate(-2deg);
            filter: brightness(1.2) drop-shadow(0 0 6px rgba(251, 146, 60, 0.5));
          }
        }
      `}</style>
    </div>
  );
}
