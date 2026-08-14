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

    // Freshness must reflect the actual underlying data timestamp, not the
    // moment this request happened to be handled.
    const metaFor = (refreshedAt: Date | null) => ({
      source: 'database' as const,
      refreshedAt: (refreshedAt ?? new Date()).toISOString(),
      ttl: 21600,
    });
    const latestOf = (dates: (Date | null | undefined)[]): Date | null => {
      const valid = dates.filter((d): d is Date => !!d);
      return valid.length > 0 ? new Date(Math.max(...valid.map((d) => d.getTime()))) : null;
    };

    if (type === 'flares') {
      const flares = await getRecentSolarFlares(limit);
      const refreshedAt = latestOf(flares.map((f) => f.updatedAt));
      return NextResponse.json({ flares, _meta: metaFor(refreshedAt) });
    }

    if (type === 'forecasts') {
      const forecasts = await getSolarForecasts(days);
      const refreshedAt = latestOf(forecasts.map((f) => f.issueDate));
      return NextResponse.json({ forecasts, _meta: metaFor(refreshedAt) });
    }

    if (type === 'activity') {
      const activity = await getCurrentSolarActivity();
      return NextResponse.json({ activity, _meta: metaFor(activity?.timestamp ?? null) });
    }

    if (type === 'stats') {
      const [stats, activity] = await Promise.all([getSolarFlareStats(), getCurrentSolarActivity()]);
      return NextResponse.json({ stats, _meta: metaFor(activity?.timestamp ?? stats.largestRecent?.date ?? null) });
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

    // Prefer the live "current activity" timestamp (updated most frequently);
    // fall back to the newest flare/forecast row if activity is unavailable.
    const refreshedAt = activity?.timestamp
      ?? latestOf([
        ...flares.map((f) => f.updatedAt),
        ...forecasts.map((f) => f.issueDate),
      ]);

    return NextResponse.json({ ...data, _meta: metaFor(refreshedAt) });
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
        _meta: {
          source: 'database' as const,
          refreshedAt: new Date(stale.storedAt).toISOString(),
          ttl: 21600,
        },
      });
    }

    // Fall back to static quiet-conditions baseline
    logger.warn('No cached solar flare data available, serving static fallback');
    return NextResponse.json({
      ...FALLBACK_SOLAR_ACTIVITY,
      _meta: {
        source: 'fallback' as const,
        refreshedAt: new Date().toISOString(),
        ttl: 21600,
      },
    });
  }
}
