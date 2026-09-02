'use client';

import { useState, useEffect } from 'react';
import { canClaimBonus, claimDailyBonus, getCurrentStreak, getBonusSchedule } from '@/lib/game/daily-bonus';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { useModalA11y } from './useModalA11y';

/** What the probe learned. `null` from useDailyBonusProbe means "still
 *  resolving" (or disabled) — the shell treats that as "does not want the
 *  overlay slot", so lower-priority surfaces are never blocked by a fetch. */
export interface DailyBonusProbe {
  claimable: boolean;
  streak: number;
  schedule: { day: number; amount: number }[];
  tier: number;
  /** Whether claims go through the server-authoritative route. */
  useServer: boolean;
}

/**
 * Detection half (overlay-manager split, 2026-09). Runs the same 1.5s-delayed
 * probe the modal used to run on mount, but in the SHELL, so the modal itself
 * can be mounted only while it holds the arbitrated overlay slot.
 *
 * Wave-A leftover wiring (audit hotlist #2): signed-in players claim through
 * POST /api/space-tycoon/daily-bonus, the authoritative server tracker (one
 * claim per UTC day, tracked on GameProfile) — the old localStorage-only flow
 * was trivially resettable into a perpetual $200M/week faucet. localStorage
 * remains the ONLY path for anonymous players (no GameProfile to track a
 * server-side claim against), so the game still works without an account.
 */
export function useDailyBonusProbe(enabled: boolean, corporationTier: number = 1): DailyBonusProbe | null {
  const [probe, setProbe] = useState<DailyBonusProbe | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // Check if bonus available after a short delay (let game load first)
    const timer = setTimeout(async () => {
      let useServer = false;
      try {
        const res = await fetch('/api/space-tycoon/daily-bonus');
        if (res.status === 401) {
          // Anonymous — no GameProfile to track against. Fall back to the
          // localStorage-only flow entirely.
          useServer = false;
        } else if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          const schedule = Array.isArray(data.schedule) && data.schedule.length === 7
            ? data.schedule
            : getBonusSchedule(typeof data.tier === 'number' ? data.tier : corporationTier);
          setProbe({
            claimable: !!data.claimable,
            streak: data.streak || 0,
            schedule,
            tier: typeof data.tier === 'number' ? data.tier : corporationTier,
            useServer: true,
          });
          return;
        } else {
          // Server hiccup — degrade to localStorage rather than block the
          // reward entirely.
          useServer = false;
        }
      } catch {
        useServer = false;
      }
      if (cancelled) return;
      // localStorage fallback path (anonymous or server unavailable)
      setProbe({
        claimable: canClaimBonus(),
        streak: getCurrentStreak(),
        schedule: getBonusSchedule(corporationTier),
        tier: corporationTier,
        useServer,
      });
    }, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
    // corporationTier only seeds the anonymous schedule; re-probing on every
    // tier change would re-open a modal the player already dismissed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return probe;
}

interface DailyBonusModalProps {
  /** Result of useDailyBonusProbe — the modal is only mounted when it says
   *  the bonus is claimable. */
  probe: DailyBonusProbe;
  onClaim: (amount: number) => void;
  /** Dismissed or auto-closed after a claim. The shell drops the overlay. */
  onClose: () => void;
  /** Local save's corporation tier — used ONLY by the anonymous
   *  localStorage flow. Signed-in claims are priced by the server from the
   *  persisted profile (row 9); the schedule shown then comes from the probe. */
  corporationTier?: number;
}

/**
 * Daily login bonus modal for Space Tycoon.
 * Shows when a player opens the game and has an unclaimed bonus (the probe
 * decides; the OverlayManager mounts it when nothing higher-priority is up).
 * Displays 7-day reward schedule with escalating amounts.
 */
