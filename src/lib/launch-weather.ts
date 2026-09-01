// ─── Launch weather odds ────────────────────────────────────────────────────
// One source of truth for "will the weather let it fly": the server strip on
// /launch/[eventId] (crawlable) and the polling client widget (via
// /api/launch-day/[eventId]/weather) both come through here, so the numbers
// agree.
//
// Honesty rules:
//  - Real forecast or nothing. NWS (api.weather.gov) is the only source and it
//    only covers US soil; every other range returns null and the caller says so.
//    There is no simulated fallback anywhere in this file.
//  - oddsPct is a *criteria heuristic*, not a probabilistic forecast — see
//    oddsFromCriteria() for the exact method. It is computed only from the
//    evaluated constraints; nothing is invented.
//  - Cached 15 minutes per (rounded pad coords, forecast hour). Every date is
//    an ISO string because unstable_cache round-trips through JSON.

import { unstable_cache } from 'next/cache';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { siteSlugForLocation, getSite } from '@/lib/launch-site-registry';
import { SITE_PADS } from '@/lib/launch-viewing-cities';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PadCoords {
  lat: number;
  lon: number;
  /** 'pad' = LL2 pad coordinates on the event; 'site' = registry pad for the site. */
  source: 'pad' | 'site';
  /** Registry site slug when known (drives the honest "no source" copy). */
  siteSlug: string | null;
}

export interface WeatherObservation {
  windSpeed: number; // knots (upper bound of any NWS range)
  windDirection: string; // 8-point compass
  temperature: number; // Fahrenheit
  cloudCover: number; // 0-100, derived from the NWS shortForecast wording
  lightningRisk: 'none' | 'low' | 'moderate' | 'high';
  precipitation: number; // probability 0-100
  visibility: number; // statute miles, derived from wording
  humidity: number; // 0-100
  shortForecast: string;
}

export interface LaunchWeatherCriterion {
  name: string;
  status: 'go' | 'caution' | 'no_go';
  detail: string;
}

export type RangeStatus = 'green' | 'yellow' | 'red';

export interface LaunchWeatherOdds {
  status: RangeStatus;
  /** Heuristic go-probability derived only from `criteria` (see oddsFromCriteria). */
  oddsPct: number;
  criteria: LaunchWeatherCriterion[];
  weather: WeatherObservation;
  /** Start of the NWS hourly period the evaluation used (ISO). */
  forecastFor: string;
  fetchedAt: string;
  source: 'NWS';
  simulated: false;
  coords: { lat: number; lon: number; source: 'pad' | 'site' };
}

// ─── Coordinates ────────────────────────────────────────────────────────────

/**
 * Location strings that the registry matcher misses but that name a US range
 * unambiguously. Checked only after siteSlugForLocation() comes up empty.
 */
const LOCATION_ALIASES: Array<{ re: RegExp; slug: string }> = [
  { re: /Boca Chica/i, slug: 'starbase' },
  { re: /\bKSC\b|\bCCSFS\b|\bCCAFS\b|SLC-?40|SLC-?41|LC-?39|LC-?36|Canaveral/i, slug: 'cape-canaveral' },
  { re: /\bVSFB\b|\bVAFB\b|SLC-?4E|SLC-?6|Lompoc/i, slug: 'vandenberg' },
  { re: /Wallops|\bMARS\b.*Virginia|Pad 0A|Pad 0B/i, slug: 'wallops' },
];

export function siteSlugForWeather(location: string | null | undefined): string | null {
  if (!location) return null;
  const registry = siteSlugForLocation(location);
  if (registry) return registry;
  for (const a of LOCATION_ALIASES) if (a.re.test(location)) return a.slug;
  return null;
}

/**
 * Pad coordinates for a launch: LL2's pad lat/lon on the event first (exact
 * pad), then the registry's representative pad for the site. Null when we
 * genuinely do not know where the rocket is.
 */
export function resolvePadCoords(event: {
  padLatitude?: number | null;
  padLongitude?: number | null;
  location?: string | null;
}): PadCoords | null {
  const siteSlug = siteSlugForWeather(event.location);
  const lat = event.padLatitude;
  const lon = event.padLongitude;
  if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    return { lat, lon, source: 'pad', siteSlug };
  }
  if (siteSlug && SITE_PADS[siteSlug]) {
    const pad = SITE_PADS[siteSlug];
    return { lat: pad.lat, lon: pad.lon, source: 'site', siteSlug };
  }
  return null;
}

