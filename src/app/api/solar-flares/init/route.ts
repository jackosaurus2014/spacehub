import { NextResponse } from 'next/server';
import { initializeSolarFlareData } from '@/lib/solar-flare-data';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const results = await initializeSolarFlareData();
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('Failed to initialize solar flare data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize data' },
      { status: 500 }
    );
  }
}
