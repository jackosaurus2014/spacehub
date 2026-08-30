/**
 * Console — the one card (SYNTHESIS.md §2.4).
 *
 * 1px --line border, radius var(--radius-console), --surface body, and an
 * optional --elev header strip carrying the stale-data doctrine (graft A2):
 * OVERLINE LABEL on the left, `source · updated HH:MMZ` + StatusBadge on the
 * right. No macOS traffic-light dots.
 *
 * Server-safe: no state, no effects.
 */

import React from 'react';
import StatusBadge, { formatUtcHHMM, type StatusKind } from './StatusBadge';

export interface ConsoleProps {
  /** Overline label rendered at the head of the console. */
  title?: React.ReactNode;
  /** Upstream that produced the data, e.g. "LL2". */
  source?: string;
  /** When the data was last refreshed. */
  asOf?: Date | string | number | null;
  /** Provenance badge. Omit for consoles that carry no fetched data. */
  status?: StatusKind;
  /** Optional right-hand controls (filters, links) rendered before the badge. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Element to render as. Defaults to <section>. */
  as?: React.ElementType;
  /** Padding on the console body. Set false when the child is a full-bleed table. */
  padded?: boolean;
}

export default function Console({
  title,
  source,
  asOf,
  status,
  actions,
  children,
  className = '',
  as: Tag = 'section',
  padded = true,
}: ConsoleProps) {
  const stamp = formatUtcHHMM(asOf);
  const provenance = [source, stamp ? `updated ${stamp}` : null].filter(Boolean).join(' \u00B7 ');
  const hasHeader = Boolean(title || provenance || status || actions);

  return (
    <Tag
      className={`overflow-hidden border border-[var(--line)] bg-[var(--surface)] ${className}`}
      style={{ borderRadius: 'var(--radius-console)' }}
    >
      {hasHeader && (
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--line)] bg-[var(--elev)] px-4 py-2.5">
          {title ? (
            <h2 className="font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-2)]">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {provenance && (
              <span className="font-mono text-[11px] leading-none text-[var(--ink-3)]">{provenance}</span>
            )}
            {actions}
            {status && <StatusBadge kind={status} asOf={status === 'stale' ? asOf : undefined} />}
          </div>
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </Tag>
  );
}
