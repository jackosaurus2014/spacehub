'use client';

import { useState, useEffect } from 'react';
import { getStreak } from '@/lib/streak';

/**
 * Shows a brief notification when a user maintains or extends their visit streak.
 * Appears as a toast-like notification in the bottom-left for 5 seconds.
 * Only shows on the first page load of the day.
 */
export default function StreakNotification() {
  const [visible, setVisible] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    // Only check on first visit of the session
    const sessionKey = 'spacenexus_streak_shown';
    if (sessionStorage.getItem(sessionKey)) return;

    const streak = getStreak();
    if (streak.currentStreak >= 2) {
      setStreakDays(streak.currentStreak);
      setIsNew(streak.currentStreak > (streak.longestStreak || 0));
      setVisible(true);
      sessionStorage.setItem(sessionKey, '1');

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const milestones: Record<number, string> = {
    3: '🔥',
    7: '⚡',
    14: '💎',
    30: '👑',
    60: '🏆',
    100: '🌟',
  };

  const emoji = milestones[streakDays] || (streakDays >= 7 ? '🔥' : '📅');

  return (
    <div
      className="fixed bottom-24 left-4 z-50 md:bottom-6"
      style={{ animation: 'reveal-up 0.4s ease-out' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-black/90 border border-white/[0.08] shadow-xl shadow-black/50 backdrop-blur-sm">
        <span className="text-lg">{emoji}</span>
        <div>
          <p className="text-white text-xs font-semibold">
            {streakDays}-day streak!
          </p>
          <p className="text-slate-500 text-[10px]">
            {isNew ? 'New personal record!' : 'Keep it going!'}
          </p>
        </div>
      </div>
    </div>
  );
}
