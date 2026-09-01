'use client';

import { useEffect, useRef } from 'react';
import type { CinematicMoment, CinematicMomentCta } from '@/lib/game/cinematic-moments';
import { playSound } from '@/lib/game/sound-engine';
import { useModalA11y } from './useModalA11y';

/**
 * CinematicOverlay — full-screen presentation moment (4X Upgrade Wave W5).
 * Generalized from MilestoneVignette.tsx: full-bleed backdrop art with a
 * Ken-Burns drift, hud-frame caption band, Orbitron title with a
 * letter-spacing glow-in, one synthesized stinger.
 *
 * Used for: narrative chain-head arrivals, science-mission discoveries,
 * expedition arrivals/first-contact, victory achievements, megastructure
 * completions (docs/4X_BASELINE_2026-08.md Part 3.4). The page owns the
 * queue (src/lib/game/cinematic-moments.ts) and passes only the head moment
 * — this component is a dumb, single-moment presenter so the queue's "one
 * at a time" rule lives in exactly one place.
 *
 * Never blocks the game tick: this is a client-side presentation layer only,
 * mounted alongside (not inside) any game-state processing. Skippable
 * instantly via click, Escape, or Enter; auto-dismisses after ~8s either way.
 */

interface CinematicOverlayProps {
  moment: CinematicMoment | null;
  onDismiss: () => void;
  /** Fired for a moment's primary CTA (quarter-close "Publish report"); the
   *  page navigates. The overlay dismisses itself either way. */
  onAction?: (cta: CinematicMomentCta) => void;
}

const AUTO_DISMISS_MS = 8000;

export default function CinematicOverlay({ moment, onDismiss, onAction }: CinematicOverlayProps) {
  const modalRef = useModalA11y<HTMLDivElement>(onDismiss, moment !== null);
  const lastPlayedIdRef = useRef<string | null>(null);

  // Auto-dismiss timer + stinger, both re-armed whenever a NEW moment (by id)
  // becomes the head of the queue. Deliberately keyed on moment?.id rather
  // than the moment object reference, so re-renders that don't change which
  // moment is showing don't restart the clock or replay the sound.
  useEffect(() => {
    if (!moment) return;
    if (lastPlayedIdRef.current !== moment.id) {
      lastPlayedIdRef.current = moment.id;
      playSound('cinematic');
    }
    const t = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment?.id]);

  // Enter dismisses too (useModalA11y already wires Escape via useEscapeKey).
  useEffect(() => {
    if (!moment) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [moment, onDismiss]);

  if (!moment) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-[95] flex items-center justify-center cursor-pointer cinematic-overlay overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cinematic-title"
      aria-describedby={moment.subtitle ? 'cinematic-subtitle' : undefined}
      onClick={onDismiss}
    >
      {/* Backdrop — art with Ken-Burns drift when available, else a plain
          accent-tinted radial glow (MilestoneVignette's fallback pattern). */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {moment.art ? (
          <div
            key={moment.id}
            className="cinematic-art absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${moment.art})` }}
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: moment.art
              ? `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.88) 100%)`
              : `radial-gradient(ellipse at center, ${moment.accent}22 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.96) 100%)`,
          }}
        />
      </div>

      {/* Caption band — hud-frame styled, bottom-anchored so full-bleed art reads clearly above it. */}
      <div className="relative w-full max-w-2xl mx-4 text-center px-6 py-10 rounded-2xl game-panel-glow" style={{ borderColor: `${moment.accent}40` }}>
        <div className="text-5xl mb-4" aria-hidden="true">{moment.icon}</div>
        <h1
          id="cinematic-title"
          className="cinematic-title font-hud text-2xl sm:text-4xl font-black mb-3 uppercase"
          style={{ color: moment.accent, textShadow: `0 0 20px ${moment.accent}, 0 0 44px ${moment.accent}80` }}
        >
          {moment.title}
        </h1>
        {moment.subtitle && (
          <p
            id="cinematic-subtitle"
            className="cinematic-subtitle font-hud text-sm sm:text-base tracking-widest text-slate-300 mb-8"
            style={{ textShadow: '0 0 12px rgba(255,255,255,0.3)' }}
          >
            {moment.subtitle}
          </p>
        )}

        {moment.stats && moment.stats.length > 0 && (
          <dl className="cinematic-subtitle grid grid-cols-3 gap-3 mb-8 mx-auto max-w-md">
            {moment.stats.slice(0, 3).map(s => (
              <div key={s.label} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2">
                <dt className="text-[10px] uppercase tracking-widest text-slate-400">{s.label}</dt>
                <dd className="font-hud text-base sm:text-lg font-bold text-white tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {moment.cta && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAction?.(moment.cta!); onDismiss(); }}
              className="cinematic-continue min-h-[44px] px-6 py-2 rounded-lg text-xs uppercase tracking-widest font-hud font-semibold text-black hover:brightness-110 transition-[filter]"
              style={{ background: moment.accent }}
            >
              {moment.cta.label}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="cinematic-continue min-h-[44px] px-6 py-2 rounded-lg border text-xs uppercase tracking-widest font-hud font-semibold hover:bg-white/10 transition-colors"
            style={{ borderColor: `${moment.accent}80`, color: moment.accent }}
          >
            {moment.cta ? (moment.dismissLabel ?? 'Dismiss') : 'Continue'}
          </button>
        </div>

        {/* Auto-dismiss progress bar — purely decorative, hidden under reduced motion via the same CSS rule that disables the animation. */}
        <div className="absolute left-6 right-6 bottom-3 h-[2px] rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
          <div key={moment.id} className="cinematic-bar-fill h-full" style={{ background: moment.accent }} />
        </div>
      </div>

      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-slate-600">
        Click, Enter, or Escape to continue
      </p>
    </div>
  );
}
