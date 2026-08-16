// ─── Space Tycoon: Dynamic Market Events ────────────────────────────────────
// Market-wide events that shift resource prices temporarily.
// Creates trading opportunities for players who pay attention.
//
// Audit Wave E (Change #5 / A5-iii + §1d-6): market events were "flavor
// text" — getMarketEventMultiplier had zero callers, so "Helium-3 ×2.0"
// never touched a price. Two fixes here:
//   1. getGlobalActiveMarketEvents — a DETERMINISTIC, WORLD-SHARED schedule
//      (seeded per 4-hour wall-clock window off SERVER_EPOCH_MS, mulberry32
//      — "seeded rng patterns only"). The server market routes and every
//      client compute the identical schedule with no DB state, so the event
//      a player reads in their feed is the event moving the shared price.
//   2. The multiplier is APPLIED: market/route.ts (displayed effective
//      price), market/trade/route.ts (execution price), and game-engine
//      mirrors the schedule into state.activeMarketEvents so existing panels
//      keep rendering it — for the event's STATED duration, then it expires.

import { mulberry32, hashStringToSeed } from './formulas';
import { SERVER_EPOCH_MS } from './server-time';

export interface MarketEvent {
  id: string;
  name: string;
  icon: string;
  description: string;
  affectedResources: string[]; // Resource IDs affected
  priceMultiplier: number;     // 1.4 = +40%, 0.7 = -30%
  durationHours: number;       // Real-time hours
}

export const MARKET_EVENTS: MarketEvent[] = [
  // Price surges (buy low before, sell during)
  {
    id: 'me_titanium_demand', name: 'Titanium Demand Surge', icon: '📈',
    description: 'A new mega-constellation contract drives titanium demand through the roof.',
    affectedResources: ['titanium'], priceMultiplier: 1.5, durationHours: 4,
  },
  {
    id: 'me_platinum_rush', name: 'Platinum Market Rally', icon: '💎',
    description: 'Automotive industry breakthroughs increase demand for platinum catalysts.',
    affectedResources: ['platinum_group', 'gold'], priceMultiplier: 1.4, durationHours: 6,
  },
  {
    id: 'me_water_crisis', name: 'Cislunar Water Shortage', icon: '💧',
    description: 'Multiple missions depleted lunar water reserves. Prices soaring.',
    affectedResources: ['lunar_water', 'mars_water'], priceMultiplier: 1.6, durationHours: 3,
  },
  {
    id: 'me_fuel_demand', name: 'Launch Season Fuel Demand', icon: '⛽',
    description: 'Heavy launch schedule driving propellant prices up.',
    affectedResources: ['methane', 'ethane'], priceMultiplier: 1.35, durationHours: 8,
  },
  {
    id: 'me_rare_earth_boom', name: 'Electronics Boom', icon: '🔬',
    description: 'New satellite constellation orders driving rare earth demand.',
    affectedResources: ['rare_earth'], priceMultiplier: 1.45, durationHours: 5,
  },

  // Price crashes (buy during, sell after)
  {
    id: 'me_iron_glut', name: 'Iron Ore Supply Glut', icon: '📉',
    description: 'Multiple asteroid mines came online simultaneously. Iron flooding the market.',
    affectedResources: ['iron', 'aluminum'], priceMultiplier: 0.6, durationHours: 6,
  },
  {
    id: 'me_exotic_discovery', name: 'Exotic Materials Discovery', icon: '✨',
    description: 'A new source of exotic materials found. Prices temporarily depressed.',
    affectedResources: ['exotic_materials'], priceMultiplier: 0.7, durationHours: 4,
  },
  {
    id: 'me_market_correction', name: 'Market Correction', icon: '⚖️',
    description: 'Broad market sell-off. All resource prices dropping.',
    affectedResources: ['iron', 'aluminum', 'titanium', 'rare_earth', 'gold'], priceMultiplier: 0.8, durationHours: 3,
  },

  // Mixed/special events
  {
    id: 'me_helium3_hype', name: 'Fusion Breakthrough Rumors', icon: '⚛️',
    description: 'Rumors of a fusion energy breakthrough send Helium-3 prices skyrocketing.',
    affectedResources: ['helium3'], priceMultiplier: 2.0, durationHours: 2,
  },
  {
    id: 'me_trade_war', name: 'Space Trade Dispute', icon: '🚫',
    description: 'Political tensions disrupt platinum and titanium trade routes.',
    affectedResources: ['platinum_group', 'titanium'], priceMultiplier: 1.3, durationHours: 8,
  },
];

