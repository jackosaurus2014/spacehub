'use client';

// ─── Space Tycoon: shared "inhabited world" data hooks (audit Change #3) ────
// The server already simulates a multiplayer world — colony claims, top
// players, global milestones, a global activity feed, competitive contract
// races — but before this wave nothing in the client called those endpoints.
// This file is the single shared fetch/cache layer for all of it, so the
// map, dashboard, and any future consumer share one poll instead of each
// hammering the API independently.
//
// All three GET endpoints backing these hooks (`game-state`, `activity`,
// `competitive-contracts`) are unauthenticated and public — every player,
// signed in or not, sees the same world. The `available` flag on
// `useWorldState` only goes false on an actual fetch failure (offline,
// server error), which is the graceful-degradation signal every consumer
// should key its "sign in to see the live world" fallback off of.

import { useEffect, useState } from 'react';

// ─── Tiny shared polling cache ───────────────────────────────────────────────
// Multiple components can mount the same hook (map layer + dashboard card +
// activity ticker) without re-fetching independently — they share one
// in-flight request and one TTL'd cache entry per key.

interface CacheEntry<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  fetchedAt: number;
  inFlight: Promise<void> | null;
  listeners: Set<() => void>;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getEntry<T>(key: string): CacheEntry<T> {
  let entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    entry = { data: null, error: null, loading: false, fetchedAt: 0, inFlight: null, listeners: new Set() };
    cache.set(key, entry as CacheEntry<unknown>);
  }
  return entry;
}

function notify(key: string): void {
  const entry = cache.get(key);
  if (!entry) return;
  entry.listeners.forEach(l => l());
}

function fetchResource<T>(key: string, url: string, ttlMs: number): Promise<void> {
  const entry = getEntry<T>(key);
  if (entry.inFlight) return entry.inFlight;
  if (entry.data && Date.now() - entry.fetchedAt < ttlMs) return Promise.resolve();

  entry.loading = true;
  notify(key);

  const promise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = (await res.json()) as T;
      entry.data = json;
      entry.error = null;
      entry.fetchedAt = Date.now();
    } catch (err) {
      entry.error = err instanceof Error ? err.message : 'Failed to load';
    } finally {
      entry.loading = false;
      entry.inFlight = null;
      notify(key);
    }
  })();
  entry.inFlight = promise;
  return promise;
}

function usePolledResource<T>(
  key: string,
  url: string,
  ttlMs: number,
  pollMs: number,
): { data: T | null; loading: boolean; error: string | null; refresh: () => void } {
  const entry = getEntry<T>(key);
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    entry.listeners.add(listener);
    void fetchResource<T>(key, url, ttlMs);
    const interval = setInterval(() => { void fetchResource<T>(key, url, ttlMs); }, pollMs);
    return () => {
      entry.listeners.delete(listener);
      clearInterval(interval);
    };
    // key/url fully determine identity; entry/ttlMs/pollMs are derived from them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, url]);

  return {
    data: entry.data,
    // Only report "loading" before the first successful/failed fetch — once
    // we have data, background refreshes shouldn't flip consumers back to a
    // loading state and flash their UI.
    loading: entry.loading && !entry.data,
    error: entry.error,
    refresh: () => { void fetchResource<T>(key, url, 0); },
  };
}

// ─── /api/space-tycoon/game-state ────────────────────────────────────────────

export interface WorldStatePlayer {
  rank: number;
  companyName: string;
  title: string | null;
  netWorth: number;
  buildings: number;
  research: number;
  services: number;
  locations: number;
  unlockedLocations: string[];
  allianceTag: string | null;
  isOnline: boolean;
}

export interface WorldStateResponse {
  serverTime: { gameDate: { year: number; month: number; formatted: string }; serverMs: number };
  world: {
    colonies: Record<string, string[]>; // locationId -> companyName[], earliest claim first
    colonyCounts: Record<string, number>;
    totalColonists: number;
  };
  players: WorldStatePlayer[];
  milestones: Record<string, string>; // milestoneId -> companyName of claimant
  alliances: { name: string; tag: string; memberCount: number; totalNetWorth: number }[];
  openBounties: number;
}

const GAME_STATE_TTL_MS = 60_000;

/** Shared, cached view of the multiplayer world (audit D1). */
export function useWorldState(): {
  world: WorldStateResponse | null;
  loading: boolean;
  error: string | null;
  /** False only on an actual fetch failure — every backing endpoint is public. */
  available: boolean;
  refresh: () => void;
} {
  const { data, loading, error, refresh } = usePolledResource<WorldStateResponse>(
    'space-tycoon:game-state',
    '/api/space-tycoon/game-state',
    GAME_STATE_TTL_MS,
    GAME_STATE_TTL_MS,
  );
  return { world: data, loading, error, available: !!data && !error, refresh };
}

