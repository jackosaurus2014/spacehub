import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getResourceStats } from '@/lib/resources-data';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const stats = await getResourceStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to fetch resource stats', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch resource stats' },
      { status: 500 }
    );
  }
}
