export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getDebrisOverview,
  getConjunctionEvents,
  getNotableDebris,
} from '@/lib/debris-data';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get('riskLevel') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');

    const [overview, conjunctions, notableDebris] = await Promise.all([
      getDebrisOverview(),
      getConjunctionEvents({ riskLevel: riskLevel as any, limit }),
      getNotableDebris(limit),
    ]);

    return NextResponse.json({
      overview,
      conjunctions,
      notableDebris,
    });
  } catch (error) {
    logger.error('Failed to fetch debris monitor data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch debris monitor data' },
      { status: 500 }
    );
  }
}
