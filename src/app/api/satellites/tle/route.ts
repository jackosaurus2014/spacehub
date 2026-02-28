export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { internalError, validationError } from '@/lib/errors';
import { EXTERNAL_APIS, fetchWithRetry } from '@/lib/external-apis';
import { parseTLEText, classifyOrbit, tleToLatLng } from '@/lib/satellite-propagator';
import type { TLEData, SatPosition } from '@/lib/satellite-propagator';

// ─── In-memory cache to respect CelesTrak rate limits (4 req/day) ───────────
interface TLECache {
  data: TLESatellite[];
  timestamp: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let tleCache: TLECache | null = null;

// ─── Response types ─────────────────────────────────────────────────────────
export interface TLESatellite {
  noradId: string;
  name: string;
  orbitClass: 'LEO' | 'MEO' | 'GEO' | 'HEO';
  category: string;
  position: SatPosition;
  tle: {
    line1: string;
    line2: string;
    epoch: string;
    inclination: number;
    eccentricity: number;
    meanMotion: number;
  };
}

// ─── CelesTrak group fetcher ────────────────────────────────────────────────
async function fetchTLEGroup(group: string, category: string): Promise<TLESatellite[]> {
  try {
    const url = `${EXTERNAL_APIS.CELESTRAK.baseUrl}/gp.php?GROUP=${group}&FORMAT=tle`;
    const response = await fetchWithRetry(url, {
      headers: { 'Accept': 'text/plain' },
    }, 2);
    const text = await response.text();

    const tles = parseTLEText(text);
    const now = new Date();

    return tles.map((tle: TLEData) => {
      const position = tleToLatLng(tle, now);
      const orbitClass = classifyOrbit(tle);

      return {
        noradId: tle.noradId,
        name: tle.name,
        orbitClass,
        category,
        position,
        tle: {
          line1: tle.line1,
          line2: tle.line2,
          epoch: tle.epoch.toISOString(),
          inclination: tle.inclination,
          eccentricity: tle.eccentricity,
          meanMotion: tle.meanMotion,
        },
      };
    });
  } catch (error) {
    logger.warn(`Failed to fetch TLE group "${group}"`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ─── Hardcoded fallback TLEs for when CelesTrak is rate-limited ─────────────
const FALLBACK_TLES: TLESatellite[] = [
  {
    noradId: '25544',
    name: 'ISS (ZARYA)',
    orbitClass: 'LEO',
    category: 'stations',
    position: { lat: 0, lng: 0, altitude: 420, velocity: 7.66 },
    tle: {
      line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025',
      line2: '2 25544  51.6400 208.9163 0006703  35.1560  51.3800 15.49560833    18',
      epoch: '2024-01-01T12:00:00.000Z',
      inclination: 51.64,
      eccentricity: 0.0006703,
      meanMotion: 15.4956,
    },
  },
  {
    noradId: '20580',
    name: 'HST',
    orbitClass: 'LEO',
    category: 'stations',
    position: { lat: 0, lng: 0, altitude: 540, velocity: 7.59 },
    tle: {
      line1: '1 20580U 90037B   24001.50000000  .00001200  00000-0  60000-4 0  9990',
      line2: '2 20580  28.4700 120.0000 0002800 100.0000 260.0000 15.09000000    10',
      epoch: '2024-01-01T12:00:00.000Z',
      inclination: 28.47,
      eccentricity: 0.00028,
      meanMotion: 15.09,
    },
  },
  {
    noradId: '48274',
    name: 'CSS (TIANHE)',
    orbitClass: 'LEO',
    category: 'stations',
    position: { lat: 0, lng: 0, altitude: 390, velocity: 7.68 },
    tle: {
      line1: '1 48274U 21035A   24001.50000000  .00020000  00000-0  18000-3 0  9990',
      line2: '2 48274  41.4700 300.0000 0005000  50.0000 310.0000 15.60000000    10',
      epoch: '2024-01-01T12:00:00.000Z',
      inclination: 41.47,
      eccentricity: 0.0005,
      meanMotion: 15.6,
    },
  },
  {
    noradId: '44713',
    name: 'STARLINK-1007',
    orbitClass: 'LEO',
    category: 'starlink',
    position: { lat: 0, lng: 0, altitude: 550, velocity: 7.59 },
    tle: {
      line1: '1 44713U 19074A   24001.50000000  .00001000  00000-0  50000-4 0  9990',
      line2: '2 44713  53.0000 180.0000 0001500  90.0000 270.0000 15.06000000    10',
      epoch: '2024-01-01T12:00:00.000Z',
      inclination: 53.0,
      eccentricity: 0.00015,
      meanMotion: 15.06,
    },
  },
  {
    noradId: '36585',
    name: 'GPS BIIF-1 (PRN 25)',
    orbitClass: 'MEO',
    category: 'gps-ops',
    position: { lat: 0, lng: 0, altitude: 20200, velocity: 3.87 },
    tle: {
      line1: '1 36585U 10022A   24001.50000000  .00000000  00000-0  00000+0 0  9990',
      line2: '2 36585  55.0000  60.0000 0040000 250.0000 110.0000  2.00563000    10',
      epoch: '2024-01-01T12:00:00.000Z',
      inclination: 55.0,
      eccentricity: 0.004,
      meanMotion: 2.00563,
    },
  },
  {
    noradId: '41866',
    name: 'GOES 16',
    orbitClass: 'GEO',
    category: 'weather',
    position: { lat: 0, lng: -75.2, altitude: 35786, velocity: 3.07 },
    tle: {
      line1: '1 41866U 16071A   24001.50000000  .00000100  00000-0  00000+0 0  9990',
      line2: '2 41866   0.0500 270.0000 0001000 270.0000  90.0000  1.00270000    10',
      epoch: '2024-01-01T12:00:00.000Z',
      inclination: 0.05,
      eccentricity: 0.0001,
      meanMotion: 1.0027,
    },
  },
];

// ─── GET handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupParam = searchParams.get('group'); // Optional: specific group
    const refreshParam = searchParams.get('refresh') === 'true';

    // Check cache
    if (!refreshParam && tleCache && (Date.now() - tleCache.timestamp < CACHE_TTL_MS)) {
      const cached = applyFilters(tleCache.data, searchParams);
      return NextResponse.json({
        success: true,
        data: cached,
        total: cached.length,
        _meta: {
          source: 'cache',
          cachedAt: new Date(tleCache.timestamp).toISOString(),
          ttl: CACHE_TTL_MS / 1000,
        },
      });
    }

    // Fetch fresh data from CelesTrak
    // We fetch a curated set of groups to get a good mix of satellite types
    const groups = groupParam
      ? [{ group: groupParam, category: groupParam }]
      : [
          { group: 'stations', category: 'stations' },
          { group: 'active', category: 'active' },
        ];

    let allSatellites: TLESatellite[] = [];
    let fetchedFromApi = false;

    for (const { group, category } of groups) {
      const sats = await fetchTLEGroup(group, category);
      if (sats.length > 0) {
        fetchedFromApi = true;
        allSatellites.push(...sats);
      }
    }

    // Deduplicate by NORAD ID (prefer stations category)
    const seen = new Map<string, TLESatellite>();
    for (const sat of allSatellites) {
      if (!seen.has(sat.noradId) || sat.category === 'stations') {
        seen.set(sat.noradId, sat);
      }
    }
    allSatellites = Array.from(seen.values());

    // If we got data, update cache
    if (fetchedFromApi && allSatellites.length > 0) {
      tleCache = {
        data: allSatellites,
        timestamp: Date.now(),
      };
      logger.info(`TLE cache refreshed with ${allSatellites.length} satellites`);
    } else if (!fetchedFromApi) {
      // Use fallback data when CelesTrak is unreachable / rate-limited
      logger.warn('CelesTrak unavailable, using fallback TLE data');
      // Compute positions for fallback data
      const now = new Date();
      allSatellites = FALLBACK_TLES.map((sat) => {
        try {
          const tleData = parseTLEText(
            `${sat.name}\n${sat.tle.line1}\n${sat.tle.line2}`
          )[0];
          if (tleData) {
            return { ...sat, position: tleToLatLng(tleData, now) };
          }
        } catch {
          // Use default position
        }
        return sat;
      });
    }

    const filtered = applyFilters(allSatellites, searchParams);

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
      _meta: {
        source: fetchedFromApi ? 'celestrak' : 'fallback',
        fetchedAt: new Date().toISOString(),
        ttl: CACHE_TTL_MS / 1000,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch TLE data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch satellite TLE data');
  }
}

// ─── Filter helpers ──────────────────────────────────────────────────────────
function applyFilters(satellites: TLESatellite[], params: URLSearchParams): TLESatellite[] {
  let result = [...satellites];
  const orbitClass = params.get('orbitClass');
  const category = params.get('category');
  const search = params.get('search');
  const limit = Math.min(parseInt(params.get('limit') || '200'), 500);

  if (orbitClass) {
    result = result.filter((s) => s.orbitClass === orbitClass);
  }
  if (category) {
    result = result.filter((s) => s.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.noradId.includes(search)
    );
  }

  return result.slice(0, limit);
}
