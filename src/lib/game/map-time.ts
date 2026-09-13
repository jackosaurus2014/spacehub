// ─── Map scene clock + time scrubber (graphics Phase 3, item 1 & 2) ─────────
// docs/GRAPHICS_REVIEW_2026-09-12.md (b) row 1: "Bodies at their real
// positions for the game date; drag a scrubber to see launch-window
// alignments."
//
// Two things live here, both PURE (no React, no three.js, no DOM) so the two
// renderers, the map shell and the unit tests share one derivation:
//
//   1. THE SCENE CLOCK. Before Phase 3 the map ran on a free-running wall
//      clock that started at 0 on mount, so the planets were never where the
//      HUD's game date said they were. Now every position derives from the
//      GAME calendar (server-time.ts: SERVER_EPOCH_MS, six real hours per
//      game month), which is the same clock the rest of the game reads.
//
//      • `sceneSecondsFor()` feeds the hand-tuned moon / orbital-pip orbits.
//        At the live date it advances one second per real second, so those
//        keep exactly the motion they had before Phase 3; a scrub jumps it by
//        whole game months, so they move when you scrub.
//      • `ephemerisMsForGameMonths()` converts a game-calendar position into
//        the REAL UTC instant the Keplerian ephemeris is evaluated at — the
//        in-game year 2084 uses the actual 2084 sky.
//
//   2. THE SCRUBBER STATE. An integer offset in GAME MONTHS, clamped to
//      ±SCRUB_RANGE_MONTHS around "now". It is PRESENTATION ONLY: nothing
//      here reads or writes GameState, and the map shell refuses every
//      state-mutating action while the offset is non-zero (see
//      PREVIEW_REFUSAL_* below — the "refuse, don't silently snap" choice).

import {
  GAME_START_YEAR,
  REAL_MS_PER_GAME_MONTH,
  REAL_SECONDS_PER_GAME_MONTH,
  SERVER_EPOCH_MS,
  type ServerGameDate,
} from './server-time';

// ── Scrubber range ───────────────────────────────────────────────────────────

/** How far the scrubber reaches either side of the live game date, in game
 *  months. ±24 covers two game years — more than a full Earth→Mars synodic
 *  period (25.6 months), so every inner-system launch window is reachable,
 *  and at six real hours per month it is 12 real days of calendar either
 *  way. */
export const SCRUB_RANGE_MONTHS = 24;
export const SCRUB_MIN_MONTHS = -SCRUB_RANGE_MONTHS;
export const SCRUB_MAX_MONTHS = SCRUB_RANGE_MONTHS;
/** The scrubber steps in whole game months — the granularity the HUD's game
 *  date itself has, so the label always changes when the thumb moves. */
export const SCRUB_STEP_MONTHS = 1;

/** Clamp + round an arbitrary scrubber value to a legal offset. Non-finite
 *  input (a chewed-up `valueAsNumber`) resolves to "now". */
export function clampScrubMonths(months: number): number {
  if (!Number.isFinite(months)) return 0;
  return Math.max(SCRUB_MIN_MONTHS, Math.min(SCRUB_MAX_MONTHS, Math.round(months)));
}

/** Is the map previewing a date other than now? */
export function isPreviewing(scrubMonths: number): boolean {
  return clampScrubMonths(scrubMonths) !== 0;
}

// ── Game-calendar helpers (continuous, unlike server-time's month floor) ─────

/** Game months elapsed since the server epoch as a FRACTIONAL value, so the
 *  ephemeris date advances smoothly inside a month instead of stepping every
 *  six real hours. Clamped at 0 — the game has no pre-epoch calendar. */
export function gameMonthsElapsed(realMs: number = Date.now()): number {
  if (!Number.isFinite(realMs)) return 0;
  return Math.max(0, (realMs - SERVER_EPOCH_MS) / REAL_MS_PER_GAME_MONTH);
}

