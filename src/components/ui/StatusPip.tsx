/**
 * StatusPip — mission state (SYNTHESIS.md §2.4).
 *
 * Word + pip shape + colour, never colour alone (§2.1): filled = live,
 * hollow = scheduled, slash = scrubbed. Replaces .badge-live, .live-badge and
 * the hand-rolled animate-ping dots.
 *
 * Server-safe. The LIVE blink is CSS-only and is switched off both by
 * prefers-reduced-motion and by the site's own html.reduce-motion toggle.
 */

export type PipState = 'go' | 'hold' | 'scrub' | 'live' | 'tminus' | 'flew';

export interface StatusPipProps {
  state: PipState;
  /** Overrides the default word, e.g. "T−04:12:07" for the tminus state. */
  label?: string;
  className?: string;
}

const SPEC: Record<PipState, { glyph: string; word: string; color: string }> = {
  // hollow = scheduled
  go: { glyph: '\u25CB', word: 'GO', color: 'var(--go)' },
  hold: { glyph: '\u25C7', word: 'HOLD', color: 'var(--caution)' },
  // slash = scrubbed
  scrub: { glyph: '\u2298', word: 'SCRUB', color: 'var(--crit)' },
  // filled = live
  live: { glyph: '\u25CF', word: 'LIVE', color: 'var(--go)' },
  tminus: { glyph: '\u25F7', word: 'T\u2212', color: 'var(--signal)' },
  flew: { glyph: '\u2713', word: 'FLEW', color: 'var(--signal)' },
};

export default function StatusPip({ state, label, className = '' }: StatusPipProps) {
  const spec = SPEC[state] ?? SPEC.hold;
  const blink =
    state === 'live'
      ? 'motion-safe:animate-pulse [html.reduce-motion_&]:animate-none'
      : '';

  return (
    <span
      className={`inline-flex min-h-[20px] items-center gap-1.5 whitespace-nowrap font-mono text-[11px] font-medium uppercase leading-none tracking-[0.12em] ${className}`}
      style={{ color: spec.color }}
      data-state={state}
    >
      <span aria-hidden="true" className={blink}>
        {spec.glyph}
      </span>
      <span>{label ?? spec.word}</span>
    </span>
  );
}
