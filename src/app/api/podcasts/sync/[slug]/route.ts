import { NextRequest, NextResponse } from 'next/server';
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
import { syncPodcastFeed } from '@/lib/podcast-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/podcasts/sync/[slug]
 *
 * Admin-only. Fetches the podcast's RSS feed and upserts its episodes
 * (most recent 50). Transcript generation is intentionally skipped for
 * v1 — leaves PodcastTranscript rows unset.
 *
 * Sync logic lives in src/lib/podcast-sync.ts (shared with the
 * /api/cron/podcasts-sync scheduled job and scripts/seed-podcasts.ts).
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

    const result = await syncPodcastFeed(podcast);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch RSS feed',
          detail: result.error,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      slug: result.slug,
      itemsSeen: result.itemsSeen,
      upserted: result.upserted,
      skipped: result.skipped,
      totalEpisodes: result.totalEpisodes,
    });
  } catch (error) {
    logger.error('[Podcasts API] Sync failed', {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Sync failed');
  }
}
