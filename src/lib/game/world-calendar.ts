// ─── Space Tycoon: Live-Service Wave LS3 — Mission Calendar ─────────────────
// docs/LIVE_SERVICE_2026-08.md §LS3. "One calendar tab shows everything
// coming: league lock, senate docket close, alliance event start, co-fund
// windows, real launch windows with in-game bonuses."
//
// This module is a PURE VIEW — no new scheduling state, no drift risk, no
// duplicate source of truth. Every entry is derived on demand from either:
//   (a) the world clock + existing deterministic schedule math already
//       shipped by senate/league/season/alliance-event/NPC-program systems
//       (accord-senate.ts, league-system.ts, seasonal-events.ts,
//       alliance-events.ts, science-missions.ts), or
//   (b) the player's own save state (active research/build timers, live
//       expeditions), or
//   (c) externally-fetched real-world data (the Sol Events upcoming-launch
//       schedule — real-world-feed.ts — passed in, never fetched here, so
//       this module stays DB-free and unit-testable with plain mocks).
//
// World-clock vs player-clock note (appendix defect #2, "two clocks"):
// senate/league/season/alliance-event windows key off the WORLD-shared clock
// (server-time.ts getGlobalGameDate — identical for every player at a given
// wall-clock instant) and so get an EXACT real-UTC timestamp. NPC co-fund
// windows and expeditions are keyed off game-MONTH counters that (pre-LS3)
// mix world-clock and player-local-clock conventions across call sites; this
// module treats "months remaining" for both as elapsing at the WORLD rate
// (server-time.ts REAL_SECONDS_PER_GAME_MONTH, 6 real hours/game-month) —
// the steady-state rate LS1's away-catchup re-anchors a regularly-returning
// player's local clock toward (docs/LIVE_SERVICE_2026-08.md §LS1 item 4).
// Actively-ticking play (state.gameDate's live-tick pace, 60s/game-month at
// 1x) completes these sooner than the calendar shows — a pleasant surprise,
// never a broken promise. This is a documented estimate, not a claim of
// per-second precision; see the NPC/expedition section comments below.

import type { GameState, ExpeditionState } from './types';
import { getGlobalGameDate, SERVER_EPOCH_MS, REAL_SECONDS_PER_GAME_MONTH } from './server-time';
import { getWeeklyMetric } from './league-system';
import { getCurrentSeasonNumber, getSeasonSchedule, SEASON_DEFINITIONS } from './seasonal-events';
import {
  getAllianceEventCycleNumber, getAllianceEventSchedule, ALLIANCE_EVENT_MAP,
  type AllianceEventCategory,
} from './alliance-events';
import { getNpcProgramStatuses } from './science-missions';
import { INTERSTELLAR_SYSTEM_MAP } from './interstellar';
import { RESEARCH_MAP } from './research-tree';
import { BUILDING_MAP } from './buildings';
import { getUpcomingAppointmentEvents } from './appointment-events';
import type { UpcomingLaunchLite } from './real-world-feed';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MS_PER_GAME_MONTH = REAL_SECONDS_PER_GAME_MONTH * 1000;

export type CalendarCategory =
  | 'senate' | 'league' | 'season' | 'alliance_event' | 'npc_program'
  | 'expedition' | 'queue' | 'appointment_event' | 'real_launch';

export type CalendarEntryKind =
  | 'lock' | 'opens' | 'closes' | 'starts' | 'ends' | 'returns' | 'completes' | 'transition';

