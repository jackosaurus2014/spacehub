// ─── Space Tycoon: per-profile route throttle ────────────────────────────────
// docs/SECURITY_AUDIT_2026-09.md "Game exploit batch 2026-09-02" (M-7 / C-2).
//
// The middleware rate limiter is per-IP and generic (200/min for /api/*). The
// economic routes need a per-PROFILE budget — a single account hammering
// market/orders or sync from one IP is exactly the loop that turned a
// per-request plausibility floor into $2B/min. This is an in-memory sliding
// window keyed by (profileId, routeKey); bounded so a hostile fleet of
// accounts cannot grow the map without limit. Per-instance (no shared store),
// which is fine: the DB-side checks (lastSyncAt, ledger, escrow) remain the
// truth; this is the fast path that keeps a tight loop from reaching them.

interface Bucket {
  timestamps: number[];
  lastSeenMs: number;
}

const store = new Map<string, Bucket>();

/** Hard cap on live keys; the least-recently-seen entries are evicted. */
export const ROUTE_THROTTLE_MAX_KEYS = 20_000;
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanupMs = 0;

function cleanup(nowMs: number, maxWindowMs: number): void {
  if (nowMs - lastCleanupMs < CLEANUP_INTERVAL_MS && store.size < ROUTE_THROTTLE_MAX_KEYS) return;
  lastCleanupMs = nowMs;
  const cutoff = nowMs - Math.max(maxWindowMs, CLEANUP_INTERVAL_MS);
  for (const [key, bucket] of Array.from(store.entries())) {
    if (bucket.lastSeenMs < cutoff) store.delete(key);
  }
  if (store.size >= ROUTE_THROTTLE_MAX_KEYS) {
    // Still too big (a burst of fresh keys): evict the oldest quarter.
    const entries = Array.from(store.entries()).sort((a, b) => a[1].lastSeenMs - b[1].lastSeenMs);
    for (const [key] of entries.slice(0, Math.ceil(entries.length / 4))) store.delete(key);
  }
}

export interface ThrottleDecision {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the oldest hit in the window expires (0 when allowed). */
  retryAfterMs: number;
}

/**
 * Record a hit for (profileId, routeKey) and decide whether it fits in
 * `max` hits per `windowMs`. A rejected hit is NOT recorded, so a client that
 * keeps retrying does not push its own retry-after further out.
 */
export function allow(
  profileId: string,
  routeKey: string,
  max: number,
  windowMs: number,
  nowMs: number = Date.now(),
): ThrottleDecision {
  cleanup(nowMs, windowMs);
  const key = `${profileId}:${routeKey}`;
  const bucket = store.get(key) ?? { timestamps: [], lastSeenMs: nowMs };
  const windowStart = nowMs - windowMs;
  bucket.timestamps = bucket.timestamps.filter(ts => ts > windowStart);
  bucket.lastSeenMs = nowMs;
  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0];
    store.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(1, oldest + windowMs - nowMs) };
  }
  bucket.timestamps.push(nowMs);
  store.set(key, bucket);
  return { allowed: true, remaining: max - bucket.timestamps.length, retryAfterMs: 0 };
}

/** The standard 429 body every throttled game route returns. */
export function throttledBody(routeKey: string, decision: ThrottleDecision): { error: string; routeKey: string; retryAfterMs: number } {
  return { error: 'rate_limited', routeKey, retryAfterMs: decision.retryAfterMs };
}

/** Test helper — clears every bucket. */
export function __resetRouteThrottle(): void {
  store.clear();
  lastCleanupMs = 0;
}

/** Test/observability helper. */
export function __routeThrottleSize(): number {
  return store.size;
}
