import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/podcasts/[slug]
 * Returns a single podcast with its 5 most recent episodes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const slug = params.slug;
    const podcast = await prisma.podcast.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        feedUrl: true,
        websiteUrl: true,
        artworkUrl: true,
        author: true,
        category: true,
        language: true,
        episodeCount: true,
        lastFetchedAt: true,
        createdAt: true,
        updatedAt: true,
        episodes: {
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            durationSec: true,
            publishedAt: true,
            episodeNumber: true,
            seasonNumber: true,
          },
        },
      },
    });

    if (!podcast) return notFoundError('Podcast');

    return NextResponse.json({ podcast });
  } catch (error) {
    logger.error('[Podcasts API] Detail failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load podcast');
  }
}
