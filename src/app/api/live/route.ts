import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export interface LiveStream {
  id: string;
  title: string;
  provider: string;
  launchName: string;
  scheduledTime: string;
  youtubeVideoId: string | null;
  xVideoId: string | null; // X.com video/space ID
  isLive: boolean;
  description: string;
  rocket: string;
  mission: string;
  launchSite: string;
}

// Provider YouTube channel IDs for live streams
const PROVIDER_CHANNELS: Record<string, string> = {
  'SpaceX': 'UCtI0Hodo5o5dUb67FeUjDeA', // @SpaceX
  'United Launch Alliance': 'UCBplVKNY0p2QIwGE9GJQwig', // @ulalaunch
  'Arianespace': 'UCu0xb5EXcRsjt2u3zCv6mdQ', // @arborealfly
  'Blue Origin': 'UCVxTHEKKLxNjGcvVaZindlg', // @blueorigin
  'Rocket Lab': 'UCsWq7LZaizhIi-c-Yo_bcpw', // @RocketLabNZ
  'NASA': 'UCLA_DiR1FfKNvjuUpBHmylQ', // @NASA
  'ISRO': 'UCgWHOsQeVwMg_jaQ3Zcpxaw', // @isaborealfly
};

// Provider X.com (Twitter) handles for live streams
const PROVIDER_X_HANDLES: Record<string, string> = {
  'SpaceX': 'SpaceX',
  'United Launch Alliance': 'ulaborealfly',
  'Arianespace': 'Arianespace',
  'Blue Origin': 'blueorigin',
  'Rocket Lab': 'RocketLab',
  'NASA': 'NASA',
  'ISRO': 'isaborealfly',
};

// Mock data for live/upcoming streams
const mockStreams: LiveStream[] = [
  {
    id: 'stream-1',
    title: 'Starlink Group 12-5 Launch',
    provider: 'SpaceX',
    launchName: 'Falcon 9 - Starlink 12-5',
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    youtubeVideoId: null, // Will be populated when stream goes live
    xVideoId: null, // Will be populated when X stream goes live
    isLive: false,
    description: 'SpaceX Falcon 9 rocket launching 23 Starlink satellites to low Earth orbit.',
    rocket: 'Falcon 9 Block 5',
    mission: 'Starlink satellite deployment',
    launchSite: 'Cape Canaveral SLC-40',
  },
  {
    id: 'stream-2',
    title: 'Crew Dragon ISS Resupply',
    provider: 'SpaceX',
    launchName: 'Falcon 9 - CRS-32',
    scheduledTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours from now
    youtubeVideoId: null,
    xVideoId: null,
    isLive: false,
    description: 'Dragon cargo spacecraft carrying supplies and experiments to the International Space Station.',
    rocket: 'Falcon 9 Block 5',
    mission: 'ISS Cargo Resupply',
    launchSite: 'Kennedy Space Center LC-39A',
  },
  {
    id: 'stream-3',
    title: 'Vulcan Centaur - Peregrine Lunar Lander',
    provider: 'United Launch Alliance',
    launchName: 'Vulcan Centaur - Cert-2',
    scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    youtubeVideoId: null,
    xVideoId: null,
    isLive: false,
    description: 'ULA Vulcan Centaur second certification flight carrying commercial lunar payload.',
    rocket: 'Vulcan Centaur',
    mission: 'Lunar payload delivery',
    launchSite: 'Cape Canaveral SLC-41',
  },
  {
    id: 'stream-4',
    title: 'Ariane 6 - Galileo Navigation Satellites',
    provider: 'Arianespace',
    launchName: 'Ariane 6 - Flight 3',
    scheduledTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    youtubeVideoId: null,
    xVideoId: null,
    isLive: false,
    description: 'European Ariane 6 rocket deploying two Galileo navigation satellites to MEO.',
    rocket: 'Ariane 6',
    mission: 'Galileo constellation expansion',
    launchSite: 'Kourou ELA-4',
  },
  {
    id: 'stream-5',
    title: 'New Glenn - First Commercial Mission',
    provider: 'Blue Origin',
    launchName: 'New Glenn - NG-2',
    scheduledTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days from now
    youtubeVideoId: null,
    xVideoId: null,
    isLive: false,
    description: 'Blue Origin New Glenn heavy-lift rocket first commercial mission.',
    rocket: 'New Glenn',
    mission: 'Commercial payload deployment',
    launchSite: 'Cape Canaveral LC-36',
  },
  {
    id: 'stream-6',
    title: 'Starship - Flight 8',
    provider: 'SpaceX',
    launchName: 'Starship - IFT-8',
    scheduledTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days from now
    youtubeVideoId: null,
    xVideoId: null,
    isLive: false,
    description: 'SpaceX Starship integrated test flight with orbital insertion attempt.',
    rocket: 'Starship + Super Heavy',
    mission: 'Integrated Flight Test',
    launchSite: 'Starbase, Boca Chica',
  },
];

export async function GET() {
  try {
    // Sort by scheduled time
    const sortedStreams = [...mockStreams].sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );

    // Check if any should be marked as live (within 30 minutes of scheduled time)
    const now = Date.now();
    const streamsWithLiveStatus = sortedStreams.map((stream) => {
      const scheduledMs = new Date(stream.scheduledTime).getTime();
      const diffMinutes = (scheduledMs - now) / (1000 * 60);
      // Consider "live" if within -30 to +10 minutes of scheduled time
      const isLive = diffMinutes >= -30 && diffMinutes <= 10;

      // Get the provider's YouTube channel as fallback
      const channelId = PROVIDER_CHANNELS[stream.provider] || PROVIDER_CHANNELS['NASA'];
      const youtubeChannelUrl = `https://www.youtube.com/channel/${channelId}/live`;

      // Get the provider's X.com handle for live streams
      const xHandle = PROVIDER_X_HANDLES[stream.provider];
      const xProfileUrl = xHandle ? `https://x.com/${xHandle}` : null;

      return {
        ...stream,
        isLive,
        // YouTube URLs
        youtubeChannelUrl,
        youtubeWatchUrl: stream.youtubeVideoId
          ? `https://www.youtube.com/watch?v=${stream.youtubeVideoId}`
          : youtubeChannelUrl,
        // X.com URLs
        xProfileUrl,
        xWatchUrl: stream.xVideoId
          ? `https://x.com/i/broadcasts/${stream.xVideoId}`
          : xProfileUrl,
        // Combined watch URLs (prefer YouTube, fallback to X)
        watchUrl: stream.youtubeVideoId
          ? `https://www.youtube.com/watch?v=${stream.youtubeVideoId}`
          : youtubeChannelUrl,
      };
    });

    // Find the next upcoming stream
    const nextStream = streamsWithLiveStatus.find(
      (s) => new Date(s.scheduledTime).getTime() > now - 30 * 60 * 1000
    );

    return NextResponse.json({
      streams: streamsWithLiveStatus,
      nextStream: nextStream || null,
      liveNow: streamsWithLiveStatus.filter((s) => s.isLive),
      providerChannels: PROVIDER_CHANNELS,
      providerXHandles: PROVIDER_X_HANDLES,
    });
  } catch (error) {
    logger.error('Error fetching live streams', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch live streams' },
      { status: 500 }
    );
  }
}
