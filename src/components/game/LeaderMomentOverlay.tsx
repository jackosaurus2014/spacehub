'use client';

// ─── Leader moment overlay (Wave A2.3, docs/VISUAL_AAA_2026-08.md §A2.3) ────
//
// Presents ONE acknowledge-only leader moment — a commander reporting for
// duty, a commander standing down, a faction leader confirming a change in
// standing. The page owns the queue (src/lib/game/leader-moments.ts) and
// passes only the head, exactly as CinematicOverlay does for its own queue,
// so the "one at a time" rule lives in one place.
//
// Deliberately NOT routed through CinematicOverlay: that surface is a
// full-bleed backdrop with a Ken-Burns drift and an 8-second auto-dismiss.
// A portrait moment is an address from a person and must not time out from
// under a slow reader — this one waits for an acknowledgement.
//
// Dismissible (there is no decision attached), so Escape closes it, per the
// A2.3 brief's "where the underlying interaction allows dismissal".

import type { LeaderMoment } from '@/lib/game/leader-moments';
import { playSound } from '@/lib/game/sound-engine';
import LeaderPortraitFrame from './LeaderPortraitFrame';
import { useModalA11y } from './useModalA11y';

interface Props {
  moment: LeaderMoment | null;
  onDismiss: () => void;
}

export default function LeaderMomentOverlay({ moment, onDismiss }: Props) {
  const modalRef = useModalA11y<HTMLDivElement>(onDismiss, moment !== null);
  if (!moment) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 overflow-y-auto game-scroll"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leader-moment-title"
      aria-describedby="leader-moment-message"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm game-modal-backdrop" aria-hidden="true" />
      <div className="relative w-full max-w-xl">
        <LeaderPortraitFrame
          speaker={moment.speaker}
          eyebrow={moment.eyebrow}
          statusLabel={moment.statusLabel}
          titleId="leader-moment-title"
          messageId="leader-moment-message"
          message={moment.message}
          actions={
            <button
              type="button"
              onClick={() => { playSound('click'); onDismiss(); }}
              className="w-full min-h-[44px] px-4 py-2 rounded-lg border border-white/[0.14] bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs uppercase tracking-widest font-hud font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Acknowledge
            </button>
          }
          footer={
            <p className="text-slate-600 text-[10px] text-center">Press Escape to dismiss.</p>
          }
        />
      </div>
    </div>
  );
}
