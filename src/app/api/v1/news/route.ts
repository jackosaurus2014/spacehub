import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import { getNewsArticles } from '@/lib/news-fetcher';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/news
 * Public API: Fetch space news articles.
 *
 * Params: limit, offset, category, search
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const { articles, total } = await getNewsArticles({
      category,
      limit,
      offset,
    });

    const response = NextResponse.json({
      success: true,
      data: articles,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/news error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch news');
  }
}