// ─── NWS coverage ───────────────────────────────────────────────────────────

// api.weather.gov gridpoints exist for the US states and territories only.
// Bounding boxes are deliberately generous; a covered point that NWS still
// rejects fails the fetch and reads as "unavailable", never as fake weather.
const NWS_BOXES: Array<{ name: string; minLat: number; maxLat: number; minLon: number; maxLon: number }> = [
  { name: 'CONUS', minLat: 24.3, maxLat: 49.5, minLon: -125.0, maxLon: -66.5 },
  { name: 'Alaska', minLat: 51.0, maxLat: 71.6, minLon: -180.0, maxLon: -129.5 },
  { name: 'Hawaii', minLat: 18.6, maxLat: 22.5, minLon: -160.5, maxLon: -154.5 },
  { name: 'Puerto Rico / USVI', minLat: 17.5, maxLat: 18.6, minLon: -67.5, maxLon: -64.4 },
  { name: 'Guam / CNMI', minLat: 13.1, maxLat: 15.4, minLon: 144.5, maxLon: 146.2 },
];

export function isNwsCovered(coords: { lat: number; lon: number }): boolean {
  return NWS_BOXES.some((b) => coords.lat >= b.minLat && coords.lat <= b.maxLat && coords.lon >= b.minLon && coords.lon <= b.maxLon);
}

/** Human name for the honest "no forecast source" line. */
export function siteDisplayName(coords: PadCoords | null, location: string | null | undefined): string {
  const site = coords?.siteSlug ? getSite(coords.siteSlug) : null;
  if (site) return site.shortName;
  if (location) return location.split(',')[0].trim();
  return 'this site';
}

// ─── NWS fetch ──────────────────────────────────────────────────────────────

// Opens after 3 failures, probes again after 2 minutes. Shared with the API
// route (createCircuitBreaker is a registry, same name = same breaker).
const nwsBreaker = createCircuitBreaker('noaa-weather', { failureThreshold: 3, resetTimeout: 120_000 });

const NWS_HEADERS = {
  'User-Agent': 'SpaceNexus/1.0 (contact@spacenexus.us)',
  Accept: 'application/geo+json',
};

interface NWSPointsResponse { properties?: { forecastHourly?: string } }
export interface NWSHourlyPeriod {
  startTime: string;
  endTime: string;
  temperature: number;
  temperatureUnit?: string;
  windSpeed: string; // "10 mph" | "5 to 10 mph"
  windDirection: string;
  relativeHumidity?: { value: number | null };
  probabilityOfPrecipitation?: { value: number | null };
  shortForecast: string;
}
interface NWSHourlyResponse { properties?: { periods?: NWSHourlyPeriod[] } }

async function fetchNwsHourly(lat: number, lon: number): Promise<NWSHourlyPeriod[]> {
  const pointsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
  const pointsRes = await fetch(pointsUrl, { headers: NWS_HEADERS, signal: AbortSignal.timeout(8000) });
  if (!pointsRes.ok) throw new Error(`NWS points ${pointsRes.status} for ${lat},${lon}`);
  const points = (await pointsRes.json()) as NWSPointsResponse;
  const hourlyUrl = points.properties?.forecastHourly;
  if (!hourlyUrl) throw new Error('NWS points response missing forecastHourly');

  const hourlyRes = await fetch(hourlyUrl, { headers: NWS_HEADERS, signal: AbortSignal.timeout(8000) });
  if (!hourlyRes.ok) throw new Error(`NWS hourly ${hourlyRes.status}`);
  const hourly = (await hourlyRes.json()) as NWSHourlyResponse;
  const periods = hourly.properties?.periods;
  if (!periods || periods.length === 0) throw new Error('NWS hourly returned no periods');
  return periods;
}

/**
 * The hourly period covering `target`. A target before the first period
 * (launch already in progress) uses the current hour; a target past the
 * horizon returns null — we do not stretch the last hour to cover it.
 */
