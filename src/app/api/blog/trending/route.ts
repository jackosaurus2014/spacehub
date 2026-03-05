import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withCache, CACHE_TTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/blog/trending
 * Returns the top 2 trending blog post slugs based on view count
 * weighted by recency (time-decay scoring).
 *
 * Score = viewCount * max(0.01, 1 - ageInDays * 0.01)
 *
 * Cached for 5 minutes with stale-while-revalidate.
 */
export async function GET() {
  try {
    const trending = await withCache(
      'blog:trending',
      async () => {
        const views = await prisma.blogPostView.findMany({
          select: {
            slug: true,
            viewCount: true,
            publishedAt: true,
          },
        });

        if (views.length === 0) return [];

        const now = Date.now();
        const scored = views.map((v) => {
          const ageMs = now - new Date(v.publishedAt).getTime();
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          const decay = Math.max(0.01, 1 - ageDays * 0.01);
          return {
            slug: v.slug,
            score: v.viewCount * decay,
          };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 2).map((s) => s.slug);
      },
      { ttlSeconds: CACHE_TTL.FREQUENT, staleWhileRevalidate: true },
    );

    return NextResponse.json({ success: true, slugs: trending });
  } catch (error) {
    logger.error('Blog trending fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return empty array on error — caller falls back to static featured
    return NextResponse.json({ success: true, slugs: [] });
  }
}
