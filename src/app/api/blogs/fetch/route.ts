import { NextResponse } from 'next/server';
import { initializeBlogSources, fetchBlogPosts } from '@/lib/blogs-fetcher';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'blogs:fetch-result';

export async function POST() {
  try {
    // First ensure blog sources are initialized
    const sourcesCount = await initializeBlogSources();

    // Then fetch posts from all sources
    const postsCount = await fetchBlogPosts();

    const responseData = {
      success: true,
      message: `Initialized ${sourcesCount} sources and fetched ${postsCount} blog posts`,
      source: 'live' as const,
      timestamp: new Date().toISOString(),
    };

    // Cache the successful result
    apiCache.set(CACHE_KEY, responseData, CacheTTL.DEFAULT);

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('Error fetching blogs', { error: error instanceof Error ? error.message : String(error) });

    // Try to return cached result
    const cached = apiCache.getStale<{
      success: boolean;
      message: string;
      source: string;
      timestamp: string;
    }>(CACHE_KEY);

    if (cached) {
      logger.info(`[Blogs] Serving cached fetch result (stale: ${cached.isStale})`);
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
        warning: 'External blog sources are temporarily unavailable. Showing previously fetched data.',
      });
    }

    // No cache -- return graceful fallback instead of 500
    return NextResponse.json({
      success: false,
      message: 'External blog sources are temporarily unavailable. Previously saved posts are still available via GET /api/blogs.',
      source: 'fallback',
      postsUpdated: 0,
      timestamp: new Date().toISOString(),
    });
  }
}
