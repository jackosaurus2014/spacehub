'use client';

// ─── Global Activity Feed (audit Change #3 / D1) ────────────────────────────
// Presentational reader for /api/space-tycoon/activity — colonizations,
// milestone claims, big trades, league promotions, and everything else the
// six writer routes already log. Used both as the compact panel reachable
// from the map HUD and (in ticker form) inline in the Command Center header.

import { useActivityFeed, formatRelativeTime, type ActivityEntry } from '@/hooks/useWorldState';
import GameIcon from './GameIcon';
import DiplomacyTimelinePanel from './DiplomacyTimelinePanel';
import type { IconName } from '@/lib/game/icons';

// Icon per activity type — falls back to a generic pulse glyph for types
// added later without needing a UI change here.
const ACTIVITY_ICON: Record<string, IconName> = {
  colony_claimed: 'city',
  milestone_claimed: 'leaderboard',
  competitive_contract_claimed: 'scroll',
  rivalry_win: 'swords',
  league_promotion: 'arrow-up',
  league_demotion: 'arrow-down',
  bounty_filled: 'money',
  bid_won: 'target',
  alliance_war: 'swords',
  alliance_treaty: 'handshake',
  // Diplomacy (2026-09-02): corp-to-corp contracts + pacts.
  contract_signed: 'handshake',
  contract_fulfilled: 'check',
  contract_defaulted: 'warning',
  contract_cancelled: 'handshake',
  contract_arbitrated: 'balance',
  pact_signed: 'scroll',
  pact_broken: 'scroll',
};

function iconFor(type: string): IconName {
  return ACTIVITY_ICON[type] || 'activity';
}

interface GlobalActivityFeedProps {
  limit?: number;
  /** Compact mode drops the panel chrome/heading for embedding inside
   *  another card (e.g. the map HUD popover). */
  compact?: boolean;
  className?: string;
}

export default function GlobalActivityFeed({ limit = 20, compact = false, className = '' }: GlobalActivityFeedProps) {
  const { activities, loading, error, available } = useActivityFeed(limit);

  if (!available && !loading) {
    return (
      <div className={`text-[11px] text-slate-500 italic p-3 text-center ${className}`}>
        Live activity feed unavailable — check your connection.
      </div>
    );
  }

  return (
    <div className={className}>
      {!compact && (
        <h3 className="font-hud text-white text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <GameIcon name="activity" size={14} glow="cyan" /> Galactic Activity
        </h3>
      )}
      {/* Diplomacy (2026-09-02): the latest signed agreements / breaks /
          rulings as a strip above the log — the public timeline lives in
          Contracts → Diplomacy; this is its ticker. */}
      {!compact && (
        <section aria-label="Latest diplomacy" className="mb-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
          <h4 className="font-hud text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
            <GameIcon name="scroll" size={11} /> Diplomacy
          </h4>
          <DiplomacyTimelinePanel compact limit={4} />
        </section>
      )}
      <div
        className="space-y-1 max-h-[50vh] overflow-y-auto game-scroll"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Global corporation activity feed"
      >
        {loading && activities.length === 0 && (
          <p className="text-slate-500 text-[11px] text-center py-3">Loading activity…</p>
        )}
        {!loading && activities.length === 0 && (
          <p className="text-slate-500 text-[11px] text-center py-3">No activity yet — be the first to make history.</p>
        )}
        {activities.map((a: ActivityEntry) => (
          <div key={a.id} className="flex items-start gap-2 text-[11px] py-1.5 px-2 rounded-lg hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0">
            <span className="shrink-0 mt-0.5"><GameIcon name={iconFor(a.type)} size={13} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-slate-200 leading-snug">{a.title}</p>
              {a.description && <p className="text-slate-500 text-[10px] mt-0.5">{a.description}</p>}
            </div>
            <span className="shrink-0 text-slate-600 text-[10px] font-mono whitespace-nowrap">{formatRelativeTime(a.createdAt)}</span>
          </div>
        ))}
        {error && activities.length === 0 && (
          <p className="text-red-400/70 text-[10px] text-center py-2">{error}</p>
        )}
      </div>
    </div>
  );
}
