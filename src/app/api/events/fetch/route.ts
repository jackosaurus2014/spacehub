import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { fetchLaunchLibraryEvents } from '@/lib/events-fetcher';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'events:fetch-result';

/**
 * POST /api/events/fetch — ingest Launch Library events into the DB.
 * Auth: Bearer CRON_SECRET via requireCronSecret (fail-closed). Note the
 * middleware cronPaths list only exempts these routes from the CSRF check —
 * it does NOT authenticate them; this handler does.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  try {
    const count = await fetchLaunchLibraryEvents();

    const responseData = {
      success: true,
      message: `Fetched and saved ${count} space events`,
      source: 'live' as const,
      timestamp: new Date().toISOString(),
    };

    // Cache the successful result
    apiCache.set(CACHE_KEY, responseData, CacheTTL.DEFAULT);

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('Error fetching events', { error: error instanceof Error ? error.message : String(error) });

    // Try to return cached result
    const cached = apiCache.getStale<{
      success: boolean;
      message: string;
      source: string;
      timestamp: string;
    }>(CACHE_KEY);

    if (cached) {
      logger.info(`[Events] Serving cached fetch result (stale: ${cached.isStale})`);
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
        warning: 'External event sources are temporarily unavailable. Showing previously fetched data.',
      });
    }

    // No cache -- return graceful fallback instead of 500
    return NextResponse.json({
      success: false,
      message: 'Launch Library API is temporarily unavailable. Previously saved events are still available via GET /api/events.',
      source: 'fallback',
      eventsUpdated: 0,
      timestamp: new Date().toISOString(),
    });
  }
}
