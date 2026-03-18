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
  /** 'youtube' | 'x' — determines embed strategy */
  platform: 'youtube' | 'x';
  /** Direct URL to watch on the original platform */
  watchUrl: string;
}

// ---------------------------------------------------------------------------
// Channel Registry
// ---------------------------------------------------------------------------

interface SpaceChannel {
  name: string;
  channelId: string;
  /** X (Twitter) handle for this channel (without @) */
  xHandle: string;
  /** Lower number = higher priority. Channels with priority <= 3 get
   *  individual API checks if not found in the broad search. */
  priority: number;
}

const SPACE_CHANNELS: SpaceChannel[] = [
  { name: 'SpaceX',              channelId: 'UCtI0Hodo5o5dUb67FeUjDeA', xHandle: 'SpaceX',           priority: 1 },
  { name: 'NASA',                channelId: 'UCLA_DiR1FfKNvjuUpBHmylQ', xHandle: 'NASA',             priority: 1 },
  { name: 'NASA STEM',            channelId: 'UCryGec9PdUCLjpJW2mgCuLw', xHandle: 'ABORTSTEM',        priority: 2 },
  { name: 'NASASpaceflight',     channelId: 'UCSUu1lih2RifWkKtDOJdsBA', xHandle: 'NASASpaceflight',  priority: 2 },
  { name: 'Everyday Astronaut',  channelId: 'UC6uKrU_WqJ1R2HMTY3LIx5Q', xHandle: 'erdayastronaut',  priority: 3 },
  { name: 'Blue Origin',         channelId: 'UCVxTHEKKLxNjGcvVaZindlg', xHandle: 'blueorigin',       priority: 2 },
  { name: 'Rocket Lab',          channelId: 'UCsWq7LZaizhIi-c-Yo_bgg',  xHandle: 'RocketLab',        priority: 3 },
  { name: 'ULA',                 channelId: 'UCVrEnvMzkT9oAXUELMfUiuQ', xHandle: 'ulalaunch',        priority: 3 },
  { name: 'ESA',                 channelId: 'UCIBaDdAbGlFDeS33shmlD0A', xHandle: 'esa',              priority: 2 },
  { name: 'Space Videos',        channelId: 'UCakgsb0w7QB0VHdnCc0CCFA', xHandle: '',                  priority: 3 },
  { name: 'Scott Manley',        channelId: 'UCxzC4EngIsMrPmbm6Nxvb-A', xHandle: 'DJSnM',            priority: 4 },
  { name: 'Marcus House',        channelId: 'UCBNHHEoiSF8pcLgqLKVugOw', xHandle: 'MarcusHouseLive',  priority: 4 },
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
      platform: 'youtube' as const,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  });
}

// ---------------------------------------------------------------------------
// Primary detection: YouTube Data API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Free RSS/page-based livestream detection (no API quota cost)
// ---------------------------------------------------------------------------

/**
 * Check a YouTube channel's /live page for active livestreams.
 * This is FREE — no API quota used. We fetch the channel page HTML
 * and look for live broadcast indicators.
 */
