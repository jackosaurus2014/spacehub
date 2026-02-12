import { NextRequest, NextResponse } from 'next/server';
import {
  getCelestialDestinations,
  getUpcomingWindows,
  getLaunchWindowStats,
} from '@/lib/launch-windows-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get('destination') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const [destinations, windows, stats] = await Promise.all([
      getCelestialDestinations(),
      getUpcomingWindows({ destination, limit }),
      getLaunchWindowStats(),
    ]);

    return NextResponse.json({
      destinations,
      windows,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch launch window data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch launch window data' },
      { status: 500 }
    );
  }
}
