import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /podcasts/[slug]/[episodeSlug] a real HTTP 404 for unknown episodes. See
// the SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound()
// alone can't set the status code.
//
// Mirrors the page's own gate exactly:
// src/app/podcasts/[slug]/[episodeSlug]/page.tsx calls notFound() when the
// show is missing OR the episode slug is not under that show — episode
// slugs are only unique per show (PodcastEpisode @@unique([podcastId, slug])).
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string; episodeSlug: string } },
) {
  try {
    const podcast = await prisma.podcast.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!podcast) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    const episode = await prisma.podcastEpisode.findUnique({
      where: { podcastId_slug: { podcastId: podcast.id, slug: params.episodeSlug } },
      select: { id: true },
    });
    if (!episode) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Podcast episode existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
