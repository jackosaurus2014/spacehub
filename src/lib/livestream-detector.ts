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
  /**
   * True when this stream qualifies as a "flagship" moment — a crewed launch,
   * an interplanetary mission, or a named flagship program milestone (see
   * MAJOR_EVENT_PATTERNS below), or when manually forced via the
   * NEXT_PUBLIC_FORCE_MAJOR_EVENT env var. Drives homepage promotion of the
   * Live Now section back to the top of the page.
   */
  isMajorEvent: boolean;
}

// ---------------------------------------------------------------------------
// Major-event detection
// ---------------------------------------------------------------------------

/**
 * Conservative, easy-to-edit allowlist of patterns matched against a
 * livestream's title + channel name to flag "flagship" coverage — crewed
 * launches, interplanetary missions, and named flagship program milestones.
 *
 * Used to auto-promote the homepage Live Now section from its normal
 * below-the-hero position back to the very top of the page (the treatment
 * the site gave the Artemis II Moon-adjacent coverage). Keep this list
 * conservative — a false positive promotes a routine stream to the top of
 * the homepage. Add new flagship triggers here as missions are announced.
 */
export const MAJOR_EVENT_PATTERNS: RegExp[] = [
  // Crewed lunar program (Artemis II circumlunar, Artemis III landing)
  /\bartemis\s*(ii|iii|2|3)\b/i,
  // SpaceX Crew Dragon rotation missions, Axiom private astronaut missions
  /\bcrew-\d+\b/i,
  /\bax-\d+\b/i,
  // Boeing Starliner crewed flights
  /\bstarliner\b[^.]{0,40}\bcrew\b/i,
  // Generic crewed-launch language
  /\bcrewed\b/i,
  /\bastronauts?\b[^.]{0,20}\b(launch|aboard|onboard)\b/i,
  // Interplanetary / deep-space flagship missions
  /\bmars\b[^.]{0,30}\b(landing|sample|rover|mission)\b/i,
  /\beuropa clipper\b/i,
  /\bpsyche\b/i,
  /\bjuice\b[^.]{0,30}\bjupiter\b/i,
  /\bdragonfly\b[^.]{0,20}\btitan\b/i,
  /\bmars sample return\b/i,
  // Named flagship program milestones
  /\bhuman landing system\b/i,
  /\bfirst crewed (flight|launch|landing)\b/i,
  /\bmoon landing\b/i,
];

/** Test a stream's title/channel text against MAJOR_EVENT_PATTERNS. */
export function isMajorEventTitle(text: string): boolean {
  return MAJOR_EVENT_PATTERNS.some((pattern) => pattern.test(text));
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
    actualEndTime?: string;
    concurrentViewers?: string;
  };
  statistics?: {
    viewCount?: string;
  };
  /** Authoritative metadata — the page scraper's title/thumbnail can be stale
   *  or, on the /live path, lifted from the wrong element entirely. */
  snippet?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  /** Embeddability + visibility. A stream that is live and popular can still
   *  refuse to play inside our iframe; without this we'd render YouTube's
   *  "Video unavailable" box on the homepage and never know. */
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
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
    part: 'liveStreamingDetails,statistics,snippet,status',
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
 * YouTube serves a grey "no thumbnail available" placeholder from its static
 * asset host when a scrape misses the real image. Treat those as absent so we
 * fall back to the video's own hqdefault frame.
 */
