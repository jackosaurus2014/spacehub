'use client';

// ─── Portrait-framed leader moment (Wave A2.3, docs/VISUAL_AAA_2026-08.md) ──
//
// The presentational half of A2.3. `leader-moments.ts` decides WHO is
// speaking; this decides how they look doing it.
//
// One component, two consumers — the acknowledge-only overlay
// (LeaderMomentOverlay) and the mandatory-choice modal (EventChoiceModal,
// when a speaker resolves). Deliberately NOT two lookalike frames: the whole
// value of A2.3 is that leader moments read as one recurring institution, so
// there is exactly one implementation of the housing to look at and to fix.
//
// Accessibility contract (CLAUDE.md):
//  - the portrait is decorative: alt="", aria-hidden on every ornamental
//    layer. Name, title, affiliation, status and message are real text and
//    carry 100% of the meaning — the frame is legible with images off.
//  - the accent colour appears only as a keyline. It is always redundant
//    with the affiliation text sitting next to it; nothing is colour-only.
//  - the caller owns dialog semantics (role, aria-labelledby, focus trap),
//    because whether the moment is dismissible depends on the underlying
//    interaction, not on the frame.
//  - 375px: the two-column portrait/text split collapses to a stack, with
//    the portrait capped so the message is never crowded out by art.

import type { ReactNode } from 'react';
import { speakerMonogram, type LeaderSpeaker } from '@/lib/game/leader-moments';

export interface LeaderPortraitFrameProps {
  speaker: LeaderSpeaker;
  /** Small line above the name — "Appointment", "Retirement", the chain name. */
  eyebrow?: string;
  /** Literal status wording. Never a colour-only badge. */
  statusLabel?: string;
  /** id for the caller's aria-labelledby. */
  titleId?: string;
  /** id for the caller's aria-describedby. */
  messageId?: string;
  /** The spoken message. */
  message: ReactNode;
  /** Progress/context rendered above the message (chain stage indicator). */
  aside?: ReactNode;
  /** Choice buttons, Continue button, etc. */
  actions?: ReactNode;
  /** Footer note under the actions. */
  footer?: ReactNode;
}

export default function LeaderPortraitFrame({
  speaker, eyebrow, statusLabel, titleId, messageId, message, aside, actions, footer,
}: LeaderPortraitFrameProps) {
  return (
    <div
      className="leader-housing leader-arrive w-full max-w-xl p-3 sm:p-4"
      style={{ ['--leader-accent' as string]: speaker.accentHex }}
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Portrait. Fixed width on desktop; on a phone it is capped at 108px
            and centred so the message column keeps its full measure. */}
        <div className="shrink-0 mx-auto sm:mx-0 w-[108px] sm:w-[156px]">
          <div className="leader-portrait">
            {speaker.portraitUrl ? (
              // Decorative by contract — every fact about this person is in
              // the text below. Plain <img>, not next/image: these are
              // already-optimized WebP served from /public and the frame
              // supplies its own fixed geometry.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={speaker.portraitUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="leader-monogram" aria-hidden="true">{speakerMonogram(speaker.name)}</span>
            )}
            <span className="leader-portrait-treatment" aria-hidden="true" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {/* Name plate */}
          <div className="leader-plate px-3 py-2">
            {eyebrow && (
              <p className="game-label text-[10px] mb-0.5" style={{ color: speaker.accentHex }}>{eyebrow}</p>
            )}
            <h3 id={titleId} className="font-hud text-white font-bold text-base sm:text-lg leading-tight break-words">
              {speaker.name}
            </h3>
            <p className="text-slate-300 text-[11px] sm:text-xs leading-snug mt-0.5">{speaker.title}</p>
            {speaker.affiliation && (
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-0.5 break-words">
                {speaker.affiliation}
              </p>
            )}
            {statusLabel && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-200 border border-white/[0.12] bg-white/[0.04] rounded px-1.5 py-0.5">
                {statusLabel}
              </p>
            )}
          </div>

          {aside && <div className="mt-3">{aside}</div>}

          <p id={messageId} className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-3">
            {message}
          </p>
        </div>
      </div>

      {actions && <div className="mt-4">{actions}</div>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
