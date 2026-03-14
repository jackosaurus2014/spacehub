/**
 * Podcast Feed Aggregator
 *
 * Fetches and normalizes episodes from a curated list of space-industry
 * podcast RSS feeds using rss-parser. Results are cached in-memory for
 * 5 minutes via the shared api-cache.
 */

import RSSParser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import { withCache, CACHE_TTL } from './api-cache';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PodcastFeed {
  name: string;
  url: string;
}

export interface PodcastEpisode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string | null;
  duration: string | null;
  podcastName: string;
  link: string | null;
}

// ---------------------------------------------------------------------------
// Feed list
// ---------------------------------------------------------------------------

export const PODCAST_FEEDS: PodcastFeed[] = [
  { name: 'Main Engine Cut Off', url: 'https://feeds.simplecast.com/7y1CbAbN' },
  { name: 'Houston We Have a Podcast', url: 'https://www.nasa.gov/feeds/houston-we-have-a-podcast/' },
  { name: 'This Week in Space', url: 'https://feeds.twit.tv/twis.xml' },
  { name: 'T-Minus Daily Space', url: 'https://feeds.megaphone.fm/tminus' },
  {
    name: 'Planetary Radio',
    url: 'https://www.omnycontent.com/d/playlist/d95da206-8ee8-4ba5-ba8d-ad1200b4e5a4/cf13d5f5-6040-458d-ab5a-ad200189747d/b75c9f7f-4a63-438e-b506-ad2001897499/podcast.rss',
  },
];

// ---------------------------------------------------------------------------
// Parser setup
// ---------------------------------------------------------------------------

const parser = new RSSParser({
  timeout: 15_000,
  headers: {
    'User-Agent': 'SpaceNexus/1.0 (Space Industry Podcast Aggregator)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
  customFields: {
    item: [['itunes:duration', 'itunesDuration']],
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAudioUrl(item: RSSParser.Item & Record<string, unknown>): string | null {
  // Check enclosure (standard for podcasts)
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  // Check media:content
  const media = item['media:content'] as { $?: { url?: string } } | undefined;
  if (media?.$?.url) {
    return media.$.url;
  }

  return null;
}

function extractDuration(item: RSSParser.Item & Record<string, unknown>): string | null {
  const raw = item.itunesDuration as string | undefined;
  if (raw) return raw;

  // Some feeds use itunes:duration directly
  const itunes = item['itunes:duration'] as string | undefined;
  if (itunes) return itunes;

  return null;
}

async function fetchSingleFeed(feed: PodcastFeed): Promise<PodcastEpisode[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items || []).slice(0, 10); // Latest 10 per feed

    return items
      .filter((item) => item.title)
      .map((item) => {
        const rawDescription =
          item.contentSnippet || item.content || item.summary || '';
        const description = sanitizeHtml(rawDescription, {
          allowedTags: [],
          allowedAttributes: {},
        })
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 400);

        return {
          title: item.title!,
          description,
          pubDate: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          audioUrl: extractAudioUrl(item as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          duration: extractDuration(item as any),
          podcastName: feed.name,
          link: item.link || null,
        };
      });
  } catch (error) {
    logger.warn(`[Podcasts] Failed to fetch feed: ${feed.name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the latest episodes from all configured podcast feeds.
 *
 * Episodes are sorted by publication date (newest first) and cached
 * for 5 minutes via the shared in-memory api-cache.
 */
export async function fetchPodcasts(): Promise<PodcastEpisode[]> {
  return withCache<PodcastEpisode[]>(
    'podcasts:all',
    async () => {
      logger.info('[Podcasts] Fetching podcast feeds');

      const results = await Promise.all(
        PODCAST_FEEDS.map((feed) => fetchSingleFeed(feed)),
      );

      const allEpisodes = results.flat();

      // Sort by date descending
      allEpisodes.sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      );

      logger.info('[Podcasts] Fetched episodes', {
        totalEpisodes: allEpisodes.length,
        feedsSucceeded: results.filter((r) => r.length > 0).length,
        feedsFailed: results.filter((r) => r.length === 0).length,
      });

      return allEpisodes;
    },
    {
      ttlSeconds: CACHE_TTL.FREQUENT, // 5 minutes
      staleWhileRevalidate: true,
      fallbackToStale: true,
    },
  );
}
