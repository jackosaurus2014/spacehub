export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeOperationalAwarenessData } from '@/lib/operational-awareness-data';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const result = await initializeOperationalAwarenessData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize operational awareness data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize operational awareness data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Also allow GET for easy testing
  try {
    const result = await initializeOperationalAwarenessData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize operational awareness data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize operational awareness data' },
      { status: 500 }
    );
  }
}