export interface CalendarEntry {
  id: string;
  category: CalendarCategory;
  title: string;
  icon: string;
  /** Primary timestamp — always UTC ms. Render with the viewer's local
   *  timezone; never format as UTC-only in the UI (item 4 of the LS3 spec:
   *  "store UTC, render local"). */
  atMs: number;
  endMs?: number;
  kind: CalendarEntryKind;
  detail: string;
  href?: string;
  /** true = every player sees the identical entry at the identical time
   *  (senate/league/season/alliance/NPC/appointment/real-launch); false =
   *  personal to this save (queue completions, this player's expeditions). */
  worldShared: boolean;
  /** Best-effort estimate flag — set on entries whose timing depends on
   *  game-month conversion rather than a wall-clock timestamp (see file
   *  header). Omitted (undefined) = exact. */
  estimated?: boolean;
}

export interface MissionCalendarOptions {
  nowMs?: number;
  /** How many days ahead to look. Default 14 (LS3 spec: "next 7-14 days"). */
  horizonDays?: number;
  /** Sol Events upcoming-launch schedule from /api/space-tycoon/world-feed
   *  (real-world-feed.ts getUpcomingLaunchSchedule). Optional — omit for a
   *  calendar with every entry EXCEPT real launches (e.g. in tests, or while
   *  the feed hasn't loaded yet). */
  upcomingLaunches?: UpcomingLaunchLite[];
}

// ─── Generic fixed-UTC weekly-occurrence helper ─────────────────────────────

/** Next occurrence (strictly after nowMs) of a fixed UTC weekday/hour/minute.
 *  utcWeekday: 0=Sunday..6=Saturday (JS Date convention). Pure, reusable for
 *  any "appears every week at the same UTC clock time" appointment — used
 *  here for the league lock (matches the real tycoon-league-processing cron,
 *  `5 0 * * 1` = Monday 00:05 UTC, cron-scheduler.ts). */
export function getNextWeeklyUtcOccurrence(
  nowMs: number,
  utcWeekday: number,
  utcHour: number,
  utcMinute: number,
): number {
  const d = new Date(nowMs);
  const candidateBase = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), utcHour, utcMinute, 0, 0);
  const candidateWeekday = new Date(candidateBase).getUTCDay();
  const dayDiff = ((utcWeekday - candidateWeekday) % 7 + 7) % 7;
  let result = candidateBase + dayDiff * DAY_MS;
  if (result <= nowMs) result += WEEK_MS;
  return result;
}

// ─── Category derivers ───────────────────────────────────────────────────────

function senateEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const docket = state.accordDocket;
  if (!docket || docket.resolved) return [];
  const closeMonth = docket.quarterIndex + 3;
  const closeMs = SERVER_EPOCH_MS + closeMonth * REAL_SECONDS_PER_GAME_MONTH * 1000;
  if (closeMs < nowMs || closeMs > nowMs + horizonMs) return [];
  return [{
    id: `senate_docket_close_${docket.quarterIndex}`,
    category: 'senate',
    title: 'Accord Senate docket closes',
    icon: '📜',
    atMs: closeMs,
    kind: 'closes',
    worldShared: true,
    detail: `${docket.measureIds.length} measure${docket.measureIds.length === 1 ? '' : 's'} up for a vote resolve; the lobbying window ends and the next quarter's docket publishes immediately after.`,
  }];
}

function leagueEntries(nowMs: number, horizonMs: number): CalendarEntry[] {
  // Matches the real tycoon-league-processing cron (cron-scheduler.ts:
  // `5 0 * * 1`, Monday 00:05 UTC) — the actual moment standings freeze and
  // rewards distribute, not the epoch-week-boundary math league-system.ts's
  // getWeekEndMs uses internally for DB bookkeeping.
  const lockMs = getNextWeeklyUtcOccurrence(nowMs, 1, 0, 5);
  if (lockMs > nowMs + horizonMs) return [];
  // weekly-events.ts's getCurrentWeekId() reads Date.now() directly with no
  // parameter — using it here would silently ignore the nowMs this whole
  // module is derived from (a real purity bug: tests / any non-"now" render
  // would show the WRONG week's metric). Recompute the same epoch-aligned
  // week index off nowMs instead so this stays a pure function of its input.
  const weekIndex = Math.floor(nowMs / WEEK_MS);
  const metric = getWeeklyMetric(weekIndex);
  return [{
    id: `league_lock_${lockMs}`,
    category: 'league',
    title: 'League week locks',
    icon: metric.icon,
    atMs: lockMs,
    kind: 'lock',
    worldShared: true,
    detail: `This week's metric: ${metric.name}. Standings freeze, promotions/demotions apply, and rewards distribute.`,
  }];
}

