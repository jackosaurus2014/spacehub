'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Economy calibration notice — clock unification (2026-09-02).
 *
 * Same pattern as WorldResetNotice: a self-expiring banner in the same slot,
 * shown to every player (start menu + in-game) for CALIBRATION_NOTICE_DAYS
 * after the change landed. Dismissible per page-load only — like a world
 * restart, a balance rescale is the one notice that must not stay hidden.
 *
 * What happened, honestly (full post-mortem on /space-tycoon/dev-log): the
 * engine credited one game-month of revenue every 60 real seconds while the
 * world calendar ran one game-month every 6 real hours. Revenue accrued 360x
 * faster than the world it was denominated in. The tick now follows the
 * calendar, and every corporation's balances were divided by 360 on
 * 2026-09-02 so nobody's relative position changed.
 */

/** When the clock unification + balance rescale went live (UTC). */
export const CLOCK_UNIFICATION_AT: number = Date.UTC(2026, 8, 2, 0, 0, 0);
/** How long the notice stays up. */
export const CALIBRATION_NOTICE_DAYS = 14;

export function isCalibrationNoticeActive(now: number): boolean {
  return now >= CLOCK_UNIFICATION_AT && now < CLOCK_UNIFICATION_AT + CALIBRATION_NOTICE_DAYS * 24 * 60 * 60 * 1000;
}

export default function EconomyCalibrationNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !isCalibrationNoticeActive(Date.now())) return null;

  return (
    <div
      role="status"
      className="relative z-20 border-b border-purple-500/30 bg-gradient-to-r from-purple-500/[0.12] via-purple-500/[0.06] to-transparent px-3 sm:px-4 py-2.5"
    >
      <div className="max-w-5xl mx-auto flex items-start sm:items-center gap-3">
        <span className="text-lg shrink-0" aria-hidden="true">🕰️</span>
        <div className="flex-1 text-xs sm:text-[13px] leading-relaxed text-purple-100">
          <span className="font-bold uppercase tracking-wider text-purple-300 mr-2">
            Economy calibration
          </span>
          Revenue, costs and production now accrue on the world calendar —{' '}
          <span className="font-semibold text-purple-200">one game-month every 6 real hours</span>,
          the clock leagues, quarters and seasons already ran on. Until now income accrued 360× faster
          than the calendar it was priced in. On{' '}
          <span className="font-semibold text-purple-200">September 2, 2026</span> every corporation&apos;s
          cash, lifetime totals and stockpiles were divided by 360 — everyone scaled equally, buildings,
          ships and research untouched, so nobody&apos;s standing changed.{' '}
          <Link href="/space-tycoon/dev-log" className="underline decoration-purple-400/60 underline-offset-2 hover:text-white">
            Read the full post-mortem
          </Link>
          .
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss economy calibration notice"
          className="shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-purple-300/70 hover:text-purple-200 hover:bg-white/[0.06] transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
