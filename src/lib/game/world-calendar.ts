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
// Since the 2026-09-02 clock unification the live tick accrues on the SAME
// 6 h/game-month calendar (constants.ts TICKS_PER_GAME_MONTH is derived from
// it), so the estimate and the experience agree. This is still a documented
// estimate, not a claim of per-second precision; see the NPC/expedition
// section comments below.

import type { GameState, ExpeditionState } from './types';
import { getGlobalGameDate, SERVER_EPOCH_MS, REAL_SECONDS_PER_GAME_MONTH } from './server-time';
import { getWeeklyMetric } from './league-system';
import { getCurrentSeasonNumber, getSeasonSchedule, SEASON_DEFINITIONS } from './seasonal-events';
// Live-Service Wave LS7 (docs/LIVE_SERVICE_2026-08.md §LS7): commodity
// super-cycle announcement entry — a SEPARATE deriver (superCycleEntries
// below), following this file's one-function-per-system convention.
// getSuperCycleForSeason is pure/DB-free (economic-seasons.ts), so the
// announcement fires purely off the clock — no season row needs to exist
// yet for players to see it coming, same "forecastable from the schedule
// alone" property seasonEntries already has.
import { getSuperCycleForSeason, getThemeHeadlines, SUPER_CYCLE_ANNOUNCE_LEAD_MS } from './economic-seasons';
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
// Live-Service Wave LS6 (docs/LIVE_SERVICE_2026-08.md §LS6): program
// completion ETAs + leader retirement dates, following the exact
// queueEntries precedent below (personal, non-world-shared, derived from
// the save's own wall-clock timestamps — no new scheduling state).
import { getProgramQueue, PROGRAM_DEF_MAP } from './programs';
import { COMMANDER_MAP, getRetirementEtaMs } from './commanders';
// Live-Service Wave LS4 (docs/LIVE_SERVICE_2026-08.md §LS4): era-end entry —
// a small additive deriver following this file's existing pattern exactly
// (personal/non-world-shared, wall-clock atMs, no new scheduling state; the
// era's own endsAtMs IS the source of truth, corporate-eras.ts never
// duplicates it).
import { ERA_CHARTER_MAP } from './corporate-eras';
// Live-Service Wave LS9 (docs/LIVE_SERVICE_2026-08.md §LS9): the next
// Realignment date + a published-band preview — a SEPARATE deriver
// following this file's existing convention (see corporateEraEntries just
// above). Pure/DB-free (realignment.ts's own header), world-shared like
// senate/league/season.
import { getCurrentRealignmentEpoch, getEpochWindow, POSTURE_BAND_MIN, POSTURE_BAND_MAX } from './realignment';
// Live-Service Wave LS8 (docs/LIVE_SERVICE_2026-08.md §LS8): calendar-dated
// Story Chapter beats — a SEPARATE deriver (chapterEntries below) following
// this file's one-function-per-system convention. getCurrentChapterInstance
// is a pure function of nowMs alone (chapters.ts's own header), so — like
// senate/league/season above — the whole entry is forecastable straight off
// the clock, no chapter row or save state required.
import { getCurrentChapterInstance, getActRevealMs, getChapterForCycle } from './chapters';
// AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md): the Accord Chair
// election. Pure/DB-free (accord-chair.ts's term math is a function of the
// UTC clock alone), world-shared like senate/league/season.
import { getChairPhase, getChairTermWindow } from './accord-chair';
// AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md): the systemic-crisis
// calendar. Pure wall-clock functions plus a display-only tier lookup — no
// DB, so this module keeps the property senate/league/season depend on.
import {
  getCrisisWindow, getCrisisForCycle, effectiveCrisisTier,
  CRISIS_STAGES, CRISIS_TIER_LABEL,
} from './systemic-crises';
// Live-Service Wave LS5 (docs/LIVE_SERVICE_2026-08.md §LS5): alliance season
// charter deadline entry — a SEPARATE deriver function per this file's
// existing convention (each system gets its own function; see
// corporateEraEntries directly above for the LS4 precedent this follows).
// Charter data is server-only (AllianceCharter has no GameState mirror — see
// alliance-charters.ts's header), so it's injected the same way
// upcomingLaunches already is: fetched by the caller, passed in, never
// queried from here (this module stays DB-free and unit-testable). Reuses
// this file's own getNextWeeklyUtcOccurrence (defined below) for the weekly
// pledge-close entry — no new import needed for that half.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MS_PER_GAME_MONTH = REAL_SECONDS_PER_GAME_MONTH * 1000;

