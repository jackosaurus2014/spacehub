import prisma from './db';
import { SpaceEventType, SpaceEventStatus } from '@/types';
import { createCircuitBreaker } from './circuit-breaker';
import { logger } from './logger';

const launchLibraryBreaker = createCircuitBreaker('launch-library', {
  failureThreshold: 3,
  resetTimeout: 120_000, // 2 minutes
});

interface LaunchLibraryLaunch {
  id: string;
  name: string;
  slug?: string;
  status: {
    id: number;
    name: string;
    abbrev: string;
  };
  net: string;
  window_start: string;
  window_end: string;
  mission?: {
    name: string;
    description: string;
    type: string;
    info_urls?: Array<{ url: string }>;
  };
  pad?: {
    name: string;
    latitude?: string | number;
    longitude?: string | number;
    location: {
      name: string;
      country_code: string;
    };
  };
  launch_service_provider?: {
    name: string;
    country_code: string;
    type?: string;
  };
  rocket?: {
    configuration: {
      name: string;
      full_name: string;
      image_url?: string;
    };
  };
  mission_patches?: Array<{ image_url: string; name?: string }>;
  orbital_launch_attempt_count?: number;
  image?: string;
  infographic?: string;
  url?: string; // LL2 API URL (not human-readable)
  infoURLs?: Array<{ url: string }>;
  webcast_live?: boolean;
  vidURLs?: Array<{ url: string }>;
  orbit?: {
    name?: string;
    abbrev?: string;
  };
  astronauts?: Array<{
    name: string;
    agency?: { name: string };
    role?: string;
  }>;
}

interface LaunchLibraryEvent {
  id: number;
  name: string;
  description: string;
  type: {
    id: number;
    name: string;
  };
  location: string;
  news_url: string;
  video_url: string;
  feature_image: string;
  date: string;
}

function mapStatusToInternal(status: string): SpaceEventStatus {
  const statusMap: Record<string, SpaceEventStatus> = {
    'Go': 'go',
    'TBD': 'tbd',
    'TBC': 'tbc',
    'Success': 'completed',
    'Failure': 'completed',
    'In Flight': 'in_progress',
    'Hold': 'upcoming',
  };
  return statusMap[status] || 'upcoming';
}

function determineEventType(launch: LaunchLibraryLaunch): SpaceEventType {
  const name = launch.name.toLowerCase();
  const missionType = launch.mission?.type?.toLowerCase() || '';
  const missionName = launch.mission?.name?.toLowerCase() || '';

  if (name.includes('crew') || missionType.includes('crew') || name.includes('astronaut')) {
    return 'crewed_mission';
  }
  if (name.includes('moon') || name.includes('lunar') || name.includes('artemis')) {
    return 'moon_mission';
  }
  if (name.includes('mars') || name.includes('perseverance') || name.includes('ingenuity')) {
    return 'mars_mission';
  }
  if (name.includes('rover')) {
    return 'rover';
  }
  if (name.includes('station') || name.includes('iss') || name.includes('tiangong')) {
    return 'space_station';
  }
  if (name.includes('starlink') || missionType.includes('communication')) {
    return 'satellite';
  }
  if (missionName.includes('probe') || name.includes('probe')) {
    return 'probe';
  }
  return 'launch';
}

