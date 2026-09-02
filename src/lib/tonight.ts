/**
 * "Tonight over your town" — tonight's ISS / Tiangong / Hubble passes for a
 * registry city (2026-09-01, roadmap Tier 2).
 *
 * What "tonight" means: the city's local 18:00 → 06:00 window, derived with
 * Intl.DateTimeFormat in the city's IANA zone (no date library). Before
 * 06:00 local the window is the night already in progress; otherwise it is
 * the coming evening.
 *
 * What "visible" means (stated on-page): the pass predictor
 * (`satellite-pass-predictor.ts`) only knows geometry — when the object is
 * above the horizon. To be seen it also has to be dark where you are and the
 * satellite has to be in sunlight. So at each pass's peak we check
 *   1. observer darkness — sun below −6° (end of civil twilight) at the
 *      city, via the NOAA solar-position approximation below; failing this
 *      marks the pass `daylight` and drops it from the headline count;
 *   2. satellite illumination — the sun above the satellite's own horizon
 *      at its altitude (i.e. not in Earth's shadow), which is the reason
 *      passes vanish mid-sky; failing this marks the pass `eclipsed`.
 * A pass is `visible` when it fails neither. Peak-only sampling is coarse:
 * a pass that enters shadow after its peak still counts as visible.
 *
 * Brightness hint is from peak elevation alone (higher = closer = brighter):
 * ≥ 60° bright, 30–60° visible, < 30° faint. It ignores phase angle and the
 * object's size, so Hubble and Tiangong should be read a step dimmer than
 * the ISS at the same band.
 */

import { fetchTLE, predictPasses } from '@/lib/satellite-pass-predictor';
import { tleToLatLng } from '@/lib/satellite-propagator';
import type { TLEData } from '@/lib/satellite-propagator';
import { logger } from '@/lib/logger';
import { getTonightCity, brightnessHint } from '@/lib/tonight-cities';
import type { TonightCity, BrightnessHint } from '@/lib/tonight-cities';

export {
  TONIGHT_CITIES, TONIGHT_REGIONS, getTonightCity, brightnessHint, BRIGHTNESS_LABEL,
  formatLocalTime, formatLocalDate, formatDuration, tonightTitle,
} from '@/lib/tonight-cities';
export type { TonightCity, TonightRegion, BrightnessHint } from '@/lib/tonight-cities';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;
/** Sun elevation at the observer below which the sky counts as dark. */
export const DARK_SUN_ELEVATION_DEG = -6;
/** Elements older than this are flagged stale (fetchTLE's ISS fallback is years old). */
const STALE_TLE_DAYS = 30;

export const TONIGHT_SATS = [
  { id: '25544', name: 'ISS', longName: 'International Space Station' },
  { id: '48274', name: 'Tiangong', longName: 'Tiangong (China Space Station)' },
  { id: '20580', name: 'Hubble', longName: 'Hubble Space Telescope' },
] as const;

export interface TonightPass {
  startIso: string;
  endIso: string;
  maxElevationDeg: number;
  maxElevationAtIso: string;
  durationSec: number;
  brightnessHint: BrightnessHint;
  /** Sun above −6° at the city at peak — sky too bright. */
  daylight: boolean;
  /** Satellite in Earth's shadow at peak — dark sky, dark satellite. */
  eclipsed: boolean;
  visible: boolean;
}

export interface TonightSat {
  id: string;
  name: string;
  longName: string;
  passes: TonightPass[];
  visibleCount: number;
  tleEpochIso: string | null;
  /** Elements older than STALE_TLE_DAYS — predictions are unreliable. */
  stale: boolean;
  /** No elements at all for this object. */
  error: boolean;
}

export interface TonightResult {
  city: TonightCity;
  nowIso: string;
  windowStartIso: string;
  windowEndIso: string;
  /** Where the scan actually began: the later of window start and now. */
  scanStartIso: string;
  sats: TonightSat[];
  visibleCount: number;
  /** Newest element epoch across the three objects, ISO. */
  tleAsOf: string | null;
  sourceLine: string;
  /** True when nothing could be computed (CelesTrak down, no fallback). */
  error: boolean;
}

// ─── Time zones without a library ───────────────────────────────────────────

interface WallClock { year: number; month: number; day: number; hour: number; minute: number; second: number }

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    // Throws RangeError on an invalid IANA zone — the registry test relies on it.
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