// ─── /api/space-tycoon/activity ──────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  companyName: string;
  type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

const ACTIVITY_POLL_MS = 20_000;

/** Shared, cached global activity feed (audit D1 / hotlist-adjacent — the
 *  `activity` route has writers on 6+ routes and, before this wave, zero
 *  readers anywhere in the client). */
export function useActivityFeed(limit = 20): {
  activities: ActivityEntry[];
  loading: boolean;
  error: string | null;
  available: boolean;
} {
  const key = `space-tycoon:activity:${limit}`;
  const { data, loading, error } = usePolledResource<{ activities: ActivityEntry[] }>(
    key,
    `/api/space-tycoon/activity?limit=${limit}`,
    ACTIVITY_POLL_MS,
    ACTIVITY_POLL_MS,
  );
  return { activities: data?.activities || [], loading, error, available: !!data && !error };
}

// ─── /api/space-tycoon/competitive-contracts ─────────────────────────────────

export interface CompetitiveContractView {
  id: string;
  title: string;
  tier: number;
  maxWinners: number;
  availableAfterGameMonth: number;
  reward: { money: number; exclusiveTitle?: string };
  winners: { companyName: string; claimedAt: string }[];
  slotsRemaining: number;
  isFull: boolean;
}

const COMPETITIVE_CONTRACTS_TTL_MS = 60_000;

/** Shared, cached view of limited-winner competitive contract races. */
export function useCompetitiveContracts(): {
  contracts: CompetitiveContractView[];
  gameMonth: number;
  loading: boolean;
  error: string | null;
  available: boolean;
} {
  const { data, loading, error } = usePolledResource<{
    contracts: CompetitiveContractView[];
    gameMonth: number;
    totalActive: number;
    totalFull: number;
  }>(
    'space-tycoon:competitive-contracts',
    '/api/space-tycoon/competitive-contracts',
    COMPETITIVE_CONTRACTS_TTL_MS,
    COMPETITIVE_CONTRACTS_TTL_MS,
  );
  return { contracts: data?.contracts || [], gameMonth: data?.gameMonth ?? 0, loading, error, available: !!data && !error };
}

// ─── Shared small utilities ──────────────────────────────────────────────────

/** Presentation-only mirror of the colony slot caps enforced server-side in
 *  `src/app/api/space-tycoon/colonies/route.ts` (POST handler's MAX_SLOTS).
 *  The server remains the source of truth and re-checks this at claim time;
 *  this copy exists only so the UI can show "42/50 slots" without an extra
 *  round trip. Locations absent from this map have unlimited slots. */
const COLONY_SLOT_CAPS: Record<string, number> = {
  mercury_surface: 50, venus_orbit: 30, ceres_surface: 100,
  io_surface: 20, europa_surface: 25, ganymede_surface: 60, callisto_surface: 40,
  titan_surface: 40, enceladus_surface: 15, titania_surface: 20,
  triton_surface: 10, pluto_surface: 5,
};

export function getColonySlotCap(locationId: string): number | null {
  return COLONY_SLOT_CAPS[locationId] ?? null;
}

/** The four global "first to colonize" milestone IDs the client can claim —
 *  mirrors the mapping in space-tycoon/page.tsx's handleUnlockLocation. */
export const LOCATION_MILESTONE_MAP: Record<string, { id: string; label: string }> = {
  lunar_surface: { id: 'first_moon', label: 'First Lunar Colony' },
  mars_orbit: { id: 'first_mars', label: 'First Mars Presence' },
  jupiter_system: { id: 'first_jupiter', label: 'First Jovian Foothold' },
  outer_system: { id: 'first_outer_system', label: 'First Outer System Colony' },
};

export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Shared prefers-reduced-motion flag — every consumer that animates the
 *  world/activity UI (ticker rotation, feed reveal) should gate on this. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** POST with a single retry on network failure (not on HTTP error responses
 *  — those are real answers from the server, like "already claimed" or
 *  "location full", and should be surfaced rather than retried). Used to
 *  close the fire-and-forget gap (audit hotlist #6): colony/milestone claims
 *  used to `.catch(() => {})` and silently drop network failures. */
export async function postWithRetry(url: string, body: unknown, retries = 1): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      if (attempt === retries) return null;
    }
  }
  return null;
}
