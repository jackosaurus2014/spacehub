import { NextResponse } from 'next/server';
import {
  fetchLaunchLibraryUpcoming,
  fetchSpaceXUpcoming,
  mergeLaunchData,
  upsertLaunchEvents,
} from '@/lib/launch-windows-data';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'launch-windows:fetch-result';

export async function POST() {
  try {
    const results = {
      launchLibrary: { fetched: 0, error: null as string | null },
      spaceX: { fetched: 0, error: null as string | null },
      merged: 0,
      created: 0,
      updated: 0,
    };

    // Fetch from Launch Library 2
    let launchLibraryData: Awaited<ReturnType<typeof fetchLaunchLibraryUpcoming>> = [];
    try {
      launchLibraryData = await fetchLaunchLibraryUpcoming();
      results.launchLibrary.fetched = launchLibraryData.length;
    } catch (error) {
      logger.error('Launch Library 2 fetch error', { error: error instanceof Error ? error.message : String(error) });
      results.launchLibrary.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Fetch from SpaceX API
    let spaceXData: Awaited<ReturnType<typeof fetchSpaceXUpcoming>> = [];
    try {
      spaceXData = await fetchSpaceXUpcoming();
      results.spaceX.fetched = spaceXData.length;
    } catch (error) {
      logger.error('SpaceX API fetch error', { error: error instanceof Error ? error.message : String(error) });
      results.spaceX.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Merge and deduplicate
    const mergedLaunches = mergeLaunchData(launchLibraryData, spaceXData);
    results.merged = mergedLaunches.length;

    // Upsert to database
    if (mergedLaunches.length > 0) {
      const upsertResult = await upsertLaunchEvents(mergedLaunches);
      results.created = upsertResult.created;
      results.updated = upsertResult.updated;
    }

    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      source: 'live' as const,
      ...results,
    };

    // Cache the successful result
    apiCache.set(CACHE_KEY, responseData, CacheTTL.DEFAULT);

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('Failed to fetch launch data', { error: error instanceof Error ? error.message : String(error) });

    // Try to return cached result
    const cached = apiCache.getStale<Record<string, unknown>>(CACHE_KEY);

    if (cached) {
      logger.info(`[LaunchWindows] Serving cached fetch result (stale: ${cached.isStale})`);
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
        warning: 'Launch data APIs are temporarily unavailable. Showing previously fetched data.',
      });
    }

    // No cache -- return graceful fallback instead of 500
    return NextResponse.json({
      success: false,
      message: 'Launch data APIs (Launch Library, SpaceX) are temporarily unavailable. Previously saved data is still available via GET /api/launch-windows.',
      source: 'fallback',
      launchLibrary: { fetched: 0, error: 'Service unavailable' },
      spaceX: { fetched: 0, error: 'Service unavailable' },
      merged: 0,
      created: 0,
      updated: 0,
      timestamp: new Date().toISOString(),
    });
  }
}