export type CalendarCategory =
  | 'senate' | 'league' | 'season' | 'alliance_event' | 'npc_program'
  | 'expedition' | 'queue' | 'appointment_event' | 'real_launch' | 'corporate_era'
  | 'alliance_charter' | 'economic_cycle' | 'program' | 'leader_retirement' | 'realignment'
  | 'story_chapter' | 'slot_auction' | 'procurement_drive'
  // Wave M6 (docs/MEANINGFUL_2026-08.md §M6): tender offers are public,
  // priced, time-boxed — and calendar-visible. Derived from state.equity
  // (the sync snapshot), keeping this module DB-free.
  | 'tender_offer'
  // AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md): the Accord Chair
  // election — nominations open, nominations close, ballot certifies. Pure
  // function of the UTC clock (accord-chair.ts's term math), so it needs no
  // state at all and stays DB-free like senate/league/season.
  | 'chair_election'
  // AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md): the systemic-crisis
  // cycle — onset, each stage boundary, the assessment deadline, and the
  // aftermath. Which crisis runs is a pure function of the wall clock, so
  // the ONSET and STAGE entries need no state and this module stays DB-free;
  // the severity a player reads beside them comes from the sync snapshot.
  | 'systemic_crisis';

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
  /** LS5: the player's alliance's active season charter, from
   *  GET /api/space-tycoon/alliances/charter. Optional — omit for a
   *  calendar with every entry EXCEPT the charter deadline (no alliance, no
   *  active charter, or not yet loaded). */
  myAllianceCharter?: CalendarCharterLite | null;
  /** E7 (docs/ECONOMY_PVP_2026-08.md §E7): open orbital-slot lease auctions,
   *  from GET /api/space-tycoon/orbital-slots (openAuctions). Server-only
   *  data, injected the same way upcomingLaunches/myAllianceCharter are —
   *  this module stays DB-free. Optional — omit for a calendar with every
   *  entry EXCEPT auction closings. */
  openSlotAuctions?: CalendarSlotAuctionLite[];
  /** E7: open NPC procurement drives (BiddingContract rows with
   *  issuerNpcId set), from GET /api/space-tycoon/bidding?status=open,
   *  pre-filtered to NPC-issued. Optional — omit for a calendar with every
   *  entry EXCEPT drive deadlines. */
  openNpcDrives?: CalendarNpcDriveLite[];
}

/** Minimal shape the slot-auction deriver needs. */
export interface CalendarSlotAuctionLite {
  id: string;
  locationId: string;
  locationLabel: string;
  closesAt: number; // ms epoch
}

/** Minimal shape the NPC-drive deriver needs. */
export interface CalendarNpcDriveLite {
  id: string;
  title: string;
  npcName: string;
  biddingEndsAt: number; // ms epoch
}

/** Minimal shape the charter deriver needs — deliberately narrow so the
 *  route's richer response (board, escrow, etc.) doesn't leak a coupling
 *  into this pure module. */
