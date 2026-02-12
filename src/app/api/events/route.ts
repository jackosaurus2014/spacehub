import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { MissionPhase } from '@/types';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Provider YouTube channel URLs for live streams
const PROVIDER_YOUTUBE_URLS: Record<string, string> = {
  'SpaceX': 'https://www.youtube.com/@SpaceX/live',
  'United Launch Alliance': 'https://www.youtube.com/@ulalaunch/live',
  'Rocket Lab': 'https://www.youtube.com/@RocketLabNZ/live',
  'Blue Origin': 'https://www.youtube.com/@blueorigin/live',
  'NASA': 'https://www.youtube.com/@NASA/live',
  'Arianespace': 'https://www.youtube.com/@arianespace/live',
  'ISRO': 'https://www.youtube.com/@isaborealfly/live',
};

// Provider X.com (Twitter) URLs for live streams
const PROVIDER_X_URLS: Record<string, string> = {
  'SpaceX': 'https://x.com/SpaceX',
  'United Launch Alliance': 'https://x.com/ulalaunch',
  'Rocket Lab': 'https://x.com/RocketLab',
  'Blue Origin': 'https://x.com/blueorigin',
  'NASA': 'https://x.com/NASA',
  'Arianespace': 'https://x.com/Arianespace',
  'ISRO': 'https://x.com/isaborealfly',
};

// Enrich a DB event with computed live/stream fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enrichEvent(event: any) {
  const now = new Date();
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

  return {
    ...event,
    isLive,
    streamUrl,
    xUrl,
    missionPhase,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = searchParams.get('hours');
    const type = searchParams.get('type');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const country = searchParams.get('country');

    const now = new Date();

    // Simple query first - get all events
    let events;
    let total;

    const eventSelect = {
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
    };

    if (startDate && endDate) {
      events = await prisma.spaceEvent.findMany({
        where: {
          launchDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          ...(type ? { type } : {}),
          ...(country ? { country } : {}),
        },
        select: eventSelect,
        orderBy: { launchDate: 'asc' },
        take: limit,
        skip: offset,
      });
      total = await prisma.spaceEvent.count({
        where: {
          launchDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          ...(type ? { type } : {}),
          ...(country ? { country } : {}),
        },
      });
    } else if (hours) {
      const parsedHours = parseInt(hours);
      const futureDate = new Date(now.getTime() + (isNaN(parsedHours) ? 24 : Math.min(parsedHours, 8760)) * 60 * 60 * 1000);
      events = await prisma.spaceEvent.findMany({
        where: {
          launchDate: {
            gte: now,
            lte: futureDate,
          },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
        select: eventSelect,
        orderBy: { launchDate: 'asc' },
        take: limit,
        skip: offset,
      });
      total = await prisma.spaceEvent.count({
        where: {
          launchDate: {
            gte: now,
            lte: futureDate,
          },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
      });
    } else {
      events = await prisma.spaceEvent.findMany({
        where: {
          launchDate: { gte: now },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
        select: eventSelect,
        orderBy: { launchDate: 'asc' },
        take: limit,
        skip: offset,
      });
      total = await prisma.spaceEvent.count({
        where: {
          launchDate: { gte: now },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
      });
    }

    // Enrich DB events with computed live/stream fields
    const enrichedEvents = events.map(enrichEvent);

    return NextResponse.json({ events: enrichedEvents, total });
  } catch (error) {
    logger.error('Error fetching events', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
