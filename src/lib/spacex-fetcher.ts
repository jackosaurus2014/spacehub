/**
 * SpaceX API Data Fetcher
 *
 * Fetches launch, rocket, and Starlink data from the SpaceX v4 API.
 * Uses the in-memory api-cache with a 5-minute TTL to avoid hammering
 * the upstream endpoint on every request.
 *
 * No authentication required.
 */

import { withCache, CACHE_TTL } from './api-cache';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  date_local: string;
  date_precision: string;
  upcoming: boolean;
  success: boolean | null;
  details: string | null;
  rocket: string;
  flight_number: number;
  links: {
    patch: { small: string | null; large: string | null };
    webcast: string | null;
    article: string | null;
    wikipedia: string | null;
  };
}

export interface SpaceXRocket {
  id: string;
  name: string;
  type: string;
  active: boolean;
  stages: number;
  boosters: number;
  cost_per_launch: number;
  success_rate_pct: number;
  first_flight: string;
  country: string;
  company: string;
  height: { meters: number; feet: number };
  diameter: { meters: number; feet: number };
  mass: { kg: number; lb: number };
  description: string;
  flickr_images: string[];
}

export interface FormattedLaunch {
  id: string;
  name: string;
  dateUtc: string;
  dateLocal: string;
  datePrecision: string;
  upcoming: boolean;
  success: boolean | null;
  details: string | null;
  rocketId: string;
  flightNumber: number;
  patchSmall: string | null;
  patchLarge: string | null;
  webcast: string | null;
  article: string | null;
  wikipedia: string | null;
}

export interface FormattedRocket {
  id: string;
  name: string;
  type: string;
  active: boolean;
  stages: number;
  costPerLaunch: number;
  successRatePct: number;
  firstFlight: string;
  country: string;
  company: string;
  heightMeters: number;
  diameterMeters: number;
  massKg: number;
  description: string;
  image: string | null;
}

export interface SpaceXData {
  launches: FormattedLaunch[];
  latestLaunch: FormattedLaunch | null;
  rockets: FormattedRocket[];
  starlinkCount: number;
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SPACEX_BASE = 'https://api.spacexdata.com/v4';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`SpaceX API error: ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json() as Promise<T>;
}

function formatLaunch(launch: SpaceXLaunch): FormattedLaunch {
  return {
    id: launch.id,
    name: launch.name,
    dateUtc: launch.date_utc,
    dateLocal: launch.date_local,
    datePrecision: launch.date_precision,
    upcoming: launch.upcoming,
    success: launch.success,
    details: launch.details,
    rocketId: launch.rocket,
    flightNumber: launch.flight_number,
    patchSmall: launch.links?.patch?.small ?? null,
    patchLarge: launch.links?.patch?.large ?? null,
    webcast: launch.links?.webcast ?? null,
    article: launch.links?.article ?? null,
    wikipedia: launch.links?.wikipedia ?? null,
  };
}

function formatRocket(rocket: SpaceXRocket): FormattedRocket {
  return {
    id: rocket.id,
    name: rocket.name,
    type: rocket.type,
    active: rocket.active,
    stages: rocket.stages,
    costPerLaunch: rocket.cost_per_launch,
    successRatePct: rocket.success_rate_pct,
    firstFlight: rocket.first_flight,
    country: rocket.country,
    company: rocket.company,
    heightMeters: rocket.height?.meters ?? 0,
    diameterMeters: rocket.diameter?.meters ?? 0,
    massKg: rocket.mass?.kg ?? 0,
    description: rocket.description,
    image: rocket.flickr_images?.[0] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch SpaceX data (upcoming launches, latest launch, rockets, Starlink count).
 *
 * Results are cached for 5 minutes via the shared in-memory api-cache.
 * On fetch failure, stale data is returned if available.
 */
export async function fetchSpaceXData(): Promise<SpaceXData> {
  return withCache<SpaceXData>(
    'spacex:all',
    async () => {
      logger.info('[SpaceX] Fetching data from SpaceX API');

      const [upcomingRaw, latestRaw, rocketsRaw, starlinkRaw] = await Promise.all([
        fetchJson<SpaceXLaunch[]>(`${SPACEX_BASE}/launches/upcoming`),
        fetchJson<SpaceXLaunch>(`${SPACEX_BASE}/launches/latest`),
        fetchJson<SpaceXRocket[]>(`${SPACEX_BASE}/rockets`),
        fetchJson<Array<{ id: string }>>(`${SPACEX_BASE}/starlink`),
      ]);

      // Sort upcoming launches by date, take the nearest 20
      const sortedUpcoming = upcomingRaw
        .sort((a, b) => new Date(a.date_utc).getTime() - new Date(b.date_utc).getTime())
        .slice(0, 20);

      const data: SpaceXData = {
        launches: sortedUpcoming.map(formatLaunch),
        latestLaunch: latestRaw ? formatLaunch(latestRaw) : null,
        rockets: rocketsRaw.map(formatRocket),
        starlinkCount: starlinkRaw.length,
        fetchedAt: new Date().toISOString(),
      };

      logger.info('[SpaceX] Data fetched successfully', {
        upcomingLaunches: data.launches.length,
        rockets: data.rockets.length,
        starlinkCount: data.starlinkCount,
      });

      return data;
    },
    {
      ttlSeconds: CACHE_TTL.FREQUENT, // 5 minutes
      staleWhileRevalidate: true,
      fallbackToStale: true,
    },
  );
}
