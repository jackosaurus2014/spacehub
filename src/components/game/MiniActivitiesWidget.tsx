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
} from '@/lib/game/mini-activities';
import type { MiniActivityReward } from '@/lib/game/mini-activities';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_VISIBLE_SLOTS = 4;
const SPAWN_INTERVAL_MS = 5 * 60 * 1000; // 1 new activity every 5 minutes

// ─── Types ──────────────────────────────────────────────────────────────────

interface MiniActivitiesWidgetProps {
  state: GameState;
  onExecute: (activityId: string, reward: MiniActivityReward) => void;
}

// ─── Reward popup ───────────────────────────────────────────────────────────

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

// ─── Slot management ────────────────────────────────────────────────────────

/**
 * Pick a random activity that's not already in slots and meets requirements.
 */
function pickNewActivity(state: GameState, currentSlots: string[]): string | null {
  const available = getAvailableActivities(state);
  const candidates = available.filter(a => !currentSlots.includes(a.id));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

/**
 * Update activity slots: spawn new ones if enough time has passed, max 4.
 * Returns updated slots and lastSpawnMs.
 */
function updateSlots(
  state: GameState,
): { slots: string[]; lastSpawnMs: number; changed: boolean } {
  const now = Date.now();
  const currentSlots = [...(state.miniActivitySlots || [])];
  const lastSpawn = state.miniActivityLastSpawnMs || 0;
  let changed = false;

  // Remove completed activities (on cooldown = just completed)
  const cooldowns = state.miniActivityCooldowns || {};
  const activeSlots = currentSlots.filter(id => {
    const onCd = isOnCooldown(id, cooldowns);
    // Keep it if not on cooldown (ready to do) or if cooldown just started (< 30s ago, show briefly)
    if (onCd) {
      const remaining = getRemainingCooldown(id, cooldowns);
      const activity = MINI_ACTIVITIES.find(a => a.id === id);
      const totalCd = activity ? activity.cooldownSeconds : 300;
      // If more than 30s into cooldown, remove from slots
      if (totalCd - remaining > 30) {
        changed = true;
        return false;
      }
    }
    return true;
  });

  let newLastSpawn = lastSpawn;

  // If returning from offline (gap > 2x spawn interval), reset the timer
  // so we don't instantly fill all slots from accumulated offline time
  if (lastSpawn > 0 && (now - lastSpawn) > SPAWN_INTERVAL_MS * 2) {
    newLastSpawn = now;
    changed = true;
  }

  // Spawn 1 new activity if: under max slots AND enough ACTIVE play time since last spawn
  if (activeSlots.length < MAX_VISIBLE_SLOTS && (now - newLastSpawn) >= SPAWN_INTERVAL_MS) {
    const newId = pickNewActivity(state, activeSlots);
    if (newId) {
      activeSlots.push(newId);
      newLastSpawn = now;
      changed = true;
    }
  }

  // First load: seed 1 activity immediately if empty
  if (activeSlots.length === 0) {
    const newId = pickNewActivity(state, activeSlots);
    if (newId) {
      activeSlots.push(newId);
      newLastSpawn = now;
      changed = true;
    }
  }

  return { slots: activeSlots, lastSpawnMs: newLastSpawn, changed };
}

// ─── Main Widget ────────────────────────────────────────────────────────────

export default function MiniActivitiesWidget({ state, onExecute }: MiniActivitiesWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Manage slot rotation via dispatching state updates
  useEffect(() => {
    const check = () => {
      const { slots, lastSpawnMs, changed } = updateSlots(state);
      if (changed) {
        // Dispatch a custom event to update game state
        window.dispatchEvent(new CustomEvent('mini-activity-slots-update', {
          detail: { slots, lastSpawnMs },
        }));
      }
    };
    check();
    const interval = setInterval(check, 10_000); // Check every 10s
    return () => clearInterval(interval);
  }, [state.miniActivitySlots?.join(','), state.miniActivityCooldowns, state.miniActivityLastSpawnMs]);

  const visibleSlots = state.miniActivitySlots || [];
  const visibleActivities = visibleSlots
    .map(id => MINI_ACTIVITIES.find(a => a.id === id))
    .filter(Boolean) as typeof MINI_ACTIVITIES;

  const cooldowns = state.miniActivityCooldowns || {};
  const readyCount = visibleActivities.filter(a =>
    activityRequirementsMet(state, a.id) && !isOnCooldown(a.id, cooldowns)
  ).length;

  // Next spawn countdown
  const lastSpawn = state.miniActivityLastSpawnMs || 0;
  const nextSpawnIn = Math.max(0, SPAWN_INTERVAL_MS - (Date.now() - lastSpawn));

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
        <div className="p-3 space-y-2">
          {/* Status line */}
          <div className="flex items-center justify-between text-[9px] px-1">
            <span style={{ color: 'var(--text-muted, #6b7280)' }}>
              {visibleActivities.length}/{MAX_VISIBLE_SLOTS} slots
            </span>
            {visibleActivities.length < MAX_VISIBLE_SLOTS && (
              <span style={{ color: 'var(--text-muted, #6b7280)' }}>
                Next in {formatCountdown(Math.ceil(nextSpawnIn / 1000))}
              </span>
            )}
          </div>

          {/* Activity cards */}
          {visibleActivities.length === 0 ? (
            <p className="text-center text-[11px] py-6" style={{ color: 'var(--text-muted, #6b7280)' }}>
              No activities available yet. First one arrives shortly...
            </p>
          ) : (
            <div className="space-y-2">
              {visibleActivities.map(activity => {
                const onCooldown = isOnCooldown(activity.id, cooldowns);
                const remaining = getRemainingCooldown(activity.id, cooldowns);
                return (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    state={state}
                    onCooldown={onCooldown}
                    cooldownRemaining={remaining}
                    onExecute={onExecute}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity Card ──────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  state,
  onCooldown,
  cooldownRemaining,
  onExecute,
}: {
  activity: typeof MINI_ACTIVITIES[0];
  state: GameState;
  onCooldown: boolean;
  cooldownRemaining: number;
  onExecute: (activityId: string, reward: MiniActivityReward) => void;
}) {
  const [showReward, setShowReward] = useState<MiniActivityReward | null>(null);

  const handleClick = useCallback(() => {
    if (onCooldown) return;
    const reward = executeActivity(state, activity.id);
    if (!reward) return;
    setShowReward(reward);
    onExecute(activity.id, reward);
  }, [onCooldown, state, activity.id, onExecute]);

  return (
    <div className="relative">
      {showReward && (
        <RewardPopup reward={showReward} onDone={() => setShowReward(null)} />
      )}
      <button
        onClick={handleClick}
        disabled={onCooldown}
        className={`w-full text-left p-3 rounded-lg border transition-all ${
          onCooldown
            ? 'border-white/[0.04] opacity-40 cursor-not-allowed'
            : 'border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 active:scale-[0.98] cursor-pointer'
        }`}
        style={{ background: onCooldown ? 'rgba(255,255,255,0.01)' : 'rgba(34,211,238,0.03)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg shrink-0">{activity.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold truncate" style={{ color: onCooldown ? 'var(--text-muted)' : 'var(--text-primary, #e5e7eb)' }}>
                {activity.name}
              </span>
              {onCooldown ? (
                <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: 'var(--text-muted, #6b7280)' }}>
                  {formatCountdown(cooldownRemaining)}
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>
                  READY
                </span>
              )}
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted, #6b7280)' }}>
              {activity.description}
            </p>
            <span className="text-[9px] font-mono mt-0.5 inline-block" style={{ color: 'var(--text-tertiary, #9ca3af)' }}>
              {activity.minReward}–{activity.maxReward}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
