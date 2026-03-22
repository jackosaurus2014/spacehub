// ─── Space Tycoon: Global Server Time ────────────────────────────────────────
// All players share the same in-game date. The game clock is derived from
// real wall-clock time since the server epoch (game launch date).
//
// This ensures:
// 1. All players see the same in-game year/month
// 2. Players who join late are in the same time period as veterans
// 3. The game calendar progresses whether you're online or not
// 4. Market events, economic cycles, and seasons are synchronized
//
// FORMULA:
// gameMonth = floor((now - EPOCH) / REAL_SECONDS_PER_GAME_MONTH)
// gameYear  = STARTING_YEAR + floor(gameMonth / 12)
// month     = (gameMonth % 12) + 1

/** The real-world timestamp when the game server started (epoch).
 *  All game time is calculated relative to this moment.
 *  Set to March 22, 2026 00:00 UTC (game reset date). */
export const SERVER_EPOCH_MS = new Date('2026-03-22T00:00:00Z').getTime();

/** How many real-world seconds equal one game month.
 *  Target: 10 game years per real month of play.
 *  1 real month = 2,592,000 seconds
 *  10 game years = 120 game months
 *  2,592,000 / 120 = 21,600 seconds per game month = 6 hours
 *
 *  This means:
 *  - 1 game month = 6 real hours
 *  - 1 game year = 3 real days
 *  - 10 game years = 30 real days (1 month)
 *  - 174 game years (2025→2199) = ~17 real months (~1.5 years)
 */
export const REAL_SECONDS_PER_GAME_MONTH = 21_600; // 6 hours

/** Starting game year */
export const GAME_START_YEAR = 2025;

/** Game date type */
export interface ServerGameDate {
  year: number;
  month: number; // 1-12
  totalMonths: number; // Total months since game start
}

/** Calculate the current global game date from wall-clock time.
 *  All players calling this function at the same real-world moment
 *  will get the same game date. */
export function getGlobalGameDate(nowMs: number = Date.now()): ServerGameDate {
  const elapsedSeconds = Math.max(0, (nowMs - SERVER_EPOCH_MS) / 1000);
  const totalMonths = Math.floor(elapsedSeconds / REAL_SECONDS_PER_GAME_MONTH);
  const year = GAME_START_YEAR + Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;

  return { year, month, totalMonths };
}

/** Get a formatted date string */
export function formatServerDate(date: ServerGameDate): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.month - 1]} ${date.year}`;
}

/** Get the current economic season (for seasonal milestones).
 *  Seasons are 3 game months long. */
export function getCurrentSeason(date: ServerGameDate): number {
  return Math.floor(date.totalMonths / 3);
}

/** Check if we're at a month boundary (for events that trigger monthly) */
export function isMonthBoundary(prevTotalMonths: number, nowMs: number = Date.now()): boolean {
  const current = getGlobalGameDate(nowMs);
  return current.totalMonths > prevTotalMonths;
}

/** Time remaining until next game month (in real seconds) */
export function secondsUntilNextMonth(nowMs: number = Date.now()): number {
  const elapsedSeconds = (nowMs - SERVER_EPOCH_MS) / 1000;
  const currentMonthStart = Math.floor(elapsedSeconds / REAL_SECONDS_PER_GAME_MONTH) * REAL_SECONDS_PER_GAME_MONTH;
  const nextMonthStart = currentMonthStart + REAL_SECONDS_PER_GAME_MONTH;
  return Math.max(0, nextMonthStart - elapsedSeconds);
}
