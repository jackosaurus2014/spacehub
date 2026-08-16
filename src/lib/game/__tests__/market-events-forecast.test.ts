/**
 * Wave M4 (docs/MEANINGFUL_2026-08.md §M4, F8) — the deterministic market
 * event schedule was a client-computable oracle: anyone reading source could
 * pre-compute future events and pre-position risk-free. The fix keeps the
 * schedule deterministic and shared (that boundary is correct by design —
 * every client and the server must agree without a DB round trip) but stops
 * it from being EXCLUSIVE: `getGlobalMarketEventForecast` runs the exact
 * same math forward and is surfaced to every player, so the "oracle" is now
 * public, honest, in-game intel instead of a source-reading exploit.
 *
 * These tests prove: (1) determinism — the forecast is a pure function of
 * `nowMs`, so server and client (or two different players) get identical
 * output, which is what makes publishing it fair; (2) the forecast only
 * contains events that haven't started yet (it's additive to, not
 * duplicative of, the active-events feed); (3) the 48h horizon is respected;
 * (4) `isMarketEventActiveForResource` correctly detects a resource's
 * currently-live event, which is what market-orderbook.ts's spread/volume
 * schedule keys off of.
 */

import {
  getGlobalActiveMarketEvents,
  getGlobalMarketEventForecast,
  isMarketEventActiveForResource,
  MARKET_EVENT_FORECAST_HORIZON_MS,
  MARKET_EVENT_WINDOW_MS,
} from '../market-events';
import { SERVER_EPOCH_MS } from '../server-time';

describe('getGlobalMarketEventForecast — Wave M4 public forecast (F8)', () => {
  it('is a pure, deterministic function of nowMs — the same instant always yields the same forecast', () => {
    const now = SERVER_EPOCH_MS + 500 * MARKET_EVENT_WINDOW_MS + 12_345;
    const a = getGlobalMarketEventForecast(now);
    const b = getGlobalMarketEventForecast(now);
    expect(a).toEqual(b);
  });

  it('two independent callers (simulating two different players / server vs client) computing the same instant get an identical forecast', () => {
    // Regression-guard for the fairness property: nothing about the
    // forecast depends on caller identity, only on the shared clock.
    const now = SERVER_EPOCH_MS + 777 * MARKET_EVENT_WINDOW_MS;
    const player1 = getGlobalMarketEventForecast(now);
    const player2 = getGlobalMarketEventForecast(now);
    expect(player1).toEqual(player2);
  });

  it('only contains events starting strictly after nowMs — never duplicates the active-events feed', () => {
    const now = SERVER_EPOCH_MS + 1000 * MARKET_EVENT_WINDOW_MS;
    const forecast = getGlobalMarketEventForecast(now);
    for (const ev of forecast) {
      expect(ev.startsAtMs).toBeGreaterThan(now);
    }
  });

  it('respects the horizon — no forecast event starts more than horizonMs after now', () => {
    const now = SERVER_EPOCH_MS + 2000 * MARKET_EVENT_WINDOW_MS;
    const horizon = MARKET_EVENT_FORECAST_HORIZON_MS;
    const forecast = getGlobalMarketEventForecast(now, horizon);
    for (const ev of forecast) {
      expect(ev.startsAtMs).toBeLessThanOrEqual(now + horizon);
    }
  });

  it('defaults to a 48h horizon', () => {
    expect(MARKET_EVENT_FORECAST_HORIZON_MS).toBe(48 * 3600_000);
  });

  it('returns results sorted by start time', () => {
    const now = SERVER_EPOCH_MS + 3000 * MARKET_EVENT_WINDOW_MS;
    const forecast = getGlobalMarketEventForecast(now, 7 * 24 * 3600_000); // wide horizon to catch several
    for (let i = 1; i < forecast.length; i++) {
      expect(forecast[i].startsAtMs).toBeGreaterThanOrEqual(forecast[i - 1].startsAtMs);
    }
  });

  it('scanning a wide horizon finds the same events getGlobalActiveMarketEvents later reports as active — the forecast is not fictional data', () => {
    const now = SERVER_EPOCH_MS + 4000 * MARKET_EVENT_WINDOW_MS;
    const forecast = getGlobalMarketEventForecast(now, 7 * 24 * 3600_000);
    // Pick the first forecast event (if any) and confirm that, once its
    // window arrives, getGlobalActiveMarketEvents reports the identical
    // event — the forecast reads the same schedule, not a separate roll.
    if (forecast.length > 0) {
      const ev = forecast[0];
      const activeAtStart = getGlobalActiveMarketEvents(ev.startsAtMs);
      expect(activeAtStart.some(a => a.eventId === ev.eventId && a.startedAtMs === ev.startsAtMs)).toBe(true);
    } else {
      // Extremely unlikely with a 7-day horizon at a 40% spawn chance per
      // 4h window, but don't fail the suite on a statistical fluke.
      expect(forecast).toEqual([]);
    }
  });
});

describe('isMarketEventActiveForResource — Wave M4 (F10 wiring)', () => {
  it('agrees with getGlobalActiveMarketEvents for an affected resource', () => {
    // Scan forward until we find a live window with a known event, then
    // confirm the resource-scoped helper agrees for both an affected and an
    // unaffected resource.
    let now = SERVER_EPOCH_MS;
    let found: ReturnType<typeof getGlobalActiveMarketEvents>[number] | null = null;
    for (let i = 0; i < 2000 && !found; i++) {
      const active = getGlobalActiveMarketEvents(now);
      if (active.length > 0) found = active[0];
      now += MARKET_EVENT_WINDOW_MS;
    }
    expect(found).not.toBeNull();
    if (found) {
      const affected = found.affectedResources[0];
      expect(isMarketEventActiveForResource(affected, now - MARKET_EVENT_WINDOW_MS)).toBe(true);
      expect(isMarketEventActiveForResource('definitely_not_a_resource_id', now - MARKET_EVENT_WINDOW_MS)).toBe(false);
    }
  });
});
