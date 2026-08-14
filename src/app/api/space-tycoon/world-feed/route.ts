import { NextResponse } from 'next/server';
import { getActiveWorldEvents } from '@/lib/game/real-world-feed';
import { withCache, CACHE_TTL } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/world-feed
 *
 * Public, unauthenticated "Sol Events" feed — the same active world events
 * for every player. Derived purely from data the site already caches
 * (NOAA space-weather content, launch-schedule SpaceEvent rows, Artemis/
 * Starship program news); see src/lib/game/real-world-feed.ts for the
 * derivation logic and its unit tests.
 *
 * Cached in-memory for 5 minutes (stale-while-revalidate) so a banner
 * polling every ~5 min across many players doesn't hammer the DB.
 */
export async function GET() {
  try {
    const events = await withCache(
      'space-tycoon:world-feed',
      () => getActiveWorldEvents(),
      { ttlSeconds: CACHE_TTL.FREQUENT, staleWhileRevalidate: true, fallbackToStale: true },
    );

    return NextResponse.json(
      { events, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch {
    // Flavor feed — never break the game on failure, just report empty.
    return NextResponse.json(
      { events: [], fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
}