export function isPlaceholderThumbnail(url: string): boolean {
  return url.includes('s.ytimg.com/yts/img/');
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

    // The API's snippet wins over the scraped one. The /live scrape path
    // regex-matches a title out of the page and has been observed lifting a
    // neighbouring stream's title, and the thumbnail it finds is sometimes
    // YouTube's grey "no thumbnail" placeholder rather than the real frame.
    const title = detail?.snippet?.title?.trim() || item.snippet.title;
    const apiThumb =
      detail?.snippet?.thumbnails?.high?.url ??
      detail?.snippet?.thumbnails?.medium?.url ??
      detail?.snippet?.thumbnails?.default?.url;
    const scrapedThumb =
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url;
    const thumbnail =
      apiThumb ??
      (scrapedThumb && !isPlaceholderThumbnail(scrapedThumb) ? scrapedThumb : undefined) ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const viewerCount = detail?.liveStreamingDetails?.concurrentViewers
      ? parseInt(detail.liveStreamingDetails.concurrentViewers, 10)
      : 0;

    const startedAt =
      detail?.liveStreamingDetails?.actualStartTime ??
      item.snippet.publishedAt;

    // Prefer our known channel name if available (never key on empty ids).
    // The scraper leaves channelId empty for handle-only channels, so fall
    // back to the API's before giving up on the name lookup.
    const channelId = item.snippet.channelId || detail?.snippet?.channelId || '';
    const channelName =
      (channelId && CHANNEL_NAME_MAP.get(channelId)) ||
      item.snippet.channelTitle ||
      detail?.snippet?.channelTitle ||
      '';

    return {
      videoId,
      title,
      channelName,
      channelId,
      thumbnailUrl: thumbnail,
      viewerCount,
      startedAt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      platform: 'youtube' as const,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      isMajorEvent: isMajorEventTitle(`${title} ${channelName}`),
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

    // Ownership + title, same as the /streams path. Regex-scraping the title
    // out of this page picks up whatever "title" key appears first, which has
    // been observed returning a neighbouring stream's title from the sidebar;
    // oEmbed is free and authoritative, so use it and drop the video when it
    // turns out not to belong to this channel.
    const verifiedTitle = await verifyVideoOwner(videoId, channel);
    if (verifiedTitle === null) return [];
    const title = verifiedTitle;

    // Extract thumbnail, ignoring YouTube's grey placeholder asset.
    const thumbMatch = html.match(/"thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/);
    const thumbnail = thumbMatch && !isPlaceholderThumbnail(thumbMatch[1])
      ? thumbMatch[1]
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

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

    // Embeddability + visibility gate. A stream can be live, public in search,
    // and busy, and still refuse to play inside a third-party iframe (owner
    // opt-out, members-only, age gate). We cannot detect that in the browser —
    // YouTube renders its own error page inside the iframe and cross-origin
    // rules hide it from us — so a non-embeddable stream would sit on the
    // homepage as a dead "Video unavailable" box. Filter it server-side and
    // let the next-best stream take the slot.
    if (detail?.status?.embeddable === false) {
      logger.info('[LivestreamDetector] Filtering out non-embeddable video', {
        videoId: stream.videoId,
        channel: stream.channelName,
        title: stream.title,
        reason: 'status.embeddable is false — would render a dead player',
      });
      return false;
    }
    if (detail?.status?.privacyStatus && detail.status.privacyStatus !== 'public') {
      logger.info('[LivestreamDetector] Filtering out non-public video', {
        videoId: stream.videoId,
        channel: stream.channelName,
        privacyStatus: detail.status.privacyStatus,
      });
      return false;
    }
    // An ended broadcast keeps its concurrentViewers reading for a while.
    if (detail?.liveStreamingDetails?.actualEndTime) {
      logger.info('[LivestreamDetector] Filtering out ended broadcast', {
        videoId: stream.videoId,
        channel: stream.channelName,
        actualEndTime: detail.liveStreamingDetails.actualEndTime,
      });
      return false;
    }

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

/**
 * Parse an X (Twitter) stream URL — native broadcasts (x.com/i/broadcasts/ID),
 * status links, or profile links. SpaceX webcasts now live on X, and Launch
 * Library supplies these URLs on SpaceEvents; dropping them meant missing
 * SpaceX's own launch coverage entirely.
 */
export function parseXStreamUrl(url: string): { id: string; handle: string | null } | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    if (host !== 'x.com' && host !== 'twitter.com') return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    // x.com/i/broadcasts/<id> — native live broadcast (no handle in URL)
    if (segments[0] === 'i' && segments[1] === 'broadcasts' && segments[2]) {
      return { id: segments[2], handle: null };
    }
    // x.com/<handle>/status/<id>
    if (segments.length >= 3 && segments[1] === 'status') {
      return { id: segments[2], handle: segments[0] };
    }
    // x.com/<handle> — profile link
    if (segments.length === 1 && segments[0] !== 'i') {
      return { id: segments[0], handle: segments[0] };
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
      let url = event.videoUrl || event.streamUrl;

      // SpaceX webcasts live on X. When an imminent SpaceX launch has no
      // webcast URL yet, point viewers at @SpaceX rather than dropping it.
      if (!url && (event.agency || '').toLowerCase().includes('spacex')) {
        url = 'https://x.com/SpaceX';
      }
      if (!url) continue;

      const startedAt = event.launchDate
        ? new Date(event.launchDate).toISOString()
        : now.toISOString();

      const videoId = extractVideoId(url);
      if (videoId) {
        streams.push({
          videoId,
          title: event.name,
          channelName: event.agency || 'Unknown',
          channelId: '',
          thumbnailUrl:
            event.imageUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          viewerCount: 0, // Not available from DB
          startedAt,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
          platform: 'youtube' as const,
          watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
          isMajorEvent: isMajorEventTitle(`${event.name} ${event.agency || ''}`),
        });
        continue;
      }

      // Non-YouTube webcasts: X broadcasts / status / profile links
      const xStream = parseXStreamUrl(url);
      if (xStream) {
        const handle =
          xStream.handle ||
          ((event.agency || '').toLowerCase().includes('spacex') ? 'SpaceX' : event.agency || '');
        streams.push({
          videoId: `x-${xStream.id}`,
          title: event.name,
          channelName: event.agency || handle || 'Unknown',
          channelId: handle,
          thumbnailUrl: event.imageUrl || '',
          viewerCount: 0,
          startedAt,
          embedUrl: url,
          platform: 'x' as const,
          watchUrl: url,
          isMajorEvent: isMajorEventTitle(`${event.name} ${event.agency || ''}`),
        });
      }
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

  // has:videos catches uploaded video; url:broadcasts catches links to native
  // X live broadcasts (x.com/i/broadcasts/...), which is how SpaceX streams.
  const query = `(${handles}) (live OR launch OR streaming OR webcast) (has:videos OR url:broadcasts) -is:retweet`;
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

      // Check if tweet has video media OR links to a native X broadcast
      const mediaKeys = tweet.attachments?.media_keys ?? [];
      const hasVideo = mediaKeys.some((key: string) => {
        const m = mediaMap.get(key);
        return m && (m.type === 'video' || m.type === 'animated_gif');
      });

      const broadcastUrl = (tweet.entities?.urls ?? [])
        .map((u: { expanded_url?: string; url?: string }) => u.expanded_url || u.url || '')
        .find((u: string) => u.includes('/broadcasts/') || u.includes('/i/spaces/'));

      if (!hasVideo && !broadcastUrl) continue;

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
      // Prefer the direct broadcast URL when the tweet links one —
      // it drops viewers straight into the live player.
      const targetUrl = broadcastUrl || tweetUrl;

      const tweetTitle = tweet.text?.slice(0, 120) || `${channelName} Live`;
      streams.push({
        videoId: tweet.id, // Use tweet ID as the identifier
        title: tweetTitle,
        channelName: matchedChannel?.name || channelName,
        channelId: xHandle,
        thumbnailUrl: thumbnailUrl || author?.profile_image_url || '',
        viewerCount: 0, // X doesn't expose viewer counts in v2 API
        startedAt: tweet.created_at || new Date().toISOString(),
        embedUrl: targetUrl,
        platform: 'x' as const,
        watchUrl: targetUrl,
        isMajorEvent: isMajorEventTitle(`${tweetTitle} ${channelName}`),
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

      // Manual override — lets Jay force homepage promotion during a big
      // moment without waiting on MAJOR_EVENT_PATTERNS to match. Set to a
      // specific videoId to promote just that stream, or 'true'/'1' to
      // promote whichever stream is currently live. Unset/empty = no-op
      // (fails closed to the pattern-matched default).
      const forceMajor = process.env.NEXT_PUBLIC_FORCE_MAJOR_EVENT?.trim();
      if (forceMajor) {
        const forceAll = forceMajor.toLowerCase() === 'true' || forceMajor === '1';
        for (const stream of merged) {
          if (forceAll || stream.videoId === forceMajor) {
            stream.isMajorEvent = true;
          }
        }
      }

      logger.info('[LivestreamDetector] Combined detection complete', {
        youtube: youtubeStreams.length,
        launchWebcasts: launchStreams.length,
        x: xStreams.length,
        total: merged.length,
        majorEvent: merged.some((s) => s.isMajorEvent),
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
