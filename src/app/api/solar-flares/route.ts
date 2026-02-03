import { NextRequest, NextResponse } from 'next/server';
import {
  getRecentSolarFlares,
  getSolarForecasts,
  getCurrentSolarActivity,
  getSolarFlareStats,
} from '@/lib/solar-flare-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');
    const days = parseInt(searchParams.get('days') || '90');

    if (type === 'flares') {
      const flares = await getRecentSolarFlares(limit);
      return NextResponse.json({ flares });
    }

    if (type === 'forecasts') {
      const forecasts = await getSolarForecasts(days);
      return NextResponse.json({ forecasts });
    }

    if (type === 'activity') {
      const activity = await getCurrentSolarActivity();
      return NextResponse.json({ activity });
    }

    if (type === 'stats') {
      const stats = await getSolarFlareStats();
      return NextResponse.json({ stats });
    }

    // Return all data for dashboard
    const [flares, forecasts, activity, stats] = await Promise.all([
      getRecentSolarFlares(5),
      getSolarForecasts(90),
      getCurrentSolarActivity(),
      getSolarFlareStats(),
    ]);

    return NextResponse.json({
      flares,
      forecasts,
      activity,
      stats,
    });
  } catch (error) {
    console.error('Failed to fetch solar flare data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch solar flare data' },
      { status: 500 }
    );
  }
}
