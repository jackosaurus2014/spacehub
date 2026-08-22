'use client';

// ─── Mission Calendar (Live-Service Wave LS3) ───────────────────────────────
// docs/LIVE_SERVICE_2026-08.md §LS3. Unified forward view of everything
// coming up: league lock, senate docket close, season transitions, alliance
// event windows, NPC co-fund windows, expedition returns, command-queue
// completions, appointment world events, and real Sol Events launch
// windows. All entries are DERIVED (src/lib/game/world-calendar.ts) — this
// component owns zero scheduling state of its own.
//
// Two views: a compact always-visible HUD strip (next 3 entries with a live
// countdown) and an expandable agenda grouped by day. Mobile-friendly (a
// single-column list, ≥44px tap targets) and reduced-motion-safe (nothing
// here depends on CSS animation — countdowns are plain text refreshed on an
// interval, same pattern as WorldEventsBanner.tsx).

import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  getMissionCalendarEntries, groupCalendarEntriesByDay,
  type CalendarEntry, type CalendarCategory, type CalendarCharterLite,
  type CalendarSlotAuctionLite, type CalendarNpcDriveLite,
} from '@/lib/game/world-calendar';
import type { UpcomingLaunchLite } from '@/lib/game/real-world-feed';
import { locationName } from '@/lib/game/spatial-strategy';
import GameIcon from '@/components/game/GameIcon';
import { calendarCategoryIcon } from '@/lib/game/icons';
import HoloTip, { Concept } from '@/components/game/HoloTip';

const POLL_MS = 5 * 60 * 1000; // matches world-feed route's 5-minute cache TTL
const TICK_MS = 30 * 1000; // countdown refresh — text only, no animation

const CATEGORY_LABEL: Partial<Record<CalendarCategory, string>> = {
  senate: 'Accord Senate',
  league: 'League',
  season: 'Season',
  alliance_event: 'Alliance Event',
  npc_program: 'NPC Program',
  expedition: 'Expedition',
  queue: 'Command Queue',
  appointment_event: 'World Event',
  real_launch: 'Real Launch',
  alliance_charter: 'Season Charter',
  corporate_era: 'Corporate Era', // Live-Service Wave LS4
  economic_cycle: 'Super-Cycle', // Live-Service Wave LS7
  program: 'Training Program', // Live-Service Wave LS6
  leader_retirement: 'Leader Retirement', // Live-Service Wave LS6
  story_chapter: 'Story Chapter', // Live-Service Wave LS8
  tender_offer: 'Tender Offer', // Wave M6 (docs/MEANINGFUL_2026-08.md §M6)
  chair_election: 'Accord Chair', // AAA Round 1 wave E1
};

const CATEGORY_FRAME: Partial<Record<CalendarCategory, string>> = {
  senate: 'border-purple-500/25 bg-purple-500/[0.03]',
  league: 'border-amber-500/25 bg-amber-500/[0.03]',
  season: 'border-cyan-500/25 bg-cyan-500/[0.03]',
  alliance_event: 'border-pink-500/25 bg-pink-500/[0.03]',
  npc_program: 'border-emerald-500/25 bg-emerald-500/[0.03]',
  expedition: 'border-indigo-500/25 bg-indigo-500/[0.03]',
  queue: 'border-slate-500/25 bg-slate-500/[0.03]',
  appointment_event: 'border-red-500/25 bg-red-500/[0.03]',
  real_launch: 'border-orange-500/25 bg-orange-500/[0.03]',
  alliance_charter: 'border-teal-500/25 bg-teal-500/[0.03]',
  corporate_era: 'border-yellow-500/25 bg-yellow-500/[0.03]', // Live-Service Wave LS4
  economic_cycle: 'border-lime-500/25 bg-lime-500/[0.03]', // Live-Service Wave LS7
  program: 'border-sky-500/25 bg-sky-500/[0.03]', // Live-Service Wave LS6
  leader_retirement: 'border-fuchsia-500/25 bg-fuchsia-500/[0.03]', // Live-Service Wave LS6
  story_chapter: 'border-violet-500/25 bg-violet-500/[0.03]', // Live-Service Wave LS8
  chair_election: 'border-purple-500/25 bg-purple-500/[0.03]', // AAA Round 1 wave E1
};
const FALLBACK_CATEGORY_LABEL = 'Event';
const FALLBACK_CATEGORY_FRAME = 'border-slate-500/25 bg-slate-500/[0.03]';

