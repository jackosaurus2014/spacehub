/**
 * Sync bridge (2026-09-12). Money is simulated on the client between syncs
 * (income ticks every 2 s) while the server copy only moves on a sync push
 * (every 60 s, cloud save every 5 min). Every asset route validates funds
 * against the SERVER copy, so a purchase that fits the dashboard figure can
 * be refused with "you have $X" where X is the last-synced balance — Jay hit
 * exactly this buying a $150M GEO Telecom Satellite while showing $185.5M.
 *
 * useGameSync registers a FORCED doSync here on mount (it skips the hook's
 * own 30 s rate limit); asset-client calls pushSyncNow() on an
 * `insufficient_funds` refusal, then retries once. The server also enforces
 * a 10 s per-profile cadence (SYNC_MIN_INTERVAL_MS, answered as 429
 * sync_too_frequent with retryAfterMs) — the live probe caught the retry
 * landing inside that window, so a throttled push waits the window out and
 * pushes again before reporting success. Nothing else should call this:
 * the periodic timers stay the only routine sync path.
 */
export type SyncOutcome =
  | { outcome: 'ok' }
  | { outcome: 'skipped' }
  | { outcome: 'throttled'; retryAfterMs: number }
  | { outcome: 'error' };

type SyncFn = () => Promise<SyncOutcome | void>;

let syncNow: SyncFn | null = null;

/** Longest we will wait for the server's sync window before retrying the push. */
export const MAX_THROTTLE_WAIT_MS = 10_500;

export function registerSyncNow(fn: SyncFn | null): void {
  syncNow = fn;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Push the client state to the server right now. Resolves true only when a
 * sync actually reached the server (so a retry against it is worth making);
 * false when no sync is registered (local play), the push was skipped, or it
 * failed. A throttled push waits `retryAfterMs` (capped) and pushes once more.
 */
export async function pushSyncNow(): Promise<boolean> {
  if (!syncNow) return false;
  try {
    const first = await syncNow();
    if (!first || first.outcome === 'ok') return true;
    if (first.outcome !== 'throttled') return false;
    await sleep(Math.min(Math.max(first.retryAfterMs, 0), MAX_THROTTLE_WAIT_MS) + 150);
    const second = await syncNow();
    return !second || second.outcome === 'ok';
  } catch {
    return false;
  }
}
