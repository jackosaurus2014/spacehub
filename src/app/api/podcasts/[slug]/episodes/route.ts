import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/podcasts/[slug]/episodes?limit=&offset=
 * Paginated list of episodes for a podcast, newest first.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const slug = params.slug;
    const { searchParams } = new URL(req.url);

    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);

    const podcast = await prisma.podcast.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!podcast) return notFoundError('Podcast');

    const [episodes, total] = await Promise.all([
      prisma.podcastEpisode.findMany({
        where: { podcastId: podcast.id },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
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
        },
      }),
      prisma.podcastEpisode.count({ where: { podcastId: podcast.id } }),
    ]);

    return NextResponse.json({
      episodes,
      total,
      limit,
      offset,
      hasMore: offset + episodes.length < total,
    });
  } catch (error) {
    logger.error('[Podcasts API] Episode list failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load episodes');
  }
}
