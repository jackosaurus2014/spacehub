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
  type CalendarEntry, type CalendarCategory,
} from '@/lib/game/world-calendar';
import type { UpcomingLaunchLite } from '@/lib/game/real-world-feed';

const POLL_MS = 5 * 60 * 1000; // matches world-feed route's 5-minute cache TTL
const TICK_MS = 30 * 1000; // countdown refresh — text only, no animation

const CATEGORY_LABEL: Record<CalendarCategory, string> = {
  senate: 'Accord Senate',
  league: 'League',
  season: 'Season',
  alliance_event: 'Alliance Event',
  npc_program: 'NPC Program',
  expedition: 'Expedition',
  queue: 'Command Queue',
  appointment_event: 'World Event',
  real_launch: 'Real Launch',
};

const CATEGORY_FRAME: Record<CalendarCategory, string> = {
  senate: 'border-purple-500/25 bg-purple-500/[0.03]',
  league: 'border-amber-500/25 bg-amber-500/[0.03]',
  season: 'border-cyan-500/25 bg-cyan-500/[0.03]',
  alliance_event: 'border-pink-500/25 bg-pink-500/[0.03]',
  npc_program: 'border-emerald-500/25 bg-emerald-500/[0.03]',
  expedition: 'border-indigo-500/25 bg-indigo-500/[0.03]',
  queue: 'border-slate-500/25 bg-slate-500/[0.03]',
  appointment_event: 'border-red-500/25 bg-red-500/[0.03]',
  real_launch: 'border-orange-500/25 bg-orange-500/[0.03]',
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

interface Props {
  state: GameState;
}

export default function MissionCalendarPanel({ state }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [upcomingLaunches, setUpcomingLaunches] = useState<UpcomingLaunchLite[]>([]);
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

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(tick);
  }, []);

  const entries = useMemo(
    () => getMissionCalendarEntries(state, { nowMs: now, horizonDays: 14, upcomingLaunches }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.accordDocket, state.expeditions, state.buildings, state.activeResearch, state.activeResearch2, upcomingLaunches, now],
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
          <span className="text-lg" aria-hidden="true">🗓️</span>
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
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] border ${CATEGORY_FRAME[entry.category]}`}
      style={{ minHeight: 44 }}
    >
      <span className="text-base shrink-0" aria-hidden="true">{entry.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="game-label mr-2">{CATEGORY_LABEL[entry.category]}</span>
        <span className="text-slate-200">{entry.title}</span>
        {!compact && entry.detail && (
          <span className="block text-slate-500 text-[10px] mt-0.5">{entry.detail}</span>
        )}
        {entry.estimated && (
          <span className="ml-1 text-[9px] text-slate-500 italic">(est.)</span>
        )}
      </span>
      <span className="text-right shrink-0">
        <span className={`block font-hud text-[11px] uppercase tracking-wide ${isFinalHour ? 'text-amber-400' : 'text-cyan-400'}`}>
          {formatCountdown(remaining)}
        </span>
        <span className="block text-slate-500 text-[9px]">{formatEntryTime(entry.atMs)}</span>
      </span>
    </div>
  );
}
