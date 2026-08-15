// ─── Space Tycoon: Returning Commander Track (Live-Service Wave LS2) ────────
// docs/LIVE_SERVICE_2026-08.md §LS2 mechanic 2. A lapse of
// RETURNING_COMMANDER_LAPSE_MS (14 real days) or more triggers a 7-day
// re-engagement track — one objective per CLAUDE.md time loop (tactical /
// daily / weekly / monthly) — plus a one-time re-entry stipend and a
// temporary earnings boost that reuses catchup-mechanics.ts's
// getNewcomerMultiplier SHAPE (a decaying multiplier over a fixed real-time
// window) at a smaller magnitude appropriate to an already-established
// veteran rather than a brand-new player.
//
// Determinism discipline (matches away-operations.ts / command-queue.ts):
// every exported function here is a pure function of GameState + a `now`
// timestamp. The boost multiplier is deliberately NOT stored as a number —
// it is recomputed from `track.startedAtMs` on every read, so it can never
// drift, never needs its own tick, and is trivially unit-testable at exact
// boundaries. No Math.random anywhere.
//
// Non-P2W: the stipend and boost are earnable-equivalent catch-up (same
// class as catchup-mechanics.ts's pioneer bonus / newcomer shield), never
// purchasable, and both are bounded well below what an actively-online
// veteran already earns — CLAUDE.md's "logging in always beats staying
// away" invariant extends to "returning never beats staying subscribed."

import type { GameState, ReturningCommanderTrack, ReturningCommanderObjective } from './types';
import {
  RETURNING_COMMANDER_LAPSE_MS,
  RETURNING_COMMANDER_TRACK_DURATION_MS,
  RETURNING_COMMANDER_BOOST_INITIAL,
  RETURNING_COMMANDER_BOOST_DECAY_MS,
  RETURNING_COMMANDER_STIPEND_PER_DAY,
  RETURNING_COMMANDER_STIPEND_CAP,
} from './constants';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Is this away-duration long enough to trigger the Returning Commander
 *  track? Distinct from the brand-new-player onramp (frontier.ts /
 *  catchup-mechanics.ts's newcomer functions key off ACCOUNT age, not
 *  absence) — a day-1 newcomer who never logs off never trips this. */
export function isLapsedReturn(timeAwayMs: number): boolean {
  return timeAwayMs >= RETURNING_COMMANDER_LAPSE_MS;
}

/** One-time re-entry stipend, linear in days away, flat-capped. Deterministic
 *  — same lapse duration always grants the same stipend. */
export function getReentryStipend(timeAwayMs: number): number {
  const days = timeAwayMs / MS_PER_DAY;
  return Math.round(Math.min(RETURNING_COMMANDER_STIPEND_CAP, days * RETURNING_COMMANDER_STIPEND_PER_DAY));
}

function snapshotBaseline(state: GameState): ReturningCommanderTrack['baseline'] {
  return {
    researchCompleted: state.stats?.researchCompleted || 0,
    buildingsComplete: state.buildings.filter(b => b.isComplete).length,
    completedContracts: (state.completedContracts || []).length,
    earnedAchievements: (state.earnedAchievements || []).length,
    claimedMilestones: Object.keys(state.claimedMilestones || {}).length,
  };
}

export interface StartTrackResult {
  state: GameState;
  stipend: number;
}

/** Start a new Returning Commander track. Idempotent: a no-op (stipend 0) if
 *  a track is already active (its 7-day objective window hasn't expired) —
 *  a player who logs off and back on repeatedly during their re-entry week
 *  cannot farm the stipend. Grants the stipend immediately into the
 *  returned state (mirrors away-operations.ts's pattern of computing +
 *  applying together at the load boundary). */
export function startReturningCommanderTrack(
  state: GameState,
  timeAwayMs: number,
  now: number = Date.now(),
): StartTrackResult {
  const existing = state.returningCommanderTrack;
  if (existing && existing.expiresAtMs > now) {
    return { state, stipend: 0 };
  }

  const stipend = getReentryStipend(timeAwayMs);
  const track: ReturningCommanderTrack = {
    startedAtMs: now,
    expiresAtMs: now + RETURNING_COMMANDER_TRACK_DURATION_MS,
    lapseDays: Math.round(timeAwayMs / MS_PER_DAY),
    baseline: snapshotBaseline(state),
    stipendGranted: stipend,
  };

  return {
    stipend,
    state: {
      ...state,
      money: state.money + stipend,
      totalEarned: state.totalEarned + stipend,
      returningCommanderTrack: track,
    },
  };
}

