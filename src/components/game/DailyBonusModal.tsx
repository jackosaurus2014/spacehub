'use client';

import { useState, useEffect, useRef } from 'react';
import { canClaimBonus, claimDailyBonus, getCurrentStreak, getBonusSchedule } from '@/lib/game/daily-bonus';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { useModalA11y } from './useModalA11y';

interface DailyBonusModalProps {
  onClaim: (amount: number) => void;
}

/**
 * Daily login bonus modal for Space Tycoon.
 * Shows automatically when a player opens the game and has an unclaimed bonus.
 * Displays 7-day reward schedule with escalating amounts.
 *
 * Wave-A leftover wiring (audit hotlist #2): signed-in players now claim
 * through POST /api/space-tycoon/daily-bonus, the authoritative server
 * tracker (one claim per UTC day, tracked on GameProfile) — the old
 * localStorage-only flow was trivially resettable into a perpetual
 * $200M/week faucet. localStorage remains the ONLY path for anonymous
 * players (no GameProfile to track a server-side claim against), so the
 * game still works without an account.
 */
export default function DailyBonusModal({ onClaim }: DailyBonusModalProps) {
  const [visible, setVisible] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether this session should use the server-authoritative flow. Resolved
  // once on mount from the GET probe below; null while unresolved.
  const useServerRef = useRef<boolean | null>(null);

  const schedule = getBonusSchedule();

  useEffect(() => {
    // Check if bonus available after a short delay (let game load first)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/space-tycoon/daily-bonus');
        if (res.status === 401) {
          // Anonymous — no GameProfile to track against. Fall back to the
          // localStorage-only flow entirely.
          useServerRef.current = false;
        } else if (res.ok) {
          const data = await res.json();
          useServerRef.current = true;
          if (data.claimable) {
            setStreak(data.streak || 0);
            setVisible(true);
          }
          return;
        } else {
          // Server hiccup — degrade to localStorage rather than block the
          // reward entirely.
          useServerRef.current = false;
        }
      } catch {
        useServerRef.current = false;
      }
      // localStorage fallback path (anonymous or server unavailable)
      if (canClaimBonus()) {
        setStreak(getCurrentStreak());
        setVisible(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleClaim = async () => {
    if (claiming) return;
    setError(null);

    if (useServerRef.current) {
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
            setTimeout(() => setVisible(false), 3000);
          }
        } else if (res.status === 409) {
          // Already claimed today (e.g. another tab/device beat this one) —
          // reconcile honestly instead of granting a duplicate reward.
          setError('Already claimed today from another session.');
          setTimeout(() => setVisible(false), 2000);
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
    const { amount, newStreak } = claimDailyBonus();
    if (amount > 0) {
      playSound('milestone');
      setClaimedAmount(amount);
      setStreak(newStreak);
      setClaimed(true);
      onClaim(amount);

      // Auto-close after showing reward
      setTimeout(() => setVisible(false), 3000);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  const modalRef = useModalA11y<HTMLDivElement>(handleDismiss, visible);
  if (!visible) return null;

  const currentDay = (streak % 7) + 1;

  return (
    <div ref={modalRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="daily-bonus-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm game-modal-backdrop" onClick={handleDismiss} aria-hidden="true" />

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
