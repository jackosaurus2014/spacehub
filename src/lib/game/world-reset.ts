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
 *  4. For a few days after, the same banner slot carries the new-era notice.
 */

/** Current world epoch. Bump this on restart day — save-load.ts archives any
 *  save whose worldEpoch is lower and starts the player fresh.
 *  Epoch 2 opened 2026-08-24 16:00 UTC (post economy-PvP-rebuild fresh start). */
export const WORLD_EPOCH = 2;

/** Scheduled fresh-start restart, or null when none is scheduled.
 *  Epoch 1 -> 2 executed on 2026-08-24; nothing scheduled beyond it. */
export const WORLD_RESET_AT: number | null = null;

/** When the current epoch began — drives the post-restart "new era" notice. */
export const EPOCH_BEGAN_AT: number = Date.UTC(2026, 7, 24, 16, 0, 0);

/** How long the new-era notice stays up after an epoch opens. */
export const NEW_ERA_NOTICE_DAYS = 3;

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

/** True for the first NEW_ERA_NOTICE_DAYS days of the current epoch — the
 *  window in which players are told the world has restarted. Epoch 1 had no
 *  predecessor to announce, so the notice only runs from epoch 2 onward. */
export function isNewEraNoticeActive(now: number): boolean {
  if (WORLD_EPOCH < 2) return false;
  return now >= EPOCH_BEGAN_AT && now < EPOCH_BEGAN_AT + NEW_ERA_NOTICE_DAYS * 24 * 60 * 60 * 1000;
}

/** Human date of the scheduled restart, e.g. "Monday, August 24, 2026". */
export function formatWorldResetDate(): string {
  if (WORLD_RESET_AT === null) return '';
  return formatUTCDate(WORLD_RESET_AT);
}

/** Human date the current epoch began. */
export function formatEpochStartDate(): string {
  return formatUTCDate(EPOCH_BEGAN_AT);
}

function formatUTCDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}
