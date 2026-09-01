/**
 * Launch-day actor resolution (2026-09-01).
 *
 * Launch pages let logged-out visitors react, vote in polls and post in chat
 * ("anonymous participation is the cheapest way to let 450 MAU do something
 * together"). Identity comes from one of two places:
 *
 *   1. A signed-in session → voterKey = user id, displayName from the session.
 *   2. The httpOnly `sn_vid` visitor cookie that src/middleware.ts sets on every
 *      page navigation (UUID, 1 year) → voterKey = `anon:<uuid>`, displayName is
 *      a deterministic handle derived from the uuid (`Observer-3F9A`). Handles
 *      are never client-supplied — that would be a spoofing vector.
 *
 * No session and no valid cookie → null (routes answer 401 "Enable cookies to
 * participate"). Rate limiters, poll uniqueness and chat attribution all key on
 * `voterKey`, so signed-in and anonymous actors share one code path.
 */

import { createHash } from 'crypto';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';

export const VISITOR_COOKIE = 'sn_vid';
export const ANONYMOUS_PREFIX = 'anon:';
export const COOKIES_REQUIRED_MESSAGE = 'Enable cookies to participate';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LaunchDayActor {
  /** Signed-in user id, or null for anonymous visitors. */
  userId: string | null;
  /** Stable key for rate limiting and one-vote-per-actor: user id or `anon:<uuid>`. */
  voterKey: string;
  /** Name to attribute chat messages to. Null only if a signed-in user has no name/email. */
  displayName: string | null;
  anonymous: boolean;
}

export function isVisitorId(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Deterministic, friendly, non-reversible handle for an anonymous visitor.
 * Hashing (rather than slicing the uuid) keeps the cookie value itself out of
 * public chat logs.
 */
export function anonymousHandle(visitorId: string): string {
  const digest = createHash('sha256').update(visitorId.toLowerCase()).digest('hex');
  return `Observer-${digest.slice(0, 4).toUpperCase()}`;
}

function readCookieHeader(request: Request | undefined, name: string): string | undefined {
  const header = request?.headers?.get?.('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    }
  }
  return undefined;
}

function readVisitorId(request?: Request): string | undefined {
  // Prefer the raw request (works for both Request and NextRequest handlers),
  // fall back to next/headers for callers that don't have the request in hand.
  const fromRequest =
    (request as { cookies?: { get?: (n: string) => { value?: string } | undefined } } | undefined)
      ?.cookies?.get?.(VISITOR_COOKIE)?.value ?? readCookieHeader(request, VISITOR_COOKIE);
  if (fromRequest) return fromRequest;
  try {
    return cookies().get(VISITOR_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export async function resolveLaunchDayActor(request?: Request): Promise<LaunchDayActor | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as
    | { id?: string; name?: string | null; email?: string | null }
    | undefined;

  if (sessionUser?.id) {
    return {
      userId: sessionUser.id,
      voterKey: sessionUser.id,
      displayName: sessionUser.name || sessionUser.email?.split('@')[0] || null,
      anonymous: false,
    };
  }

  const visitorId = readVisitorId(request);
  if (!isVisitorId(visitorId)) return null;

  const uuid = visitorId.toLowerCase();
  return {
    userId: null,
    voterKey: `${ANONYMOUS_PREFIX}${uuid}`,
    displayName: anonymousHandle(uuid),
    anonymous: true,
  };
}

/**
 * Small bounded per-key sliding-window limiter shared by the launch-day routes.
 *
 * In-memory and therefore PER INSTANCE: on a multi-instance deploy each
 * instance enforces its own window, so the effective ceiling is N× the
 * configured one. That is acceptable for reactions/chat (abuse is bounded by
 * cost, not correctness); do not reuse this for anything that must be exact.
 */
export interface WindowLimit {
  /** Minimum gap between two accepted hits from one key (ms). 0 disables. */
  minGapMs: number;
  /** Optional cap of `max` hits per `windowMs`. */
  max?: number;
  windowMs?: number;
}

interface KeyState {
  last: number;
  stamps: number[];
}

export class BoundedRateLimiter {
  private readonly state = new Map<string, KeyState>();

  constructor(
    private readonly limit: WindowLimit,
    private readonly maxKeys = 5000
  ) {}

  /**
   * Returns null if the hit is accepted (and records it), or the number of
   * seconds the caller should wait.
   */
  hit(key: string, now = Date.now()): number | null {
    const { minGapMs, max, windowMs } = this.limit;
    const entry = this.state.get(key) ?? { last: Number.NEGATIVE_INFINITY, stamps: [] };

    if (minGapMs > 0 && now - entry.last < minGapMs) {
      return Math.max(1, Math.ceil((minGapMs - (now - entry.last)) / 1000));
    }

    if (max && windowMs) {
      entry.stamps = entry.stamps.filter((t) => now - t < windowMs);
      if (entry.stamps.length >= max) {
        const oldest = entry.stamps[0];
        return Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      }
      entry.stamps.push(now);
    }

    entry.last = now;
    // Re-insert so Map iteration order doubles as an LRU for eviction.
    this.state.delete(key);
    this.state.set(key, entry);
    if (this.state.size > this.maxKeys) {
      const oldestKey = this.state.keys().next().value;
      if (oldestKey !== undefined) this.state.delete(oldestKey);
    }
    return null;
  }

  /** Test hook. */
  clear(): void {
    this.state.clear();
  }
}
