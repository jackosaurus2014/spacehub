'use client';

// ─── Diplomacy timeline — the public record of agreements ───────────────────
// Diplomacy (2026-09-02, docs/ECONOMY_PVP_2026-08.md "Diplomacy"). The
// Contracts hub's `contracts:diplomacy` sub-view: one merged, newest-first
// feed of corp contract signings / fulfilments / defaults / arbitration
// rulings, pact signings and breaks, and alliance treaties and wars.
// CLAUDE.md: "All signed agreements, ratings changes, and broken pacts
// appear in a global diplomatic timeline — reputation is legible."
// Design system: Console + StatusPip; word + glyph, never colour alone.

import { useDiplomacyFeed, formatRelativeTime, type DiplomacyFeedView } from '@/hooks/useWorldState';
import Console from '@/components/ui/Console';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';

export function diplomacyKindPip(kind: string): { state: PipState; label: string; icon: IconName } {
  switch (kind) {
    case 'contract_signed': return { state: 'live', label: 'SIGNED', icon: 'handshake' };
    case 'contract_fulfilled': return { state: 'flew', label: 'FULFILLED', icon: 'check' };
    case 'contract_defaulted': return { state: 'scrub', label: 'DEFAULT', icon: 'warning' };
    case 'contract_cancelled': return { state: 'hold', label: 'CANCELLED', icon: 'handshake' };
    case 'contract_arbitrated': return { state: 'tminus', label: 'RULING', icon: 'balance' };
    case 'pact_signed': return { state: 'live', label: 'PACT', icon: 'scroll' };
    case 'pact_broken': return { state: 'scrub', label: 'BROKEN', icon: 'scroll' };
    case 'alliance_treaty': return { state: 'go', label: 'TREATY', icon: 'alliance' };
    case 'alliance_war': return { state: 'scrub', label: 'WAR', icon: 'swords' };
    default: return { state: 'hold', label: kind.replace(/_/g, ' ').toUpperCase().slice(0, 12), icon: 'activity' };
  }
}

interface DiplomacyTimelinePanelProps {
  limit?: number;
  /** Compact strip (no chrome, few rows) for embedding in the activity feed. */
  compact?: boolean;
  className?: string;
}

export default function DiplomacyTimelinePanel({ limit = 60, compact = false, className = '' }: DiplomacyTimelinePanelProps) {
  const { entries, loading, error } = useDiplomacyFeed(limit);

  const list = (
    <ol className={`${compact ? 'space-y-1' : 'space-y-2'}`} aria-label="Diplomacy timeline" aria-live="polite" aria-relevant="additions">
      {loading && entries.length === 0 && <li className="text-[11px] text-[var(--ink-3)] py-2">Loading the diplomatic record…</li>}
      {!loading && entries.length === 0 && (
        <li className="text-[11px] text-[var(--ink-3)] py-2">
          {error ? 'The diplomatic record is unavailable right now.' : 'No agreements on the record yet — the first signed contract or pact will appear here.'}
        </li>
      )}
      {entries.map((e: DiplomacyFeedView) => {
        const pip = diplomacyKindPip(e.kind);
        return (
          <li key={e.id} className={`flex items-start gap-2 ${compact ? 'py-1' : 'py-1.5 border-b border-[var(--line)] last:border-0'}`}>
            <span className="shrink-0 mt-0.5"><GameIcon name={pip.icon} size={13} /></span>
            <div className="min-w-0 flex-1">
              <p className={`leading-snug text-[var(--ink)] ${compact ? 'text-[11px]' : 'text-[13px]'}`}>{e.title}</p>
              {!compact && e.description && <p className="mt-0.5 text-[11px] leading-[1.5] text-[var(--ink-3)]">{e.description}</p>}
            </div>
            <span className="shrink-0 inline-flex items-center gap-2">
              <StatusPip state={pip.state} label={pip.label} />
              <time dateTime={e.at} className="font-mono text-[10px] text-[var(--ink-3)] whitespace-nowrap">{formatRelativeTime(e.at)}</time>
            </span>
          </li>
        );
      })}
    </ol>
  );

  if (compact) return <div className={className}>{list}</div>;

  return (
    <div className={className}>
      <Console title="Diplomacy timeline" source="public record" asOf={new Date()} status={error ? 'stale' : 'live'}>
        <p className="font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-2)] mb-3">
          Every binding agreement between corporations, and what became of it: supply contracts signed, fulfilled, defaulted or arbitrated;
          pacts signed and broken; alliance treaties and wars. Reputation is legible — this record is public and permanent.
        </p>
        <div className="max-h-[60vh] overflow-y-auto game-scroll">{list}</div>
      </Console>
    </div>
  );
}
