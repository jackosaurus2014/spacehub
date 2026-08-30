'use client';

/**
 * Countdown — the clock (SYNTHESIS.md §2.4, §2.5).
 *
 * The server renders a real initial value from the ISO prop, so the HTML a
 * crawler or a slow phone receives is never blank and never an em-dash; the
 * client then ticks it once a second. aria-live is "off" on purpose — a
 * per-second live region is a screen-reader denial of service — and the value
 * is exposed to assistive tech as words via aria-label instead.
 */

import { useEffect, useState } from 'react';

export interface CountdownParts {
  /** True at or after T−0. */
  live: boolean;
  /** False when the target date could not be parsed; text is then a placeholder. */
  valid: boolean;
  /** Whole days remaining (0 when under 24h). */
  days: number;
  /** Plain text, e.g. "T−2d 04:12", "T−04:12:07", "LIVE". */
  text: string;
  /** The same value in words, for aria-label. */
  words: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Pure formatter. `msRemaining` is milliseconds until T−0; pass NaN for an
 * unknown target to get the non-reflowing placeholder.
 */
export function formatCountdown(msRemaining: number): CountdownParts {
  if (!Number.isFinite(msRemaining)) {
    return { live: false, valid: false, days: 0, text: 'T\u2212--:--:--', words: 'Countdown unavailable' };
  }
  if (msRemaining <= 0) {
    return { live: true, valid: true, days: 0, text: 'LIVE', words: 'Live now' };
  }
  const total = Math.floor(msRemaining / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

  if (days >= 1) {
    return {
      live: false,
      valid: true,
      days,
      text: `T\u2212${days}d ${pad(hours)}:${pad(minutes)}`,
      words: `T minus ${plural(days, 'day')} ${plural(hours, 'hour')} ${plural(minutes, 'minute')}`,
    };
  }
  return {
    live: false,
    valid: true,
    days: 0,
    text: `T\u2212${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    words: `T minus ${plural(hours, 'hour')} ${plural(minutes, 'minute')} ${plural(seconds, 'second')}`,
  };
}

/** Milliseconds from now until `to`, or NaN when `to` is unparseable. */
export function msUntil(to: Date | string | number | null | undefined, now: number = Date.now()): number {
  if (to === null || to === undefined || to === '') return NaN;
  const t = to instanceof Date ? to.getTime() : new Date(to).getTime();
  return Number.isNaN(t) ? NaN : t - now;
}

export interface CountdownProps {
  /** Target instant. An ISO string is the expected form on the server. */
  to: Date | string | number | null | undefined;
  size?: 'clock' | 'lg' | 'md';
  className?: string;
}

const SIZE: Record<NonNullable<CountdownProps['size']>, string> = {
  clock: 'text-[clamp(3.2rem,7.4vw,5.6rem)] leading-[0.92] tracking-[-0.03em] font-bold',
  lg: 'text-[1.875rem] leading-[1.1] font-bold',
  md: 'text-[0.9375rem] leading-none font-medium',
};

export default function Countdown({ to, size = 'lg', className = '' }: CountdownProps) {
  // Rendered on the server too: the first paint carries a real clock.
  const [parts, setParts] = useState<CountdownParts>(() => formatCountdown(msUntil(to)));

  useEffect(() => {
    const tick = () => setParts(formatCountdown(msUntil(to)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [to]);

  // Split "2d" so the unit letter can carry ember, per the type spec.
  const dayMatch = parts.text.match(/^T\u2212(\d+)(d)\s(.*)$/);

  return (
    <time
      dateTime={typeof to === 'string' ? to : to instanceof Date ? to.toISOString() : undefined}
      aria-live="off"
      aria-label={parts.words}
      suppressHydrationWarning
      className={`inline-block font-mono tabular-nums ${SIZE[size]} ${className}`}
      style={{ color: parts.live ? 'var(--go)' : 'var(--ink)' }}
      data-live={parts.live ? 'true' : 'false'}
    >
      <span aria-hidden="true">
        {parts.live || !parts.valid ? (
          parts.text
        ) : dayMatch ? (
          <>
            <span style={{ color: 'var(--ember)' }}>T{'\u2212'}</span>
            {dayMatch[1]}
            <span style={{ color: 'var(--ember)' }}>d</span> {dayMatch[3]}
          </>
        ) : (
          <>
            <span style={{ color: 'var(--ember)' }}>T{'\u2212'}</span>
            {parts.text.slice(2)}
          </>
        )}
      </span>
    </time>
  );
}
