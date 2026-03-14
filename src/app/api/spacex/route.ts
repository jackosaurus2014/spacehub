import { NextRequest, NextResponse } from 'next/server';
import { fetchSpaceXData } from '@/lib/spacex-fetcher';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function fetchAndRespond() {
  const data = await fetchSpaceXData();

  return NextResponse.json({
    launches: data.launches,
    latestLaunch: data.latestLaunch,
    rockets: data.rockets,
    starlinkCount: data.starlinkCount,
    fetchedAt: data.fetchedAt,
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
    logger.error('[SpaceX API] Failed to fetch SpaceX data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch SpaceX data' },
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
    logger.error('[SpaceX API] Cron-triggered fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch SpaceX data' },
      { status: 500 },
    );
  }
}
