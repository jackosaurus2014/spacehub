import { NextResponse } from 'next/server';
import { fetchPodcasts } from '@/lib/podcast-fetcher';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const episodes = await fetchPodcasts();

    return NextResponse.json({
      episodes,
      total: episodes.length,
    });
  } catch (error) {
    logger.error('[Podcasts API] Failed to fetch podcasts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch podcast episodes' },
      { status: 500 },
    );
  }
}