export interface CalendarCharterLite {
  id: string;
  name: string;
  icon: string;
  endsAtMs: number;
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

/** AAA Round 1 wave E1 — the Accord Chair election. Three world-shared
 *  appointments per monthly term, all derived from the UTC clock alone
 *  (getChairTermWindow), so — like senate/league/season above — the whole
 *  entry is forecastable straight off the calendar with no save state and no
 *  DB read. `state.accordChair` is consulted only to colour the detail line
 *  with the live tally when a snapshot happens to be present. */
function chairElectionEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const phase = getChairPhase(nowMs);
  const win = getChairTermWindow(phase.contestedTermIndex);
  const snap = state.accordChair;
  // Honest copy: while the gate is closed the calendar says so rather than
  // advertising an election that will certify a vacancy.
  const gateNote = snap && !snap.enabled
    ? ` The chamber is short of the ${snap.requiredElectorate}-corporation electorate the Accord requires (${snap.electorate} publishing today), so the seat will stand vacant.`
    : '';
  const out: CalendarEntry[] = [
    {
      id: `chair_nominations_open_${win.termIndex}`,
      category: 'chair_election',
      title: `Accord Chair nominations open — ${win.label} term`,
      icon: '🏛️',
      atMs: win.campaignOpensMs,
      kind: 'opens',
      worldShared: true,
      detail: `Candidacies and ballots open for the ${win.label} term of the Accord Chair. Vote weight comes from your published quarterly reports.${gateNote}`,
    },
    {
      id: `chair_nominations_close_${win.termIndex}`,
      category: 'chair_election',
      title: 'Accord Chair nominations close',
      icon: '🏛️',
      atMs: win.nominationsCloseMs,
      kind: 'closes',
      worldShared: true,
      detail: 'No further candidacies may be filed; every platform is public for the remaining 72 hours of the ballot.',
    },
    {
      id: `chair_certification_${win.termIndex}`,
      category: 'chair_election',
      title: `Accord Chair certified — ${win.label} term`,
      icon: '🏛️',
      atMs: win.ballotClosesMs,
      kind: 'closes',
      worldShared: true,
      detail: 'The ballot closes and the Council certifies the result. The seated Chair may then exercise agenda writs over the Senate docket.',
    },
  ];
  return out.filter(e => e.atMs >= nowMs && e.atMs <= nowMs + horizonMs);
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

/** LS7: the upcoming season's commodity super-cycle, announced
 *  SUPER_CYCLE_ANNOUNCE_LEAD_MS (7 real days) before that season starts —
 *  "positioning inventory before the announced cycle is the intelligence-
 *  layer play" (spec). One entry, fired once per season transition; if the
 *  horizon window is shorter than the lead time (e.g. the default 14-day
 *  view opened mid-lead) it still surfaces because the announcement instant
 *  itself, not the season start, is what's being scheduled here. */
function superCycleEntries(nowMs: number, horizonMs: number): CalendarEntry[] {
  const n = getCurrentSeasonNumber(new Date(nowMs));
  const next = getSeasonSchedule(n + 1);
  const announceMs = next.startsAt.getTime() - SUPER_CYCLE_ANNOUNCE_LEAD_MS;
  if (announceMs < nowMs || announceMs > nowMs + horizonMs) return [];

  const theme = getSuperCycleForSeason(n + 1);
  const def = SEASON_DEFINITIONS[next.seasonType];
  const headlines = getThemeHeadlines(theme).slice(0, 3).map(h => h.label).join(', ');

  return [{
    id: `super_cycle_announce_${n + 1}`,
    category: 'economic_cycle',
    title: `${theme.name} super-cycle announced`,
    icon: theme.icon,
    atMs: announceMs,
    kind: 'opens',
    worldShared: true,
    detail: headlines
      ? `Ahead of ${def.name} (Season ${n + 1}): ${headlines}. Bounded ±25% — position inventory now.`
      : `Ahead of ${def.name} (Season ${n + 1}): ${theme.description}`,
  }];
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

function corporateEraEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const active = state.corporateEras?.currentEra;
  if (!active) return [];
  if (active.endsAtMs < nowMs || active.endsAtMs > nowMs + horizonMs) return [];
  const charter = ERA_CHARTER_MAP.get(active.charterId);
  return [{
    id: `corporate_era_end_${active.eraIndex}`,
    category: 'corporate_era',
    title: `${charter?.name || 'Chartered era'} ends`,
    icon: charter?.icon || '🏛️',
    atMs: active.endsAtMs,
    kind: 'ends',
    worldShared: false,
    detail: 'Your 90-day charter closes — the era medal is graded and recorded, then the next charter is yours to declare.',
  }];
}

/** LS9 — the next Realignment (real-world UTC calendar quarter boundary),
 *  world-shared like senate/league/season. The band preview is published
 *  ahead of time (forecastable, CLAUDE.md invariant) rather than the actual
 *  outcome, which isn't knowable until the epoch's aggregate senate/season
 *  data exists. */
function realignmentEntries(nowMs: number, horizonMs: number): CalendarEntry[] {
  const currentEpoch = getCurrentRealignmentEpoch(nowMs);
  const next = getEpochWindow(currentEpoch + 1);
  if (next.startMs < nowMs || next.startMs > nowMs + horizonMs) return [];
  const bandPct = Math.round((POSTURE_BAND_MAX - 1) * 100);
  return [{
    id: `realignment_${next.epochIndex}`,
    category: 'realignment',
    title: `Epoch ${next.year} Q${next.quarter} Realignment`,
    icon: '🌐',
    atMs: next.startMs,
    kind: 'starts',
    worldShared: true,
    detail: `Faction postures shift within their published ±${bandPct}% band, NPC market bias re-aligns, and the Epoch Address publishes with the new roadmap spotlight.`,
    href: '/space-tycoon/epoch',
  }];
}

/** LS5: alliance season charter entries — the season-end deadline (personal:
 *  only this alliance sees it, unlike league/senate which fire for
 *  everyone) plus the weekly pledge-close lock, aligned to the SAME fixed
 *  UTC slot as the league lock (`getNextWeeklyUtcOccurrence(nowMs, 1, 0, 5)`
 *  — Monday 00:05 UTC, matching alliance-cron's step 10). Co-fund
 *  settlements are intentionally NOT duplicated here — npcProgramEntries
 *  above already covers them and the underlying cycle math is unchanged by
 *  the LS5 server-stake conversion (only who pays/gets paid moved
 *  server-side, not the schedule). */
function charterEntries(
  charter: CalendarCharterLite | null | undefined,
  nowMs: number,
  horizonMs: number,
): CalendarEntry[] {
  if (!charter) return [];
  const entries: CalendarEntry[] = [];

  if (charter.endsAtMs >= nowMs && charter.endsAtMs <= nowMs + horizonMs) {
    entries.push({
      id: `charter_ends_${charter.id}`,
      category: 'alliance_charter',
      title: `${charter.name} season ends`,
      icon: charter.icon,
      atMs: charter.endsAtMs,
      kind: 'ends',
      worldShared: false,
      detail: 'Final grading — remaining escrow refunds to the treasury and the next charter is yours to ratify.',
    });
  }

  const pledgeCloseMs = getNextWeeklyUtcOccurrence(nowMs, 1, 0, 5);
  if (pledgeCloseMs <= nowMs + horizonMs) {
    entries.push({
      id: `charter_pledge_close_${charter.id}_${pledgeCloseMs}`,
      category: 'alliance_charter',
      title: `${charter.name}: weekly pledge closes`,
      icon: charter.icon,
      atMs: pledgeCloseMs,
      kind: 'lock',
      worldShared: false,
      detail: 'Met pledges pay a stipend from the charter escrow and add alliance XP. Missing the week only forfeits the stipend — no penalty.',
    });
  }

  return entries;
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

/** LS6 — the active head of each program track (personal, wall-clock —
 *  same pattern as queueEntries above for research/build). Queued-but-not-
 *  started instances have no ETA yet, so only startedAtMs !== null heads
 *  produce an entry. */
function programEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const track of ['crew_cohort', 'leader_development', 'rd_residency'] as const) {
    const head = getProgramQueue(state, track)[0];
    if (!head || head.startedAtMs === null) continue;
    const atMs = head.startedAtMs + head.durationMs;
    if (atMs < nowMs || atMs > nowMs + horizonMs) continue;
    const def = PROGRAM_DEF_MAP.get(head.defId);
    const commanderName = head.targetCommanderId ? COMMANDER_MAP.get(head.targetCommanderId)?.name : undefined;
    entries.push({
      id: `program_${track}_${head.id}`,
      category: 'program',
      title: commanderName ? `${commanderName}: ${head.label} complete` : `${head.label} complete`,
      icon: def?.icon || '🎓',
      atMs,
      kind: 'completes',
      worldShared: false,
      detail: track === 'crew_cohort'
        ? 'Cohort certification completes — the workforce bonus goes live.'
        : 'Posting completes — XP and any trait unlock apply, then re-assign them.',
    });
  }
  return entries;
}

