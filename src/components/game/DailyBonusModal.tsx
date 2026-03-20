'use client';

import { useState, useEffect } from 'react';
import { canClaimBonus, claimDailyBonus, getCurrentStreak, getBonusSchedule } from '@/lib/game/daily-bonus';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface DailyBonusModalProps {
  onClaim: (amount: number) => void;
}

/**
 * Daily login bonus modal for Space Tycoon.
 * Shows automatically when a player opens the game and has an unclaimed bonus.
 * Displays 7-day reward schedule with escalating amounts.
 */
export default function DailyBonusModal({ onClaim }: DailyBonusModalProps) {
  const [visible, setVisible] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [streak, setStreak] = useState(0);

  const schedule = getBonusSchedule();

  useEffect(() => {
    // Check if bonus available after a short delay (let game load first)
    const timer = setTimeout(() => {
      if (canClaimBonus()) {
        setStreak(getCurrentStreak());
        setVisible(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleClaim = () => {
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

  if (!visible) return null;

  const currentDay = (streak % 7) + 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #0f0f2e 0%, #0a0a1a 100%)' }}>
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" />

        <div className="p-6">
          {!claimed ? (
            <>
              {/* Header */}
              <div className="text-center mb-5">
                <span className="text-3xl block mb-2">🎁</span>
                <h3 className="text-xl font-bold text-white">Daily Bonus</h3>
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
                      <p className={`text-[9px] font-medium ${isToday ? 'text-cyan-400' : isPast ? 'text-green-400' : 'text-slate-500'}`}>
                        Day {day.day}
                      </p>
                      <p className={`text-[10px] font-bold mt-0.5 ${isToday ? 'text-white' : isPast ? 'text-green-400/70' : 'text-slate-400'}`}>
                        {formatMoney(day.amount)}
                      </p>
                      {isPast && (
                        <span className="absolute -top-1 -right-1 text-[8px]">✅</span>
                      )}
                      {isToday && (
                        <span className="absolute -top-1 -right-1 text-[10px] animate-pulse">⭐</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Claim button */}
              <button
                onClick={handleClaim}
                className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.98]"
              >
                Claim {formatMoney(schedule[(currentDay - 1) % 7].amount)}
              </button>

              <p className="text-slate-600 text-[10px] text-center mt-2">
                Come back tomorrow for Day {currentDay < 7 ? currentDay + 1 : 1} reward!
              </p>
            </>
          ) : (
            /* Claimed state */
            <div className="text-center py-4">
              <span className="text-5xl block mb-3">💰</span>
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
