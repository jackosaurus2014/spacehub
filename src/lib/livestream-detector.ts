/**
 * Livestream Detection System for SpaceNexus
 *
 * Detects active YouTube livestreams from known space industry channels
 * using a hybrid approach:
 *
 * 1. Primary: YouTube Data API v3 search.list with eventType=live
 *    (requires YOUTUBE_API_KEY env var)
 * 2. Fallback: Check existing database events marked as live
 *
 * Optimised for YouTube API quota conservation:
 *   - Single broad search first (100 quota units)
 *   - Individual channel checks only for high-priority channels
 *     not already found in the broad search
 *   - 2-minute cache via withCache to avoid redundant calls
 */

import { withCache, CACHE_TTL } from './api-cache';
import { logger } from './logger';
import prisma from './db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveLiveStream {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  thumbnailUrl: string;
  viewerCount: number;
  startedAt: string;
  embedUrl: string;
}

// ---------------------------------------------------------------------------
// Channel Registry
// ---------------------------------------------------------------------------

interface SpaceChannel {
  name: string;
  channelId: string;
  /** Lower number = higher priority. Channels with priority <= 3 get
   *  individual API checks if not found in the broad search. */
  priority: number;
}

const SPACE_CHANNELS: SpaceChannel[] = [
  { name: 'SpaceX',              channelId: 'UCtI0Hodo5o5dUb67FeUjDeA', priority: 1 },
  { name: 'NASA',                channelId: 'UCLA_DiR1FfKNvjuUpBHmylQ', priority: 1 },
  { name: 'NASASpaceflight',     channelId: 'UCSUu1lih2RifWkKtDOJdsBA', priority: 2 },
  { name: 'Everyday Astronaut',  channelId: 'UC6uKrU_WqJ1R2HMTY3LIx5Q', priority: 3 },
  { name: 'Blue Origin',         channelId: 'UCVxTHEKKLxNjGcvVaZindlg', priority: 2 },
  { name: 'Rocket Lab',          channelId: 'UCsWq7LZaizhIi-c-Yo_bgg',  priority: 3 },
  { name: 'ULA',                 channelId: 'UCVrEnvMzkT9oAXUELMfUiuQ', priority: 3 },
  { name: 'ESA',                 channelId: 'UCIBaDdAbGlFDeS33shmlD0A', priority: 2 },
  { name: 'Scott Manley',        channelId: 'UCxzC4EngIsMrPmbm6Nxvb-A', priority: 4 },
  { name: 'Marcus House',        channelId: 'UCBNHHEoiSF8pcLgqLKVugOw', priority: 4 },
];

/** Map channelId -> channel name for fast lookups. */
const CHANNEL_NAME_MAP = new Map<string, string>(
  SPACE_CHANNELS.map((ch) => [ch.channelId, ch.name]),
);

/** High-priority threshold -- channels at or below this priority get
 *  individual checks when the broad search misses them. */
const HIGH_PRIORITY_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// YouTube Data API helpers
// ---------------------------------------------------------------------------

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    channelId: string;
    channelTitle: string;
    title: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
    publishedAt: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeVideoItem {
  id: string;
  liveStreamingDetails?: {
    actualStartTime?: string;
    concurrentViewers?: string;
  };
  statistics?: {
    viewCount?: string;
  };
}

interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[];
}

/**
 * Perform a YouTube search for live videos.
 * Returns raw search items or an empty array on failure.
 */
