/**
 * Sync bridge (2026-09-12). Money is simulated on the client between syncs
 * (income ticks every 2 s) while the server copy only moves on a sync push
 * (every 60 s, cloud save every 5 min). Every asset route validates funds
 * against the SERVER copy, so a purchase that fits the dashboard figure can
 * be refused with "you have $X" where X is the last-synced balance — Jay hit
 * exactly this buying a $150M GEO Telecom Satellite while showing $185.5M.
 *
 * useGameSync registers its doSync here on mount; asset-client calls it on an
 * `insufficient_funds` refusal, then retries once. Nothing else should call
 * this: the periodic timers stay the only routine sync path.
 */
let syncNow: (() => Promise<void>) | null = null;

export function registerSyncNow(fn: (() => Promise<void>) | null): void {
  syncNow = fn;
}

/** Push the client state to the server right now; resolves false when no sync is registered (local play). */
export async function pushSyncNow(): Promise<boolean> {
  if (!syncNow) return false;
  try { await syncNow(); return true; } catch { return false; }
}
