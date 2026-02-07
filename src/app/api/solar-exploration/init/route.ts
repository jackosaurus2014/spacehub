import { NextResponse } from 'next/server';
import { initializeSolarExplorationData } from '@/lib/solar-exploration-data';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const results = await initializeSolarExplorationData();
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('Failed to initialize solar exploration data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize data' },
      { status: 500 }
    );
  }
}