/** The game date at a (possibly fractional) month count. Month is 1-12. */
export function gameDateAtMonths(monthsFloat: number): ServerGameDate {
  const total = Math.max(0, Math.floor(Number.isFinite(monthsFloat) ? monthsFloat : 0));
  return {
    year: GAME_START_YEAR + Math.floor(total / 12),
    month: (total % 12) + 1,
    totalMonths: total,
  };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 2084" — the label under the scrubber and in the preview chip. */
export function formatGameMonths(monthsFloat: number): string {
  const d = gameDateAtMonths(monthsFloat);
  return `${MONTH_NAMES[d.month - 1]} ${d.year}`;
}

/** Days in a Gregorian month (0-indexed month), for the intra-month fraction. */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * The REAL UTC instant the Keplerian ephemeris is evaluated at for a given
 * game-calendar position. The mapping is the honest one: game year 2084,
 * month 11 is evaluated at 2084-11-01 UTC plus the fraction of the month
 * already elapsed, so the map shows the real sky of that date.
 */
export function ephemerisMsForGameMonths(monthsFloat: number): number {
  const m = Math.max(0, Number.isFinite(monthsFloat) ? monthsFloat : 0);
  const whole = Math.floor(m);
  const frac = m - whole;
  const year = GAME_START_YEAR + Math.floor(whole / 12);
  const monthIndex = whole % 12;
  return Date.UTC(year, monthIndex, 1) + frac * daysInMonth(year, monthIndex) * 86_400_000;
}

/**
 * Inverse of `ephemerisMsForGameMonths`: the (fractional) game-month count
 * an ephemeris instant sits at. The mapping is exact by construction — the
 * game calendar's year/month IS the real calendar's year/month — so this is
 * how a computed transfer-window departure date comes back as a scrubber
 * offset and a "Nov 2084" label.
 */
export function gameMonthsForEphemerisMs(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const monthIndex = d.getUTCMonth();
  const whole = (year - GAME_START_YEAR) * 12 + monthIndex;
  const monthStart = Date.UTC(year, monthIndex, 1);
  const frac = (ms - monthStart) / (daysInMonth(year, monthIndex) * 86_400_000);
  return whole + Math.max(0, Math.min(1, frac));
}

/** "Nov 2084" for an ephemeris instant — the formatter launch-windows.ts's
 *  `formatWindowLine` is handed. */
export function formatEphemerisMs(ms: number): string {
  return formatGameMonths(gameMonthsForEphemerisMs(ms));
}

/**
 * Seconds for the hand-tuned moon / pip orbits. Referenced to the server
 * epoch so it is a property of the GAME clock, not of when the canvas
 * mounted: at the live date it ticks one second per real second (moons and
 * orbital pips keep exactly their pre-Phase-3 motion), and each scrubbed
 * game month adds REAL_SECONDS_PER_GAME_MONTH so scrubbing moves them too.
 */
export function sceneSecondsFor(realMs: number = Date.now(), scrubMonths = 0): number {
  const base = Number.isFinite(realMs) ? (realMs - SERVER_EPOCH_MS) / 1000 : 0;
  return base + clampScrubMonths(scrubMonths) * REAL_SECONDS_PER_GAME_MONTH;
}

/** Everything a renderer needs to place the scene at a scrubbed date. */
export interface SceneTime {
  /** Scrubber offset actually applied (clamped). */
  scrubMonths: number;
  /** Fractional game months since the epoch at the previewed date. */
  gameMonths: number;
  /** Real UTC ms the ephemeris is evaluated at. */
  ephemerisMs: number;
  /** Seconds for the hand-tuned moon / pip orbits. */
  tSec: number;
  /** "Nov 2084". */
  label: string;
  previewing: boolean;
}

/** One call, both clocks — what SceneClock (3D) and draw() (2D) use. */
export function sceneTimeAt(realMs: number = Date.now(), scrubMonths = 0): SceneTime {
  const scrub = clampScrubMonths(scrubMonths);
  const gameMonths = gameMonthsElapsed(realMs) + scrub;
  return {
    scrubMonths: scrub,
    gameMonths,
    ephemerisMs: ephemerisMsForGameMonths(gameMonths),
    tSec: sceneSecondsFor(realMs, scrub),
    label: formatGameMonths(gameMonths),
    previewing: scrub !== 0,
  };
}

// ── Preview refusal (the documented choice) ──────────────────────────────────
// Two designs were on the table: (a) snap the scrubber back to now and then
// perform the action, or (b) refuse the action and say why. We refuse.
// Silently rewinding the map under a player who is looking at a future
// alignment and then committing a dispatch against the PRESENT is exactly the
// kind of "I didn't mean that" the order queue exists to prevent, and the
// scrubber is one keystroke (the Now button, or Escape) from being cleared.
// Enforcement lives at the single choke point where the map shell receives
// the engine handlers (MapCommandCenter's `guardPreview`), so every mutating
// path — radial menu, context panel, keyboard, Location List — is covered.

export const PREVIEW_REFUSAL_TITLE = 'Preview mode';

/** The refusal toast. `label` is the previewed date, e.g. "Nov 2084". */
export function previewRefusalMessage(label: string): string {
  return `Preview mode — the map is showing ${label}. Press Now to return to the present before giving orders.`;
}

/** The chip above the map while scrubbed away from the live date. */
export function previewChipText(label: string): string {
  return `Preview — ${label}`;
}

/**
 * The refusal itself, extracted from the React shell so it can be tested:
 * run `fn` only when the map is at the live date, otherwise hand the caller a
 * message to show and DO NOT call it. Returns whether the action ran.
 *
 * This is the whole enforcement mechanism — MapCommandCenter wraps every
 * engine handler it passes downward in it, so there is exactly one place
 * where "am I previewing?" gates a state change.
 */
export function callUnlessPreviewing<A extends unknown[]>(
  scrubMonths: number,
  label: string,
  fn: (...args: A) => void,
  onRefused: (message: string) => void,
  args: A,
): boolean {
  if (isPreviewing(scrubMonths)) {
    onRefused(previewRefusalMessage(label));
    return false;
  }
  fn(...args);
  return true;
}

/** "+3 game months" / "-1 game month" / "live game date" — the scrubber's
 *  accessible value text (never colour or thumb position alone). */
export function describeScrubOffset(scrubMonths: number): string {
  const m = clampScrubMonths(scrubMonths);
  if (m === 0) return 'live game date';
  const n = Math.abs(m);
  return `${m > 0 ? '+' : '-'}${n} game month${n === 1 ? '' : 's'}`;
}

export { REAL_SECONDS_PER_GAME_MONTH };
