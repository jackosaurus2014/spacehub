export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeDebrisData } from '@/lib/debris-data';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const result = await initializeDebrisData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize debris data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize debris data' },
      { status: 500 }
    );
  }
}
