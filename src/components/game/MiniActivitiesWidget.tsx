'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatCountdown } from '@/lib/game/formulas';
import {
  MINI_ACTIVITIES,
  getAvailableActivities,
  isOnCooldown,
  getRemainingCooldown,
  executeActivity,
  activityRequirementsMet,
  getMissingRequirements,
} from '@/lib/game/mini-activities';
import type { MiniActivity, MiniActivityCategory, MiniActivityReward } from '@/lib/game/mini-activities';

// ─── Types ─────────────────────────────────────────────────────────────────

interface MiniActivitiesWidgetProps {
  state: GameState;
  onExecute: (activityId: string, reward: MiniActivityReward) => void;
}

type FilterCategory = 'all' | MiniActivityCategory;

// ─── Reward popup ──────────────────────────────────────────────────────────

function RewardPopup({ reward, onDone }: { reward: MiniActivityReward; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div
        className="px-4 py-3 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 max-w-[280px] text-center pointer-events-auto"
        style={{ background: 'var(--bg-elevated, #111827)', animation: 'reveal-up 0.3s ease-out' }}
      >
        {reward.money > 0 && (
          <p className="text-cyan-400 font-bold text-sm font-mono mb-1">
            +${(reward.money / 1_000_000 >= 1) ? `${(reward.money / 1_000_000).toFixed(1)}M` : `${(reward.money / 1_000).toFixed(0)}K`}
          </p>
        )}
        <p className="text-slate-300 text-[11px] leading-relaxed">{reward.message}</p>
        {reward.bonus && (
          <p className="text-amber-400 text-[10px] mt-1 font-medium">{reward.bonus.label}</p>
        )}
      </div>
    </div>
  );
}

// ─── Cooldown timer ────────────────────────────────────────────────────────

function CooldownTimer({ activityId, cooldowns }: { activityId: string; cooldowns: Record<string, number> }) {
  const [remaining, setRemaining] = useState(() => getRemainingCooldown(activityId, cooldowns));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getRemainingCooldown(activityId, cooldowns));
    }, 1000);
    return () => clearInterval(timer);
  }, [activityId, cooldowns]);

  if (remaining <= 0) return null;
  return (
    <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-muted, #6b7280)' }}>
      {formatCountdown(remaining)}
    </span>
  );
}

// ─── Category filter tabs ──────────────────────────────────────────────────

const CATEGORY_TABS: { id: FilterCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🎯' },
  { id: 'scanning', label: 'Scan', icon: '📡' },
  { id: 'trading', label: 'Trade', icon: '💹' },
  { id: 'management', label: 'Manage', icon: '⚙️' },
  { id: 'research', label: 'Research', icon: '📄' },
  { id: 'social', label: 'Social', icon: '📢' },
];

// ─── Activity button ───────────────────────────────────────────────────────

function ActivityButton({
  activity,
  state,
  onExecute,
}: {
  activity: MiniActivity;
  state: GameState;
  onExecute: (activityId: string, reward: MiniActivityReward) => void;
}) {
  const [showReward, setShowReward] = useState<MiniActivityReward | null>(null);
  const cooldowns = state.miniActivityCooldowns || {};
  const onCooldown = isOnCooldown(activity.id, cooldowns);
  const reqsMet = activityRequirementsMet(state, activity.id);
  const missingReqs = !reqsMet ? getMissingRequirements(state, activity.requirements) : [];
  const disabled = onCooldown || !reqsMet;

  const handleClick = useCallback(() => {
    if (disabled) return;
    const reward = executeActivity(state, activity.id);
    if (!reward) return;
    setShowReward(reward);
    onExecute(activity.id, reward);
  }, [disabled, state, activity.id, onExecute]);

  return (
    <div className="relative">
      {showReward && (
        <RewardPopup reward={showReward} onDone={() => setShowReward(null)} />
      )}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full text-left p-2.5 rounded-lg border transition-all ${
          disabled
            ? 'border-white/[0.04] opacity-50 cursor-not-allowed'
            : 'border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 active:scale-[0.98] cursor-pointer'
        }`}
        style={{ background: disabled ? 'rgba(255,255,255,0.01)' : 'rgba(34,211,238,0.03)' }}
      >
        <div className="flex items-start gap-2">
          <span className="text-base shrink-0 mt-0.5">
            {!reqsMet ? '🔒' : activity.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold truncate" style={{ color: disabled ? 'var(--text-muted, #6b7280)' : 'var(--text-primary, #e5e7eb)' }}>
                {activity.name}
              </span>
              {onCooldown ? (
                <CooldownTimer activityId={activity.id} cooldowns={cooldowns} />
              ) : !reqsMet ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(255,179,2,0.1)', color: '#FFB302' }}>
                  LOCKED
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>
                  READY
                </span>
              )}
            </div>
            <p className="text-[10px] leading-relaxed mt-0.5 truncate" style={{ color: 'var(--text-muted, #6b7280)' }}>
              {!reqsMet
                ? `Requires: ${missingReqs.join(', ')}`
                : activity.description
              }
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-tertiary, #9ca3af)' }}>
                {activity.minReward}–{activity.maxReward}
              </span>
              <span className="text-[9px]" style={{ color: 'var(--text-muted, #6b7280)' }}>
                {activity.cooldownSeconds < 60
                  ? `${activity.cooldownSeconds}s cd`
                  : activity.cooldownSeconds < 3600
                    ? `${Math.round(activity.cooldownSeconds / 60)}m cd`
                    : `${(activity.cooldownSeconds / 3600).toFixed(1)}h cd`
                }
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ─── Main Widget ───────────────────────────────────────────────────────────

export default function MiniActivitiesWidget({ state, onExecute }: MiniActivitiesWidgetProps) {
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allActivities = MINI_ACTIVITIES;

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return allActivities;
    return allActivities.filter(a => a.category === filter);
  }, [allActivities, filter]);

  // Count ready activities for the badge
  const cooldowns = state.miniActivityCooldowns || {};
  const readyCount = useMemo(() => {
    return allActivities.filter(a =>
      activityRequirementsMet(state, a.id) && !isOnCooldown(a.id, cooldowns)
    ).length;
  }, [allActivities, state, cooldowns]);

  // Re-render cooldown timers every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--bg-surface, #0f172a)', borderColor: 'var(--border-subtle, rgba(255,255,255,0.06))' }}
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
        style={{ borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary, #e5e7eb)' }}>
            Quick Activities
          </span>
          {readyCount > 0 && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}
            >
              {readyCount} ready
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          style={{ color: 'var(--text-muted, #6b7280)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Category filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_TABS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  filter === cat.id
                    ? 'text-white'
                    : 'hover:bg-white/[0.04]'
                }`}
                style={{
                  background: filter === cat.id ? 'rgba(34,211,238,0.15)' : 'transparent',
                  color: filter === cat.id ? '#22d3ee' : 'var(--text-muted, #6b7280)',
                  border: filter === cat.id ? '1px solid rgba(34,211,238,0.2)' : '1px solid transparent',
                }}
              >
                <span className="mr-0.5">{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>

          {/* Activity grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-0.5">
            {filteredActivities.map(activity => (
              <ActivityButton
                key={activity.id}
                activity={activity}
                state={state}
                onExecute={onExecute}
              />
            ))}
          </div>

          {filteredActivities.length === 0 && (
            <p className="text-center text-[11px] py-4" style={{ color: 'var(--text-muted, #6b7280)' }}>
              No activities in this category.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