/** Select a random market event.
 *  @deprecated Wave E — superseded by getGlobalActiveMarketEvents (per-player
 *  Math.random rolls meant every player saw different "events" and none of
 *  them priced). Kept only for back-compat imports. */
export function rollMarketEvent(): MarketEvent | null {
  if (Math.random() > 0.05) return null;
  const index = Math.floor(Math.random() * MARKET_EVENTS.length);
  return MARKET_EVENTS[index];
}

export interface ActiveMarketEvent {
  eventId: string;
  name: string;
  icon: string;
  affectedResources: string[];
  priceMultiplier: number;
  startedAtMs: number;
  expiresAtMs: number;
}

/** Check if a market event has expired */
export function isMarketEventExpired(event: ActiveMarketEvent): boolean {
  return Date.now() >= event.expiresAtMs;
}

/** Get active price multiplier for a resource from all active market events */
export function getMarketEventMultiplier(
  resourceId: string,
  activeEvents: ActiveMarketEvent[],
  nowMs: number = Date.now(),
): number {
  let multiplier = 1.0;
  for (const event of activeEvents) {
    if (nowMs >= event.expiresAtMs) continue; // Expired
    if (event.affectedResources.includes(resourceId)) {
      multiplier *= event.priceMultiplier;
    }
  }
  return multiplier;
}

// ─── Global deterministic schedule (audit Wave E — A5-iii) ───────────────────

/** Wall-clock spawn window. One spawn check per window keeps the cadence at
 *  ~2-3 events per real day (each lasting 2-8h), so there is usually one
 *  live opportunity without the market being permanently distorted. */
export const MARKET_EVENT_WINDOW_MS = 4 * 3600_000;

/** Chance that a window opens with a new event. */
export const MARKET_EVENT_SPAWN_CHANCE = 0.40;

/**
 * The world-shared market event schedule at a moment in time. Pure and
 * deterministic: every caller (server routes, client engine, tests) passing
 * the same `nowMs` gets the same answer. Seeded per window index off
 * SERVER_EPOCH_MS — same epoch that drives the shared game calendar, so
 * event windows are aligned for all players.
 */
export function getGlobalActiveMarketEvents(nowMs: number = Date.now()): ActiveMarketEvent[] {
  const active: ActiveMarketEvent[] = [];
  const currentWindow = Math.floor((nowMs - SERVER_EPOCH_MS) / MARKET_EVENT_WINDOW_MS);
  // Look back far enough to cover the longest event duration (8h = 2 windows).
  for (let w = currentWindow - 2; w <= currentWindow; w++) {
    if (w < 0) continue;
    const rng = mulberry32(hashStringToSeed(`stw-market-event:${w}`));
    if (rng() >= MARKET_EVENT_SPAWN_CHANCE) continue;
    const def = MARKET_EVENTS[Math.floor(rng() * MARKET_EVENTS.length)];
    const startedAtMs = SERVER_EPOCH_MS + w * MARKET_EVENT_WINDOW_MS;
    const expiresAtMs = startedAtMs + def.durationHours * 3600_000;
    if (nowMs < startedAtMs || nowMs >= expiresAtMs) continue;
    active.push({
      eventId: def.id,
      name: def.name,
      icon: def.icon,
      affectedResources: def.affectedResources,
      priceMultiplier: def.priceMultiplier,
      startedAtMs,
      expiresAtMs,
    });
  }
  return active;
}

/** Effective event multiplier for a resource from the global schedule —
 *  convenience for the server market routes. */
