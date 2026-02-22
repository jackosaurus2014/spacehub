import { NextRequest, NextResponse } from 'next/server';
import {
  getRecentSolarFlares,
  getSolarForecasts,
  getCurrentSolarActivity,
  getSolarFlareStats,
} from '@/lib/solar-flare-data';
import { logger } from '@/lib/logger';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { FALLBACK_SOLAR_ACTIVITY } from '@/lib/fallback-space-weather';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'solar-flares-dashboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const days = parseInt(searchParams.get('days') || '90');

    if (type === 'flares') {
      const flares = await getRecentSolarFlares(limit);
      return NextResponse.json({ flares });
    }

    if (type === 'forecasts') {
      const forecasts = await getSolarForecasts(days);
      return NextResponse.json({ forecasts });
    }

    if (type === 'activity') {
      const activity = await getCurrentSolarActivity();
      return NextResponse.json({ activity });
    }

    if (type === 'stats') {
      const stats = await getSolarFlareStats();
      return NextResponse.json({ stats });
    }

    // Return all data for dashboard
    const [flares, forecasts, activity, stats] = await Promise.all([
      getRecentSolarFlares(5),
      getSolarForecasts(90),
      getCurrentSolarActivity(),
      getSolarFlareStats(),
    ]);

    const data = { flares, forecasts, activity, stats };

    // Cache full dashboard payload for fallback use
    apiCache.set(CACHE_KEY, data, CacheTTL.DEFAULT);

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Failed to fetch solar flare data', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Try stale cache first
    const stale = apiCache.getStale<Record<string, unknown>>(CACHE_KEY);
    if (stale) {
      logger.info('Serving stale cached solar flare data', {
        ageMs: Date.now() - stale.storedAt,
      });
      return NextResponse.json({
        ...stale.value,
        _meta: { source: 'cache', isStale: true, age: Date.now() - stale.storedAt },
      });
    }

    // Fall back to static quiet-conditions baseline
    logger.warn('No cached solar flare data available, serving static fallback');
    return NextResponse.json({
      ...FALLBACK_SOLAR_ACTIVITY,
      _meta: { source: 'fallback', isFallback: true },
    });
  }
}
