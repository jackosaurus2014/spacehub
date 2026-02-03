import { NextResponse } from 'next/server';
import {
  getOrbitalSlots,
  getTopOperators,
  getUpcomingEvents,
  getOrbitalStats,
} from '@/lib/orbital-slots-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [slots, operators, events, stats] = await Promise.all([
      getOrbitalSlots(),
      getTopOperators(8),
      getUpcomingEvents(30),
      getOrbitalStats(),
    ]);

    return NextResponse.json({
      slots,
      operators,
      events,
      stats,
    });
  } catch (error) {
    console.error('Failed to fetch orbital data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orbital data' },
      { status: 500 }
    );
  }
}