/** LS6 — a currently-assigned leader's retirement ETA (personal). Only
 *  fires for commanders actually on the clock — see commanders.ts's
 *  getRetirementEtaMs / the assignedSinceMs field-header trade-off note
 *  (benched commanders never retire, so they never appear here). */
function leaderRetirementEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const h of state.hiredCommanders || []) {
    const etaMs = getRetirementEtaMs(h);
    if (etaMs === null || etaMs < nowMs || etaMs > nowMs + horizonMs) continue;
    const def = COMMANDER_MAP.get(h.definitionId);
    entries.push({
      id: `leader_retirement_${h.definitionId}`,
      category: 'leader_retirement',
      title: `${def?.name || h.definitionId} approaches retirement`,
      icon: '🎖️',
      atMs: etaMs,
      kind: 'completes',
      worldShared: false,
      detail: 'Two real months of continuous assignment complete — they retire with a legacy grant and a mentor boost for their successor. Reassigning them to a different post resets this clock.',
    });
  }
  return entries;
}

/** LS8 — calendar-dated Story Chapter beats: the next unrevealed act, the
 *  finale weekend window (start if upcoming, end if currently running), and
 *  the moment the epilogue ends / the next chapter's Act 1 opens.
 *  World-shared — every player sees the identical timing
 *  (getCurrentChapterInstance is a pure function of nowMs alone). */
