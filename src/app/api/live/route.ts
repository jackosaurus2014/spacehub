import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  PROVIDER_YOUTUBE_CHANNEL_IDS,
  PROVIDER_X_HANDLES,
} from '@/lib/launch-providers';

export const dynamic = 'force-dynamic';

export interface LiveStream {
  id: string;
  title: string;
  provider: string;
  scheduledTime: string;
  description: string;
  isLive: boolean;
}

export async function GET() {
  try {
    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Query upcoming launches within the next 14 days, plus any in-progress missions regardless of date
    const events = await prisma.spaceEvent.findMany({
      where: {
        OR: [
          {
            // Normal upcoming window: -90min to +14 days
            launchDate: {
              gte: new Date(now.getTime() - 90 * 60 * 1000),
              lte: fourteenDaysFromNow,
            },
            status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          },
          {
            // In-progress missions always show (e.g. multi-day missions like Artemis II)
            status: 'in_progress',
          },
        ],
        type: 'launch',
      },
      select: {
        id: true,
        name: true,
        agency: true,
        launchDate: true,
        description: true,
        videoUrl: true,
        webcastLive: true,
      },
      orderBy: { launchDate: 'asc' },
      take: 20,
    });

    const nowMs = now.getTime();

    // Map DB events to stream objects
    const streams = events.map((event) => {
      const provider = event.agency || 'Unknown';
      const scheduledMs = event.launchDate ? new Date(event.launchDate).getTime() : 0;
      const diffMinutes = (scheduledMs - nowMs) / (1000 * 60);

      // Live if within -30min to +90min of scheduled time, or if webcastLive flag is set
      const isLive = event.webcastLive || (diffMinutes >= -90 && diffMinutes <= 30);

      // Build YouTube channel URL from provider map
      const channelId = PROVIDER_YOUTUBE_CHANNEL_IDS[provider] || PROVIDER_YOUTUBE_CHANNEL_IDS['NASA'];
      const youtubeChannelUrl = channelId
        ? `https://www.youtube.com/channel/${channelId}/live`
        : null;

      // Build X profile URL from provider map
      const xHandle = PROVIDER_X_HANDLES[provider];
      const xProfileUrl = xHandle ? `https://x.com/${xHandle}` : null;

      return {
        id: event.id,
        title: event.name,
        provider,
        scheduledTime: event.launchDate ? new Date(event.launchDate).toISOString() : new Date().toISOString(),
        description: event.description || '',
        isLive,
        youtubeChannelUrl,
        youtubeWatchUrl: event.videoUrl || youtubeChannelUrl,
        xProfileUrl,
        xWatchUrl: xProfileUrl,
        watchUrl: event.videoUrl || youtubeChannelUrl,
      };
    });

    // Sort by scheduled time
    const sortedStreams = streams.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );

    // Find the next upcoming stream (not yet past)
    const nextStream = sortedStreams.find(
      (s) => new Date(s.scheduledTime).getTime() > nowMs - 30 * 60 * 1000
    );

    return NextResponse.json({
      streams: sortedStreams,
      nextStream: nextStream || null,
      liveNow: sortedStreams.filter((s) => s.isLive),
      providerChannels: PROVIDER_YOUTUBE_CHANNEL_IDS,
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
