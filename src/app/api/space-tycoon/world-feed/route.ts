import { NextResponse } from 'next/server';
import { getActiveWorldEvents, getUpcomingLaunchSchedule } from '@/lib/game/real-world-feed';
import { getUpcomingAppointmentEvents } from '@/lib/game/appointment-events';
import { withCache, CACHE_TTL } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

/** Mission Calendar horizon (LS3) — how far ahead the upcoming-launch query
 *  and appointment-event window reach. Matches MissionCalendarPanel.tsx. */
const CALENDAR_HORIZON_DAYS = 14;

/**
 * GET /api/space-tycoon/world-feed
 *
 * Public, unauthenticated "Sol Events" feed — the same active world events
 * for every player. Derived purely from data the site already caches
 * (NOAA space-weather content, launch-schedule SpaceEvent rows, Artemis/
 * Starship program news); see src/lib/game/real-world-feed.ts for the
 * derivation logic and its unit tests.
 *
 * LS3 (docs/LIVE_SERVICE_2026-08.md §LS3) additions, same cached payload:
 *   - `upcomingLaunches`: the forward SpaceEvent launch schedule (not just
 *     the "live now" window `events` above already covers) — feeds the
 *     Mission Calendar's real-launch entries.
 *   - `appointmentEvents`: fixed-UTC-window world events (Belt Rush Weekend
 *     etc.) — pure/deterministic (src/lib/game/appointment-events.ts), no DB
 *     read, computed fresh on every request but cheap enough to ride the
 *     same cache entry.
 *
 * Cached in-memory for 5 minutes (stale-while-revalidate) so a banner
 * polling every ~5 min across many players doesn't hammer the DB.
 */
export async function GET() {
  try {
    const payload = await withCache(
      'space-tycoon:world-feed',
      async () => {
        const [events, upcomingLaunches] = await Promise.all([
          getActiveWorldEvents(),
          getUpcomingLaunchSchedule(CALENDAR_HORIZON_DAYS),
        ]);
        return { events, upcomingLaunches };
      },
      { ttlSeconds: CACHE_TTL.FREQUENT, staleWhileRevalidate: true, fallbackToStale: true },
    );

    return NextResponse.json(
      {
        events: payload.events,
        upcomingLaunches: payload.upcomingLaunches,
        appointmentEvents: getUpcomingAppointmentEvents(Date.now(), CALENDAR_HORIZON_DAYS),
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch {
    // Flavor feed — never break the game on failure, just report empty.
    return NextResponse.json(
      { events: [], upcomingLaunches: [], appointmentEvents: [], fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
}