function chapterEntries(nowMs: number, horizonMs: number): CalendarEntry[] {
  const inst = getCurrentChapterInstance(nowMs);
  const entries: CalendarEntry[] = [];
  const def = inst.def;

  if (inst.revealedActCount < def.acts.length) {
    const nextActIndex = inst.revealedActCount;
    const atMs = getActRevealMs(inst.cycleIndex, nextActIndex);
    if (atMs >= nowMs && atMs <= nowMs + horizonMs) {
      const act = def.acts[nextActIndex];
      entries.push({
        id: `chapter_act_${def.id}_${inst.cycleIndex}_${nextActIndex}`,
        category: 'story_chapter',
        title: `${def.name}: ${act.name}`,
        icon: act.icon,
        atMs,
        kind: 'starts',
        worldShared: true,
        detail: act.description,
      });
    }
  }

  if (!inst.finaleClosed) {
    const { startMs, endMs } = inst.finaleWindow;
    const upcoming = startMs > nowMs;
    const atMs = upcoming ? startMs : endMs;
    if (atMs >= nowMs && atMs <= nowMs + horizonMs) {
      entries.push({
        id: `chapter_finale_${def.id}_${inst.cycleIndex}`,
        category: 'story_chapter',
        title: `${def.name}: ${def.finale.name}`,
        icon: def.finale.icon,
        atMs,
        endMs,
        kind: upcoming ? 'starts' : 'ends',
        worldShared: true,
        detail: def.finale.description,
      });
    }
  } else {
    const atMs = inst.epilogueEndMs;
    if (atMs >= nowMs && atMs <= nowMs + horizonMs) {
      const nextDef = getChapterForCycle(inst.cycleIndex + 1);
      entries.push({
        id: `chapter_next_${nextDef.id}_${inst.cycleIndex + 1}`,
        category: 'story_chapter',
        title: `Next chapter: ${nextDef.name}`,
        icon: nextDef.icon,
        atMs,
        kind: 'starts',
        worldShared: true,
        detail: nextDef.tagline,
      });
    }
  }

  return entries;
}

/** E7 — sealed-bid orbital-slot lease auction closings. World-shared (every
 *  player sees the identical auction/close time). Server-only source data
 *  (injected, see MissionCalendarOptions.openSlotAuctions header). */
function slotAuctionEntries(auctions: CalendarSlotAuctionLite[] | undefined, nowMs: number, horizonMs: number): CalendarEntry[] {
  if (!auctions || auctions.length === 0) return [];
  const entries: CalendarEntry[] = [];
  for (const a of auctions) {
    if (a.closesAt < nowMs || a.closesAt > nowMs + horizonMs) continue;
    entries.push({
      id: `slot_auction_${a.id}`,
      category: 'slot_auction',
      title: `${a.locationLabel} slot lease auction closes`,
      icon: '🛰',
      atMs: a.closesAt,
      kind: 'closes',
      worldShared: true,
      detail: 'Sealed bids close and the winner is awarded — bid before the window shuts.',
    });
  }
  return entries;
}

