import { NextResponse } from 'next/server';
import { getSpaceWeatherSummary } from '@/lib/noaa-fetcher';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await getSpaceWeatherSummary();
    return NextResponse.json(summary);
  } catch (error) {
    logger.error('Failed to fetch space weather data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch space weather data');
  }
}
