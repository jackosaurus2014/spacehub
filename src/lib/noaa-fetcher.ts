import { createCircuitBreaker } from './circuit-breaker';
import { logger } from './logger';

const noaaBreaker = createCircuitBreaker('noaa-swpc', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

// NOAA Space Weather Prediction Center APIs (free, no key needed)

export interface SolarFlareData {
  flrID: string;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classType: string;
  sourceLocation: string;
  activeRegionNum: number;
  linkedEvents: Array<{ activityID: string }> | null;
}

export interface GeomagneticStormData {
  gstID: string;
  startTime: string;
  allKpIndex: Array<{
    observedTime: string;
    kpIndex: number;
    source: string;
  }>;
  linkedEvents: Array<{ activityID: string }> | null;
}

export interface CMEData {
  activityID: string;
  startTime: string;
  sourceLocation: string;
  activeRegionNum: number | null;
  note: string;
  catalog: string;
}

export interface SpaceWeatherSummary {
  recentFlares: SolarFlareData[];
  recentStorms: GeomagneticStormData[];
  recentCMEs: CMEData[];
  lastUpdated: string;
  /** Latest planetary Kp from NOAA SWPC (keyless); null when the feed is down. */
  currentKp?: number | null;
  currentKpTime?: string | null;
}

/**
 * Latest 3-hour planetary Kp from NOAA SWPC — no API key, answers in well
 * under a second, and is what the homepage card should say when DONKI (NASA,
 * keyed, rate-limited on DEMO_KEY) is slow or empty.
 */
export async function fetchPlanetaryKp(): Promise<{ kp: number; time: string } | null> {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ time_tag?: string; Kp?: number | string }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const last = rows[rows.length - 1];
    const kp = typeof last.Kp === 'string' ? parseFloat(last.Kp) : last.Kp;
    if (kp == null || Number.isNaN(kp)) return null;
    return { kp, time: last.time_tag ?? '' };
  } catch (error) {
    logger.warn('SWPC planetary Kp fetch failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Fetch recent solar flares from NASA DONKI API (powered by NOAA data)
 */
export async function fetchRecentSolarFlares(days: number = 7): Promise<SolarFlareData[]> {
  return noaaBreaker.execute(async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetch(
      `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      throw new Error(`DONKI FLR API error: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }, [] as SolarFlareData[]);
}

/**
 * Fetch recent geomagnetic storms from NASA DONKI API
 */
export async function fetchRecentGeomagneticStorms(days: number = 30): Promise<GeomagneticStormData[]> {
  return noaaBreaker.execute(async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetch(
      `https://api.nasa.gov/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      throw new Error(`DONKI GST API error: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }, [] as GeomagneticStormData[]);
}

/**
 * Fetch recent Coronal Mass Ejections from NASA DONKI API
 */
export async function fetchRecentCMEs(days: number = 14): Promise<CMEData[]> {
  return noaaBreaker.execute(async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetch(
      `https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      throw new Error(`DONKI CME API error: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }, [] as CMEData[]);
}

/**
 * Get a summary of all recent space weather activity
 */
export async function getSpaceWeatherSummary(): Promise<SpaceWeatherSummary> {
  // allSettled: one slow DONKI endpoint must not take the others (or the Kp
  // reading) down with it — the breaker already returns [] on failure.
  const [flares, storms, cmes, kp] = await Promise.allSettled([
    fetchRecentSolarFlares(7),
    fetchRecentGeomagneticStorms(30),
    fetchRecentCMEs(14),
    fetchPlanetaryKp(),
  ]);
  const recentFlares = flares.status === 'fulfilled' ? flares.value : [];
  const recentStorms = storms.status === 'fulfilled' ? storms.value : [];
  const recentCMEs = cmes.status === 'fulfilled' ? cmes.value : [];
  const currentKp = kp.status === 'fulfilled' ? kp.value : null;

  logger.info('Space weather data fetched', {
    flares: recentFlares.length,
    storms: recentStorms.length,
    cmes: recentCMEs.length,
  });

  return {
    recentFlares,
    recentStorms,
    recentCMEs,
    lastUpdated: new Date().toISOString(),
    currentKp: currentKp?.kp ?? null,
    currentKpTime: currentKp?.time ?? null,
  };
}
