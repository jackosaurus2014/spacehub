export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  fetchCelesTrakGPData,
  parseSatelliteCounts,
  calculateOrbitalStatistics,
  fetchSatcat,
  computeCatalogStats,
  updateDebrisStatsFromSatcat,
  refreshDebrisObjectsFromSatcat,
} from '@/lib/debris-data';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

// CelesTrak object groups to fetch
const CELESTRAK_GROUPS = {
  active: 'Active satellites',
  stations: 'Space stations',
  analyst: 'Analyst objects',
  'cosmos-1408-debris': 'COSMOS 1408 debris event',
} as const;

type CelesTrakGroup = keyof typeof CELESTRAK_GROUPS;

const CACHE_KEY = 'debris-monitor:fetch-result';

export async function POST() {
  try {
    const results: Record<string, {
      count: number;
      orbitalStats: { leo: number; meo: number; geo: number };
      error?: string;
    }> = {};

    let totalObjects = 0;
    let totalLeo = 0;
    let totalMeo = 0;
    let totalGeo = 0;

    // Fetch data for each group
    for (const [group, description] of Object.entries(CELESTRAK_GROUPS)) {
      try {
        logger.info(`Fetching CelesTrak data for: ${description}`);

        const gpData = await fetchCelesTrakGPData(group);

        if (Array.isArray(gpData)) {
          const count = parseSatelliteCounts(gpData);
          const orbitalStats = calculateOrbitalStatistics(gpData);

          results[group] = {
            count,
            orbitalStats,
          };

          totalObjects += count;
          totalLeo += orbitalStats.leo;
          totalMeo += orbitalStats.meo;
          totalGeo += orbitalStats.geo;

          logger.info(`${description}: ${count} objects (LEO: ${orbitalStats.leo}, MEO: ${orbitalStats.meo}, GEO: ${orbitalStats.geo})`);
        } else {
          results[group] = {
            count: 0,
            orbitalStats: { leo: 0, meo: 0, geo: 0 },
            error: 'Invalid response format',
          };
        }
      } catch (error) {
        logger.error(`Error fetching ${group}`, { error: error instanceof Error ? error.message : String(error) });
        results[group] = {
          count: 0,
          orbitalStats: { leo: 0, meo: 0, geo: 0 },
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Stats come from the FULL SATCAT, not the handful of GP groups above.
    // The GP-group totals undercounted by ~60x (593 tracked, debris hardcoded
    // to 0, while the real catalogue holds ~35k on-orbit objects, ~12.5k of
    // them debris). The group fetches are kept for their per-event breakdown
    // in the response; the database snapshot is catalogue truth.
    let statsUpdate = false;
    let catalog: { totalTracked: number; totalDebris: number } | null = null;
    let objectRefresh: { updated: number; decayed: number } | null = null;
    try {
      const satcat = await fetchSatcat();
      const stats = computeCatalogStats(satcat);
      statsUpdate = await updateDebrisStatsFromSatcat(stats);
      catalog = { totalTracked: stats.totalTracked, totalDebris: stats.totalDebris };
      // Also the DebrisObject showcase rows' only refresh path.
      objectRefresh = await refreshDebrisObjectsFromSatcat(satcat);
      logger.info('SATCAT stats updated', { ...stats, objectRefresh });
    } catch (error) {
      logger.error('SATCAT stats update failed — keeping previous snapshot', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        catalog,
        objectRefresh,
        totalObjects,
        byOrbit: {
          leo: totalLeo,
          meo: totalMeo,
          geo: totalGeo,
        },
      },
      byGroup: results,
      databaseUpdated: statsUpdate,
      source: 'live' as const,
    };

    // Cache the successful result
    apiCache.set(CACHE_KEY, responseData, CacheTTL.SLOW);

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('Failed to fetch CelesTrak data', { error: error instanceof Error ? error.message : String(error) });

    // Try to return cached result
    const cached = apiCache.getStale<Record<string, unknown>>(CACHE_KEY);

    if (cached) {
      logger.info(`[DebrisMonitor] Serving cached fetch result (stale: ${cached.isStale})`);
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
        warning: 'CelesTrak is temporarily unavailable. Showing previously fetched data.',
      });
    }

    // No cache -- return graceful fallback instead of 500
    return NextResponse.json({
      success: false,
      message: 'CelesTrak is temporarily unavailable. Previously saved debris data is still available via GET /api/debris-monitor.',
      source: 'fallback',
      summary: { totalObjects: 0, byOrbit: { leo: 0, meo: 0, geo: 0 } },
      byGroup: {},
      databaseUpdated: false,
      timestamp: new Date().toISOString(),
    });
  }
}
