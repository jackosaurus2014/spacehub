// ─── Space Tycoon: Rivalry Stake (GAME_DESIGN_REVIEW_2026-09 §2 row 14) ─────
//
// "Today Rivals is a leaderboard with no consequence." The stake makes
// TRACKING a rival a decision on the weekly loop: a player may DESIGNATE up
// to RIVALRY_STAKE.MAX_DESIGNATED of their shadow rivals; each Monday the
// league cron (/api/space-tycoon/leagues/process-week) compares the pair's
// week-over-week net-worth growth and the WINNER earns a small reputation
// gain. The loser gets nothing — no sink, no zero-sum money. It is an
// intel/reputation loop, not an economic transfer, so it can never be
// farmed for cash and never touches the ledger.
//
// This module is PURE (no prisma) so the client (RivalsPanel, server-effects
// application, the Situation Log) can share the constants and the settlement
// arithmetic with the routes. rival-system.ts re-exports it for the routes.

export const RIVALRY_STAKE = {
  /** Max rivals a player can hold a stake against at once. */
  MAX_DESIGNATED: 3,
  /** Designation is refused when the pair is MORE than this many league
   *  brackets apart. 0 = must share a league bracket (the brief: "≥ one
   *  league bracket apart forbidden") — CLAUDE.md "newcomers compete against
   *  peers, not legends". Tunable if population makes same-league pairing
   *  too sparse. */
  MAX_LEAGUE_GAP: 0,
  /** Reputation points the winner of one settled stake earns. */
  REP_PER_WIN: 1,
  /** Reputation a single profile can earn from stakes in one week. */
  REP_CAP_PER_WEEK: 3,
  /** Growth-rate difference (percentage points) inside which the week is a
   *  draw — a 0.01% edge from sync timing is noise, not a win. */
  DRAW_BAND_PCT: 0.1,
} as const;

/** RivalEvent.type marking a designated (staked) assignment. */
export const RIVAL_DESIGNATED_EVENT = 'rival_designated';
/** RivalEvent.type written once per assignment when the stake settles. */
export const RIVALRY_SETTLED_EVENT = 'rivalry_settled';
/** PlayerActivity.type for a stake win (public feed + rep hand-off). */
export const RIVALRY_WIN_ACTIVITY = 'rivalry_win';

export type RivalryOutcome = 'player' | 'rival' | 'draw';

export interface RivalrySettlement {
  outcome: RivalryOutcome;
  playerGrowthPct: number;
  rivalGrowthPct: number;
}

/** Week-over-week growth in percent, guarded for a zero/negative start. */
export function growthPct(start: number, end: number): number {
  const s = Number.isFinite(start) ? start : 0;
  const e = Number.isFinite(end) ? end : 0;
  return ((e - s) / Math.max(Math.abs(s), 1)) * 100;
}

/**
 * Settle one stake from the first and last net-worth snapshots of the week.
 * Pure — the cron feeds it RivalSnapshot rows, tests feed it numbers.
 */
export function settleRivalryStake(
  playerStart: number,
  playerEnd: number,
  rivalStart: number,
  rivalEnd: number,
): RivalrySettlement {
  const playerGrowthPct = growthPct(playerStart, playerEnd);
  const rivalGrowthPct = growthPct(rivalStart, rivalEnd);
  const diff = playerGrowthPct - rivalGrowthPct;
  const outcome: RivalryOutcome =
    Math.abs(diff) < RIVALRY_STAKE.DRAW_BAND_PCT ? 'draw' : diff > 0 ? 'player' : 'rival';
  return {
    outcome,
    playerGrowthPct: Math.round(playerGrowthPct * 100) / 100,
    rivalGrowthPct: Math.round(rivalGrowthPct * 100) / 100,
  };
}

/** Reputation to award for one more win given what the profile already
 *  earned from stakes this week — enforces REP_CAP_PER_WEEK. */
export function rivalryRepAward(alreadyAwardedThisWeek: number): number {
  const room = RIVALRY_STAKE.REP_CAP_PER_WEEK - Math.max(0, alreadyAwardedThisWeek);
  return Math.max(0, Math.min(RIVALRY_STAKE.REP_PER_WIN, room));
}

export interface DesignationCheck {
  ok: boolean;
  reason?: string;
}

/** Can this player designate this rival right now? */
export function checkRivalryDesignation(
  playerLeague: number,
  rivalLeague: number,
  currentlyDesignated: number,
): DesignationCheck {
  if (currentlyDesignated >= RIVALRY_STAKE.MAX_DESIGNATED) {
    return { ok: false, reason: `You can hold at most ${RIVALRY_STAKE.MAX_DESIGNATED} rivalry stakes at once.` };
  }
  const gap = Math.abs(Math.round(playerLeague) - Math.round(rivalLeague));
  if (gap > RIVALRY_STAKE.MAX_LEAGUE_GAP) {
    return {
      ok: false,
      reason: RIVALRY_STAKE.MAX_LEAGUE_GAP === 0
        ? 'Stakes are only allowed against rivals in your own league bracket.'
        : `Stakes are only allowed against rivals within ${RIVALRY_STAKE.MAX_LEAGUE_GAP} league bracket(s).`,
    };
  }
  return { ok: true };
}

/** Client-side record of a settled stake that reached the save through
 *  the server-effects hop (server-effects.ts RivalryStakeSnapshot). */
export interface RivalryStakeResult {
  /** PlayerActivity id — the idempotency key for the rep grant. */
  id: string;
  weekId: number;
  opponent: string;
  rep: number;
  atMs: number;
}

/** Max settled results kept on the save for the Situation Log / scorecard. */
export const RIVALRY_RESULTS_KEEP = 12;
