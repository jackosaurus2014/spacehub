import { NextResponse } from 'next/server';
import { getSpaceWeatherSummary, SpaceWeatherSummary } from '@/lib/noaa-fetcher';
import { logger } from '@/lib/logger';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { FALLBACK_SPACE_WEATHER_SUMMARY } from '@/lib/fallback-space-weather';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'space-weather-summary';

export async function GET() {
  try {
    const summary = await getSpaceWeatherSummary();
    // Cache the successful response for future fallback use
    apiCache.set(CACHE_KEY, summary, CacheTTL.DEFAULT);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Failed to fetch space weather data', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Try stale cache first -- recent data is better than static fallback
    const stale = apiCache.getStale<SpaceWeatherSummary>(CACHE_KEY);
    if (stale) {
      logger.info('Serving stale cached space weather data', {
        ageMs: Date.now() - stale.storedAt,
      });
      return NextResponse.json({
        success: true,
        data: { ...stale.value, isStale: true },
        meta: { source: 'cache', age: Date.now() - stale.storedAt },
      });
    }

    // No cache available -- serve static quiet-conditions fallback
    logger.warn('No cached space weather data available, serving static fallback');
    return NextResponse.json({
      success: true,
      data: { ...FALLBACK_SPACE_WEATHER_SUMMARY, isFallback: true },
      meta: { source: 'fallback' },
    });
  }
}