// V2: not every calendar category maps to a glossary concept (some, like
// real_launch or queue, are self-explanatory from their row content) — only
// wire the ones with a documented mechanic behind them.
const CATEGORY_CONCEPT: Partial<Record<CalendarCategory, string>> = {
  senate: 'senate-docket',
  economic_cycle: 'super-cycle',
  corporate_era: 'era-charter',
  alliance_charter: 'alliance-charter',
  queue: 'command-queue',
  chair_election: 'accord-chair', // AAA Round 1 wave E1
};

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Now';
  const totalMinutes = Math.floor(msRemaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDayHeading(dayKey: string, now: Date): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatEntryTime(atMs: number): string {
  return new Date(atMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface WorldFeedResponse {
  upcomingLaunches?: UpcomingLaunchLite[];
}

interface CharterFeedResponse {
  charter?: { id: string; def?: { name?: string; icon?: string } | null; endsAt: number } | null;
}

interface Props {
  state: GameState;
}

export default function MissionCalendarPanel({ state }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [upcomingLaunches, setUpcomingLaunches] = useState<UpcomingLaunchLite[]>([]);
  const [myAllianceCharter, setMyAllianceCharter] = useState<CalendarCharterLite | null>(null);
  const [openSlotAuctions, setOpenSlotAuctions] = useState<CalendarSlotAuctionLite[]>([]);
  const [openNpcDrives, setOpenNpcDrives] = useState<CalendarNpcDriveLite[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/space-tycoon/world-feed');
        if (!res.ok) return;
        const json = (await res.json()) as WorldFeedResponse;
        if (cancelled) return;
        setUpcomingLaunches(Array.isArray(json.upcomingLaunches) ? json.upcomingLaunches : []);
      } catch {
        // Real-launch entries just stay empty — every other calendar source
        // is engine-derived and unaffected.
      }
    }
    void poll();
    const feedInterval = setInterval(() => { void poll(); }, POLL_MS);
    return () => { cancelled = true; clearInterval(feedInterval); };
  }, []);

  // LS5: alliance season charter deadline — same "fetch, pass in, never
  // query from world-calendar.ts" pattern as upcomingLaunches above.
  useEffect(() => {
    let cancelled = false;
    async function pollCharter() {
      try {
        const res = await fetch('/api/space-tycoon/alliances/charter');
        if (!res.ok) return;
        const json = (await res.json()) as CharterFeedResponse;
        if (cancelled) return;
        if (json.charter) {
          setMyAllianceCharter({
            id: json.charter.id,
            name: json.charter.def?.name || 'Season Charter',
            icon: json.charter.def?.icon || '🤝',
            endsAtMs: json.charter.endsAt,
          });
        } else {
          setMyAllianceCharter(null);
        }
      } catch {
        // Charter entry just stays absent — every other calendar source is
        // engine-derived and unaffected.
      }
    }
    void pollCharter();
    const charterInterval = setInterval(() => { void pollCharter(); }, POLL_MS);
    return () => { cancelled = true; clearInterval(charterInterval); };
  }, []);

  // E7 (docs/ECONOMY_PVP_2026-08.md §E7): open orbital-slot auctions + NPC
  // procurement drives — same "fetch, pass in, never query from
  // world-calendar.ts" pattern as upcomingLaunches/myAllianceCharter above.
  useEffect(() => {
    let cancelled = false;
    async function pollSlots() {
      try {
        const res = await fetch('/api/space-tycoon/orbital-slots');
        if (!res.ok) return;
        const json = await res.json() as { openAuctions?: { id: string; locationId: string; closesAt: string }[] };
        if (cancelled) return;
        setOpenSlotAuctions((json.openAuctions || []).map(a => ({
          id: a.id, locationId: a.locationId, locationLabel: locationName(a.locationId),
          closesAt: new Date(a.closesAt).getTime(),
        })));
      } catch {
        // Auction entries just stay empty — every other calendar source is
        // engine-derived and unaffected.
      }
    }
    void pollSlots();
    const slotsInterval = setInterval(() => { void pollSlots(); }, POLL_MS);
    return () => { cancelled = true; clearInterval(slotsInterval); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function pollDrives() {
      try {
        const res = await fetch('/api/space-tycoon/bidding?status=open');
        if (!res.ok) return;
        const json = await res.json() as { contracts?: { id: string; title: string; biddingEndsAt: string; issuerNpcId?: string | null }[] };
        if (cancelled) return;
        const drives = (json.contracts || []).filter(c => !!c.issuerNpcId);
        setOpenNpcDrives(drives.map(d => ({
          id: d.id, title: d.title, npcName: d.title.split(':')[0] || 'NPC', biddingEndsAt: new Date(d.biddingEndsAt).getTime(),
        })));
      } catch {
        // Drive entries just stay empty.
      }
    }
    void pollDrives();
    const drivesInterval = setInterval(() => { void pollDrives(); }, POLL_MS);
    return () => { cancelled = true; clearInterval(drivesInterval); };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(tick);
  }, []);

  const entries = useMemo(
    () => getMissionCalendarEntries(state, {
      nowMs: now, horizonDays: 14, upcomingLaunches, myAllianceCharter, openSlotAuctions, openNpcDrives,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.accordDocket, state.expeditions, state.buildings, state.activeResearch, state.activeResearch2, upcomingLaunches, myAllianceCharter, openSlotAuctions, openNpcDrives, now],
  );

  const preview = entries.slice(0, 3);
  const dayGroups = useMemo(() => groupCalendarEntriesByDay(entries), [entries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="hud-frame relative rounded-2xl border border-cyan-500/20 p-4" style={{ background: '#050510' }}>
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />

      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-controls="mission-calendar-agenda"
        className="flex w-full items-center justify-between gap-3 text-left"
        style={{ minHeight: 44 }}
      >
        <span className="flex items-center gap-2">
          <GameIcon name="calendar" size={18} glow="cyan" />
          <span className="game-label text-cyan-300">Mission Calendar</span>
          <span className="text-[10px] text-slate-500 font-hud uppercase tracking-wide">Next 14 days</span>
        </span>
        <span className="text-cyan-400 text-[11px] font-hud uppercase tracking-wide shrink-0">
          {expanded ? 'Collapse ▲' : `${entries.length} upcoming ▼`}
        </span>
      </button>

      {/* Compact preview strip — always visible, next 3 entries. */}
      {!expanded && (
        <div className="mt-3 space-y-1.5">
          {preview.map(entry => (
            <CalendarRow key={entry.id} entry={entry} now={now} compact />
          ))}
        </div>
      )}

      {/* Full agenda, grouped by day. */}
      {expanded && (
        <div id="mission-calendar-agenda" className="mt-3 space-y-4">
          {dayGroups.map(group => (
            <div key={group.dayKey}>
              <div className="game-label text-slate-400 text-[10px] mb-1.5">
                {formatDayHeading(group.dayKey, new Date(now))}
              </div>
              <div className="space-y-1.5">
                {group.entries.map(entry => (
                  <CalendarRow key={entry.id} entry={entry} now={now} compact={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarRow({ entry, now, compact }: { entry: CalendarEntry; now: number; compact: boolean }) {
  const remaining = entry.atMs - now;
  const isFinalHour = remaining > 0 && remaining <= 60 * 60 * 1000;
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] border ${CATEGORY_FRAME[entry.category] ?? FALLBACK_CATEGORY_FRAME}`}
      style={{ minHeight: 44 }}
    >
      {/* V1: icon keyed by CATEGORY (not entry.icon) — per-entry emoji is
          authored deep in season/event/program data files outside this
          wave's src/components/game/ sweep scope; the category-level icon
          set (world-calendar.ts CalendarCategory, 16 entries) is what the
          spec's icon inventory calls for and keeps every row's glyph
          sourced from this file's own registry. */}
      <span className="shrink-0"><GameIcon name={calendarCategoryIcon(entry.category)} size={16} /></span>
      <span className="min-w-0 flex-1">
        {CATEGORY_CONCEPT[entry.category] ? (
          <Concept id={CATEGORY_CONCEPT[entry.category]!}>
            <span className="game-label mr-2">{CATEGORY_LABEL[entry.category] ?? FALLBACK_CATEGORY_LABEL}</span>
          </Concept>
        ) : (
          <span className="game-label mr-2">{CATEGORY_LABEL[entry.category] ?? FALLBACK_CATEGORY_LABEL}</span>
        )}
        <span className="text-slate-200">{entry.title}</span>
        {!compact && entry.detail && (
          <span className="block text-slate-500 text-[10px] mt-0.5">{entry.detail}</span>
        )}
        {entry.estimated && (
          <span className="ml-1 text-[10px] text-slate-500 italic">(est.)</span>
        )}
      </span>
      <span className="text-right shrink-0">
        <span className={`block font-hud text-[11px] uppercase tracking-wide ${isFinalHour ? 'text-amber-400' : 'text-cyan-400'}`}>
          {formatCountdown(remaining)}
        </span>
        <span className="block text-slate-500 text-[10px]">{formatEntryTime(entry.atMs)}</span>
      </span>
    </div>
  );
}
