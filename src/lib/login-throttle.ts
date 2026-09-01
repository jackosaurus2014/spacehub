/**
 * Per-account sign-in throttle (2026-09-01 hardening, finding H2).
 *
 * The IP bucket in src/middleware.ts bounds guesses per source address; this
 * bounds guesses per *account*, so a distributed attacker rotating IPs still
 * hits a wall after MAX_FAILURES wrong passwords for one email.
 *
 * In-memory and per-instance — the same trade-off the middleware rate limiter
 * makes (Railway runs a single instance; counters reset on deploy). If a
 * second instance is ever added, move this to the database or Redis.
 */

export const MAX_FAILURES = 8;
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;

interface Entry {
  failures: number[]; // timestamps of recent failures
  lockedUntil: number; // 0 = not locked
}

const store = new Map<string, Entry>();
let lastPrune = 0;

function key(email: string): string {
  return email.trim().toLowerCase();
}

function prune(now: number): void {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  store.forEach((e, k) => {
    e.failures = e.failures.filter((t: number) => t > now - WINDOW_MS);
    if (e.failures.length === 0 && e.lockedUntil <= now) store.delete(k);
  });
}

/** Seconds until the account may try again, or 0 if not locked. */
export function lockedFor(email: string, now = Date.now()): number {
  prune(now);
  const e = store.get(key(email));
  if (!e || e.lockedUntil <= now) return 0;
  return Math.ceil((e.lockedUntil - now) / 1000);
}

/** Record a failed attempt; returns true if this failure triggered a lock. */
export function recordFailure(email: string, now = Date.now()): boolean {
  prune(now);
  const k = key(email);
  const e = store.get(k) ?? { failures: [], lockedUntil: 0 };
  e.failures = e.failures.filter((t) => t > now - WINDOW_MS);
  e.failures.push(now);
  let locked = false;
  if (e.failures.length >= MAX_FAILURES) {
    e.lockedUntil = now + LOCK_MS;
    e.failures = [];
    locked = true;
  }
  store.set(k, e);
  return locked;
}

export function recordSuccess(email: string): void {
  store.delete(key(email));
}

/** Test hook. */
export function _resetLoginThrottle(): void {
  store.clear();
  lastPrune = 0;
}