export async function fetchLaunchLibraryEvents(): Promise<number> {
  return launchLibraryBreaker.execute(async () => {
    // Fetch upcoming launches (next 5 years worth)
    const launchResponse = await fetch(
      'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=100&mode=detailed',
      {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!launchResponse.ok) {
      throw new Error(`Launch Library API error: ${launchResponse.status}`);
    }

    const launchData = await launchResponse.json();
    const launches: LaunchLibraryLaunch[] = launchData.results || [];

    let savedCount = 0;

    for (const launch of launches) {
      const eventType = determineEventType(launch);
      const status = mapStatusToInternal(launch.status?.name || 'TBD');

      try {
        const padLat = launch.pad?.latitude ? Number(launch.pad.latitude) : null;
        const padLon = launch.pad?.longitude ? Number(launch.pad.longitude) : null;
        const orbitType = launch.orbit?.name || launch.orbit?.abbrev || null;
        const missionPatchUrl = launch.mission_patches?.[0]?.image_url || null;
        const rocketImageUrl = launch.rocket?.configuration?.image_url || null;
        const crewCount = launch.astronauts?.length || null;
        const crewDetails = launch.astronauts && launch.astronauts.length > 0
          ? launch.astronauts.map(a => ({ name: a.name, agency: a.agency?.name, role: a.role }))
          : null;
        const providerType = launch.launch_service_provider?.type || null;

        await prisma.spaceEvent.upsert({
          where: { externalId: launch.id },
          update: {
            name: launch.name,
            description: launch.mission?.description || null,
            type: eventType,
            status,
            launchDate: launch.net ? new Date(launch.net) : null,
            launchDatePrecision: 'exact',
            windowStart: launch.window_start ? new Date(launch.window_start) : null,
            windowEnd: launch.window_end ? new Date(launch.window_end) : null,
            location: launch.pad?.location?.name || launch.pad?.name || null,
            country: launch.pad?.location?.country_code || launch.launch_service_provider?.country_code || null,
            agency: launch.launch_service_provider?.name || null,
            rocket: launch.rocket?.configuration?.full_name || launch.rocket?.configuration?.name || null,
            mission: launch.mission?.name || null,
            imageUrl: launch.image || launch.infographic || null,
            infoUrl: launch.infoURLs?.[0]?.url
              || launch.mission?.info_urls?.[0]?.url
              || (launch.slug ? `https://www.spacelaunchnow.me/launch/${launch.slug}` : null)
              || null,
            videoUrl: launch.vidURLs?.[0]?.url || null,
            webcastLive: launch.webcast_live ?? false,
            padLatitude: padLat && !isNaN(padLat) ? padLat : undefined,
            padLongitude: padLon && !isNaN(padLon) ? padLon : undefined,
            orbitType: orbitType ?? undefined,
            missionPatchUrl: missionPatchUrl ?? undefined,
            rocketImageUrl: rocketImageUrl ?? undefined,
            crewCount: crewCount ?? undefined,
            crewDetails: crewDetails as any ?? undefined,
            providerType: providerType ?? undefined,
            updatedAt: new Date(),
          },
          create: {
            externalId: launch.id,
            name: launch.name,
            description: launch.mission?.description || null,
            type: eventType,
            status,
            launchDate: launch.net ? new Date(launch.net) : null,
            launchDatePrecision: 'exact',
            windowStart: launch.window_start ? new Date(launch.window_start) : null,
            windowEnd: launch.window_end ? new Date(launch.window_end) : null,
            location: launch.pad?.location?.name || launch.pad?.name || null,
            country: launch.pad?.location?.country_code || launch.launch_service_provider?.country_code || null,
            agency: launch.launch_service_provider?.name || null,
            rocket: launch.rocket?.configuration?.full_name || launch.rocket?.configuration?.name || null,
            mission: launch.mission?.name || null,
            imageUrl: launch.image || launch.infographic || null,
            infoUrl: launch.infoURLs?.[0]?.url
              || launch.mission?.info_urls?.[0]?.url
              || (launch.slug ? `https://www.spacelaunchnow.me/launch/${launch.slug}` : null)
              || null,
            videoUrl: launch.vidURLs?.[0]?.url || null,
            webcastLive: launch.webcast_live ?? false,
            padLatitude: padLat && !isNaN(padLat) ? padLat : null,
            padLongitude: padLon && !isNaN(padLon) ? padLon : null,
            orbitType,
            missionPatchUrl,
            rocketImageUrl,
            crewCount,
            crewDetails: crewDetails as any,
            providerType,
          },
        });
        savedCount++;
      } catch (err) {
        logger.error(`Failed to save launch ${launch.id}`, { error: err instanceof Error ? err.message : String(err) });
        continue;
      }
    }

    // Also fetch space events (EVAs, dockings, etc)
    try {
      const eventsResponse = await fetch(
        'https://ll.thespacedevs.com/2.2.0/event/upcoming/?limit=50',
        {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        }
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events: LaunchLibraryEvent[] = eventsData.results || [];

        for (const event of events) {
          const eventType: SpaceEventType = event.type?.name?.toLowerCase().includes('eva')
            ? 'crewed_mission'
            : event.type?.name?.toLowerCase().includes('dock')
              ? 'space_station'
              : 'launch';

          try {
            await prisma.spaceEvent.upsert({
              where: { externalId: `event-${event.id}` },
              update: {
                name: event.name,
                description: event.description || null,
                type: eventType,
                status: 'upcoming',
                launchDate: event.date ? new Date(event.date) : null,
                location: event.location || null,
                imageUrl: event.feature_image || null,
                infoUrl: event.news_url || null,
                videoUrl: event.video_url || null,
                updatedAt: new Date(),
              },
              create: {
                externalId: `event-${event.id}`,
                name: event.name,
                description: event.description || null,
                type: eventType,
                status: 'upcoming',
                launchDate: event.date ? new Date(event.date) : null,
                location: event.location || null,
                imageUrl: event.feature_image || null,
                infoUrl: event.news_url || null,
                videoUrl: event.video_url || null,
              },
            });
            savedCount++;
          } catch {
            continue;
          }
        }
      }
    } catch (err) {
      logger.error('Failed to fetch events', { error: err instanceof Error ? err.message : String(err) });
    }

    return savedCount;
  }, 0); // fallback: 0 saved events
}

export async function getUpcomingEvents(options?: {
  hours?: number;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const { hours, type, limit = 20, offset = 0 } = options || {};

  const now = new Date();

  // Build where clause
  const statusFilter = { in: ['upcoming', 'go', 'tbc', 'tbd'] as string[] };

  let dateFilter;
  if (hours) {
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
    dateFilter = { gte: now, lte: futureDate };
  } else {
    dateFilter = { gte: now };
  }

  const whereClause = {
    status: statusFilter,
    launchDate: dateFilter,
    ...(type ? { type } : {}),
  };

  const events = await prisma.spaceEvent.findMany({
    where: whereClause,
    orderBy: { launchDate: 'asc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.spaceEvent.count({ where: whereClause });

  return { events, total };
}

export async function getAllEventsInRange(startDate: Date, endDate: Date, options?: {
  type?: string;
  country?: string;
  limit?: number;
  offset?: number;
}) {
  const { type, country, limit = 50, offset = 0 } = options || {};

  const whereClause = {
    launchDate: {
      gte: startDate,
      lte: endDate,
    },
    ...(type ? { type } : {}),
    ...(country ? { country } : {}),
  };

  const events = await prisma.spaceEvent.findMany({
    where: whereClause,
    orderBy: { launchDate: 'asc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.spaceEvent.count({ where: whereClause });

  return { events, total };
}

export async function getEventById(id: string) {
  return prisma.spaceEvent.findUnique({ where: { id } });
}
