/**
 * Rate-limited, authenticated client for the Companies House public data API.
 *
 * AUTHENTICATION
 * Companies House does NOT use a bearer token. The API key is the USERNAME of
 * an HTTP Basic credential with an EMPTY password - Authorization: Basic
 * base64(key + ":"). Sending the key as a bearer token returns 401 with a body
 * that does not say why, which is half an hour of anyone's life.
 *
 * RATE LIMITS
 * The published limit is 600 requests per rolling five-minute window, and
 * Companies House states that applications which "regularly exceed or attempt
 * to bypass the rate limits" may be suspended without notice. Suspension would
 * take the whole UK dataset offline, so this client is deliberately timid:
 *
 *   - it paces every request at MIN_REQUEST_GAP_MS, well under half the
 *     permitted rate even running flat out for a full window;
 *   - it reads the x-ratelimit-remain header the API returns on EVERY response
 *     and, when the window is nearly spent, sleeps until x-ratelimit-reset
 *     rather than spending the last of it;
 *   - a 429 is honoured rather than retried blindly: it waits out the reset
 *     the header names.
 *
 * ERROR ACCOUNTING
 * Every non-2xx bumps a counter on the caller's FetchStats, except 404, which
 * for this API means "no such company / no such sub-resource" - data, not
 * breakage. A feed that silently returns nothing must stay distinguishable
 * from a feed that genuinely found nothing; that is what DataSourceRun and
 * these counters exist for.
 */

import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { UK_REGISTRY_SOURCE_KEY } from './attribution';

export const COMPANIES_HOUSE_API_BASE = 'https://api.company-information.service.gov.uk';

/**
 * 600 requests per 5 minutes is 2.0/s. We pace at ~1.4/s, which keeps a full
 * sweep near 70% of the ceiling even with no idle time, and leaves headroom
 * for a human hitting the admin UI while the cron runs.
 */
const MIN_REQUEST_GAP_MS = 700;

/**
 * When the window has this few requests left we stop and wait for the reset
 * instead of spending them. The sweep is resumable, so pausing costs nothing;
 * tripping the limit risks the key.
 */
const RATE_LIMIT_FLOOR = 40;

/** Never sleep longer than one window plus slack, whatever a header claims. */
const MAX_SLEEP_MS = 330_000;

const MAX_ATTEMPTS = 3;

/** Statuses worth one backoff-and-retry. 429 is handled separately. */
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

const circuitBreaker = createCircuitBreaker(UK_REGISTRY_SOURCE_KEY, {
  failureThreshold: 5,
  resetTimeout: 300_000,
});

/** Run fn through the shared Companies House circuit breaker. */
export function withCompaniesHouseBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return circuitBreaker.execute(fn, undefined) as Promise<T>;
}

/** Counters a caller threads through a run so nothing fails silently. */
export interface FetchStats {
  requests: number;
  httpErrors: number;
  notFound: number;
  rateLimitWaits: number;
  lastError: string | null;
  /** Lowest x-ratelimit-remain seen this run - how close we got to the edge. */
  minRemaining: number | null;
}

export function newFetchStats(): FetchStats {
  return {
    requests: 0,
    httpErrors: 0,
    notFound: 0,
    rateLimitWaits: 0,
    lastError: null,
    minRemaining: null,
  };
}

/** Is the API key configured? Callers refuse to start a run without one. */
export function hasCompaniesHouseKey(): boolean {
  return Boolean(process.env.COMPANIES_HOUSE_API_KEY);
}

