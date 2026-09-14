import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError, constrainPagination } from '@/lib/errors';
import {
  parseSearchQuery,
  rankThreads,
  buildSearchWhere,
  searchExcerpt,
  MAX_QUERY_LENGTH,
} from '@/lib/forum-search';
import { getAnchorsForThreads } from '@/lib/forum-anchors';

export const dynamic = 'force-dynamic';

/** Rows pulled as search candidates before ranking. */
const CANDIDATE_LIMIT = 300;

/**
 * GET /api/forums/search?q=...&category=<slug>&limit=20
 *
 * Search within the forum. Public — reading a forum should not need an
 * account, and search is how a visitor arriving from Google finds the thread
 * they actually wanted.
 *
 * Read-only and unauthenticated, so it selects no author email and no user
 * fields beyond a display name. The thread GET route carries a comment about
 * exactly this leak; the same rule holds here.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get('q') || '').trim();

    if (!raw) {
      return NextResponse.json({
        success: true,
        data: { query: '', terms: [], results: [], total: 0 },
      });
    }

    if (raw.length > MAX_QUERY_LENGTH) {
      return validationError(`Search queries are limited to ${MAX_QUERY_LENGTH} characters`);
    }

    const terms = parseSearchQuery(raw);
    if (terms.length === 0) {
      return NextResponse.json({
        success: true,
        data: { query: raw, terms: [], results: [], total: 0 },
      });
    }

    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20', 10), 50);
    const categorySlug = searchParams.get('category');

    let categoryId: string | undefined;
    if (categorySlug) {
      const cat = await prisma.forumCategory.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      // An unknown category filter narrows to nothing rather than silently
      // searching the whole forum — a filtered search that quietly ignores
      // its filter is worse than an empty result.
      if (!cat) {
        return NextResponse.json({
          success: true,
          data: { query: raw, terms, results: [], total: 0 },
        });
      }
      categoryId = cat.id;
    }

    const candidates = await prisma.forumThread.findMany({
      where: buildSearchWhere(terms, categoryId) as never,
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        upvoteCount: true,
        createdAt: true,
        updatedAt: true,
        viewCount: true,
        isPinned: true,
        isLocked: true,
        author: { select: { id: true, name: true } },
        category: { select: { slug: true, name: true } },
        _count: { select: { posts: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: CANDIDATE_LIMIT,
    });

    const ranked = rankThreads(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candidates.map((t: any) => ({ ...t, postCount: t._count.posts })),
      terms,
      limit
    );

    const anchors = await getAnchorsForThreads(ranked.map((r) => r.thread.id));

    const results = ranked.map(({ thread, score }) => {
      const anchor = anchors.get(thread.id);
      return {
        id: thread.id,
        title: thread.title,
        excerpt: searchExcerpt(thread.content, terms),
        categorySlug: thread.category.slug,
        categoryName: thread.category.name,
        authorName: thread.author?.name || 'Unknown',
        postCount: thread.postCount,
        viewCount: thread.viewCount,
        upvoteCount: thread.upvoteCount,
        tags: thread.tags,
        isPinned: thread.isPinned,
        isLocked: thread.isLocked,
        updatedAt: thread.updatedAt,
        createdAt: thread.createdAt,
        url: `/community/forums/${thread.category.slug}/${thread.id}`,
        anchor: anchor
          ? {
              anchorType: anchor.anchorType,
              subjectTitle: anchor.subjectTitle,
              subjectUrl: anchor.retiredAt ? null : anchor.subjectUrl,
            }
          : null,
        // Exposed so the UI can show "best match" ordering honestly rather
        // than implying these are sorted by date.
        score: Math.round(score * 10) / 10,
      };
    });

    return NextResponse.json(
      { success: true, data: { query: raw, terms, results, total: results.length } },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (error) {
    logger.error('Forum search failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Search is temporarily unavailable');
  }
}
