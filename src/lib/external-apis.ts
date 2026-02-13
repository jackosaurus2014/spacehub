// External API Configuration and Utilities for Real-Time Data Integration

import { createCircuitBreaker } from './circuit-breaker';
import { logger } from './logger';

// Warn once at runtime if NASA_API_KEY is missing (DEMO_KEY has severe rate limits: 30 req/hr)
let _nasaKeyWarned = false;
export function warnIfNasaDemoKey(): void {
  if (!_nasaKeyWarned && !process.env.NASA_API_KEY) {
    _nasaKeyWarned = true;
    logger.warn('NASA_API_KEY is not set — falling back to DEMO_KEY with severe rate limits (30 req/hr, 50 req/day). Set NASA_API_KEY in environment to avoid data staleness.');
  }
}

export const EXTERNAL_APIS = {
  NASA_DONKI: {
    baseUrl: 'https://api.nasa.gov/DONKI',
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
    rateLimit: { requests: 1000, period: 3600 },
  },
  NOAA_SWPC: {
    baseUrl: 'https://services.swpc.noaa.gov',
    rateLimit: { requests: 100, period: 3600 },
  },
  LAUNCH_LIBRARY: {
    baseUrl: 'https://ll.thespacedevs.com/2.2.0',
    rateLimit: { requests: 15, period: 3600 },
  },
  SPACEX: {
    baseUrl: 'https://api.spacexdata.com/v5',
    rateLimit: { requests: 50, period: 1 },
  },
  CELESTRAK: {
    baseUrl: 'https://celestrak.org/NORAD/elements',
    rateLimit: { requests: 4, period: 86400 },
  },
  SPACEFLIGHT_NEWS: {
    baseUrl: 'https://api.spaceflightnewsapi.net/v4',
    rateLimit: { requests: 100, period: 3600 },
  },
  FEDERAL_REGISTER: {
    baseUrl: 'https://www.federalregister.gov/api/v1',
    rateLimit: { requests: 100, period: 3600 },
  },
  OPEN_NOTIFY: {
    baseUrl: 'https://api.open-notify.org',
    rateLimit: { requests: 12, period: 60 }, // ~1 per 5 seconds
  },
  NASA_NEOWS: {
    baseUrl: 'https://api.nasa.gov/neo/rest/v1',
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
    rateLimit: { requests: 1000, period: 3600 },
  },
  USASPENDING: {
    baseUrl: 'https://api.usaspending.gov/api/v2',
    rateLimit: { requests: 100, period: 60 },
  },
  USPTO_PATENTSVIEW: {
    baseUrl: 'https://search.patentsview.org/api/v1',
    rateLimit: { requests: 45, period: 60 },
  },
  // ─── NEW APIs ────────────────────────────────────────────────────────
  NASA_APOD: {
    baseUrl: 'https://api.nasa.gov/planetary',
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
    rateLimit: { requests: 1000, period: 3600 },
  },
  NASA_TECHPORT: {
    baseUrl: 'https://api.nasa.gov/techport/api',
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
    rateLimit: { requests: 1000, period: 3600 },
  },
  JPL_SBDB: {
    baseUrl: 'https://ssd-api.jpl.nasa.gov',
    rateLimit: { requests: 20, period: 60 }, // Conservative — no official limit published
  },
  NOAA_SWPC_JSON: {
    baseUrl: 'https://services.swpc.noaa.gov/json',
    rateLimit: { requests: 60, period: 3600 }, // No credentials needed, be polite
  },
  NOAA_SWPC_PRODUCTS: {
    baseUrl: 'https://services.swpc.noaa.gov/products',
    rateLimit: { requests: 60, period: 3600 },
  },
  N2YO: {
    baseUrl: 'https://api.n2yo.com/rest/v1/satellite',
    apiKey: process.env.N2YO_API_KEY || '',
    rateLimit: { requests: 1000, period: 3600 },
  },
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    apiKey: process.env.FINNHUB_API_KEY || '',
    rateLimit: { requests: 60, period: 60 }, // Free tier: 60 calls/min
  },
  SAM_GOV: {
    baseUrl: 'https://api.sam.gov/prod/opportunities/v2',
    apiKey: process.env.SAM_GOV_API_KEY || '',
    rateLimit: { requests: 1000, period: 86400 }, // Free tier: 1000/day
  },
  FCC_ECFS: {
    baseUrl: 'https://efiling.fcc.gov/solr/ecfs/select',
    rateLimit: { requests: 50, period: 3600 }, // Conservative — be polite
  },
  // ─── NEW APIs (v0.8.0) ─────────────────────────────────────────────────
  NASA_EPIC: {
    baseUrl: 'https://epic.gsfc.nasa.gov/api',
    rateLimit: { requests: 30, period: 3600 }, // No official limit; be polite
  },
  NASA_EONET: {
    baseUrl: 'https://eonet.gsfc.nasa.gov/api/v3',
    rateLimit: { requests: 60, period: 3600 },
  },
  NASA_MARS_PHOTOS: {
    baseUrl: 'https://api.nasa.gov/mars-photos/api/v1',
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
    rateLimit: { requests: 1000, period: 3600 },
  },
  NASA_EXOPLANET: {
    baseUrl: 'https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nstedAPI/nph-nstedAPI',
    rateLimit: { requests: 30, period: 3600 }, // Be polite — academic resource
  },
  JPL_SENTRY: {
    baseUrl: 'https://ssd-api.jpl.nasa.gov/sentry.api',
    rateLimit: { requests: 20, period: 60 },
  },
  JPL_FIREBALL: {
    baseUrl: 'https://ssd-api.jpl.nasa.gov/fireball.api',
    rateLimit: { requests: 20, period: 60 },
  },
  ASTERANK: {
    baseUrl: 'https://www.asterank.com/api/asterank',
    rateLimit: { requests: 30, period: 3600 },
  },
  NASA_IMAGES: {
    baseUrl: 'https://images-api.nasa.gov',
    rateLimit: { requests: 100, period: 3600 },
  },
  HELIOVIEWER: {
    baseUrl: 'https://api.helioviewer.org/v2',
    rateLimit: { requests: 60, period: 3600 },
  },
  NASA_DSN: {
    baseUrl: 'https://eyes.jpl.nasa.gov/dsn/data',
    rateLimit: { requests: 30, period: 3600 },
  },
  WHERE_THE_ISS: {
    baseUrl: 'https://api.wheretheiss.at/v1',
    rateLimit: { requests: 60, period: 3600 },
  },
  SBIR_GOV: {
    baseUrl: 'https://www.sbir.gov/api',
    rateLimit: { requests: 30, period: 3600 },
  },
};

