import { NextResponse } from 'next/server';
import { initializeSpectrumData } from '@/lib/spectrum-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await initializeSpectrumData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize spectrum data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize spectrum data', details: String(error) },
      { status: 500 }
    );
  }
}
