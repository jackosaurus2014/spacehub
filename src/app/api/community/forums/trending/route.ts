export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

/**
 * GET /api/community/forums/trending
 * Returns top trending forum threads based on a scoring algorithm.
 *
 * Query params:
 *   - limit: number of threads to return (default 10, max 50)
 *   - timeframe: '24h' | '7d' | '30d' (default '7d')
 *
 * Trending score formula:
 *   (upvoteCount * 3) + (viewCount * 0.1) + (postCount * 5) - (ageInHours * 0.5)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate limit
    const limitParam = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 10 : limitParam), 50);

    // Parse and validate timeframe
    const timeframeParam = searchParams.get('timeframe') || '7d';
    const validTimeframes = ['24h', '7d', '30d'] as const;
    const timeframe = validTimeframes.includes(timeframeParam as any)
      ? (timeframeParam as typeof validTimeframes[number])
      : '7d';

    // Calculate cutoff date based on timeframe
    const now = new Date();
    const hoursMap: Record<string, number> = {
      '24h': 24,
      '7d': 168,
      '30d': 720,
    };
    const cutoffHours = hoursMap[timeframe];
    const cutoffDate = new Date(now.getTime() - cutoffHours * 60 * 60 * 1000);

    // Fetch threads created within the timeframe
    const threads = await (prisma as any).forumThread.findMany({
      where: {
        createdAt: { gte: cutoffDate },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            reputation: true,
          },
        },
        category: {
          select: {
            slug: true,
            name: true,
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      // Fetch more than the limit so we can sort by score
      take: limit * 5,
    });

    // Calculate trending score for each thread
    const scoredThreads = threads.map((thread: any) => {
      const ageInHours =
        (now.getTime() - new Date(thread.createdAt).getTime()) / (1000 * 60 * 60);
      const postCount = thread._count?.posts || 0;

      const score =
        (thread.upvoteCount || 0) * 3 +
        (thread.viewCount || 0) * 0.1 +
        postCount * 5 -
        ageInHours * 0.5;

      return {
        id: thread.id,
        title: thread.title,
        slug: thread.category?.slug || '',
        categoryName: thread.category?.name || '',
        score: Math.round(score * 100) / 100,
        upvoteCount: thread.upvoteCount || 0,
        downvoteCount: thread.downvoteCount || 0,
        viewCount: thread.viewCount || 0,
        postCount,
        authorName: thread.author?.name || 'Anonymous',
        authorReputation: (thread.author as any)?.reputation ?? 0,
        tags: thread.tags || [],
        isPinned: thread.isPinned || false,
        acceptedPostId: thread.acceptedPostId || null,
        createdAt: thread.createdAt,
      };
    });

    // Sort by score descending and take the top N
    scoredThreads.sort((a: any, b: any) => b.score - a.score);
    const topThreads = scoredThreads.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        threads: topThreads,
        timeframe,
        limit,
        total: topThreads.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching trending threads', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch trending threads');
  }
}
