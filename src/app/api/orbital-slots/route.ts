import { NextResponse } from 'next/server';
import {
  getOrbitalSlots,
  getTopOperators,
  getUpcomingEvents,
  getOrbitalStats,
} from '@/lib/orbital-slots-data';
import { logger } from '@/lib/logger';

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
    logger.error('Failed to fetch orbital data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch orbital data' },
      { status: 500 }
    );
  }
}