async function youtubeSearchLive(
  apiKey: string,
  params: Record<string, string>,
): Promise<YouTubeSearchItem[]> {
  const query = new URLSearchParams({
    part: 'snippet',
    eventType: 'live',
    type: 'video',
    key: apiKey,
    ...params,
  });

  const url = `${YOUTUBE_API_BASE}/search?${query.toString()}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn('[LivestreamDetector] YouTube search API error', {
        status: res.status,
        body: body.slice(0, 300),
      });
      return [];
    }
    const data: YouTubeSearchResponse = await res.json();
    return data.items ?? [];
  } catch (err) {
    logger.warn('[LivestreamDetector] YouTube search fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Fetch video details (viewer counts, start times) for a list of video IDs.
 */
async function youtubeVideoDetails(
  apiKey: string,
  videoIds: string[],
): Promise<Map<string, YouTubeVideoItem>> {
  const map = new Map<string, YouTubeVideoItem>();
  if (videoIds.length === 0) return map;

  const query = new URLSearchParams({
    part: 'liveStreamingDetails,statistics',
    id: videoIds.join(','),
    key: apiKey,
  });

  const url = `${YOUTUBE_API_BASE}/videos?${query.toString()}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn('[LivestreamDetector] YouTube videos API error', {
        status: res.status,
        body: body.slice(0, 300),
      });
      return map;
    }
    const data: YouTubeVideosResponse = await res.json();
    for (const item of data.items ?? []) {
      map.set(item.id, item);
    }
  } catch (err) {
    logger.warn('[LivestreamDetector] YouTube videos fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return map;
}

/**
 * Convert raw YouTube search + video detail data into ActiveLiveStream objects.
 */
function toActiveLiveStreams(
  searchItems: YouTubeSearchItem[],
  videoDetails: Map<string, YouTubeVideoItem>,
): ActiveLiveStream[] {
  return searchItems.map((item) => {
    const videoId = item.id.videoId;
    const detail = videoDetails.get(videoId);
    const thumbnail =
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const viewerCount = detail?.liveStreamingDetails?.concurrentViewers
      ? parseInt(detail.liveStreamingDetails.concurrentViewers, 10)
      : 0;

    const startedAt =
      detail?.liveStreamingDetails?.actualStartTime ??
      item.snippet.publishedAt;

    // Prefer our known channel name if available
    const channelName =
      CHANNEL_NAME_MAP.get(item.snippet.channelId) ?? item.snippet.channelTitle;

    return {
      videoId,
      title: item.snippet.title,
      channelName,
      channelId: item.snippet.channelId,
      thumbnailUrl: thumbnail,
      viewerCount,
      startedAt,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    };
  });
}

// ---------------------------------------------------------------------------
// Primary detection: YouTube Data API
// ---------------------------------------------------------------------------

async function detectViaYouTubeAPI(apiKey: string): Promise<ActiveLiveStream[]> {
  // Step 1: Broad search for any space-related live streams
  const broadItems = await youtubeSearchLive(apiKey, {
    q: 'space+launch+live',
    maxResults: '10',
  });

  // Track which channel IDs we've already found
  const foundChannelIds = new Set(broadItems.map((item) => item.snippet.channelId));

  // Step 2: For high-priority channels NOT found in the broad search,
  // do individual channel searches
  const highPriorityMissing = SPACE_CHANNELS.filter(
    (ch) => ch.priority <= HIGH_PRIORITY_THRESHOLD && !foundChannelIds.has(ch.channelId),
  );

  const channelSearchPromises = highPriorityMissing.map((ch) =>
    youtubeSearchLive(apiKey, {
      channelId: ch.channelId,
      maxResults: '3',
    }),
  );

  const channelResults = await Promise.all(channelSearchPromises);
  const additionalItems = channelResults.flat();

  // Merge and deduplicate by videoId
  const allItems = [...broadItems, ...additionalItems];
  const seen = new Set<string>();
  const uniqueItems = allItems.filter((item) => {
    if (seen.has(item.id.videoId)) return false;
    seen.add(item.id.videoId);
    return true;
  });

  if (uniqueItems.length === 0) {
    return [];
  }

  // Step 3: Get viewer counts and start times
  const videoIds = uniqueItems.map((item) => item.id.videoId);
  const videoDetails = await youtubeVideoDetails(apiKey, videoIds);

  // Step 4: Convert and sort by viewerCount descending
  const streams = toActiveLiveStreams(uniqueItems, videoDetails);
  streams.sort((a, b) => b.viewerCount - a.viewerCount);

  logger.info('[LivestreamDetector] YouTube API detection complete', {
    found: streams.length,
    channels: streams.map((s) => s.channelName),
  });

  return streams;
}

// ---------------------------------------------------------------------------
// Fallback detection: Database events
// ---------------------------------------------------------------------------

/**
 * Extract a YouTube video ID from a URL string.
 * Returns null if no valid video ID can be parsed.
 */
function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    // youtube.com/watch?v=xxx
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
    // youtu.be/xxx
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1) || null;
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

async function detectViaDatabase(): Promise<ActiveLiveStream[]> {
  try {
    const now = new Date();
    const events = await prisma.spaceEvent.findMany({
      where: {
        OR: [
          { webcastLive: true },
          { isLive: true },
        ],
        launchDate: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Within last 24h
        },
      },
      select: {
        id: true,
        name: true,
        agency: true,
        videoUrl: true,
        streamUrl: true,
        launchDate: true,
        imageUrl: true,
      },
      orderBy: { launchDate: 'desc' },
      take: 20,
    });

    const streams: ActiveLiveStream[] = [];

    for (const event of events) {
      const url = event.videoUrl || event.streamUrl;
      if (!url) continue;

      const videoId = extractVideoId(url);
      if (!videoId) continue;

      streams.push({
        videoId,
        title: event.name,
        channelName: event.agency || 'Unknown',
        channelId: '',
        thumbnailUrl:
          event.imageUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        viewerCount: 0, // Not available from DB
        startedAt: event.launchDate
          ? new Date(event.launchDate).toISOString()
          : now.toISOString(),
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      });
    }

    logger.info('[LivestreamDetector] Database fallback detection complete', {
      found: streams.length,
    });

    return streams;
  } catch (err) {
    logger.error('[LivestreamDetector] Database fallback failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Cache TTL for livestream detection: 2 minutes. */
const LIVESTREAM_CACHE_TTL = 120; // seconds

/**
 * Detect currently active YouTube livestreams from space industry channels.
 *
 * Uses YouTube Data API v3 when YOUTUBE_API_KEY is configured, otherwise
 * falls back to checking the database for events with webcastLive/isLive flags.
 *
 * Results are cached for 2 minutes with stale-while-revalidate.
 */
export async function detectLiveStreams(): Promise<ActiveLiveStream[]> {
  return withCache<ActiveLiveStream[]>(
    'livestreams:active',
    async () => {
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (apiKey) {
        try {
          const streams = await detectViaYouTubeAPI(apiKey);
          return streams;
        } catch (err) {
          logger.error('[LivestreamDetector] YouTube API detection failed, trying DB fallback', {
            error: err instanceof Error ? err.message : String(err),
          });
          // Fall through to database fallback
        }
      }

      return detectViaDatabase();
    },
    {
      ttlSeconds: LIVESTREAM_CACHE_TTL,
      staleWhileRevalidate: true,
      fallbackToStale: true,
    },
  );
}

/**
 * Get the count of currently active livestreams.
 * Lightweight wrapper around detectLiveStreams() -- shares the same cache.
 */
export async function getActiveStreamCount(): Promise<number> {
  const streams = await detectLiveStreams();
  return streams.length;
}
