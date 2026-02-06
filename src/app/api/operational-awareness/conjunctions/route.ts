export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getConjunctionEvents, getConjunctionCounts, AlertLevel, ConjunctionStatus } from '@/lib/operational-awareness-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertLevel = searchParams.get('alertLevel') as AlertLevel | null;
    const status = searchParams.get('status') as ConjunctionStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeCounts = searchParams.get('includeCounts') === 'true';

    const [events, counts] = await Promise.all([
      getConjunctionEvents({
        alertLevel: alertLevel || undefined,
        status: status || undefined,
        limit,
      }),
      includeCounts ? getConjunctionCounts() : null,
    ]);

    return NextResponse.json({
      events,
      counts: counts || undefined,
      total: events.length,
    });
  } catch (error) {
    console.error('Failed to fetch conjunction events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conjunction events' },
      { status: 500 }
    );
  }
}
