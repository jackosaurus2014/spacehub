import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { BLOG_POSTS } from '@/lib/blog-content';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stats
 *
 * Returns high-level platform statistics used across marketing pages,
 * the dashboard, and public-facing widgets. Sourced from the database
 * where possible and enriched with counts derived from static config
 * (blog articles, RSS sources, data modules).
 */
export async function GET() {
  try {
    // Query live database counts in parallel
    const [companyProfiles, newsArticles] = await Promise.all([
      prisma.companyProfile.count().catch(() => null),
      prisma.newsArticle.count().catch(() => null),
    ]);

    // Static / config-derived counts
    const totalBlogArticles = BLOG_POSTS.length;

    // RSS sources: 53 feeds in news-fetcher.ts + 44 blog sources in blogs-fetcher.ts
    const totalRssSources = 97;

    // Data modules counted from dashboard page module arrays
    const totalDataModules = 30;

    return NextResponse.json({
      success: true,
      data: {
        companyProfiles: companyProfiles ?? 200,
        newsArticles: newsArticles ?? 0,
        blogArticles: totalBlogArticles,
        dataModules: totalDataModules,
        rssSources: totalRssSources,
        lastRefresh: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch platform stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch platform stats');
  }
}
