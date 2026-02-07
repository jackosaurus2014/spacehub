import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  fetchNasaDonkiSolarFlares,
  fetchNoaaXrayFlares,
  fetchNoaaPlanetaryKIndex,
  transformNasaDonkiFlare,
  transformNoaaXrayFlare,
  mergeSolarFlareData,
} from '@/lib/solar-flare-data';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'solar-flares:fetch-result';

export async function POST() {
  try {
    // Fetch data from both sources in parallel
    // These individual functions already return [] on failure
    const [nasaFlares, noaaXrayFlares, noaaKpIndex] = await Promise.all([
      fetchNasaDonkiSolarFlares(),
      fetchNoaaXrayFlares(),
      fetchNoaaPlanetaryKIndex(),
    ]);

    // Transform data to internal format
    const transformedNasaFlares = nasaFlares.map(transformNasaDonkiFlare);
    const transformedNoaaFlares = noaaXrayFlares.map(transformNoaaXrayFlare);

    // Merge data from both sources (NASA takes precedence for duplicates)
    const mergedFlares = mergeSolarFlareData(transformedNasaFlares, transformedNoaaFlares);

    // Track results
    let created = 0;
    let updated = 0;

    // Upsert each flare to the database
    for (const flare of mergedFlares) {
      try {
        const existing = await prisma.solarFlare.findUnique({
          where: { flareId: flare.flareId },
        });

        if (existing) {
          await prisma.solarFlare.update({
            where: { flareId: flare.flareId },
            data: {
              classification: flare.classification,
              intensity: flare.intensity,
              startTime: flare.startTime,
              peakTime: flare.peakTime,
              endTime: flare.endTime,
              activeRegion: flare.activeRegion,
              sourceLocation: flare.sourceLocation,
              radioBlackout: flare.radioBlackout,
              solarRadiation: flare.solarRadiation,
              geomagneticStorm: flare.geomagneticStorm,
              description: flare.description,
              linkedCME: flare.linkedCME,
            },
          });
          updated++;
        } else {
          await prisma.solarFlare.create({
            data: flare,
          });
          created++;
        }
      } catch (dbError) {
        logger.warn(`Failed to upsert flare ${flare.flareId}`, { error: dbError instanceof Error ? dbError.message : String(dbError) });
      }
    }

    // Update current solar activity with Kp index if available
    if (noaaKpIndex && noaaKpIndex.length > 0) {
      const latestKp = noaaKpIndex[noaaKpIndex.length - 1];
      const kpValue = parseFloat(latestKp.Kp || latestKp.kp || '0');

      if (!isNaN(kpValue)) {
        try {
          await prisma.solarActivity.create({
            data: {
              timestamp: new Date(),
              kpIndex: kpValue,
              overallStatus: kpValue >= 5 ? 'stormy' : kpValue >= 4 ? 'active' : 'quiet',
            },
          });
        } catch (activityError) {
          logger.warn('Failed to save solar activity', { error: activityError instanceof Error ? activityError.message : String(activityError) });
        }
      }
    }

    const responseData = {
      success: true,
      created,
      updated,
      total: mergedFlares.length,
      sources: {
        nasa: nasaFlares.length,
        noaa: noaaXrayFlares.length,
      },
      source: 'live' as const,
      timestamp: new Date().toISOString(),
    };

    // Cache the successful result
    apiCache.set(CACHE_KEY, responseData, CacheTTL.DEFAULT);

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('Failed to fetch solar flare data', { error: error instanceof Error ? error.message : String(error) });

    // Try to return cached result
    const cached = apiCache.getStale<Record<string, unknown>>(CACHE_KEY);

    if (cached) {
      logger.info(`[SolarFlares] Serving cached fetch result (stale: ${cached.isStale})`);
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
        warning: 'Solar data sources are temporarily unavailable. Showing previously fetched data.',
      });
    }

    // No cache -- return graceful fallback instead of 500
    return NextResponse.json({
      success: false,
      message: 'Solar data sources (NASA DONKI, NOAA SWPC) are temporarily unavailable. Previously saved data is still available via GET /api/solar-flares.',
      source: 'fallback',
      created: 0,
      updated: 0,
      total: 0,
      sources: { nasa: 0, noaa: 0 },
      timestamp: new Date().toISOString(),
    });
  }
}