/** Revenue multiplier from an active Returning Commander boost: 1.3x the
 *  instant the track starts, linearly decaying to 1.0x by day 14. Always
 *  exactly 1.0 once the track is absent, expired-boost, or was never
 *  started — safe to call unconditionally from the tick. */
export function getReturningCommanderMultiplier(state: GameState, now: number = Date.now()): number {
  const track = state.returningCommanderTrack;
  if (!track) return 1.0;
  const elapsedMs = now - track.startedAtMs;
  if (elapsedMs < 0 || elapsedMs >= RETURNING_COMMANDER_BOOST_DECAY_MS) return 1.0;
  const t = elapsedMs / RETURNING_COMMANDER_BOOST_DECAY_MS; // 0..1
  return 1 + RETURNING_COMMANDER_BOOST_INITIAL * (1 - t);
}

/** Live-evaluated objective checklist — one per time loop. Never stored as
 *  mutable state; recomputed from the track's baseline vs. current GameState
 *  every call, so it can never desync from the actual save (e.g. after an
 *  undo-less action, a reload, or server reconciliation). */
export function getReturningCommanderObjectives(state: GameState): ReturningCommanderObjective[] {
  const track = state.returningCommanderTrack;
  if (!track) return [];
  const b = track.baseline;

  const researchDone = (state.stats?.researchCompleted || 0) - b.researchCompleted >= 1;
  const buildDone = state.buildings.filter(x => x.isComplete).length - b.buildingsComplete >= 1;
  const contractDone = (state.completedContracts || []).length - b.completedContracts >= 1;
  // accordLobbying resets every quarter (accord-senate.ts), so "any entry
  // present" correctly reads as "lobbied THIS quarter" rather than needing
  // a baseline delta.
  const lobbyDone = (state.accordLobbying || []).length > 0;
  const achievementDone = (state.earnedAchievements || []).length - b.earnedAchievements >= 1;
  const milestoneDone = Object.keys(state.claimedMilestones || {}).length - b.claimedMilestones >= 1;

  return [
    {
      id: 'queue',
      loop: 'tactical',
      label: 'Queue a research or build order',
      done: (state.commandQueue || []).length > 0 || researchDone || buildDone,
    },
    {
      id: 'produce',
      loop: 'daily',
      label: 'Complete a research or a building',
      done: researchDone || buildDone,
    },
    {
      id: 'engage',
      loop: 'weekly',
      label: "Lobby this quarter's Senate docket or fulfill a delivery contract",
      done: lobbyDone || contractDone,
    },
    {
      id: 'achieve',
      loop: 'monthly',
      label: 'Earn an achievement or claim a milestone',
      done: achievementDone || milestoneDone,
    },
  ];
}

export function isReturningCommanderTrackActive(state: GameState, now: number = Date.now()): boolean {
  const track = state.returningCommanderTrack;
  if (!track) return false;
  return now < track.expiresAtMs || now - track.startedAtMs < RETURNING_COMMANDER_BOOST_DECAY_MS;
}

export function isReturningCommanderTrackComplete(state: GameState): boolean {
  if (!state.returningCommanderTrack) return false;
  const objectives = getReturningCommanderObjectives(state);
  return objectives.length > 0 && objectives.every(o => o.done);
}

/** Clear a fully-expired track (objective window closed AND boost decayed to
 *  1.0x). Opportunistic housekeeping only — every reader above already
 *  treats an expired track as inert, so calling this is never required for
 *  correctness, only to keep the save tidy. */
export function pruneExpiredReturningCommanderTrack(state: GameState, now: number = Date.now()): GameState {
  if (!state.returningCommanderTrack) return state;
  if (isReturningCommanderTrackActive(state, now)) return state;
  return { ...state, returningCommanderTrack: null };
}
