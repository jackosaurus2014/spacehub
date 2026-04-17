import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import { MARKET_SEGMENTS } from '@/lib/market-sizing-data';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/market-sizing
 * Public API: Fetch space industry market sizing data.
 *
 * Params: segment (optional, filter by segment ID)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get('segment') || undefined;

    let data = MARKET_SEGMENTS;

    if (segment) {
      data = MARKET_SEGMENTS.filter((s) => s.id === segment);
    }

    const response = NextResponse.json({
      success: true,
      data,
      total: data.length,
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/market-sizing error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch market sizing data');
  }
}