export function pickPeriod(periods: NWSHourlyPeriod[], target: Date): NWSHourlyPeriod | null {
  if (periods.length === 0) return null;
  const t = target.getTime();
  const first = Date.parse(periods[0].startTime);
  if (Number.isFinite(first) && t < first) return periods[0];
  for (const p of periods) {
    const s = Date.parse(p.startTime);
    const e = Date.parse(p.endTime);
    if (Number.isFinite(s) && Number.isFinite(e) && t >= s && t < e) return p;
  }
  return null;
}

const THREE_TO_TWO: Record<string, string> = { NNE: 'NE', ENE: 'NE', ESE: 'SE', SSE: 'SE', SSW: 'SW', WSW: 'SW', WNW: 'NW', NNW: 'NW' };
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Pure parse of one NWS hourly period into our observation shape. */
export function parsePeriod(p: NWSHourlyPeriod): WeatherObservation {
  let mph = 0;
  const m = /(\d+)\s*(?:to\s*(\d+))?\s*mph/i.exec(p.windSpeed || '');
  if (m) mph = m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10); // range → upper bound
  const windSpeed = Math.round(mph * 0.868976);

  let windDirection = (p.windDirection || 'N').toUpperCase();
  if (windDirection.length === 3) windDirection = THREE_TO_TWO[windDirection] ?? windDirection.slice(0, 2);
  if (!COMPASS.includes(windDirection)) windDirection = 'N';

  const temperature = p.temperatureUnit === 'C' ? Math.round(p.temperature * 9 / 5 + 32) : p.temperature;
  const humidity = p.relativeHumidity?.value ?? 50;
  const precipitation = p.probabilityOfPrecipitation?.value ?? 0;

  const f = (p.shortForecast || '').toLowerCase();
  let cloudCover = 20;
  if (f.includes('mostly cloudy')) cloudCover = 70;
  else if (f.includes('partly cloudy') || f.includes('partly sunny')) cloudCover = 45;
  else if (f.includes('overcast') || f.includes('cloudy')) cloudCover = 85;
  else if (f.includes('mostly clear') || f.includes('mostly sunny')) cloudCover = 25;
  else if (f.includes('clear') || f.includes('sunny')) cloudCover = 10;
  else if (f.includes('fog')) cloudCover = 90;

  let visibility = 10;
  if (f.includes('fog') || f.includes('mist')) visibility = 2;
  else if (f.includes('haze') || f.includes('smoke')) visibility = 4;
  else if (f.includes('rain') || f.includes('shower') || f.includes('storm')) visibility = 5;

  let lightningRisk: WeatherObservation['lightningRisk'] = 'none';
  if (f.includes('thunderstorm') || f.includes('lightning')) lightningRisk = precipitation > 60 ? 'high' : 'moderate';
  else if (f.includes('storm') || f.includes('shower')) lightningRisk = 'low';

  return { windSpeed, windDirection, temperature, cloudCover, lightningRisk, precipitation, visibility, humidity, shortForecast: p.shortForecast || '' };
}

// ─── Criteria and odds ──────────────────────────────────────────────────────

/**
 * Weather-only go/no-go constraints, in the spirit of the 45th Weather
 * Squadron's launch commit criteria but simplified to what an hourly public
 * forecast can support. Nothing here pretends to know vehicle health, range
 * assets or upper-level winds — those are not in the forecast.
 */
export function evaluateCriteria(w: WeatherObservation): LaunchWeatherCriterion[] {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return [
    { name: 'Surface winds', status: w.windSpeed > 25 ? 'no_go' : w.windSpeed > 18 ? 'caution' : 'go', detail: `${w.windSpeed} kt ${w.windDirection} (limit 25 kt)` },
    { name: 'Lightning', status: w.lightningRisk === 'high' ? 'no_go' : w.lightningRisk === 'moderate' ? 'caution' : 'go', detail: `${cap(w.lightningRisk)} risk` },
    { name: 'Cloud cover', status: w.cloudCover > 80 ? 'caution' : 'go', detail: `${w.cloudCover}% (${w.shortForecast || 'from NWS wording'})` },
    { name: 'Precipitation', status: w.precipitation > 40 ? 'no_go' : w.precipitation > 15 ? 'caution' : 'go', detail: `${w.precipitation}% chance` },
    { name: 'Visibility', status: w.visibility < 3 ? 'caution' : 'go', detail: `${w.visibility} mi` },
  ];
}

