/**
 * Satellite pass predictor for a ground observer.
 *
 * Given TLE data for a satellite and an observer's latitude/longitude, scans
 * ahead over a time window in small time steps and groups consecutive "above
 * horizon" samples into discrete passes. For each pass we record:
 *   - startTime  / endTime       (ISO strings, UTC)
 *   - maxElevation                (peak degrees above horizon during pass)
 *   - maxElevationAt              (time of peak, ISO UTC)
 *
 * This is a simplified prediction suitable for alerting (ISS / LEO objects).
 * For mission-critical usage, a full SGP4 implementation is required.
 *
 * The underlying geometry mirrors `getVisibleSatellites()` in
 * `satellite-propagator.ts` — elevation is computed from the sub-satellite
 * point via Haversine + tan(elevation) formula.
 */

import { parseTLE, parseTLEText, tleToLatLng } from '@/lib/satellite-propagator';
import type { TLEData } from '@/lib/satellite-propagator';
import { logger } from '@/lib/logger';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;

/** Elevation in degrees for a satellite over a ground observer, right now. */
export function elevationFor(
  tle: TLEData,
  observerLat: number,
  observerLng: number,
  date: Date
): number {
  const pos = tleToLatLng(tle, date);

  const dLat = (pos.lat - observerLat) * DEG2RAD;
  const dLng = (pos.lng - observerLng) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(observerLat * DEG2RAD) *
      Math.cos(pos.lat * DEG2RAD) *
      Math.sin(dLng / 2) ** 2;
  const earthAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (earthAngle < 1e-10) return 90;

  const rRatio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + pos.altitude);
  const elevation = Math.atan2(
    Math.cos(earthAngle) - rRatio,
    Math.sin(earthAngle)
  ) * RAD2DEG;

  return elevation;
}

export interface PassPrediction {
  startTime: string;
  endTime: string;
  maxElevation: number;
  maxElevationAt: string;
  durationSeconds: number;
}

/**
 * Predict passes for an observer in a forward time window.
 *
 * @param tle            Parsed TLE data for the satellite
 * @param observerLat    Observer latitude (degrees, -90 to 90)
 * @param observerLng    Observer longitude (degrees, -180 to 180)
 * @param fromDate       Start of the forward scan window
 * @param windowHours    How far ahead to look (default 24)
 * @param stepSeconds    Time step for the scan (default 30)
 * @param minElevation   Minimum peak elevation to qualify as a pass (default 10)
 */
export function predictPasses(
  tle: TLEData,
  observerLat: number,
  observerLng: number,
  fromDate: Date = new Date(),
  windowHours: number = 24,
  stepSeconds: number = 30,
  minElevation: number = 10
): PassPrediction[] {
  const passes: PassPrediction[] = [];
  const endMs = fromDate.getTime() + windowHours * 60 * 60 * 1000;

  let inPass = false;
  let passStart: Date | null = null;
  let passMax = -90;
  let passMaxAt: Date | null = null;

  for (let t = fromDate.getTime(); t <= endMs; t += stepSeconds * 1000) {
    const sampleDate = new Date(t);
    const elev = elevationFor(tle, observerLat, observerLng, sampleDate);

    if (elev >= 0) {
      if (!inPass) {
        inPass = true;
        passStart = sampleDate;
        passMax = elev;
        passMaxAt = sampleDate;
      } else {
        if (elev > passMax) {
          passMax = elev;
          passMaxAt = sampleDate;
        }
      }
    } else if (inPass) {
      // Pass just ended at previous sample. Only record if peak >= minElevation.
      if (passStart && passMaxAt && passMax >= minElevation) {
        const endSample = new Date(t - stepSeconds * 1000);
        passes.push({
          startTime: passStart.toISOString(),
          endTime: endSample.toISOString(),
          maxElevation: Math.round(passMax * 10) / 10,
          maxElevationAt: passMaxAt.toISOString(),
          durationSeconds: Math.round((endSample.getTime() - passStart.getTime()) / 1000),
        });
      }
      inPass = false;
      passStart = null;
      passMax = -90;
      passMaxAt = null;
    }
  }

  // Tail: if we ended the scan mid-pass, record it anyway
  if (inPass && passStart && passMaxAt && passMax >= minElevation) {
    const endSample = new Date(endMs);
    passes.push({
      startTime: passStart.toISOString(),
      endTime: endSample.toISOString(),
      maxElevation: Math.round(passMax * 10) / 10,
      maxElevationAt: passMaxAt.toISOString(),
      durationSeconds: Math.round((endSample.getTime() - passStart.getTime()) / 1000),
    });
  }

  return passes;
}

