import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  PROVIDER_YOUTUBE_CHANNEL_IDS,
  PROVIDER_X_HANDLES,
} from '@/lib/launch-providers';

// Keep this route dynamic so we can apply precise Cache-Control headers
// suitable for a 30-60 second edge cache while still reflecting in-progress
// stream state promptly.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const LIVE_WINDOW_BEFORE_MIN = 30; // treat as "live" starting 30m before T-0
const LIVE_WINDOW_AFTER_MIN = 90; // and until 90m after T-0
const UPCOMING_GRACE_MIN = 5; // include launches T-5m or later as "upcoming soon"

export interface ActiveLiveStream {
  id: string;
  missionName: string;
  provider: string;
  scheduledTime: string;
  description: string | null;
  isLive: boolean;
  webcastLive: boolean;
  watchUrl: string | null;
  youtubeChannelUrl: string | null;
  youtubeWatchUrl: string | null;
  xProfileUrl: string | null;
  href: string;
  /** Minutes from now until scheduled time. Negative = already past T-0. */
  minutesUntil: number;
}

function normalizeEvent(
  event: {
    id: string;
    name: string;
    agency: string | null;
    description: string | null;
    launchDate: Date | null;
    videoUrl: string | null;
    streamUrl: string | null;
    webcastLive: boolean;
    isLive: boolean;
  },
  nowMs: number,
): ActiveLiveStream {
  const provider = event.agency || 'Unknown';
  const scheduledMs = event.launchDate
    ? new Date(event.launchDate).getTime()
    : nowMs;
  const diffMinutes = (scheduledMs - nowMs) / (1000 * 60);

  const withinLiveWindow =
    diffMinutes <= LIVE_WINDOW_BEFORE_MIN &&
    diffMinutes >= -LIVE_WINDOW_AFTER_MIN;

  const isLive = event.webcastLive || event.isLive || withinLiveWindow;

  const channelId =
    PROVIDER_YOUTUBE_CHANNEL_IDS[provider] ||
    PROVIDER_YOUTUBE_CHANNEL_IDS['NASA'];
  const youtubeChannelUrl = channelId
    ? `https://www.youtube.com/channel/${channelId}/live`
    : null;

  const xHandle = PROVIDER_X_HANDLES[provider];
  const xProfileUrl = xHandle ? `https://x.com/${xHandle}` : null;

  const watchUrl = event.videoUrl || event.streamUrl || youtubeChannelUrl;

  return {
    id: event.id,
    missionName: event.name,
    provider,
    scheduledTime: event.launchDate
      ? new Date(event.launchDate).toISOString()
      : new Date(nowMs).toISOString(),
    description: event.description,
    isLive,
    webcastLive: event.webcastLive,
    watchUrl,
    youtubeChannelUrl,
    youtubeWatchUrl: event.videoUrl || youtubeChannelUrl,
    xProfileUrl,
    // Deep-link into the live hub, preselecting the mission via ?id
    href: `/live?id=${encodeURIComponent(event.id)}`,
    minutesUntil: Math.round(diffMinutes),
  };
}

export async function GET() {
  try {
    const now = new Date();
    const nowMs = now.getTime();
    const fourHoursFromNow = new Date(nowMs + FOUR_HOURS_MS);
    // Pull a slightly wider pre-T0 window so the "live window" heuristic
    // (-30m → +90m around T-0) is not artificially truncated.
    const windowStart = new Date(nowMs - LIVE_WINDOW_AFTER_MIN * 60 * 1000);

    const events = await prisma.spaceEvent.findMany({
      where: {
        type: 'launch',
        OR: [
          // Explicitly live streams, regardless of when T-0 is.
          { webcastLive: true },
          { isLive: true },
          // Missions in-progress (multi-day missions like Artemis).
          { status: 'in_progress' },
          // Upcoming launches in the next 4 hours.
          {
            launchDate: {
              gte: windowStart,
              lte: fourHoursFromNow,
            },
            status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        agency: true,
        description: true,
        launchDate: true,
        videoUrl: true,
        streamUrl: true,
        webcastLive: true,
        isLive: true,
      },
      orderBy: { launchDate: 'asc' },
      take: 25,
    });

    const streams = events.map((event) => normalizeEvent(event, nowMs));

    const live = streams
      .filter((s) => s.isLive)
      .sort((a, b) => a.minutesUntil - b.minutesUntil)
      .slice(0, 3);

    const liveIds = new Set(live.map((s) => s.id));
    const upcomingSoon = streams
      .filter(
        (s) =>
          !liveIds.has(s.id) &&
          s.minutesUntil >= -UPCOMING_GRACE_MIN &&
          s.minutesUntil <= FOUR_HOURS_MS / (60 * 1000),
      )
      .sort((a, b) => a.minutesUntil - b.minutesUntil)
      .slice(0, 6);

    return NextResponse.json(
      {
        live,
        upcomingSoon,
        fetchedAt: now.toISOString(),
      },
      {
        headers: {
          // 30s edge cache + 30s SWR. Good tradeoff between load and freshness
          // for a banner that polls every ~30-60s client-side.
          'Cache-Control':
            'public, s-maxage=30, stale-while-revalidate=30, max-age=0',
        },
      },
    );
  } catch (error) {
    logger.error('[Livestreams Active API] GET failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch active livestreams', live: [], upcomingSoon: [] },
      { status: 500 },
    );
  }
}
