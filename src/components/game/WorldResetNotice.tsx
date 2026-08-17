'use client';

import { useState } from 'react';
import { WORLD_RESET_AT, isWorldResetPending, daysUntilWorldReset, formatWorldResetDate } from '@/lib/game/world-reset';

/**
 * Scheduled world-restart notice — shown to every player (start menu + in-game)
 * from announcement until the restart lands. Founder directive 8/17: 7-day
 * public notice ahead of the fresh-start restart on 2026-08-24.
 *
 * Dismissible per page-load only (deliberately not persisted — a scheduled
 * world wipe is the one notice that must not stay hidden for a week).
 */
export default function WorldResetNotice() {
  const [dismissed, setDismissed] = useState(false);
  const now = Date.now();

  if (dismissed || WORLD_RESET_AT === null || !isWorldResetPending(now)) return null;

  const days = daysUntilWorldReset(now);

  return (
    <div
      role="status"
      className="relative z-20 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.06] to-transparent px-3 sm:px-4 py-2.5"
    >
      <div className="max-w-5xl mx-auto flex items-start sm:items-center gap-3">
        <span className="text-lg shrink-0" aria-hidden="true">🌍</span>
        <div className="flex-1 text-xs sm:text-[13px] leading-relaxed text-amber-100">
          <span className="font-bold uppercase tracking-wider text-amber-300 mr-2">
            World restart in {days} {days === 1 ? 'day' : 'days'}
          </span>
          We&apos;ve shipped major updates to the game — a rebuilt economy, real supply and
          demand, contract limits, and deeper corporate play. On{' '}
          <span className="font-semibold text-amber-200">{formatWorldResetDate()}</span> the
          world restarts from a fresh start: every corporation begins the new era on equal
          footing under the new rules. Your current save will be archived, not deleted.
          Thanks for playing the founding season.
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss world restart notice"
          className="shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-amber-300/70 hover:text-amber-200 hover:bg-white/[0.06] transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
