import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { initializeOpportunities } from '@/lib/opportunities-data';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const result = await initializeOpportunities();
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to initialize opportunities', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize opportunities' },
      { status: 500 }
    );
  }
}