export function statusFromCriteria(criteria: LaunchWeatherCriterion[]): RangeStatus {
  if (criteria.some((c) => c.status === 'no_go')) return 'red';
  if (criteria.some((c) => c.status === 'caution')) return 'yellow';
  return 'green';
}

/**
 * Odds method (stated, deterministic, criteria-only):
 *   all constraints GO                → 90
 *   any CAUTION, no NO-GO             → 60, minus 10 for each caution after the first (floor 40)
 *   any NO-GO                         → 25, minus 10 for each further no-go (floor 10)
 * These are bands mapped from the evaluated constraint list, not a modelled
 * probability of violation — the real POV comes from the range weather
 * squadron, which we do not have.
 */
export function oddsFromCriteria(criteria: LaunchWeatherCriterion[]): number {
  const noGo = criteria.filter((c) => c.status === 'no_go').length;
  const caution = criteria.filter((c) => c.status === 'caution').length;
  if (noGo > 0) return Math.max(10, 25 - 10 * (noGo - 1));
  if (caution > 0) return Math.max(40, 60 - 10 * (caution - 1));
  return 90;
}

export const ODDS_METHOD = 'SpaceNexus constraint heuristic on the NWS hourly forecast (90 all-go / 60 caution / 25 no-go bands)';

// ─── Cached loader ──────────────────────────────────────────────────────────

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (error) {
    logger.warn(`launch-weather: ${label} failed`, { error: error instanceof Error ? error.message : String(error) });
    return fallback;
  }
}

async function loadOdds(coords: PadCoords, launchIso: string): Promise<LaunchWeatherOdds | null> {
  const periods = await nwsBreaker.execute(() => fetchNwsHourly(coords.lat, coords.lon));
  const period = pickPeriod(periods, new Date(launchIso));
  if (!period) {
    logger.info('launch-weather: launch beyond NWS hourly horizon', { launchIso, last: periods[periods.length - 1]?.endTime });
    return null;
  }
  const weather = parsePeriod(period);
  const criteria = evaluateCriteria(weather);
  return {
    status: statusFromCriteria(criteria),
    oddsPct: oddsFromCriteria(criteria),
    criteria,
    weather,
    forecastFor: new Date(period.startTime).toISOString(),
    fetchedAt: new Date().toISOString(),
    source: 'NWS',
    simulated: false,
    coords: { lat: coords.lat, lon: coords.lon, source: coords.source },
  };
}

/** NWS hourly horizon: ~156 h. We gate at 7 days and let pickPeriod be strict. */
export const WEATHER_HORIZON_MS = 7 * 86400000;

/**
 * Launch weather odds for a pad and launch time. Null when there is no
 * forecast source (outside NWS coverage), the fetch failed, or the launch is
 * beyond the hourly horizon — callers render an honest line, never a guess.
 */
export async function getLaunchWeatherOdds(
  eventId: string,
  coords: PadCoords | null,
  launchDate: Date | string | null | undefined,
): Promise<LaunchWeatherOdds | null> {
  if (!coords || !isNwsCovered(coords)) return null;
  const launch = launchDate ? new Date(launchDate) : new Date();
  if (Number.isNaN(launch.getTime())) return null;
  const launchIso = launch.toISOString();
  // Cache key: pad to ~1 km + the forecast hour the launch falls in.
  const latKey = coords.lat.toFixed(2);
  const lonKey = coords.lon.toFixed(2);
  const hourKey = String(Math.floor(Math.max(launch.getTime(), Date.now()) / 3600000));
  const cached = unstable_cache(
    () => safe(`nws ${eventId}`, () => loadOdds(coords, launchIso), null),
    ['launch-weather-v1', latKey, lonKey, hourKey],
    { revalidate: 900 },
  );
  return cached();
}

/** Should the launch page show a weather strip at all? */
export function weatherWindowOpen(status: string, launchDate: Date | null | undefined, now: Date = new Date()): boolean {
  if (!launchDate) return false;
  if (['completed', 'failed', 'failure', 'scrubbed', 'success', 'partial_failure'].includes(status)) return false;
  const dt = launchDate.getTime() - now.getTime();
  // Already-lifted-off within the last 30 minutes still counts as live.
  return dt > -30 * 60000 && dt <= WEATHER_HORIZON_MS;
}
