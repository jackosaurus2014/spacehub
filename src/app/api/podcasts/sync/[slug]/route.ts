import { NextRequest, NextResponse } from 'next/server';
import RSSParser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  validationError,
} from '@/lib/errors';
import { generateSlug } from '@/lib/marketplace-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const parser = new RSSParser({
  timeout: 25_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SpaceNexus/2.0; +https://spacenexus.us)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
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

/**
 * POST /api/podcasts/sync/[slug]
 *
 * Admin-only. Fetches the podcast's RSS feed and upserts its episodes
 * (most recent 50). Transcript generation is intentionally skipped for
 * v1 — leaves PodcastTranscript rows unset.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  // Auth: admin only
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorizedError();
  if (!session.user.isAdmin) return forbiddenError('Admin access required');

  const slug = params.slug;

  try {
    const podcast = await prisma.podcast.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, feedUrl: true },
    });
    if (!podcast) return notFoundError('Podcast');
    if (!podcast.feedUrl) {
      return validationError('Podcast has no feedUrl configured', { feedUrl: 'Required for sync' });
    }

    let parsed: RSSParser.Output<RSSParser.Item>;
    try {
      parsed = await parser.parseURL(podcast.feedUrl);
    } catch (err) {
      logger.warn('[Podcasts API] RSS fetch failed', {
        slug: podcast.slug,
        feedUrl: podcast.feedUrl,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch RSS feed',
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 502 },
      );
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
        logger.warn('[Podcasts API] Episode upsert failed', {
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

    logger.info('[Podcasts API] Sync complete', {
      slug: podcast.slug,
      itemsSeen: items.length,
      upserted,
      skipped,
      totalEpisodes,
    });

    return NextResponse.json({
      success: true,
      slug: podcast.slug,
      itemsSeen: items.length,
      upserted,
      skipped,
      totalEpisodes,
    });
  } catch (error) {
    logger.error('[Podcasts API] Sync failed', {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Sync failed');
  }
}
