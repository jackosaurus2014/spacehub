import { NextRequest, NextResponse } from 'next/server';
import { fetchPodcasts } from '@/lib/podcast-fetcher';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function fetchAndRespond() {
  const episodes = await fetchPodcasts();

  return NextResponse.json({
    episodes,
    total: episodes.length,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}

export async function GET() {
  try {
    return await fetchAndRespond();
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

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await fetchAndRespond();
  } catch (error) {
    logger.error('[Podcasts API] Cron-triggered fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch podcast episodes' },
      { status: 500 },
    );
  }
}