/** E7 — NPC procurement drive bidding deadlines (NPC_BACKDROP "visible and
 *  forecastable"). World-shared. Server-only source data (injected). */
function procurementDriveEntries(drives: CalendarNpcDriveLite[] | undefined, nowMs: number, horizonMs: number): CalendarEntry[] {
  if (!drives || drives.length === 0) return [];
  const entries: CalendarEntry[] = [];
  for (const d of drives) {
    if (d.biddingEndsAt < nowMs || d.biddingEndsAt > nowMs + horizonMs) continue;
    entries.push({
      id: `procurement_drive_${d.id}`,
      category: 'procurement_drive',
      title: `${d.npcName}: bidding closes`,
      icon: '📢',
      atMs: d.biddingEndsAt,
      kind: 'closes',
      worldShared: true,
      detail: `${d.title} — lowest qualified bid wins the contract.`,
    });
  }
  return entries;
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
    ...superCycleEntries(nowMs, horizonMs),
    ...allianceEventEntries(nowMs, horizonMs),
    ...npcProgramEntries(nowMs, horizonMs),
    ...expeditionEntries(state, nowMs, horizonMs),
    ...queueEntries(state, nowMs, horizonMs),
    ...corporateEraEntries(state, nowMs, horizonMs),
    ...charterEntries(opts.myAllianceCharter, nowMs, horizonMs),
    ...appointmentEventEntries(nowMs, horizonDays),
    ...realLaunchEntries(opts.upcomingLaunches, nowMs, horizonMs),
    ...programEntries(state, nowMs, horizonMs),
    ...leaderRetirementEntries(state, nowMs, horizonMs),
    ...realignmentEntries(nowMs, horizonMs),
    ...chapterEntries(nowMs, horizonMs),
    ...slotAuctionEntries(opts.openSlotAuctions, nowMs, horizonMs),
    ...procurementDriveEntries(opts.openNpcDrives, nowMs, horizonMs),
    ...tenderOfferEntries(state, nowMs, horizonMs),
    ...chairElectionEntries(state, nowMs, horizonMs),
    ...systemicCrisisEntries(state, nowMs, horizonMs),
  ];

  return entries
    .filter(e => e.atMs >= nowMs && e.atMs <= nowMs + horizonMs)
    .sort((a, b) => a.atMs - b.atMs);
}

/** AAA Round 2 — the systemic-crisis cycle. Four kinds of appointment, all
 *  world-shared and all derivable from the wall clock alone (this module
 *  stays DB-free — the same property `senate`, `league` and `season` rely
 *  on): the next crisis's ONSET, the next STAGE boundary inside an open
 *  window, the ASSESSMENT deadline (= the close of the active window), and
 *  the AFTERMATH week when the relief lands.
 *
 *  The severity shown alongside comes from `state.systemicCrisis` when a
 *  snapshot has arrived; with no snapshot the entries still publish — a
 *  forecast that says "this is what is scheduled, severity not yet
 *  measured" is honest, while hiding the calendar until a network round trip
 *  lands is not. */
function systemicCrisisEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const win = getCrisisWindow(nowMs);
  const def = getCrisisForCycle(win.cycleIndex);
  const snap = state.systemicCrisis;
  const severity = snap?.enabled && snap.cycleIndex === win.cycleIndex
    ? `Published severity: ${CRISIS_TIER_LABEL[effectiveCrisisTier(state, snap)]}.`
    : 'Severity is measured and published when the forecast phase opens.';
  const entries: CalendarEntry[] = [];
  const inHorizon = (t: number) => t >= nowMs && t <= nowMs + horizonMs;

  if (inHorizon(win.activeStartMs)) {
    entries.push({
      id: `crisis_onset_${win.cycleIndex}`,
      category: 'systemic_crisis',
      title: `${def.name}: emergency window opens`,
      icon: def.icon,
      atMs: win.activeStartMs,
      endMs: win.activeEndMs,
      kind: 'opens',
      worldShared: true,
      detail: `${def.tagline} ${severity}`,
    });
  }

  // Next stage boundary inside an open window — the recurring weekly beat.
  if (win.phase === 'active') {
    const nextStage = Math.min(CRISIS_STAGES, win.stage + 1);
    const stageMs = win.activeStartMs + (nextStage / CRISIS_STAGES) * (win.activeEndMs - win.activeStartMs);
    if (nextStage < CRISIS_STAGES && inHorizon(stageMs)) {
      entries.push({
        id: `crisis_stage_${win.cycleIndex}_${nextStage}`,
        category: 'systemic_crisis',
        title: `${def.name}: stage ${nextStage + 1} of ${CRISIS_STAGES}`,
        icon: def.icon,
        atMs: stageMs,
        kind: 'transition',
        worldShared: true,
        detail: 'Your chosen posture is charged again and the exposure bar advances. Change posture in Reports → Emergency before the boundary if you mean to.',
      });
    }
  }

  if (inHorizon(win.activeEndMs)) {
    entries.push({
      id: `crisis_assessment_${win.cycleIndex}`,
      category: 'systemic_crisis',
      title: `${def.name}: Accord assessment closes`,
      icon: '🤝',
      atMs: win.activeEndMs,
      kind: 'closes',
      worldShared: true,
      detail: snap?.enabled && snap.assessmentTargetUsd > 0
        ? `$${Math.round(snap.pledgedUsd / 1e6).toLocaleString()}M pledged of a $${Math.round(snap.assessmentTargetUsd / 1e6).toLocaleString()}M target from ${snap.pledgeCount} corporation${snap.pledgeCount === 1 ? '' : 's'}. Whether the target is met changes the aftermath for every corporation the emergency reached — pledger or not.`
        : 'The last moment to pledge to the Accord Stabilization Assessment. Whether the target is met changes the aftermath for every corporation the emergency reached.',
    });
  }

  if (inHorizon(win.aftermathStartMs)) {
    entries.push({
      id: `crisis_aftermath_${win.cycleIndex}`,
      category: 'systemic_crisis',
      title: `${def.name}: relief allocated`,
      icon: '📋',
      atMs: win.aftermathStartMs,
      kind: 'starts',
      worldShared: true,
      detail: 'The assessment is spent on the directed relief allocation and the cycle is sealed into the Accord register.',
    });
  }

  return entries;
}

/** M6 — tender-offer contest deadlines (docs/MEANINGFUL_2026-08.md §M6:
 *  "public, priced, time-boxed — calendar-visible"). Personal lens over the
 *  sync-delivered equity snapshot: offers TARGETING me and offers I opened.
 *  Null snapshot (gate closed / never synced) = no entries. */
function tenderOfferEntries(state: GameState, nowMs: number, horizonMs: number): CalendarEntry[] {
  const equity = state.equity;
  if (!equity?.enabled) return [];
  const entries: CalendarEntry[] = [];
  const seen = new Set<string>();
  for (const t of equity.tendersOnMe || []) {
    if (t.status !== 'open' || t.closesAtMs < nowMs || t.closesAtMs > nowMs + horizonMs) continue;
    seen.add(t.id);
    entries.push({
      id: `tender_offer_${t.id}`,
      category: 'tender_offer',
      title: t.kind === 'buyback'
        ? 'Your buyback counteroffer closes'
        : `${t.initiatorName}'s tender for your corporation closes`,
      icon: '🏢',
      atMs: t.closesAtMs,
      kind: 'closes',
      worldShared: false,
      detail: `$${Math.round(t.pricePerShare).toLocaleString()}/share for ${t.sharesSought} shares — the contest resolves deterministically at the deadline (highest price wins; the board's counteroffer wins ties).`,
    });
  }
  for (const o of equity.myOffers || []) {
    if (o.status !== 'open' || seen.has(o.id) || o.closesAtMs < nowMs || o.closesAtMs > nowMs + horizonMs) continue;
    entries.push({
      id: `tender_offer_${o.id}`,
      category: 'tender_offer',
      title: o.kind === 'raise'
        ? 'Your capital raise listing closes'
        : o.kind === 'distress'
          ? 'Your distress tranche listing closes'
          : `Your offer on ${o.targetName} closes`,
      icon: '🏢',
      atMs: o.closesAtMs,
      kind: 'closes',
      worldShared: false,
      detail: `$${Math.round(o.pricePerShare).toLocaleString()}/share × ${o.sharesSought} shares.`,
    });
  }
  return entries;
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