async function checkChannelLivePage(channel: SpaceChannel): Promise<YouTubeSearchItem[]> {
  try {
    const url = `https://www.youtube.com/channel/${channel.channelId}/live`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SpaceNexus/2.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();

    // Look for live broadcast indicators in the page HTML
    const isLive = html.includes('"isLiveBroadcast":true') ||
                   html.includes('"isLiveNow":true') ||
                   html.includes('"style":"LIVE"') ||
                   html.includes('"isLive":true');

    if (!isLive) return [];

    // Extract the video ID from the page
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (!videoIdMatch) return [];

    const videoId = videoIdMatch[1];

    // Extract the title
    const titleMatch = html.match(/"title":"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : `${channel.name} Live`;

    // Extract thumbnail
    const thumbMatch = html.match(/"thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/);
    const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return [{
      id: { videoId },
      snippet: {
        channelId: channel.channelId,
        channelTitle: channel.name,
        title: title.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
        thumbnails: {
          high: { url: thumbnail },
        },
        publishedAt: new Date().toISOString(),
      },
    }];
  } catch {
    // Silently fail — channel page might be unreachable
    return [];
  }
}

// ---------------------------------------------------------------------------
// Primary detection: Free page scraping + optional YouTube API
// ---------------------------------------------------------------------------

async function detectViaYouTubeAPI(apiKey: string): Promise<ActiveLiveStream[]> {
  // ═══════════════════════════════════════════════════════════════════
  // STEP 1 (FREE): Check all channel /live pages — zero quota cost
  // This catches 24/7 streams like NASA ISS and any active broadcasts
  // ═══════════════════════════════════════════════════════════════════
  const pageCheckPromises = SPACE_CHANNELS.map((ch) => checkChannelLivePage(ch));
  const pageResults = await Promise.all(pageCheckPromises);
  const pageItems = pageResults.flat();

  logger.info('[LivestreamDetector] Free page check complete', {
    checked: SPACE_CHANNELS.length,
    found: pageItems.length,
    channels: pageItems.map(i => i.snippet.channelTitle),
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2 (PAID, CONSERVATIVE): One single broad YouTube API search
  // Only if the free check found nothing — catches non-registered channels
  // Cost: 100 units per call. At 10-min intervals = 144/day = 14,400 units
  // We only do this if we haven't found anything via free checks.
  // ═══════════════════════════════════════════════════════════════════
  let apiItems: YouTubeSearchItem[] = [];
  if (pageItems.length === 0) {
    apiItems = await youtubeSearchLive(apiKey, {
      q: 'NASA ISS live OR space launch live',
      maxResults: '5',
    });
  }

  // Merge all results
  const allItems = [...pageItems, ...apiItems];

  // Deduplicate by videoId
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
        platform: 'youtube' as const,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
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
// X (Twitter) livestream detection
// ---------------------------------------------------------------------------

/**
 * Detect livestreams on X (Twitter) from known space industry accounts.
 *
 * Uses the X API v2 to search for recent tweets from space accounts that
 * contain video/broadcast content and live-related keywords.
 *
 * Requires X_BEARER_TOKEN env var (Twitter/X API Bearer token).
 */
async function detectViaXApi(bearerToken: string): Promise<ActiveLiveStream[]> {
  const streams: ActiveLiveStream[] = [];

  // Build a search query for live/streaming tweets from space accounts
  // X API v2 recent search: find tweets with video from known handles mentioning "live"
  const handles = SPACE_CHANNELS.filter(ch => ch.xHandle && ch.priority <= 3)
    .map(ch => `from:${ch.xHandle}`)
    .join(' OR ');

  const query = `(${handles}) (live OR launch OR streaming OR webcast) has:videos -is:retweet`;
  const params = new URLSearchParams({
    query,
    'tweet.fields': 'created_at,attachments,entities,author_id',
    'expansions': 'attachments.media_keys,author_id',
    'media.fields': 'type,url,preview_image_url,duration_ms',
    'user.fields': 'name,username,profile_image_url',
    max_results: '10',
  });

  try {
    const res = await fetch(
      `https://api.x.com/2/tweets/search/recent?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn('[LivestreamDetector] X API search error', {
        status: res.status,
        body: body.slice(0, 300),
      });
      return [];
    }

    const data = await res.json();
    const tweets = data.data ?? [];
    const includes = data.includes ?? {};
    const media = includes.media ?? [];
    const users = includes.users ?? [];

    // Build lookup maps
    const userMap = new Map<string, { name: string; username: string; profile_image_url?: string }>();
    for (const u of users) {
      userMap.set(u.id, u);
    }

    const mediaMap = new Map<string, { type: string; url?: string; preview_image_url?: string }>();
    for (const m of media) {
      mediaMap.set(m.media_key, m);
    }

    for (const tweet of tweets) {
      // Only include tweets from the last 4 hours (likely still live)
      const tweetAge = Date.now() - new Date(tweet.created_at).getTime();
      if (tweetAge > 4 * 60 * 60 * 1000) continue;

      // Check if tweet has video media
      const mediaKeys = tweet.attachments?.media_keys ?? [];
      const hasVideo = mediaKeys.some((key: string) => {
        const m = mediaMap.get(key);
        return m && (m.type === 'video' || m.type === 'animated_gif');
      });

      if (!hasVideo) continue;

      const author = userMap.get(tweet.author_id);
      const channelName = author?.name || 'Unknown';
      const xHandle = author?.username || '';

      // Find matching channel for thumbnail
      const matchedChannel = SPACE_CHANNELS.find(
        ch => ch.xHandle.toLowerCase() === xHandle.toLowerCase(),
      );

      // Get thumbnail from first video media
      let thumbnailUrl = '';
      for (const key of mediaKeys) {
        const m = mediaMap.get(key);
        if (m?.preview_image_url) {
          thumbnailUrl = m.preview_image_url;
          break;
        }
      }

      const tweetUrl = `https://x.com/${xHandle}/status/${tweet.id}`;

      streams.push({
        videoId: tweet.id, // Use tweet ID as the identifier
        title: tweet.text?.slice(0, 120) || `${channelName} Live`,
        channelName: matchedChannel?.name || channelName,
        channelId: xHandle,
        thumbnailUrl: thumbnailUrl || author?.profile_image_url || '',
        viewerCount: 0, // X doesn't expose viewer counts in v2 API
        startedAt: tweet.created_at || new Date().toISOString(),
        embedUrl: tweetUrl, // X embeds use tweet URL
        platform: 'x' as const,
        watchUrl: tweetUrl,
      });
    }

    logger.info('[LivestreamDetector] X API detection complete', {
      found: streams.length,
      accounts: streams.map(s => s.channelName),
    });
  } catch (err) {
    logger.warn('[LivestreamDetector] X API detection failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return streams;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Cache TTL for livestream detection: 2 minutes. */
const LIVESTREAM_CACHE_TTL = 300; // 5 minutes

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
      const youtubeKey = process.env.YOUTUBE_API_KEY;
      const xBearerToken = process.env.X_BEARER_TOKEN;

      // Run YouTube and X detection in parallel
      const [youtubeStreams, xStreams] = await Promise.all([
        // YouTube detection
        (async (): Promise<ActiveLiveStream[]> => {
          if (youtubeKey) {
            try {
              return await detectViaYouTubeAPI(youtubeKey);
            } catch (err) {
              logger.error('[LivestreamDetector] YouTube API detection failed', {
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
          // Fall back to database for YouTube streams
          return detectViaDatabase();
        })(),

        // X detection
        (async (): Promise<ActiveLiveStream[]> => {
          if (xBearerToken) {
            try {
              return await detectViaXApi(xBearerToken);
            } catch (err) {
              logger.warn('[LivestreamDetector] X API detection failed', {
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
          return [];
        })(),
      ]);

      // Merge YouTube and X streams, deduplicate by channelName
      // (if same company is live on both, keep the YouTube one since it's embeddable)
      const merged: ActiveLiveStream[] = [...youtubeStreams];
      const seenChannels = new Set(youtubeStreams.map(s => s.channelName.toLowerCase()));

      for (const xStream of xStreams) {
        if (!seenChannels.has(xStream.channelName.toLowerCase())) {
          merged.push(xStream);
          seenChannels.add(xStream.channelName.toLowerCase());
        }
      }

      // Sort: YouTube first (embeddable), then by viewerCount descending
      merged.sort((a, b) => {
        // Prefer YouTube (embeddable) over X (link only)
        if (a.platform !== b.platform) {
          return a.platform === 'youtube' ? -1 : 1;
        }
        return b.viewerCount - a.viewerCount;
      });

      logger.info('[LivestreamDetector] Combined detection complete', {
        youtube: youtubeStreams.length,
        x: xStreams.length,
        total: merged.length,
      });

      return merged;
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
