import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/podcasts/[slug]/[episodeSlug]
 * Returns a single episode + its transcript (if any) + parent podcast meta.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; episodeSlug: string } },
) {
  try {
    const { slug, episodeSlug } = params;

    const podcast = await prisma.podcast.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        artworkUrl: true,
        websiteUrl: true,
        author: true,
      },
    });
    if (!podcast) return notFoundError('Podcast');

    const episode = await prisma.podcastEpisode.findUnique({
      where: { podcastId_slug: { podcastId: podcast.id, slug: episodeSlug } },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        audioUrl: true,
        durationSec: true,
        publishedAt: true,
        episodeNumber: true,
        seasonNumber: true,
        transcript: {
          select: {
            id: true,
            body: true,
            language: true,
            generatedBy: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!episode) return notFoundError('Episode');

    return NextResponse.json({ podcast, episode });
  } catch (error) {
    logger.error('[Podcasts API] Episode detail failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load episode');
  }
}
