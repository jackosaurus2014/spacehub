'use client';

import { useState } from 'react';
import {
  WORLD_EPOCH,
  WORLD_RESET_AT,
  isWorldResetPending,
  daysUntilWorldReset,
  formatWorldResetDate,
  isNewEraNoticeActive,
  formatEpochStartDate,
} from '@/lib/game/world-reset';

/**
 * World-epoch banner — shown to every player (start menu + in-game). It has
 * two modes and is otherwise absent:
 *
 *  · COUNTDOWN — a restart is scheduled and hasn't landed yet. Founder
 *    directive 8/17: 7-day public notice ahead of a fresh-start restart.
 *  · NEW ERA — the restart has landed; for the first few days of the epoch the
 *    same slot explains what happened and where the old save went.
 *
 * Dismissible per page-load only (deliberately not persisted — a world wipe is
 * the one notice that must not stay hidden for a week).
 */
export default function WorldResetNotice() {
  const [dismissed, setDismissed] = useState(false);
  const now = Date.now();

  const pending = WORLD_RESET_AT !== null && isWorldResetPending(now);
  const newEra = !pending && isNewEraNoticeActive(now);

  if (dismissed || (!pending && !newEra)) return null;

  const days = daysUntilWorldReset(now);

  const tone = pending
    ? {
        border: 'border-amber-500/30',
        bg: 'from-amber-500/[0.12] via-amber-500/[0.06]',
        body: 'text-amber-100',
        head: 'text-amber-300',
        strong: 'text-amber-200',
        close: 'text-amber-300/70 hover:text-amber-200',
      }
    : {
        border: 'border-cyan-500/30',
        bg: 'from-cyan-500/[0.12] via-cyan-500/[0.06]',
        body: 'text-cyan-100',
        head: 'text-cyan-300',
        strong: 'text-cyan-200',
        close: 'text-cyan-300/70 hover:text-cyan-200',
      };

  return (
    <div
      role="status"
      className={`relative z-20 border-b ${tone.border} bg-gradient-to-r ${tone.bg} to-transparent px-3 sm:px-4 py-2.5`}
    >
      <div className="max-w-5xl mx-auto flex items-start sm:items-center gap-3">
        <span className="text-lg shrink-0" aria-hidden="true">{pending ? '🌍' : '🚀'}</span>
        <div className={`flex-1 text-xs sm:text-[13px] leading-relaxed ${tone.body}`}>
          {pending ? (
            <>
              <span className={`font-bold uppercase tracking-wider ${tone.head} mr-2`}>
                World restart in {days} {days === 1 ? 'day' : 'days'}
              </span>
              We&apos;ve shipped major updates to the game — a rebuilt economy, real supply and
              demand, contract limits, and deeper corporate play. On{' '}
              <span className={`font-semibold ${tone.strong}`}>{formatWorldResetDate()}</span> the
              world restarts from a fresh start: every corporation begins the new era on equal
              footing under the new rules. Your current save will be archived, not deleted.
              Thanks for playing the founding season.
            </>
          ) : (
            <>
              <span className={`font-bold uppercase tracking-wider ${tone.head} mr-2`}>
                Epoch {WORLD_EPOCH} has begun
              </span>
              The world restarted on{' '}
              <span className={`font-semibold ${tone.strong}`}>{formatEpochStartDate()}</span>. Every
              corporation now starts level under the rebuilt economy — real supply and demand,
              contract limits, orbital slot auctions, and deeper corporate play. Your founding-season
              save has been archived, not deleted. Stake your claim early: the best deposits, orbital
              slots, and lane positions are unclaimed right now.
            </>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label={pending ? 'Dismiss world restart notice' : 'Dismiss new era notice'}
          className={`shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center rounded ${tone.close} hover:bg-white/[0.06] transition-colors`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
