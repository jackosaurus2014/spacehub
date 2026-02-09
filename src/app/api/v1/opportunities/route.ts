import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import { getOpportunities } from '@/lib/opportunities-data';
import { constrainPagination, constrainOffset, internalError, forbiddenError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/opportunities
 * Public API: Fetch business opportunities.
 * Enterprise tier only.
 *
 * Params: limit, offset, type, category, sector
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return auth.response;
  }

  // Enterprise-only endpoint
  if (auth.apiKey.tier !== 'enterprise') {
    return forbiddenError(
      'The opportunities endpoint requires an Enterprise API tier. Please upgrade your plan.'
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const sector = searchParams.get('sector') || undefined;

    const result = await getOpportunities({
      type,
      category,
      sector,
      limit,
      offset,
    });

    const response = NextResponse.json({
      success: true,
      data: result.opportunities || [],
      pagination: {
        limit,
        offset,
        total: result.total || 0,
      },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/opportunities error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch opportunities');
  }
}
