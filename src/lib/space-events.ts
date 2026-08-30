// Shared SpaceEvent read + enrichment.
//
// Extracted from src/app/api/events/route.ts so the server component at
// /mission-control can render the same rows the client would have fetched
// (SYNTHESIS.md item 14) without a self-HTTP round trip. The route still owns
// the HTTP contract; this module owns the query and the derived live fields so
// the two can never drift.

import prisma from '@/lib/db';
import type { MissionPhase } from '@/types';
import { PROVIDER_YOUTUBE_URLS, PROVIDER_X_URLS } from '@/lib/launch-providers';

/** The exact column set /api/events returns. */
export const EVENT_SELECT = {
  id: true,
  name: true,
  type: true,
  status: true,
  launchDate: true,
  agency: true,
  location: true,
  mission: true,
  description: true,
  imageUrl: true,
  videoUrl: true,
  webcastLive: true,
  infoUrl: true,
  country: true,
  rocket: true,
  externalId: true,
  windowStart: true,
  windowEnd: true,
  launchDatePrecision: true,
} as const;

/**
 * Adds the computed live/stream fields. `now` is injectable so a server render
 * and a test can agree on the 30/90-minute windows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function enrichEvent(event: any, now: Date = new Date()) {
  const launchDate = event.launchDate ? new Date(event.launchDate) : null;

  // Resolve stream URL: prefer videoUrl from Launch Library, fall back to provider channel
  const rawStreamUrl = event.videoUrl
    || (event.agency && PROVIDER_YOUTUBE_URLS[event.agency])
    || null;

  // X.com URL from provider map
  const xUrl = event.agency ? PROVIDER_X_URLS[event.agency] || null : null;

  // Determine if stream should be considered live/verified
  let isLive = false;
  if (launchDate) {
    const timeDiff = launchDate.getTime() - now.getTime();
    const isWithin30Min = timeDiff > 0 && timeDiff <= 30 * 60 * 1000;
    const isPastWithin90Min = timeDiff < 0 && Math.abs(timeDiff) <= 90 * 60 * 1000;
    isLive = (event.webcastLive || isWithin30Min || isPastWithin90Min) && !!rawStreamUrl;
  }

  // Compute mission phase from time proximity
  let missionPhase: MissionPhase | null = null;
  if (launchDate) {
    const timeDiff = launchDate.getTime() - now.getTime();
    if (timeDiff <= 30 * 60 * 1000 && timeDiff > 0) {
      missionPhase = 'countdown';
    } else if (timeDiff <= 0 && Math.abs(timeDiff) <= 5 * 60 * 1000) {
      missionPhase = 'liftoff';
    } else if (timeDiff <= 0 && Math.abs(timeDiff) <= 15 * 60 * 1000) {
      missionPhase = 'ascent';
    } else if (timeDiff <= 0 && Math.abs(timeDiff) <= 90 * 60 * 1000) {
      missionPhase = 'nominal_orbit';
    } else if (timeDiff > 30 * 60 * 1000 && timeDiff <= 2 * 60 * 60 * 1000) {
      missionPhase = 'pre_launch';
    }
  }

  // Only expose streamUrl when the stream is verified (live or imminent)
  const streamUrl = isLive ? rawStreamUrl : null;

  return { ...event, isLive, streamUrl, xUrl, missionPhase };
}

/**
 * The Mission Control default view, server-side: every event in the next five
 * years, all types, oldest first. Mirrors the client's opening request —
 * `/api/events?startDate=now&endDate=now+5y&limit=500` — including the
 * `constrainPagination` cap of 100 the route applies to that 500, so seeding
 * the client with this result is indistinguishable from letting it fetch.
 *
 * Dates come back as ISO strings: the value crosses the server/client boundary
 * and JSON has no Date, exactly as `/api/events` already delivers it.
 */
export const MISSION_CONTROL_WINDOW_YEARS = 5;
export const MISSION_CONTROL_EVENT_LIMIT = 100;

export async function getMissionControlEvents(
  now: Date = new Date(),
  limit: number = MISSION_CONTROL_EVENT_LIMIT,
) {
  const end = new Date(now.getTime() + MISSION_CONTROL_WINDOW_YEARS * 365 * 24 * 60 * 60 * 1000);
  const rows = await prisma.spaceEvent.findMany({
    where: { launchDate: { gte: now, lte: end } },
    select: EVENT_SELECT,
    orderBy: { launchDate: 'asc' },
    take: limit,
  });
  // JSON round-trip: Date → ISO string, matching the API response shape.
  return JSON.parse(JSON.stringify(rows.map((r) => enrichEvent(r, now))));
}
