import { NextRequest, NextResponse } from 'next/server';
import {
  getCelestialDestinations,
  getUpcomingWindows,
  getLaunchWindowStats,
} from '@/lib/launch-windows-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get('destination') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');

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
    console.error('Failed to fetch launch window data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch launch window data' },
      { status: 500 }
    );
  }
}