function seasonEntries(nowMs: number, horizonMs: number): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const n = getCurrentSeasonNumber(new Date(nowMs));

  const current = getSeasonSchedule(n);
  const endMs = current.endsAt.getTime();
  if (endMs >= nowMs && endMs <= nowMs + horizonMs) {
    const def = SEASON_DEFINITIONS[current.seasonType];
    entries.push({
      id: `season_end_${n}`,
      category: 'season',
      title: `${def.name} season ends`,
      icon: def.icon,
      atMs: endMs,
      kind: 'ends',
      worldShared: true,
      detail: 'Season pass tiers lock and final standings tally.',
    });
  }

  const next = getSeasonSchedule(n + 1);
  const startMs = next.startsAt.getTime();
  if (startMs >= nowMs && startMs <= nowMs + horizonMs) {
    const def = SEASON_DEFINITIONS[next.seasonType];
    entries.push({
      id: `season_start_${n + 1}`,
      category: 'season',
      title: `${def.name} season begins`,
      icon: def.icon,
      atMs: startMs,
      kind: 'starts',
      worldShared: true,
      detail: def.description,
    });
  }

  return entries;
}

const ALLIANCE_EVENT_CATEGORIES: AllianceEventCategory[] = ['sprint', 'challenge', 'mega_event'];

function allianceEventEntries(nowMs: number, horizonMs: number): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const cat of ALLIANCE_EVENT_CATEGORIES) {
    const currentCycle = getAllianceEventCycleNumber(cat, new Date(nowMs));
    // current + next cycle covers both "still running, ends soon" and
    // "hasn't started yet, starts soon" within the horizon.
    for (const cycle of [currentCycle, currentCycle + 1]) {
      const sched = getAllianceEventSchedule(cat, cycle);
      const def = ALLIANCE_EVENT_MAP.get(sched.type);
      if (!def) continue;
      const startMs = sched.startsAt.getTime();
      const endMs = sched.endsAt.getTime();
      if (endMs < nowMs || startMs > nowMs + horizonMs) continue;
      const upcoming = startMs > nowMs;
      entries.push({
        id: `alliance_${cat}_${cycle}`,
        category: 'alliance_event',
        title: def.name,
        icon: def.icon,
        atMs: upcoming ? startMs : endMs,
        endMs,
        kind: upcoming ? 'starts' : 'ends',
        worldShared: true,
        detail: def.description,
      });
    }
  }
  return entries;
}

function npcProgramEntries(nowMs: number, horizonMs: number): CalendarEntry[] {
  // World-shared month index (see file header) — deterministic and
  // identical for every player at this wall-clock instant, so co-fund
  // windows/settlements are genuinely forecastable, not just per-save.
  const worldMonthIndex = getGlobalGameDate(nowMs).totalMonths;
  const statuses = getNpcProgramStatuses(worldMonthIndex);
  const entries: CalendarEntry[] = [];

  for (const s of statuses) {
    if (s.coFundOpen) {
      const closeMonthsRemaining = (s.cycleStartMonth + s.def.coFundWindowMonths) - worldMonthIndex;
      if (closeMonthsRemaining > 0) {
        const atMs = nowMs + closeMonthsRemaining * MS_PER_GAME_MONTH;
        if (atMs <= nowMs + horizonMs) {
          entries.push({
            id: `npc_${s.def.id}_cofund_close_${s.cycleIndex}`,
            category: 'npc_program',
            title: `${s.def.name} co-fund window closes`,
            icon: s.def.icon,
            atMs,
            kind: 'closes',
            worldShared: true,
            estimated: true,
            detail: `${s.def.factionLabel} program — stake before the window shuts to share in the settlement payout.`,
          });
        }
      }
    }
    if (s.monthsToSettlement > 0) {
      const atMs = nowMs + s.monthsToSettlement * MS_PER_GAME_MONTH;
      if (atMs <= nowMs + horizonMs) {
        entries.push({
          id: `npc_${s.def.id}_settle_${s.cycleIndex}`,
          category: 'npc_program',
          title: `${s.def.name} settles`,
          icon: s.def.icon,
          atMs,
          kind: 'completes',
          worldShared: true,
          estimated: true,
          detail: `${s.def.factionLabel} program cycle ${s.cycleIndex} pays out to co-funders.`,
        });
      }
    }
  }

  return entries;
}

function expeditionEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const exp of state.expeditions || []) {
    if (exp.phase === 'completed' || exp.phase === 'lost' || exp.phase === 'colonizing') continue;
    const entry = nextExpeditionMilestone(exp);
    if (!entry) continue;
    const monthsRemaining = entry.milestoneMonth - exp.monthsElapsed;
    if (monthsRemaining <= 0) continue;
    const atMs = nowMs + monthsRemaining * MS_PER_GAME_MONTH;
    if (atMs > nowMs + horizonMs) continue;
    const system = INTERSTELLAR_SYSTEM_MAP.get(exp.targetSystemId);
    const systemName = system?.name || exp.targetSystemId;
    entries.push({
      id: `expedition_${exp.id}_${entry.kind}`,
      category: 'expedition',
      title: `Expedition to ${systemName} ${entry.label}`,
      icon: '🛰️',
      atMs,
      kind: entry.kind,
      worldShared: false,
      estimated: true,
      detail: `${entry.label[0].toUpperCase()}${entry.label.slice(1)} — ${exp.crew} crew aboard.`,
    });
  }
  return entries;
}

function nextExpeditionMilestone(
  exp: ExpeditionState,
): { milestoneMonth: number; kind: CalendarEntryKind; label: string } | null {
  const returnStartMonth = exp.outboundMonths + exp.exploreMonths;
  const totalMissionMonths = returnStartMonth + exp.outboundMonths;
  if (exp.phase === 'outbound') return { milestoneMonth: exp.outboundMonths, kind: 'transition', label: 'arrives at destination' };
  if (exp.phase === 'exploring') return { milestoneMonth: returnStartMonth, kind: 'transition', label: 'departs for the return journey' };
  if (exp.phase === 'returning') return { milestoneMonth: totalMissionMonths, kind: 'returns', label: 'returns home' };
  return null;
}

function queueEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const entries: CalendarEntry[] = [];

  const pushResearch = (label: string, key: string) => {
    const active = key === 'q1' ? state.activeResearch : state.activeResearch2;
    if (!active) return;
    const atMs = active.startedAtMs + active.realDurationSeconds * 1000;
    if (atMs < nowMs || atMs > nowMs + horizonMs) return;
    const def = RESEARCH_MAP.get(active.definitionId);
    entries.push({
      id: `queue_research_${key}_${active.definitionId}_${active.startedAtMs}`,
      category: 'queue',
      title: `Research complete: ${def?.name || active.definitionId}`,
      icon: '🔬',
      atMs,
      kind: 'completes',
      worldShared: false,
      detail: `${label} finishes — the next queued research order (if any) starts automatically.`,
    });
  };
  pushResearch('Research Queue 1', 'q1');
  pushResearch('Research Queue 2', 'q2');

  for (const bld of state.buildings) {
    if (bld.isComplete) continue;
    const atMs = (bld.startedAtMs || 0) + (bld.realDurationSeconds || 0) * 1000;
    if (atMs < nowMs || atMs > nowMs + horizonMs) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    entries.push({
      id: `queue_build_${bld.instanceId}`,
      category: 'queue',
      title: `Construction complete: ${def?.name || bld.definitionId}`,
      icon: '🏗️',
      atMs,
      kind: 'completes',
      worldShared: false,
      detail: 'Construction slot frees up — the next queued build order (if any) starts automatically.',
    });
  }

  return entries;
}

