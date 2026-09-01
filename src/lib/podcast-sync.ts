/**
 * Podcast RSS Sync (shared)
 *
 * Fetches a single podcast's RSS feed and upserts its episodes into the
 * PodcastEpisode table, then refreshes the parent Podcast's episodeCount
 * and lastFetchedAt. Extracted from src/app/api/podcasts/sync/[slug]/route.ts
 * so it can be reused by:
 *   - the admin-triggered per-show sync route (POST /api/podcasts/sync/[slug])
 *   - the scheduled cron route (POST /api/cron/podcasts-sync), which syncs
 *     the N stalest podcasts per invocation
 *   - the initial seed script (scripts/seed-podcasts.ts --sync)
 *
 * Transcript generation is intentionally skipped for v1 — leaves
 * PodcastTranscript rows unset.
 */

import RSSParser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateSlug } from '@/lib/marketplace-types';
import { safeFetchText } from '@/lib/security/safe-url';

/**
 * Per-feed network budget. Previously the rss-parser `timeout` option; now
 * enforced by safeFetchText's AbortController across every redirect hop and
 * the body read, so the semantics are unchanged (one 25s deadline per feed).
 */
const FEED_FETCH_TIMEOUT_MS = 25_000;
/** RSS feeds are rarely more than a few MB; anything larger is not a podcast feed. */
const FEED_MAX_BYTES = 10_000_000;

const FEED_REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; SpaceNexus/2.0; +https://spacenexus.us)',
  Accept: 'application/rss+xml, application/xml, text/xml, */*',
};

// The network fetch is done by safeFetchText (SSRF-guarded); rss-parser is
// only used to parse the already-downloaded XML string. Never call
// parser.parseURL() here — feedUrl is user-submitted and parseURL follows
// redirects into whatever the URL resolves to (loopback, cloud metadata...).
const parser = new RSSParser({
  customFields: {
    item: [
      ['itunes:duration', 'itunesDuration'],
      ['itunes:episode', 'itunesEpisode'],
      ['itunes:season', 'itunesSeason'],
    ],
  },
});

function durationToSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseInt(p, 10));
    if (parts.some(Number.isNaN)) return null;
    let secs = 0;
    for (const p of parts) {
      secs = secs * 60 + p;
    }
    return secs;
  }
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) ? null : n;
}

