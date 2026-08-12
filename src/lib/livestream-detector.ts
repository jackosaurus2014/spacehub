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
  /** YouTube channel ID (UC...). Optional when `handle` is provided. */
  channelId: string;
  /** YouTube @handle — used to build /streams URLs when channelId is empty.
   *  Unknown/wrong handles 404 and fail silently, so handle-based entries
   *  are safe to add without verifying the opaque channel ID. */
  handle?: string;
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
  // Handle-based entries — broaden coverage of launch/webcast activity.
  // (Handles verified 2026-08: og:title matches the intended channel.)
  { name: 'Avid Space',          channelId: '', handle: 'LabPadre',            xHandle: 'LabPadre',       priority: 2 },
  { name: 'Spaceflight Now',     channelId: '', handle: 'SpaceflightNowVideo', xHandle: 'SpaceflightNow', priority: 2 },
  { name: 'The Launch Pad',      channelId: '', handle: 'TheLaunchPad',        xHandle: '',               priority: 3 },
  { name: 'VideoFromSpace',      channelId: '', handle: 'VideoFromSpace',      xHandle: '',               priority: 3 },
  { name: 'Arianespace',         channelId: '', handle: 'arianespace',         xHandle: 'Arianespace',    priority: 3 },
  { name: 'Firefly Aerospace',   channelId: '', handle: 'FireflySpace',        xHandle: 'Firefly_Space',  priority: 4 },
  { name: 'Axiom Space',         channelId: '', handle: 'AxiomSpace',          xHandle: 'Axiom_Space',    priority: 4 },
];

/** Map channelId -> channel name for fast lookups. Handle-only entries have
 *  no channelId and must NOT share the '' key (it would mislabel them all). */
const CHANNEL_NAME_MAP = new Map<string, string>(
  SPACE_CHANNELS.filter((ch) => ch.channelId).map((ch) => [ch.channelId, ch.name]),
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

    // Prefer our known channel name if available (never key on empty ids)
    const channelName =
      (item.snippet.channelId && CHANNEL_NAME_MAP.get(item.snippet.channelId)) ||
      item.snippet.channelTitle;

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

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; SpaceNexus/2.0)',
  'Accept-Language': 'en-US,en;q=0.9',
};

function channelBaseUrl(channel: SpaceChannel): string | null {
  if (channel.channelId) return `https://www.youtube.com/channel/${channel.channelId}`;
  if (channel.handle) return `https://www.youtube.com/@${channel.handle}`;
  return null;
}

