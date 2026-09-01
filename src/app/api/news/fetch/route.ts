import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecretOrAdmin } from '@/lib/api-auth';
import { fetchSpaceflightNews, tagRecentArticlesWithCompanies } from '@/lib/news-fetcher';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'news:fetch-result';

/**
 * POST /api/news/fetch — ingest Spaceflight News into the DB.
 * Auth: Bearer CRON_SECRET (scheduler) OR an admin session (manual refresh).
 * The middleware cronPaths list only exempts CSRF; it does not authenticate.
 */
export async function POST(request: NextRequest) {
  const auth = await requireCronSecretOrAdmin(request);
  if (auth) return auth;

  try {
    const count = await fetchSpaceflightNews();

    // Tag newly fetched articles with company profiles (best-effort)
    try {
      const tagged = await tagRecentArticlesWithCompanies(count || 200);
      logger.info(`[News] Tagged ${tagged} articles with company profiles`);
    } catch (tagError) {
      logger.warn('[News] Company tagging failed', { error: String(tagError) });
    }

    const responseData = {
      success: true,
      message: `Fetched and saved ${count} articles`,
      source: 'live' as const,
      timestamp: new Date().toISOString(),
    };

    // Cache the successful result
    apiCache.set(CACHE_KEY, responseData, CacheTTL.NEWS);

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('Error fetching news', { error: error instanceof Error ? error.message : String(error) });

    // Try to return cached result
    const cached = apiCache.getStale<{
      success: boolean;
      message: string;
      source: string;
      timestamp: string;
    }>(CACHE_KEY);

    if (cached) {
      logger.info(`[News] Serving cached fetch result (stale: ${cached.isStale})`);
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
        warning: 'External news sources are temporarily unavailable. Showing previously fetched data.',
      });
    }

    // No cache -- return graceful fallback instead of 500
    return NextResponse.json({
      success: false,
      message: 'External news sources are temporarily unavailable. Previously saved articles are still available via GET /api/news.',
      source: 'fallback',
      articlesUpdated: 0,
      timestamp: new Date().toISOString(),
    });
  }
}
