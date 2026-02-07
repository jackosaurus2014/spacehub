import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getOpportunityStats } from '@/lib/opportunities-data';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const stats = await getOpportunityStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to fetch opportunity stats', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch opportunity stats' },
      { status: 500 }
    );
  }
}