/** Wall-clock fields of an instant in a zone. */
export function wallClock(date: Date, tz: string): WallClock {
  const p: Record<string, number> = {};
  for (const part of formatter(tz).formatToParts(date)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  return { year: p.year, month: p.month, day: p.day, hour: p.hour % 24, minute: p.minute, second: p.second };
}

/** UTC offset (ms) of a zone at an instant — positive east of Greenwich. */
export function tzOffsetMs(date: Date, tz: string): number {
  const w = wallClock(date, tz);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The instant at which a zone's wall clock reads `wallMs` (a Date.UTC value
 * built from the local fields). Evaluates the offset twice so a DST change
 * between the guess and the answer is absorbed.
 */
export function wallToUtc(wallMs: number, tz: string): Date {
  const first = wallMs - tzOffsetMs(new Date(wallMs), tz);
  const second = wallMs - tzOffsetMs(new Date(first), tz);
  return new Date(second);
}

/**
 * Tonight's local 18:00 → 06:00 window for a zone. Before 06:00 local it is
 * the night in progress (yesterday 18:00 → today 06:00); otherwise it is the
 * coming night (today 18:00 → tomorrow 06:00).
 */
export function localNightWindow(now: Date, tz: string): { start: Date; end: Date } {
  const w = wallClock(now, tz);
  const dayShift = w.hour < 6 ? -1 : 0; // Date.UTC normalises day 0 to the previous month
  const start = wallToUtc(Date.UTC(w.year, w.month - 1, w.day + dayShift, 18), tz);
  const end = wallToUtc(Date.UTC(w.year, w.month - 1, w.day + dayShift + 1, 6), tz);
  return { start, end };
}

// ─── Sun ────────────────────────────────────────────────────────────────────

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Sun elevation (degrees above the horizon) at a point — NOAA's low-precision
 * solar-position algorithm (Meeus), good to a few hundredths of a degree
 * here, which is far finer than the −6° darkness threshold needs.
 */
export function sunElevationDeg(date: Date, lat: number, lon: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = norm360(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = norm360(357.52911 + T * (35999.05029 - 0.0001537 * T));
  const Mr = M * DEG2RAD;
  const C = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * Mr) * 0.000289;
  const omega = (125.04 - 1934.136 * T) * DEG2RAD;
  const lambda = (L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) * DEG2RAD;
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = (eps0 + 0.00256 * Math.cos(omega)) * DEG2RAD;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const y = Math.tan(eps / 2) ** 2;
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const L0r = L0 * DEG2RAD;
  const eqTimeMin = 4 * RAD2DEG * (
    y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r)
    - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr)
  );
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarMin = (((utcMin + eqTimeMin + 4 * lon) % 1440) + 1440) % 1440;
  const hourAngle = (trueSolarMin / 4 - 180) * DEG2RAD;
  const latR = lat * DEG2RAD;
  const cosZenith = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(hourAngle);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) * RAD2DEG;
}

/** True when the observer's sky is dark enough to see a bright satellite. */
export function isDark(date: Date, lat: number, lon: number): boolean {
  return sunElevationDeg(date, lat, lon) < DARK_SUN_ELEVATION_DEG;
}

/**
 * True when the satellite itself is in sunlight: from its altitude the
 * horizon dips acos(R/(R+h)) below level (≈20° for the ISS), so it stays lit
 * while the sun, seen from the sub-satellite point, is above −dip.
 */
export function isSatelliteSunlit(tle: TLEData, date: Date): boolean {
  const pos = tleToLatLng(tle, date);
  const dipDeg = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.max(0, pos.altitude))) * RAD2DEG;
  return sunElevationDeg(date, pos.lat, pos.lng) > -dipDeg;
}

// ─── Passes ─────────────────────────────────────────────────────────────────

function emptyResult(city: TonightCity, now: Date, error: boolean): TonightResult {
  const { start, end } = localNightWindow(now, city.tz);
  const scanStart = new Date(Math.max(start.getTime(), now.getTime()));
  return {
    city,
    nowIso: now.toISOString(),
    windowStartIso: start.toISOString(),
    windowEndIso: end.toISOString(),
    scanStartIso: scanStart.toISOString(),
    sats: TONIGHT_SATS.map((s) => ({ id: s.id, name: s.name, longName: s.longName, passes: [], visibleCount: 0, tleEpochIso: null, stale: true, error: true })),
    visibleCount: 0,
    tleAsOf: null,
    sourceLine: 'Orbital elements: CelesTrak (unavailable)',
    error,
  };
}