// ─── TLE fetching (CelesTrak by NORAD id) ──────────────────────────────────
/**
 * In-memory TLE cache keyed by satellite identifier. CelesTrak rate-limits
 * aggressively (~4 requests/day per host), so we cache for 6 hours.
 */
interface TLECacheEntry {
  tle: TLEData;
  fetchedAt: number;
}
const tleCache = new Map<string, TLECacheEntry>();
const TLE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Known alias map for common satellite names used in the UI.
 * Users can type "ISS" and we resolve to NORAD 25544.
 */
const SAT_ALIAS: Record<string, string> = {
  ISS: '25544',
  'ISS (ZARYA)': '25544',
  HUBBLE: '20580',
  HST: '20580',
  CSS: '48274',
  'TIANHE': '48274',
};

/** Hard-coded ISS TLE as a last-resort fallback when CelesTrak is unreachable. */
const ISS_FALLBACK_TLE = {
  name: 'ISS (ZARYA)',
  line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025',
  line2: '2 25544  51.6400 208.9163 0006703  35.1560  51.3800 15.49560833    18',
};

/**
 * Resolve a user-provided satellite identifier (name or NORAD id) to its
 * NORAD catalog number.
 */
export function resolveSatelliteId(input: string): string {
  const upper = input.trim().toUpperCase();
  if (SAT_ALIAS[upper]) return SAT_ALIAS[upper];
  // If purely numeric, treat as NORAD id directly.
  if (/^\d+$/.test(upper)) return upper;
  // Otherwise fall back to ISS — keeps the stub safe for v1.
  return SAT_ALIAS.ISS;
}

/**
 * Fetch TLE for a given satellite identifier. Tries CelesTrak first,
 * falls back to a hardcoded ISS TLE if unreachable (keeps the cron
 * safe and deterministic in dev / outage situations).
 */
export async function fetchTLE(
  identifier: string
): Promise<TLEData | null> {
  const noradId = resolveSatelliteId(identifier);
  const cached = tleCache.get(noradId);
  if (cached && Date.now() - cached.fetchedAt < TLE_TTL_MS) {
    return cached.tle;
  }

  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`;
    const res = await fetch(url, {
      headers: { Accept: 'text/plain' },
      // 8s timeout via AbortController (avoid hanging cron runs)
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const text = await res.text();
      const parsed = parseTLEText(text);
      if (parsed.length > 0) {
        tleCache.set(noradId, { tle: parsed[0], fetchedAt: Date.now() });
        return parsed[0];
      }
    } else {
      logger.warn('CelesTrak TLE fetch non-OK', { noradId, status: res.status });
    }
  } catch (err) {
    logger.warn('CelesTrak TLE fetch failed', {
      noradId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback: hardcoded ISS TLE (only for ISS). Better a stale prediction
  // than a failed cron run.
  if (noradId === SAT_ALIAS.ISS) {
    try {
      const tle = parseTLE(
        ISS_FALLBACK_TLE.line1,
        ISS_FALLBACK_TLE.line2,
        ISS_FALLBACK_TLE.name
      );
      tleCache.set(noradId, { tle, fetchedAt: Date.now() });
      return tle;
    } catch {
      return null;
    }
  }

  return null;
}
