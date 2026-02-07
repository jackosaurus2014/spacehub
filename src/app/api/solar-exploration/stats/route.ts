import { NextResponse } from 'next/server';
import { getSolarExplorationStats } from '@/lib/solar-exploration-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getSolarExplorationStats();
    return NextResponse.json({ stats });
  } catch (error) {
    logger.error('Failed to fetch solar exploration stats', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