/** Pure computation — no cache. Exported for tests and for the client shape. */
export async function computeTonight(city: TonightCity, now: Date = new Date()): Promise<TonightResult> {
  const base = emptyResult(city, now, false);
  const scanStart = new Date(base.scanStartIso);
  const windowEnd = new Date(base.windowEndIso);
  const windowHours = Math.max(0, (windowEnd.getTime() - scanStart.getTime()) / 3_600_000);

  const sats: TonightSat[] = [];
  for (const sat of TONIGHT_SATS) {
    let tle: TLEData | null = null;
    try {
      tle = await fetchTLE(sat.id);
    } catch (err) {
      logger.warn('tonight: TLE fetch threw', { sat: sat.id, error: err instanceof Error ? err.message : String(err) });
    }
    if (!tle) {
      sats.push({ id: sat.id, name: sat.name, longName: sat.longName, passes: [], visibleCount: 0, tleEpochIso: null, stale: true, error: true });
      continue;
    }
    const epochMs = tle.epoch instanceof Date ? tle.epoch.getTime() : new Date(tle.epoch).getTime();
    const stale = !Number.isFinite(epochMs) || now.getTime() - epochMs > STALE_TLE_DAYS * 86_400_000;
    const raw = windowHours > 0 ? predictPasses(tle, city.lat, city.lon, scanStart, windowHours, 30, 10) : [];
    const passes: TonightPass[] = raw.map((p) => {
      const peak = new Date(p.maxElevationAt);
      const daylight = !isDark(peak, city.lat, city.lon);
      const eclipsed = !isSatelliteSunlit(tle as TLEData, peak);
      return {
        startIso: p.startTime,
        endIso: p.endTime,
        maxElevationDeg: p.maxElevation,
        maxElevationAtIso: p.maxElevationAt,
        durationSec: p.durationSeconds,
        brightnessHint: brightnessHint(p.maxElevation),
        daylight,
        eclipsed,
        visible: !daylight && !eclipsed,
      };
    });
    sats.push({
      id: sat.id, name: sat.name, longName: sat.longName, passes,
      visibleCount: passes.filter((p) => p.visible).length,
      tleEpochIso: Number.isFinite(epochMs) ? new Date(epochMs).toISOString() : null,
      stale, error: false,
    });
  }

  const epochs = sats.map((s) => s.tleEpochIso).filter((e): e is string => !!e).sort();
  const tleAsOf = epochs.length ? epochs[epochs.length - 1] : null;
  return {
    ...base,
    sats,
    visibleCount: sats.reduce((n, s) => n + s.visibleCount, 0),
    tleAsOf,
    sourceLine: tleAsOf ? `Orbital elements: CelesTrak, epoch ${tleAsOf.slice(0, 16).replace('T', ' ')} UTC` : 'Orbital elements: CelesTrak (unavailable)',
    error: sats.every((s) => s.error),
  };
}

/** Never throws: an outage yields an empty result with `error: true`. */
export async function safeComputeTonight(city: TonightCity, now: Date = new Date()): Promise<TonightResult> {
  try {
    return await computeTonight(city, now);
  } catch (err) {
    logger.error('tonight: computation failed', { city: city.slug, error: err instanceof Error ? err.message : String(err) });
    return emptyResult(city, now, true);
  }
}

/**
 * Cached per city for 30 minutes (the TLE cache upstream is 6 h; the window
 * itself only moves once a day). `now` is taken inside the cached function
 * so it does not become part of the key.
 */
// Per-instance memo instead of unstable_cache (2026-09-01): a CelesTrak
// hiccup on the first render used to be cached for the full 30 minutes as
// "no passes tonight". Successful results keep the 30-min TTL; results
// carrying `error` are retried after 60 s.
const TONIGHT_OK_TTL_MS = 30 * 60 * 1000;
const TONIGHT_ERR_TTL_MS = 60 * 1000;
const tonightMemo = new Map<string, { result: TonightResult; at: number }>();

export function _resetTonightMemo(): void {
  tonightMemo.clear();
}

export async function getTonightPasses(slug: string): Promise<TonightResult | null> {
  const city = getTonightCity(slug);
  if (!city) return null;
  const hit = tonightMemo.get(city.slug);
  const now = Date.now();
  if (hit) {
    const ttl = hit.result.error || hit.result.sats.some((s) => s.error) ? TONIGHT_ERR_TTL_MS : TONIGHT_OK_TTL_MS;
    if (now - hit.at < ttl) return hit.result;
  }
  const result = await safeComputeTonight(city, new Date(now));
  tonightMemo.set(city.slug, { result, at: now });
  if (tonightMemo.size > 200) {
    const oldest = Array.from(tonightMemo.entries()).sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) tonightMemo.delete(oldest[0]);
  }
  return result;
}
