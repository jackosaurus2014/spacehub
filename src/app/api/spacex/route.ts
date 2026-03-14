import { NextResponse } from 'next/server';
import { fetchSpaceXData } from '@/lib/spacex-fetcher';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchSpaceXData();

    return NextResponse.json({
      launches: data.launches,
      latestLaunch: data.latestLaunch,
      rockets: data.rockets,
      starlinkCount: data.starlinkCount,
      fetchedAt: data.fetchedAt,
    });
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
