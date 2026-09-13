'use client';

// ─── Ship traffic layer — client poll ───────────────────────────────────────
// docs/GRAPHICS_REVIEW_2026-09-12.md addendum point 3. One shared entry
// (useWorldState.ts precedent) so both solar renderers and the shell HUD
// read the same feed; polling only runs while a consumer is enabled (map
// tab mounted, contacts layer on, map not covered) AND the document is
// visible. A 401/403 (anonymous game) marks the feed unavailable and stops
// the timer until the next enable. The wire types and placement maths live
// in src/lib/game/ship-traffic.ts, which stays React-free because the
// server-side builder (and so the API route) imports it.

import { useEffect, useState } from 'react';
import { TRAFFIC_POLL_MS, type TrafficContact, type TrafficFeed } from '@/lib/game/ship-traffic';

interface TrafficCacheEntry {
  feed: TrafficFeed | null;
  available: boolean | null; // null = not asked yet
  inFlight: Promise<void> | null;
  fetchedAt: number;
  listeners: Set<() => void>;
}

const trafficEntry: TrafficCacheEntry = { feed: null, available: null, inFlight: null, fetchedAt: 0, listeners: new Set() };

function notifyTraffic(): void {
  trafficEntry.listeners.forEach(l => l());
}

export function __resetTrafficCache(): void {
  trafficEntry.feed = null;
  trafficEntry.available = null;
  trafficEntry.inFlight = null;
  trafficEntry.fetchedAt = 0;
}

async function fetchTraffic(force = false): Promise<void> {
  if (trafficEntry.inFlight) return trafficEntry.inFlight;
  if (!force && trafficEntry.feed && Date.now() - trafficEntry.fetchedAt < TRAFFIC_POLL_MS * 0.8) return;
  const p = (async () => {
    try {
      const res = await fetch('/api/space-tycoon/traffic', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        trafficEntry.available = false;
        trafficEntry.feed = null;
        return;
      }
      if (!res.ok) throw new Error(`traffic ${res.status}`);
      const json = (await res.json()) as TrafficFeed;
      trafficEntry.feed = {
        contacts: Array.isArray(json.contacts) ? json.contacts : [],
        asOf: json.asOf,
        asOfMs: typeof json.asOfMs === 'number' ? json.asOfMs : Date.parse(json.asOf) || Date.now(),
        total: json.total ?? 0,
        capped: !!json.capped,
        revealed: json.revealed ?? 0,
      };
      trafficEntry.available = true;
      trafficEntry.fetchedAt = Date.now();
    } catch {
      // Keep the last good feed; a transient failure must not blank the map.
      if (!trafficEntry.feed) trafficEntry.available = false;
    } finally {
      trafficEntry.inFlight = null;
      notifyTraffic();
    }
  })();
  trafficEntry.inFlight = p;
  return p;
}

export interface ShipTrafficState {
  contacts: TrafficContact[];
  asOfMs: number;
  /** false = the feed answered 401/403 (anonymous game) or never loaded. */
  available: boolean;
  total: number;
  capped: boolean;
  revealed: number;
}

const EMPTY_CONTACTS: TrafficContact[] = [];

/** Poll the traffic feed every TRAFFIC_POLL_MS while `enabled` and the tab
 *  is visible. Re-enabling refreshes at once (a toggle flip is a request). */
export function useShipTraffic(enabled: boolean): ShipTrafficState {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const listener = () => setTick(t => t + 1);
    trafficEntry.listeners.add(listener);
    const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
    if (visible()) void fetchTraffic(true);
    const iv = setInterval(() => { if (visible() && trafficEntry.available !== false) void fetchTraffic(); }, TRAFFIC_POLL_MS);
    const onVis = () => { if (visible() && trafficEntry.available !== false) void fetchTraffic(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      trafficEntry.listeners.delete(listener);
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled]);
  const feed = trafficEntry.feed;
  return {
    contacts: enabled && feed ? feed.contacts : EMPTY_CONTACTS,
    asOfMs: feed?.asOfMs ?? 0,
    available: trafficEntry.available === true,
    total: feed?.total ?? 0,
    capped: feed?.capped ?? false,
    revealed: feed?.revealed ?? 0,
  };
}