function cleanText(raw: string, max = 4000): string {
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export interface PodcastSyncTarget {
  id: string;
  slug: string;
  name: string;
  feedUrl: string | null;
}

export interface PodcastSyncResult {
  slug: string;
  success: boolean;
  itemsSeen: number;
  upserted: number;
  skipped: number;
  totalEpisodes: number;
  error?: string;
}

/**
 * Fetches `podcast.feedUrl`, upserts its most recent 50 episodes, and
 * updates the parent Podcast's episodeCount + lastFetchedAt. Safe to call
 * repeatedly (idempotent upserts keyed on podcastId+episodeSlug).
 */
export async function syncPodcastFeed(podcast: PodcastSyncTarget): Promise<PodcastSyncResult> {
  if (!podcast.feedUrl) {
    return {
      slug: podcast.slug,
      success: false,
      itemsSeen: 0,
      upserted: 0,
      skipped: 0,
      totalEpisodes: 0,
      error: 'Podcast has no feedUrl configured',
    };
  }

  let parsed: RSSParser.Output<RSSParser.Item>;
  try {
    // safeFetchText validates the URL (scheme, port, host, DNS answers) and
    // every redirect Location before connecting, caps the body size, and
    // applies the per-feed deadline. parseString is pure XML parsing.
    const { text } = await safeFetchText(podcast.feedUrl, {
      timeoutMs: FEED_FETCH_TIMEOUT_MS,
      maxBytes: FEED_MAX_BYTES,
      headers: FEED_REQUEST_HEADERS,
    });
    parsed = await parser.parseString(text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn('[podcast-sync] RSS fetch failed', {
      slug: podcast.slug,
      feedUrl: podcast.feedUrl,
      error: detail,
    });
    return {
      slug: podcast.slug,
      success: false,
      itemsSeen: 0,
      upserted: 0,
      skipped: 0,
      totalEpisodes: 0,
      error: `Failed to fetch RSS feed: ${detail}`,
    };
  }

  const items = (parsed.items || []).slice(0, 50);
  let upserted = 0;
  let skipped = 0;
  const usedSlugs = new Set<string>();

  for (const item of items) {
    if (!item.title) {
      skipped++;
      continue;
    }

    // Build a stable slug — prefer guid, fall back to title
    const guid = (item.guid || (item as { id?: string }).id || '') as string;
    const baseSlug = generateSlug(guid || item.title).slice(0, 80) || 'episode';
    let episodeSlug = baseSlug;
    let suffix = 1;
    while (usedSlugs.has(episodeSlug)) {
      suffix++;
      episodeSlug = `${baseSlug}-${suffix}`;
    }
    usedSlugs.add(episodeSlug);

    const description = cleanText(
      (item.contentSnippet || item.content || item.summary || '') as string,
    );
    const enclosure = item.enclosure as { url?: string } | undefined;
    const audioUrl = enclosure?.url || null;
    const durationRaw = (item as Record<string, unknown>).itunesDuration as string | undefined;
    const durationSec = durationToSeconds(durationRaw);
    const epNumRaw = (item as Record<string, unknown>).itunesEpisode as string | undefined;
    const seasonNumRaw = (item as Record<string, unknown>).itunesSeason as string | undefined;
    const episodeNumber = epNumRaw ? parseInt(epNumRaw, 10) || null : null;
    const seasonNumber = seasonNumRaw ? parseInt(seasonNumRaw, 10) || null : null;

    const publishedAt = item.pubDate ? new Date(item.pubDate) : null;

    try {
      await prisma.podcastEpisode.upsert({
        where: {
          podcastId_slug: { podcastId: podcast.id, slug: episodeSlug },
        },
        create: {
          podcastId: podcast.id,
          slug: episodeSlug,
          title: item.title,
          description,
          audioUrl,
          durationSec,
          publishedAt,
          episodeNumber,
          seasonNumber,
        },
        update: {
          title: item.title,
          description,
          audioUrl,
          durationSec,
          publishedAt,
          episodeNumber,
          seasonNumber,
        },
      });
      upserted++;
    } catch (err) {
      skipped++;
      logger.warn('[podcast-sync] Episode upsert failed', {
        slug: podcast.slug,
        episodeSlug,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Update parent podcast counters
  const totalEpisodes = await prisma.podcastEpisode.count({ where: { podcastId: podcast.id } });
  await prisma.podcast.update({
    where: { id: podcast.id },
    data: {
      episodeCount: totalEpisodes,
      lastFetchedAt: new Date(),
    },
  });

  logger.info('[podcast-sync] Sync complete', {
    slug: podcast.slug,
    itemsSeen: items.length,
    upserted,
    skipped,
    totalEpisodes,
  });

  return {
    slug: podcast.slug,
    success: true,
    itemsSeen: items.length,
    upserted,
    skipped,
    totalEpisodes,
  };
}

/**
 * Selects the N podcasts most in need of a sync: those with feedUrl set,
 * ordered by lastFetchedAt ascending with nulls first (never-synced shows
 * are always the most stale). Pure DB read — no network calls.
 */
export async function getStalestPodcasts(limit: number): Promise<PodcastSyncTarget[]> {
  // Prisma doesn't support "nulls first" via orderBy on all providers uniformly
  // in a single query alongside a normal sort in older client versions, so we
  // split into two queries: never-fetched first, then oldest-fetched, and
  // concatenate up to `limit`.
  const neverFetched = await prisma.podcast.findMany({
    where: { feedUrl: { not: null }, lastFetchedAt: null },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, slug: true, name: true, feedUrl: true },
  });

  if (neverFetched.length >= limit) return neverFetched;

  const remaining = limit - neverFetched.length;
  const stalest = await prisma.podcast.findMany({
    where: { feedUrl: { not: null }, lastFetchedAt: { not: null } },
    orderBy: { lastFetchedAt: 'asc' },
    take: remaining,
    select: { id: true, slug: true, name: true, feedUrl: true },
  });

  return [...neverFetched, ...stalest];
}