export function getGlobalMarketEventMultiplier(resourceId: string, nowMs: number = Date.now()): number {
  return getMarketEventMultiplier(resourceId, getGlobalActiveMarketEvents(nowMs), nowMs);
}

// ─── Wave M4 (docs/MEANINGFUL_2026-08.md §M4, F8/F10) — public forecast ────
//
// F8: the schedule above is deterministic and world-shared BY DESIGN — that
// boundary is correct (every client and the server must agree on which event
// is live without a DB round trip). The DEFECT was that the only way to know
// a FUTURE event was to read this source file and run the same math ahead of
// time — a code-reading trader front-ran every event risk-free. The fix is
// NOT to make the schedule secret (that would break the shared-client-tick
// boundary [BOUND] this file documents at the top); it's to STOP the
// forecast from being exclusive. `getGlobalMarketEventForecast` runs the
// exact same pure function ahead of "now" and is surfaced to EVERY player
// through the market API (see market/route.ts) and MarketPanel's "Market
// Outlook" section — so the code-reader's edge and the in-game trader's edge
// are now the identical, fully public 48h forecast. [P2W]: this must never
// sit behind a subscription tier — see market/route.ts.

export interface ForecastMarketEvent {
  eventId: string;
  name: string;
  icon: string;
  affectedResources: string[];
  priceMultiplier: number;
  startsAtMs: number;
  expiresAtMs: number;
  durationHours: number;
}

/** How far ahead the public forecast looks. Matches the spec's "48h ahead". */
export const MARKET_EVENT_FORECAST_HORIZON_MS = 48 * 3600_000;

/**
 * The world-shared, publicly-surfaced forecast of market events that have
 * not started yet as of `nowMs`, within `horizonMs`. Pure and deterministic
 * — identical output for the server and every client, exactly like
 * `getGlobalActiveMarketEvents`. This is the fix for F8: the same math the
 * schedule always ran, just exposed as a first-class in-game feature instead
 * of something only a source-reader could compute.
 */
export function getGlobalMarketEventForecast(
  nowMs: number = Date.now(),
  horizonMs: number = MARKET_EVENT_FORECAST_HORIZON_MS,
): ForecastMarketEvent[] {
  const forecast: ForecastMarketEvent[] = [];
  const currentWindow = Math.floor((nowMs - SERVER_EPOCH_MS) / MARKET_EVENT_WINDOW_MS);
  const lastWindow = Math.floor((nowMs + horizonMs - SERVER_EPOCH_MS) / MARKET_EVENT_WINDOW_MS);
  // Strictly future windows only — currently-active events are already
  // surfaced by getGlobalActiveMarketEvents; the forecast is "what's next".
  for (let w = Math.max(0, currentWindow + 1); w <= lastWindow; w++) {
    const rng = mulberry32(hashStringToSeed(`stw-market-event:${w}`));
    if (rng() >= MARKET_EVENT_SPAWN_CHANCE) continue;
    const def = MARKET_EVENTS[Math.floor(rng() * MARKET_EVENTS.length)];
    const startsAtMs = SERVER_EPOCH_MS + w * MARKET_EVENT_WINDOW_MS;
    const expiresAtMs = startsAtMs + def.durationHours * 3600_000;
    forecast.push({
      eventId: def.id,
      name: def.name,
      icon: def.icon,
      affectedResources: def.affectedResources,
      priceMultiplier: def.priceMultiplier,
      startsAtMs,
      expiresAtMs,
      durationHours: def.durationHours,
    });
  }
  return forecast.sort((a, b) => a.startsAtMs - b.startsAtMs);
}

/** True while any active or forecast event affects `resourceId` — used by the
 *  NPC maker (market-orderbook.ts) to widen its spread / halve its volume cap
 *  during a known event window (F10: an event-window trade against the NPC
 *  maker must be a real trade against liquidity, not a free-money oracle). */
export function isMarketEventActiveForResource(resourceId: string, nowMs: number = Date.now()): boolean {
  return getGlobalActiveMarketEvents(nowMs).some(ev => ev.affectedResources.includes(resourceId));
}
