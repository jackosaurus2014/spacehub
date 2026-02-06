export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  fetchCelesTrakGPData,
  parseSatelliteCounts,
  calculateOrbitalStatistics,
  updateDebrisStatsFromCelesTrak,
} from '@/lib/debris-data';

// CelesTrak object groups to fetch
const CELESTRAK_GROUPS = {
  active: 'Active satellites',
  stations: 'Space stations',
  analyst: 'Analyst objects',
  'cosmos-1408-debris': 'COSMOS 1408 debris event',
} as const;

type CelesTrakGroup = keyof typeof CELESTRAK_GROUPS;

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
        console.log(`Fetching CelesTrak data for: ${description}`);

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

          console.log(`${description}: ${count} objects (LEO: ${orbitalStats.leo}, MEO: ${orbitalStats.meo}, GEO: ${orbitalStats.geo})`);
        } else {
          results[group] = {
            count: 0,
            orbitalStats: { leo: 0, meo: 0, geo: 0 },
            error: 'Invalid response format',
          };
        }
      } catch (error) {
        console.error(`Error fetching ${group}:`, error);
        results[group] = {
          count: 0,
          orbitalStats: { leo: 0, meo: 0, geo: 0 },
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Update database with new statistics
    const statsUpdate = await updateDebrisStatsFromCelesTrak({
      totalTracked: totalObjects,
      leoCount: totalLeo,
      meoCount: totalMeo,
      geoCount: totalGeo,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalObjects,
        byOrbit: {
          leo: totalLeo,
          meo: totalMeo,
          geo: totalGeo,
        },
      },
      byGroup: results,
      databaseUpdated: statsUpdate,
    });
  } catch (error) {
    console.error('Failed to fetch CelesTrak data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch satellite/debris tracking data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
