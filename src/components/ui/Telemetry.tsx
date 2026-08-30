/**
 * Telemetry — one readout: overline label / mono value / unit, plus an optional
 * delta (SYNTHESIS.md §2.4). Replaces the ad-hoc DataCard in LandingHero and
 * the four .card-data__* classes.
 *
 * Every delta carries a glyph (▲ ▼ ─) as well as a colour, so direction
 * survives deuteranopia and greyscale printing (§2.1).
 *
 * Server-safe: no state, no effects.
 */

import React from 'react';

export interface TelemetryDelta {
  /** Signed change. Sign picks the glyph and colour; the value is shown absolute. */
  value: number;
  /** Appended to the delta, e.g. "%" or " launches". */
  suffix?: string;
}

export interface TelemetryProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: TelemetryDelta;
  /** Caption under the value, e.g. "vs. same week 2025". */
  sub?: React.ReactNode;
  /** Value colour. 'signal' (default) for live/derived data, 'ink' plain, 'ember' for CTA-adjacent figures. */
  tone?: 'signal' | 'ink' | 'ember';
  className?: string;
}

const TONE: Record<NonNullable<TelemetryProps['tone']>, string> = {
  signal: 'var(--signal)',
  ink: 'var(--ink)',
  ember: 'var(--ember)',
};

/** ▲ up, ▼ down, ─ flat. Exported for tests and for reuse in tables. */
export function deltaGlyph(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '\u2500';
  return value > 0 ? '\u25B2' : '\u25BC';
}

function deltaColor(value: number): string {
  if (!Number.isFinite(value) || value === 0) return 'var(--ink-3)';
  return value > 0 ? 'var(--go)' : 'var(--crit)';
}

export default function Telemetry({
  label,
  value,
  unit,
  delta,
  sub,
  tone = 'signal',
  className = '',
}: TelemetryProps) {
  return (
    <div className={className}>
      <div className="font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className="font-mono text-[1.875rem] font-bold leading-[1.1] tabular-nums"
          style={{ color: TONE[tone] }}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[0.8125rem] leading-none text-[var(--ink-3)]">{unit}</span>
        )}
        {delta && (
          <span
            className="ml-1 inline-flex items-center gap-1 font-mono text-[0.8125rem] leading-none tabular-nums"
            style={{ color: deltaColor(delta.value) }}
          >
            <span aria-hidden="true">{deltaGlyph(delta.value)}</span>
            <span>
              {Number.isFinite(delta.value) ? Math.abs(delta.value) : 0}
              {delta.suffix ?? ''}
            </span>
          </span>
        )}
      </div>
      {sub && <div className="mt-1 font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-3)]">{sub}</div>}
    </div>
  );
}
