import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { MissionPhase } from '@/types';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';

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

// Generate mock live missions based on current time
function generateMockLiveMissions() {
  const now = new Date();

  // Mission 1: Currently live (launched 30 minutes ago)
  const liveLaunchTime = new Date(now.getTime() - 30 * 60 * 1000);

  // Mission 2: About to launch (in 45 minutes)
  const upcomingLaunchTime = new Date(now.getTime() + 45 * 60 * 1000);

  // Mission 3: Launching in 90 minutes
  const soonLaunchTime = new Date(now.getTime() + 90 * 60 * 1000);

  const mockMissions = [
    {
      id: 'mock-live-1',
      externalId: 'live-spacex-starlink-demo',
      name: 'SpaceX Starlink Group 12-5',
      description: 'SpaceX Falcon 9 launching 23 Starlink v2 Mini satellites to low Earth orbit. This mission marks the 300th Falcon 9 flight.',
      type: 'launch',
      status: 'in_progress' as const,
      launchDate: liveLaunchTime,
      launchDatePrecision: 'exact',
      windowStart: new Date(liveLaunchTime.getTime() - 15 * 60 * 1000),
      windowEnd: new Date(liveLaunchTime.getTime() + 4 * 60 * 60 * 1000),
      location: 'Kennedy Space Center, FL',
      country: 'USA',
      agency: 'SpaceX',
      rocket: 'Falcon 9 Block 5',
      mission: 'Starlink Group 12-5',
      imageUrl: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800',
      infoUrl: 'https://www.spacex.com/launches/',
      videoUrl: PROVIDER_YOUTUBE_URLS['SpaceX'],
      xUrl: PROVIDER_X_URLS['SpaceX'],
      fetchedAt: now,
      updatedAt: now,
      isLive: true,
      streamUrl: PROVIDER_YOUTUBE_URLS['SpaceX'],
      missionPhase: 'ascent' as MissionPhase,
    },
    {
      id: 'mock-live-2',
      externalId: 'live-rocketlab-electron-demo',
      name: 'Rocket Lab Electron - TROPICS-3',
      description: 'Rocket Lab Electron rocket launching NASA TROPICS weather satellite to sun-synchronous orbit for climate monitoring.',
      type: 'launch',
      status: 'go' as const,
      launchDate: upcomingLaunchTime,
      launchDatePrecision: 'exact',
      windowStart: upcomingLaunchTime,
      windowEnd: new Date(upcomingLaunchTime.getTime() + 2 * 60 * 60 * 1000),
      location: 'Rocket Lab LC-1, New Zealand',
      country: 'New Zealand',
      agency: 'Rocket Lab',
      rocket: 'Electron',
      mission: 'TROPICS-3',
      imageUrl: 'https://images.unsplash.com/photo-1457364559154-aa2644600ebb?w=800',
      infoUrl: 'https://www.rocketlabusa.com/',
      videoUrl: PROVIDER_YOUTUBE_URLS['Rocket Lab'],
      xUrl: PROVIDER_X_URLS['Rocket Lab'],
      fetchedAt: now,
      updatedAt: now,
      isLive: false,
      streamUrl: PROVIDER_YOUTUBE_URLS['Rocket Lab'],
      missionPhase: 'pre_launch' as MissionPhase,
    },
    {
      id: 'mock-live-3',
      externalId: 'live-ula-vulcan-demo',
      name: 'ULA Vulcan Centaur - Sierra Space Dream Chaser',
      description: 'United Launch Alliance Vulcan Centaur launching Sierra Space Dream Chaser spaceplane for ISS cargo resupply mission.',
      type: 'crewed_mission',
      status: 'go' as const,
      launchDate: soonLaunchTime,
      launchDatePrecision: 'exact',
      windowStart: soonLaunchTime,
      windowEnd: new Date(soonLaunchTime.getTime() + 4 * 60 * 60 * 1000),
      location: 'Cape Canaveral SLC-41, FL',
      country: 'USA',
      agency: 'United Launch Alliance',
      rocket: 'Vulcan Centaur',
      mission: 'Dream Chaser CRS-1',
      imageUrl: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800',
      infoUrl: 'https://www.ulalaunch.com/',
      videoUrl: PROVIDER_YOUTUBE_URLS['United Launch Alliance'],
      xUrl: PROVIDER_X_URLS['United Launch Alliance'],
      fetchedAt: now,
      updatedAt: now,
      isLive: false,
      streamUrl: PROVIDER_YOUTUBE_URLS['United Launch Alliance'],
      missionPhase: 'countdown' as MissionPhase,
    },
  ];

  return mockMissions;
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
    const includeMockLive = searchParams.get('includeMockLive') !== 'false'; // Default true

    const now = new Date();

    // Simple query first - get all events
    let events;
    let total;

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
      const futureDate = new Date(now.getTime() + parseInt(hours) * 60 * 60 * 1000);
      events = await prisma.spaceEvent.findMany({
        where: {
          launchDate: {
            gte: now,
            lte: futureDate,
          },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
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

    // Add mock live missions if requested (for demo purposes)
    let allEvents = events;
    if (includeMockLive) {
      const mockLiveMissions = generateMockLiveMissions();

      // Filter mock missions by type if specified
      const filteredMockMissions = type
        ? mockLiveMissions.filter((m) => m.type === type)
        : mockLiveMissions;

      // Combine and sort by launch date
      allEvents = [...filteredMockMissions, ...events].sort((a, b) => {
        const aDate = a.launchDate ? new Date(a.launchDate).getTime() : 0;
        const bDate = b.launchDate ? new Date(b.launchDate).getTime() : 0;
        return aDate - bDate;
      });
    }

    return NextResponse.json({ events: allEvents, total: total + (includeMockLive ? 3 : 0) });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: String(error) },
      { status: 500 }
    );
  }
}