function decodeYtTitle(title: string): string {
  return title.replace(/\\u0026/g, '&').replace(/\\"/g, '"');
}

/**
 * Verify a fetched YouTube page actually belongs to the intended channel.
 * Nonexistent handles make YouTube serve a discovery/suggestions page full of
 * unrelated live videos — scraping those would mislabel third-party streams
 * as the registry channel.
 */
function pageMatchesChannel(html: string, channel: SpaceChannel): boolean {
  if (channel.channelId) {
    return html.includes(`"channelId":"${channel.channelId}"`) ||
           html.includes(`"externalId":"${channel.channelId}"`);
  }
  if (channel.handle) {
    const needle = `"canonicalBaseUrl":"/@${channel.handle.toLowerCase()}"`;
    return html.toLowerCase().includes(needle.toLowerCase());
  }
  return false;
}

/**
 * Verify video ownership via YouTube's oEmbed endpoint (free, no API quota).
 * Returns the video's clean title when the author matches the expected
 * channel, or null when it belongs to someone else / is unavailable.
 * Guards against YouTube fallback shelves that surface third-party videos
 * on sparse channel pages.
 */
async function verifyVideoOwner(
  videoId: string,
  channel: SpaceChannel,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${videoId}&format=json`,
      { signal: AbortSignal.timeout(6000), headers: SCRAPE_HEADERS },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string; author_url?: string };

    const authorUrl = (data.author_url || '').toLowerCase();
    const authorName = (data.author_name || '').toLowerCase();

    const matches =
      (channel.channelId && authorUrl.includes(`/channel/${channel.channelId.toLowerCase()}`)) ||
      (channel.handle && authorUrl.includes(`/@${channel.handle.toLowerCase()}`)) ||
      authorName === channel.name.toLowerCase();

    return matches ? (data.title || null) : null;
  } catch {
    return null;
  }
}

/**
 * Check a YouTube channel's /streams tab for ALL currently-live broadcasts.
 * FREE — no API quota used. Unlike the /live redirect (which only ever
 * surfaces one stream), the /streams tab lists every broadcast, so a
 * channel's 24/7 stream can't shadow its launch coverage.
 */
async function checkChannelStreamsTab(channel: SpaceChannel): Promise<YouTubeSearchItem[]> {
  const base = channelBaseUrl(channel);
  if (!base) return [];

  try {
    const res = await fetch(`${base}/streams`, {
      signal: AbortSignal.timeout(8000),
      headers: SCRAPE_HEADERS,
    });
    if (!res.ok) return [];

    const html = await res.text();

    // Reject fallback/suggestion pages served for unknown handles.
    if (!pageMatchesChannel(html, channel)) return [];

    // The tab HTML embeds one videoRenderer JSON blob per video. A live
    // broadcast carries a LIVE badge inside its own renderer block.
    const chunks = html.split('"videoRenderer":{"videoId":"').slice(1);
    const items: YouTubeSearchItem[] = [];

    for (const chunk of chunks) {
      if (items.length >= 4) break; // sanity cap per channel

      const videoId = chunk.slice(0, 11);
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue;

      // Scope the LIVE-badge check to this renderer's own block.
      const block = chunk.slice(0, chunk.indexOf('"videoRenderer"') === -1
        ? chunk.length
        : chunk.indexOf('"videoRenderer"'));
      const isLive = block.includes('"style":"LIVE"') ||
                     block.includes('"iconType":"LIVE"');
      if (!isLive) continue;

      // A channel's own tab renders its videos WITHOUT a byline; suggested /
      // related videos carry one. Skip bylined blocks — they belong to other
      // channels and would be mislabeled.
      if (block.includes('"longBylineText"') || block.includes('"shortBylineText"')) continue;

      // Ownership check: YouTube renders fallback/suggestion shelves on
      // sparse channel pages, so confirm the video really belongs to this
      // channel (oEmbed — free) and take the clean title from the same call.
      const verifiedTitle = await verifyVideoOwner(videoId, channel);
      if (verifiedTitle === null) continue;

      items.push({
        id: { videoId },
        snippet: {
          channelId: channel.channelId,
          channelTitle: channel.name,
          title: verifiedTitle,
          thumbnails: {
            high: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
          },
          publishedAt: new Date().toISOString(),
        },
      });
    }

    return items;
  } catch {
    // Silently fail — channel page might be unreachable
    return [];
  }
}

/**
 * Fallback: check a channel's /live redirect page (single stream only).
 * Used when the /streams tab yielded nothing for a high-priority channel.
 */
async function checkChannelLivePage(channel: SpaceChannel): Promise<YouTubeSearchItem[]> {
  const base = channelBaseUrl(channel);
  if (!base) return [];

  try {
    const res = await fetch(`${base}/live`, {
      signal: AbortSignal.timeout(8000),
      headers: SCRAPE_HEADERS,
    });

    if (!res.ok) return [];

    const html = await res.text();

    // Reject fallback/suggestion pages served for unknown handles.
    if (!pageMatchesChannel(html, channel)) return [];

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

    // Extract the video title (prefer the runs-format title over the first
    // bare "title" key, which is often channel metadata)
    const runsTitleMatch = html.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
    const bareTitleMatch = html.match(/"title":"([^"]+)"/);
    const title = runsTitleMatch
      ? decodeYtTitle(runsTitleMatch[1])
      : bareTitleMatch
        ? decodeYtTitle(bareTitleMatch[1])
        : `${channel.name} Live`;

    // Extract thumbnail
    const thumbMatch = html.match(/"thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/);
    const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return [{
      id: { videoId },
      snippet: {
        channelId: channel.channelId,
        channelTitle: channel.name,
        title,
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

async function detectViaYouTube(apiKey: string | undefined): Promise<ActiveLiveStream[]> {
  // ═══════════════════════════════════════════════════════════════════
  // STEP 1 (FREE): Scrape every channel's /streams tab — zero quota cost.
  // Catches ALL concurrent broadcasts per channel (24/7 streams can no
  // longer shadow launch coverage). Runs with or without an API key.
  // ═══════════════════════════════════════════════════════════════════
  const tabResults = await Promise.all(SPACE_CHANNELS.map((ch) => checkChannelStreamsTab(ch)));
  let pageItems = tabResults.flat();

  // Fallback: for high-priority channels the /streams tab missed entirely,
  // try the /live redirect page (some channel layouts differ).
  const foundChannels = new Set(pageItems.map((i) => i.snippet.channelTitle));
  const missedHighPriority = SPACE_CHANNELS.filter(
    (ch) => ch.priority <= 2 && !foundChannels.has(ch.name),
  );
  if (missedHighPriority.length > 0) {
    const liveResults = await Promise.all(missedHighPriority.map((ch) => checkChannelLivePage(ch)));
    pageItems = [...pageItems, ...liveResults.flat()];
  }

  logger.info('[LivestreamDetector] Free page check complete', {
    checked: SPACE_CHANNELS.length,
    found: pageItems.length,
    channels: pageItems.map(i => i.snippet.channelTitle),
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2 (PAID, CONSERVATIVE): One single broad YouTube API search
  // Only if the free check found nothing — catches non-registered channels
  // Cost: 100 units per call.
  // ═══════════════════════════════════════════════════════════════════
  let apiItems: YouTubeSearchItem[] = [];
  if (pageItems.length === 0 && apiKey) {
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

  // Step 3: Get viewer counts and start times (enrichment — needs API key)
  const videoIds = uniqueItems.map((item) => item.id.videoId);
  const videoDetails = apiKey
    ? await youtubeVideoDetails(apiKey, videoIds)
    : new Map<string, YouTubeVideoItem>();

  // Step 4: Convert and filter. The page scraper can return stale videos, so
  // when the details lookup SUCCEEDED we require concurrentViewers as proof
  // of an active stream. When the lookup failed or no key is configured we
  // keep the page-scraped items (the page itself flagged them LIVE) rather
  // than filtering everything out on an API hiccup.
  const allStreams = toActiveLiveStreams(uniqueItems, videoDetails);
  const detailsAvailable = videoDetails.size > 0;

  const confirmedLive = allStreams.filter((stream) => {
    if (!detailsAvailable) return true;
    const detail = videoDetails.get(stream.videoId);
    if (!detail?.liveStreamingDetails?.concurrentViewers) {
      logger.info('[LivestreamDetector] Filtering out non-live video', {
        videoId: stream.videoId,
        channel: stream.channelName,
        title: stream.title,
        reason: 'No concurrentViewers — likely ended or not yet started',
      });
      return false;
    }
    const viewers = parseInt(detail.liveStreamingDetails.concurrentViewers, 10);
    return viewers > 0;
  });

  confirmedLive.sort((a, b) => b.viewerCount - a.viewerCount);

  logger.info('[LivestreamDetector] YouTube detection complete', {
    found: confirmedLive.length,
    filtered: allStreams.length - confirmedLive.length,
    detailsAvailable,
    channels: confirmedLive.map((s) => s.channelName),
  });

  return confirmedLive;
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
          // Explicitly flagged live webcasts (within the last 24h)
          {
            webcastLive: true,
            launchDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
          {
            isLive: true,
            launchDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
          // Imminent/ongoing launches: T-45m through T+90m. Official webcasts
          // typically start ~30-45 minutes before the window opens, and the
          // flags above are not reliably set by upstream data.
          {
            launchDate: {
              gte: new Date(now.getTime() - 90 * 60 * 1000),
              lte: new Date(now.getTime() + 45 * 60 * 1000),
            },
            status: { in: ['upcoming', 'go', 'in_progress'] },
          },
        ],
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

      // Run YouTube scrape/API, launch-webcast DB lookup, and X detection in parallel
      const [youtubeStreams, launchStreams, xStreams] = await Promise.all([
        // YouTube detection (free scrape always runs; API enriches when keyed)
        (async (): Promise<ActiveLiveStream[]> => {
          try {
            return await detectViaYouTube(youtubeKey);
          } catch (err) {
            logger.error('[LivestreamDetector] YouTube detection failed', {
              error: err instanceof Error ? err.message : String(err),
            });
            return [];
          }
        })(),

        // Launch webcasts from tracked events (imminent/ongoing launches) —
        // always merged in, not just a fallback, so official mission webcasts
        // from providers outside the channel registry still surface.
        detectViaDatabase(),

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

      // Merge: YouTube channel streams + launch webcasts (dedupe by videoId),
      // then X streams (dedupe by channelName — if the same company is live on
      // both platforms, keep the YouTube one since it's embeddable).
      const merged: ActiveLiveStream[] = [...youtubeStreams];
      const seenVideoIds = new Set(youtubeStreams.map(s => s.videoId));

      for (const launchStream of launchStreams) {
        if (!seenVideoIds.has(launchStream.videoId)) {
          merged.push(launchStream);
          seenVideoIds.add(launchStream.videoId);
        }
      }

      const seenChannels = new Set(merged.map(s => s.channelName.toLowerCase()));
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
        launchWebcasts: launchStreams.length,
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