// Circuit breakers for each external API
const nasaDonkiBreaker = createCircuitBreaker('nasa-donki', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const noaaSwpcBreaker = createCircuitBreaker('noaa-swpc', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const launchLibBreaker = createCircuitBreaker('launch-library-api', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const spacexBreaker = createCircuitBreaker('spacex-api', {
  failureThreshold: 3,
  resetTimeout: 60_000,
});
const celestrakBreaker = createCircuitBreaker('celestrak', {
  failureThreshold: 3,
  resetTimeout: 300_000, // 5 minutes — very strict rate limits
});
const spaceflightNewsBreaker = createCircuitBreaker('spaceflight-news-api', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const federalRegisterBreaker = createCircuitBreaker('federal-register', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const nasaApodBreaker = createCircuitBreaker('nasa-apod', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const nasaTechportBreaker = createCircuitBreaker('nasa-techport', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const jplSbdbBreaker = createCircuitBreaker('jpl-sbdb', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const noaaSwpcJsonBreaker = createCircuitBreaker('noaa-swpc-json', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const n2yoBreaker = createCircuitBreaker('n2yo', {
  failureThreshold: 3,
  resetTimeout: 300_000, // 5 min — protect API key limits
});
const finnhubBreaker = createCircuitBreaker('finnhub', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const samGovBreaker = createCircuitBreaker('sam-gov', {
  failureThreshold: 3,
  resetTimeout: 300_000, // 5 min — limited daily quota
});
const fccEcfsBreaker = createCircuitBreaker('fcc-ecfs', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
// --- New circuit breakers (v0.8.0) ---
const nasaEpicBreaker = createCircuitBreaker('nasa-epic', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const nasaEonetBreaker = createCircuitBreaker('nasa-eonet', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const nasaMarsPhotosBreaker = createCircuitBreaker('nasa-mars-photos', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const nasaExoplanetBreaker = createCircuitBreaker('nasa-exoplanet', {
  failureThreshold: 3,
  resetTimeout: 300_000, // 5 min — academic resource, be polite
});
const jplSentryBreaker = createCircuitBreaker('jpl-sentry', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const jplFireballBreaker = createCircuitBreaker('jpl-fireball', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const asterankBreaker = createCircuitBreaker('asterank', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const nasaImagesBreaker = createCircuitBreaker('nasa-images', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const helioviewerBreaker = createCircuitBreaker('helioviewer', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const nasaDsnBreaker = createCircuitBreaker('nasa-dsn', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const whereTheIssBreaker = createCircuitBreaker('where-the-iss', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
const sbirGovBreaker = createCircuitBreaker('sbir-gov', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

// Fetch with retry and exponential backoff
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options?.headers,
        },
      });

      if (response.ok) {
        return response;
      }

      // Rate limited - wait and retry
      if (response.status === 429) {
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        logger.warn(`Rate limited, waiting ${waitTime}ms before retry ${i + 1}/${retries}`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      // Server error - retry
      if (response.status >= 500) {
        const waitTime = Math.pow(2, i) * 1000;
        logger.warn(`Server error ${response.status}, waiting ${waitTime}ms before retry ${i + 1}/${retries}`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      // Client error - don't retry
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000;
        logger.warn(`Fetch error, waiting ${waitTime}ms before retry ${i + 1}/${retries}`, { error: error instanceof Error ? error.message : String(error) });
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

// NASA DONKI API helpers
export async function fetchNasaDonki(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  return nasaDonkiBreaker.execute(async () => {
    const searchParams = new URLSearchParams({
      api_key: EXTERNAL_APIS.NASA_DONKI.apiKey,
      ...params,
    });

    const url = `${EXTERNAL_APIS.NASA_DONKI.baseUrl}/${endpoint}?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NOAA SWPC API helpers
export async function fetchNoaaSwpc(endpoint: string): Promise<unknown> {
  return noaaSwpcBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.NOAA_SWPC.baseUrl}${endpoint}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// Launch Library 2 API helpers
export async function fetchLaunchLibrary(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  return launchLibBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.LAUNCH_LIBRARY.baseUrl}/${endpoint}?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// SpaceX API helpers
export async function fetchSpaceX(endpoint: string): Promise<unknown> {
  return spacexBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.SPACEX.baseUrl}/${endpoint}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// CelesTrak API helpers
export async function fetchCelesTrak(
  group: string,
  format: 'json' | 'tle' | '3le' = 'json'
): Promise<unknown> {
  return celestrakBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.CELESTRAK.baseUrl}/gp.php?GROUP=${group}&FORMAT=${format}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// Spaceflight News API helpers
export async function fetchSpaceflightNews(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  return spaceflightNewsBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.SPACEFLIGHT_NEWS.baseUrl}/${endpoint}?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// Federal Register API helpers
export async function fetchFederalRegister(
  params: Record<string, string> = {}
): Promise<unknown> {
  return federalRegisterBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.FEDERAL_REGISTER.baseUrl}/documents.json?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NASA APOD API helpers
export async function fetchNasaApod(
  params: Record<string, string> = {}
): Promise<unknown> {
  return nasaApodBreaker.execute(async () => {
    const searchParams = new URLSearchParams({
      api_key: EXTERNAL_APIS.NASA_APOD.apiKey,
      ...params,
    });
    const url = `${EXTERNAL_APIS.NASA_APOD.baseUrl}/apod?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NASA TechPort API helpers
export async function fetchNasaTechport(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  return nasaTechportBreaker.execute(async () => {
    const searchParams = new URLSearchParams({
      api_key: EXTERNAL_APIS.NASA_TECHPORT.apiKey,
      ...params,
    });
    const url = `${EXTERNAL_APIS.NASA_TECHPORT.baseUrl}/${endpoint}?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// JPL SBDB Close Approach Data API helpers
export async function fetchJplCad(
  params: Record<string, string> = {}
): Promise<unknown> {
  return jplSbdbBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.JPL_SBDB.baseUrl}/cad.api?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NOAA SWPC JSON data helpers (planetary K-index, solar regions, etc.)
export async function fetchNoaaSwpcJson(endpoint: string): Promise<unknown> {
  return noaaSwpcJsonBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.NOAA_SWPC_JSON.baseUrl}/${endpoint}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NOAA SWPC Products helpers (alerts, forecasts, etc.)
export async function fetchNoaaSwpcProducts(endpoint: string): Promise<unknown> {
  return noaaSwpcJsonBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.NOAA_SWPC_PRODUCTS.baseUrl}/${endpoint}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// N2YO satellite tracking API helpers (requires API key)
export async function fetchN2yo(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  if (!EXTERNAL_APIS.N2YO.apiKey) {
    logger.warn('N2YO API key not configured — skipping satellite tracking fetch');
    return null;
  }
  return n2yoBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.N2YO.baseUrl}/${endpoint}&apiKey=${EXTERNAL_APIS.N2YO.apiKey}&${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// Finnhub stock data API helpers (requires free API key)
export async function fetchFinnhub(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  if (!EXTERNAL_APIS.FINNHUB.apiKey) {
    logger.warn('Finnhub API key not configured — skipping stock data fetch');
    return null;
  }
  return finnhubBreaker.execute(async () => {
    const searchParams = new URLSearchParams({
      token: EXTERNAL_APIS.FINNHUB.apiKey,
      ...params,
    });
    const url = `${EXTERNAL_APIS.FINNHUB.baseUrl}/${endpoint}?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// SAM.gov Government Opportunities API helpers (requires free API key)
export async function fetchSamGov(
  params: Record<string, string> = {}
): Promise<unknown> {
  if (!EXTERNAL_APIS.SAM_GOV.apiKey) {
    logger.warn('SAM.gov API key not configured — skipping government opportunities fetch');
    return null;
  }
  return samGovBreaker.execute(async () => {
    const searchParams = new URLSearchParams({
      api_key: EXTERNAL_APIS.SAM_GOV.apiKey,
      ...params,
    });
    const url = `${EXTERNAL_APIS.SAM_GOV.baseUrl}/search?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// FCC ECFS public search helpers (no key needed, but rate-limit respectfully)
export async function fetchFccEcfs(
  params: Record<string, string> = {}
): Promise<unknown> {
  return fccEcfsBreaker.execute(async () => {
    const searchParams = new URLSearchParams({
      wt: 'json',
      ...params,
    });
    const url = `${EXTERNAL_APIS.FCC_ECFS.baseUrl}?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// ─── NEW FETCH HELPERS (v0.8.0) ──────────────────────────────────────────

// NASA EPIC (Earth Polychromatic Imaging Camera) API helpers
export async function fetchNasaEpic(
  collection: 'natural' | 'enhanced' = 'natural'
): Promise<unknown> {
  return nasaEpicBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.NASA_EPIC.baseUrl}/${collection}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NASA EONET (Earth Observatory Natural Event Tracker) API helpers
export async function fetchNasaEonet(
  params: Record<string, string> = {}
): Promise<unknown> {
  return nasaEonetBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.NASA_EONET.baseUrl}/events?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NASA Mars Rover Photos API helpers
export async function fetchNasaMarsPhotos(
  rover: string = 'perseverance',
  params: Record<string, string> = {}
): Promise<unknown> {
  return nasaMarsPhotosBreaker.execute(async () => {
    const searchParams = new URLSearchParams({
      api_key: EXTERNAL_APIS.NASA_MARS_PHOTOS.apiKey,
      ...params,
    });
    const url = `${EXTERNAL_APIS.NASA_MARS_PHOTOS.baseUrl}/rovers/${rover}/latest_photos?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NASA Exoplanet Archive API helpers
export async function fetchNasaExoplanets(
  params: Record<string, string> = {}
): Promise<unknown> {
  return nasaExoplanetBreaker.execute(async () => {
    const defaultParams: Record<string, string> = {
      table: 'ps',
      select: 'pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_rade,pl_bmasse,pl_eqt,sy_dist',
      where: 'default_flag=1',
      order: 'disc_year desc',
      format: 'json',
      ...params,
    };
    const searchParams = new URLSearchParams(defaultParams);
    const url = `${EXTERNAL_APIS.NASA_EXOPLANET.baseUrl}?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// JPL Sentry (Impact Risk) API helpers
export async function fetchJplSentry(
  params: Record<string, string> = {}
): Promise<unknown> {
  return jplSentryBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const qs = searchParams.toString();
    const url = qs ? `${EXTERNAL_APIS.JPL_SENTRY.baseUrl}?${qs}` : EXTERNAL_APIS.JPL_SENTRY.baseUrl;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// JPL Fireball (Bolide Events) API helpers
export async function fetchJplFireball(
  params: Record<string, string> = {}
): Promise<unknown> {
  return jplFireballBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.JPL_FIREBALL.baseUrl}?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// Asterank (Asteroid Mining Economics) API helpers
export async function fetchAsterank(
  query: string,
  limit: number = 50
): Promise<unknown> {
  return asterankBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.ASTERANK.baseUrl}?query=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NASA Image and Video Library API helpers
export async function fetchNasaImages(
  params: Record<string, string> = {}
): Promise<unknown> {
  return nasaImagesBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.NASA_IMAGES.baseUrl}/search?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// Helioviewer (Solar Images) API helpers
export async function fetchHelioviewer(
  params: Record<string, string> = {}
): Promise<unknown> {
  return helioviewerBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.HELIOVIEWER.baseUrl}/getClosestImage/?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// NASA DSN Now (Deep Space Network) — returns XML, parsed as text
export async function fetchNasaDsn(): Promise<string | null> {
  return nasaDsnBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.NASA_DSN.baseUrl}/dsn.xml`;
    const response = await fetchWithRetry(url, {
      headers: { 'Accept': 'application/xml, text/xml, */*' },
    });
    return response.text();
  }, null);
}

// Where The ISS At API helpers
export async function fetchWhereTheIss(
  satelliteId: string = '25544'
): Promise<unknown> {
  return whereTheIssBreaker.execute(async () => {
    const url = `${EXTERNAL_APIS.WHERE_THE_ISS.baseUrl}/satellites/${satelliteId}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// SBIR.gov (Space Innovation Grants) API helpers
export async function fetchSbirGov(
  params: Record<string, string> = {}
): Promise<unknown> {
  return sbirGovBreaker.execute(async () => {
    const searchParams = new URLSearchParams(params);
    const url = `${EXTERNAL_APIS.SBIR_GOV.baseUrl}/awards.json?${searchParams}`;
    const response = await fetchWithRetry(url);
    return response.json();
  }, null);
}

// Date formatting helpers
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDateRange(daysBack: number, daysForward: number = 0): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - daysBack);
  const end = new Date(now);
  end.setDate(end.getDate() + daysForward);

  return {
    startDate: formatDateForApi(start),
    endDate: formatDateForApi(end),
  };
}

// Response wrapper for consistent API responses
export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  source: string;
  itemCount?: number;
}

export function createFetchResult<T>(
  source: string,
  data?: T,
  error?: string,
  itemCount?: number
): FetchResult<T> {
  return {
    success: !error,
    data,
    error,
    timestamp: new Date().toISOString(),
    source,
    itemCount,
  };
}
