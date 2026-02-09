import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import { getSpaceWeatherSummary } from '@/lib/noaa-fetcher';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/space-weather
 * Public API: Fetch space weather data (solar activity, forecasts).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const summary = await getSpaceWeatherSummary();

    const response = NextResponse.json({
      success: true,
      data: summary,
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/space-weather error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch space weather data');
  }
}