function appointmentEventEntries(nowMs: number, horizonDays: number): CalendarEntry[] {
  return getUpcomingAppointmentEvents(nowMs, horizonDays).map(ev => {
    const upcoming = ev.startsAtMs > nowMs;
    return {
      id: `appointment_${ev.def.id}_${ev.weekIndex}`,
      category: 'appointment_event' as const,
      title: ev.def.name,
      icon: ev.def.icon,
      atMs: upcoming ? ev.startsAtMs : ev.endsAtMs,
      endMs: ev.endsAtMs,
      kind: upcoming ? ('starts' as const) : ('ends' as const),
      worldShared: true,
      detail: ev.def.description,
    };
  });
}

function realLaunchEntries(
  upcomingLaunches: UpcomingLaunchLite[] | undefined,
  nowMs: number,
  horizonMs: number,
): CalendarEntry[] {
  if (!upcomingLaunches || upcomingLaunches.length === 0) return [];
  return upcomingLaunches
    .filter(l => l.launchDateMs >= nowMs && l.launchDateMs <= nowMs + horizonMs)
    .map(l => ({
      id: `real_launch_${l.id}`,
      category: 'real_launch' as const,
      title: l.agency ? `${l.agency}: ${l.name}` : l.name,
      icon: '🚀',
      atMs: l.launchDateMs,
      kind: 'starts' as const,
      worldShared: true,
      detail: 'Real launch — a 3-hour world-shared launch-ops bonus window opens around T-0.',
      href: '/live',
    }));
}

// ─── Orchestrator ──────────────────────────────────────────────────────────

const DEFAULT_HORIZON_DAYS = 14;

/**
 * All Mission Calendar entries for a save, sorted ascending by atMs, within
 * the requested horizon (default 14 days). Pure — same inputs always
 * produce the same output, safe to call on every render.
 */
export function getMissionCalendarEntries(state: GameState, opts: MissionCalendarOptions = {}): CalendarEntry[] {
  const nowMs = opts.nowMs ?? Date.now();
  const horizonDays = opts.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const horizonMs = horizonDays * DAY_MS;

  const entries: CalendarEntry[] = [
    ...senateEntries(state, nowMs, horizonMs),
    ...leagueEntries(nowMs, horizonMs),
    ...seasonEntries(nowMs, horizonMs),
    ...allianceEventEntries(nowMs, horizonMs),
    ...npcProgramEntries(nowMs, horizonMs),
    ...expeditionEntries(state, nowMs, horizonMs),
    ...queueEntries(state, nowMs, horizonMs),
    ...appointmentEventEntries(nowMs, horizonDays),
    ...realLaunchEntries(opts.upcomingLaunches, nowMs, horizonMs),
  ];

  return entries
    .filter(e => e.atMs >= nowMs && e.atMs <= nowMs + horizonMs)
    .sort((a, b) => a.atMs - b.atMs);
}

/** Group already-sorted entries by local calendar day (viewer's timezone) —
 *  the shape MissionCalendarPanel's agenda view renders. Pure/UI-agnostic so
 *  it's independently testable. */
export function groupCalendarEntriesByDay(entries: CalendarEntry[]): { dayKey: string; entries: CalendarEntry[] }[] {
  const groups = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.atMs);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups.has(dayKey)) groups.set(dayKey, []);
    groups.get(dayKey)!.push(entry);
  }
  return Array.from(groups.entries()).map(([dayKey, es]) => ({ dayKey, entries: es }));
}
