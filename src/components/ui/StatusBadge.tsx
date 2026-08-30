/**
 * StatusBadge — data-provenance badge (SYNTHESIS.md §2.4, graft A3).
 *
 * One badge replaces ConfidenceBadge / DataFreshness / DataFreshnessBadge /
 * DataFreshnessIndicator / DataAsOf / LastUpdated. State is carried by a WORD
 * and a SHAPE as well as colour — never by colour alone (§2.1).
 *
 *   ● LIVE   ◆ STALE · last good 13:58Z   ◷ DELAYED   ✓ VERIFIED   ○ OFF
 *
 * Server-safe: no state, no effects.
 */

export type StatusKind = 'live' | 'stale' | 'delayed' | 'verified' | 'off';

export interface StatusBadgeProps {
  kind: StatusKind;
  /** When the value was last known good. */
  asOf?: Date | string | number | null;
  /** Upstream that produced the value, e.g. "LL2" or "SEC EDGAR". */
  source?: string;
  className?: string;
}

const SPEC: Record<StatusKind, { glyph: string; word: string; color: string }> = {
  live: { glyph: '\u25CF', word: 'LIVE', color: 'var(--go)' },
  stale: { glyph: '\u25C6', word: 'STALE', color: 'var(--caution)' },
  delayed: { glyph: '\u25F7', word: 'DELAYED', color: 'var(--caution)' },
  verified: { glyph: '\u2713', word: 'VERIFIED', color: 'var(--signal)' },
  off: { glyph: '\u25CB', word: 'OFF', color: 'var(--ink-3)' },
};

/** `13:58Z` in UTC. Returns null for anything unparseable — never "Invalid Date". */
export function formatUtcHHMM(input?: Date | string | number | null): string | null {
  if (input === null || input === undefined || input === '') return null;
  const d = input instanceof Date ? input : new Date(input);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return null;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}Z`;
}

export default function StatusBadge({ kind, asOf, source, className = '' }: StatusBadgeProps) {
  const spec = SPEC[kind] ?? SPEC.off;
  const stamp = formatUtcHHMM(asOf);
  const detail: string[] = [];
  if (kind === 'stale' && stamp) detail.push(`last good ${stamp}`);
  else if (stamp) detail.push(stamp);
  if (source) detail.push(source);

  return (
    <span
      className={`inline-flex min-h-[20px] items-center gap-1.5 whitespace-nowrap font-mono text-[11px] uppercase leading-none tracking-[0.1em] ${className}`}
      style={{ color: spec.color }}
      data-status={kind}
    >
      <span aria-hidden="true">{spec.glyph}</span>
      <span>{spec.word}</span>
      {detail.length > 0 && (
        <span className="text-[var(--ink-3)] normal-case tracking-[0.04em]">
          {'\u00B7'} {detail.join(' \u00B7 ')}
        </span>
      )}
    </span>
  );
}