function authHeader(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY ?? '';
  // Basic auth, key as username, EMPTY password. Not a bearer token.
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

const sleep = (ms: number) =>
  new Promise((r) => setTimeout(r, Math.max(0, Math.min(ms, MAX_SLEEP_MS))));

let lastRequestAt = 0;

async function pace(): Promise<void> {
  const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/**
 * Milliseconds until the window named by x-ratelimit-reset (epoch SECONDS)
 * reopens, plus a second of slack. Falls back to a minute when the header is
 * missing or nonsensical - guessing short is what gets a key suspended.
 */
export function msUntilReset(resetHeader: string | null, now: number = Date.now()): number {
  const epochSeconds = Number(resetHeader);
  if (!resetHeader || !Number.isFinite(epochSeconds) || epochSeconds <= 0) return 60_000;
  const ms = epochSeconds * 1000 - now + 1_000;
  if (ms <= 0) return 1_000;
  return Math.min(ms, MAX_SLEEP_MS);
}

/** Result of one API call. notFound separates "no such row" from failure. */
export interface ApiResult<T> {
  data: T | null;
  status: number;
  notFound: boolean;
}

/**
 * One Companies House request. `path` is API-relative, e.g.
 * "/company/09580714/officers".
 *
 * Returns { data: null, notFound: true } on 404 without counting an error.
 * Returns { data: null, notFound: false } on any other failure, having first
 * recorded the status on `stats` - a failure must always leave a trace.
 */
export async function chFetch<T = unknown>(path: string, stats: FetchStats): Promise<ApiResult<T>> {
  if (!hasCompaniesHouseKey()) {
    stats.httpErrors++;
    stats.lastError = 'COMPANIES_HOUSE_API_KEY is not set';
    return { data: null, status: 0, notFound: false };
  }

  const url = COMPANIES_HOUSE_API_BASE + path;
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await pace();
    stats.requests++;
    try {
      const res = await fetch(url, {
        headers: { Authorization: authHeader(), Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });

      // Every response carries the window counters, success or not.
      const remaining = Number(res.headers.get('x-ratelimit-remain'));
      if (Number.isFinite(remaining)) {
        stats.minRemaining =
          stats.minRemaining === null ? remaining : Math.min(stats.minRemaining, remaining);
      }

      if (res.status === 429) {
        const waitMs = msUntilReset(res.headers.get('x-ratelimit-reset'));
        stats.rateLimitWaits++;
        logger.warn('Companies House rate limit hit; waiting for window reset', {
          path,
          waitMs,
          attempt,
        });
        await sleep(waitMs);
        lastStatus = 429;
        continue;
      }

      if (res.ok) {
        // Stop BEFORE the window is exhausted. The sweep resumes next run.
        if (Number.isFinite(remaining) && remaining <= RATE_LIMIT_FLOOR) {
          const waitMs = msUntilReset(res.headers.get('x-ratelimit-reset'));
          stats.rateLimitWaits++;
          logger.info('Companies House window nearly spent; pausing until reset', {
            remaining,
            waitMs,
          });
          await sleep(waitMs);
        }
        const text = await res.text();
        if (!text) return { data: null, status: res.status, notFound: false };
        try {
          return { data: JSON.parse(text) as T, status: res.status, notFound: false };
        } catch {
          stats.httpErrors++;
          stats.lastError = 'JSON parse failed for ' + path;
          return { data: null, status: res.status, notFound: false };
        }
      }

      lastStatus = res.status;

      // 404 is an answer: this company number, or this sub-resource, does not
      // exist. It must never count against the feed's health.
      if (res.status === 404) {
        stats.notFound++;
        return { data: null, status: 404, notFound: true };
      }

      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
        await sleep(900 * attempt);
        continue;
      }

      stats.httpErrors++;
      stats.lastError = 'HTTP ' + res.status + ' ' + path;
      logger.warn('Companies House request failed', { status: res.status, path, attempt });
      return { data: null, status: res.status, notFound: false };
    } catch (err) {
      lastStatus = 0;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(900 * attempt);
        continue;
      }
      stats.httpErrors++;
      stats.lastError = (err instanceof Error ? err.message : String(err)) + ' ' + path;
      logger.warn('Companies House request threw', { path, error: stats.lastError });
      return { data: null, status: 0, notFound: false };
    }
  }

  stats.httpErrors++;
  stats.lastError = 'HTTP ' + lastStatus + ' after ' + MAX_ATTEMPTS + ' attempts ' + path;
  return { data: null, status: lastStatus, notFound: false };
}

/** Reset the inter-request pacing clock (tests, long-lived workers). */
export function resetPacing(): void {
  lastRequestAt = 0;
}
