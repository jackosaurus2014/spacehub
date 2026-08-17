/**
 * World reset / epoch machinery.
 *
 * Space Tycoon runs in "epochs" — long seasons of the shared world. When the
 * team ships a foundational overhaul (like the Aug 2026 economy-PvP rebuild),
 * the world restarts from a fresh start so every corporation begins the new
 * era on equal footing under the new rules.
 *
 * How a restart works:
 *  1. Ahead of time, WORLD_RESET_AT is set and an in-game notice counts down.
 *  2. On restart day, WORLD_EPOCH is bumped (+ server-shared tables wiped).
 *  3. On next load, any save from an older epoch is archived to
 *     ARCHIVED_SAVE_KEY (never destroyed) and the player starts fresh.
 */

/** Current world epoch. Bump this on restart day — save-load.ts archives any
 *  save whose worldEpoch is lower and starts the player fresh. */
export const WORLD_EPOCH = 1;

/** Scheduled fresh-start restart: Monday 2026-08-24, 16:00 UTC (9am PT).
 *  Announced to players 7 days ahead (founder directive 8/17).
 *  Set to null when no restart is scheduled. */
export const WORLD_RESET_AT: number | null = Date.UTC(2026, 7, 24, 16, 0, 0);

/** localStorage key old-epoch saves are archived under (not deleted). */
export const ARCHIVED_SAVE_KEY = 'spaceTycoonSave_epoch_archive';

/** True while a scheduled restart is announced but hasn't happened yet. */
export function isWorldResetPending(now: number): boolean {
  return WORLD_RESET_AT !== null && now < WORLD_RESET_AT;
}

/** Days (ceil) until the scheduled restart; 0 if none pending. */
export function daysUntilWorldReset(now: number): number {
  if (WORLD_RESET_AT === null || now >= WORLD_RESET_AT) return 0;
  return Math.ceil((WORLD_RESET_AT - now) / (24 * 60 * 60 * 1000));
}

/** Human date of the scheduled restart, e.g. "Monday, August 24, 2026". */
export function formatWorldResetDate(): string {
  if (WORLD_RESET_AT === null) return '';
  return new Date(WORLD_RESET_AT).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}