export default function DailyBonusModal({ probe, onClaim, onClose, corporationTier = 1 }: DailyBonusModalProps) {
  const [claimed, setClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [streak, setStreak] = useState(probe.streak);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schedule = probe.schedule;
  const tier = probe.tier;

  const handleClaim = async () => {
    if (claiming) return;
    setError(null);

    if (probe.useServer) {
      setClaiming(true);
      try {
        const res = await fetch('/api/space-tycoon/daily-bonus', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.amount > 0) {
            playSound('milestone');
            setClaimedAmount(data.amount);
            setStreak(data.newStreak);
            setClaimed(true);
            onClaim(data.amount);
            setTimeout(onClose, 3000);
          }
        } else if (res.status === 409) {
          // Already claimed today (e.g. another tab/device beat this one) —
          // reconcile honestly instead of granting a duplicate reward.
          setError('Already claimed today from another session.');
          setTimeout(onClose, 2000);
        } else {
          setError('Could not reach the server. Try again shortly.');
        }
      } catch {
        setError('Network error — could not claim right now.');
      } finally {
        setClaiming(false);
      }
      return;
    }

    // Anonymous fallback — localStorage only.
    const { amount, newStreak } = claimDailyBonus(corporationTier);
    if (amount > 0) {
      playSound('milestone');
      setClaimedAmount(amount);
      setStreak(newStreak);
      setClaimed(true);
      onClaim(amount);

      // Auto-close after showing reward
      setTimeout(onClose, 3000);
    }
  };

  const modalRef = useModalA11y<HTMLDivElement>(onClose);

  const currentDay = (streak % 7) + 1;

  return (
    <div ref={modalRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="daily-bonus-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm game-modal-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden game-modal-card" style={{ background: 'linear-gradient(180deg, #0f0f2e 0%, #0a0a1a 100%)' }}>
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" />

        <div className="p-6">
          {!claimed ? (
            <>
              {/* Header */}
              <div className="text-center mb-5">
                <span className="text-3xl block mb-2" aria-hidden="true">🎁</span>
                <h3 id="daily-bonus-title" className="text-xl font-bold text-white">Daily Bonus</h3>
                <p className="text-slate-400 text-sm mt-1">
                  {streak > 0 ? `${streak}-day streak!` : 'Welcome back!'} Claim your reward.
                </p>
                <p className="text-slate-600 text-[10px] mt-1">
                  Tier {tier} schedule — the bonus scales with your corporation tier.
                </p>
              </div>

              {/* 7-day schedule */}
              <div className="grid grid-cols-7 gap-1.5 mb-5">
                {schedule.map((day) => {
                  const isToday = day.day === currentDay;
                  const isPast = day.day < currentDay;
                  return (
                    <div
                      key={day.day}
                      className={`relative p-2 rounded-lg text-center transition-all ${
                        isToday
                          ? 'bg-gradient-to-b from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 ring-1 ring-cyan-500/20'
                          : isPast
                            ? 'bg-green-500/10 border border-green-500/20'
                            : 'bg-white/[0.03] border border-white/[0.06]'
                      }`}
                    >
                      <p className={`text-[10px] font-medium ${isToday ? 'text-cyan-400' : isPast ? 'text-green-400' : 'text-slate-500'}`}>
                        Day {day.day}
                      </p>
                      <p className={`text-[10px] font-bold mt-0.5 ${isToday ? 'text-white' : isPast ? 'text-green-400/70' : 'text-slate-400'}`}>
                        {formatMoney(day.amount)}
                      </p>
                      <span className="sr-only">{isPast ? ' (claimed)' : isToday ? ' (today)' : ''}</span>
                      {isPast && (
                        <span className="absolute -top-1 -right-1 text-[10px]" aria-hidden="true">✅</span>
                      )}
                      {isToday && (
                        <span className="absolute -top-1 -right-1 text-[10px] animate-pulse motion-reduce:animate-none" aria-hidden="true">⭐</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Claim button */}
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
              >
                {claiming ? 'Claiming…' : `Claim ${formatMoney(schedule[(currentDay - 1) % 7].amount)}`}
              </button>

              {error && (
                <p role="alert" className="text-red-400 text-[10px] text-center mt-2">{error}</p>
              )}

              <p className="text-slate-600 text-[10px] text-center mt-2">
                Come back tomorrow for Day {currentDay < 7 ? currentDay + 1 : 1} reward!
              </p>
            </>
          ) : (
            /* Claimed state */
            <div className="text-center py-4" role="status" aria-live="polite">
              <span className="text-5xl block mb-3" aria-hidden="true">💰</span>
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 mb-1">
                +{formatMoney(claimedAmount)}
              </h3>
              <p className="text-slate-400 text-sm">
                Day {streak} bonus claimed!
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {streak >= 7 ? 'Max streak! Jackpot day!' : `${7 - (streak % 7)} days until jackpot`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
