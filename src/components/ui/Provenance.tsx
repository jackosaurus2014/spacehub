/**
 * Provenance — the Bloomberg-style "as of {time} · {source}" stamp for stat
 * surfaces (growth plan G5).
 *
 * Renders one muted 11px mono line matching Console's provenance chip
 * typography:
 *
 *   Source: Yahoo Finance · as of Sep 1, 2026 14:05 UTC
 *
 * Rules of honesty:
 *  - `asOf` null/undefined/unparseable → the line renders "Source: X" only.
 *    Never invent a timestamp.
 *  - A date-only string (e.g. "2026-09-01") or `dateOnly` renders without the
 *    HH:MM — a midnight-UTC artifact must not masquerade as a fetch time.
 *  - A non-ISO vintage string (e.g. "Q3 2026") renders verbatim.
 *
 * Server-safe: no state, no effects.
 */

import React from 'react';

export interface ProvenanceProps {
  /** Upstream that produced the data, e.g. "NOAA SWPC" or "SpaceNexus curated". */
  source: string;
  /** When the data was last fetched/verified. Null-safe; omit rather than invent. */
  asOf?: Date | string | number | null;
  /** Force date-only rendering even when the value carries a time component. */
  dateOnly?: boolean;
  className?: string;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "Sep 1, 2026 14:05 UTC" (or "Sep 1, 2026" when the time is unknown).
 * Returns null for missing/unparseable input — never "Invalid Date".
 * Non-ISO vintage strings ("Q3 2026", "August 2026") pass through verbatim.
 */
export function formatProvenanceDate(
  input?: Date | string | number | null,
  opts: { dateOnly?: boolean } = {}
): string | null {
  if (input === null || input === undefined || input === '') return null;

  let dateOnly = opts.dateOnly ?? false;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return null;
    if (DATE_ONLY_RE.test(trimmed)) dateOnly = true;
    const ms = Date.parse(trimmed);
    // Unparseable string = a hand-written vintage like "Q3 2026" — honest as-is.
    if (Number.isNaN(ms)) return trimmed;
  }

  const d = input instanceof Date ? input : new Date(input as string | number);
  if (Number.isNaN(d.getTime())) return null;

  const date = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  if (dateOnly) return date;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm} UTC`;
}

export default function Provenance({ source, asOf, dateOnly, className = '' }: ProvenanceProps) {
  const stamp = formatProvenanceDate(asOf, { dateOnly });
  return (
    <p className={`font-mono text-[11px] leading-snug text-[var(--ink-3)] ${className}`}>
      Source: {source}
      {stamp ? ` · as of ${stamp}` : ''}
    </p>
  );
}
