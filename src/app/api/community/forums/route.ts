import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { FORUM_CATEGORY_SEEDS } from '@/lib/forum-categories';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Default forum categories — auto-seeded if the ForumCategory table is empty.
 */
// Canonical list lives in src/lib/forum-categories.ts. It used to be copied
// into three route files that each asked the next person to keep them in
// sync; the alias keeps the local name while removing the duplicate.
const DEFAULT_FORUM_CATEGORIES = FORUM_CATEGORY_SEEDS;

/**
 * GET /api/community/forums
 * List forum categories with thread count and latest thread info
 */
export async function GET() {
  try {
    let categories = await prisma.forumCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { threads: true },
        },
        threads: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            createdAt: true,
            author: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Auto-seed default categories if table is empty
    if (categories.length === 0) {
      logger.info('Forum categories table empty — auto-seeding default categories');
      for (const cat of DEFAULT_FORUM_CATEGORIES) {
        await prisma.forumCategory.upsert({
          where: { slug: cat.slug },
          update: {},
          create: cat,
        });
      }
      categories = await prisma.forumCategory.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { threads: true } },
          threads: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              title: true,
              createdAt: true,
              author: { select: { id: true, name: true } },
            },
          },
        },
      });
    }

    // Transform response to flatten latest thread
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = categories.map((cat: any) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      threadCount: cat._count.threads,
      latestThread: cat.threads[0]
        ? {
            id: cat.threads[0].id,
            title: cat.threads[0].title,
            authorName: cat.threads[0].author?.name || 'Unknown',
            createdAt: cat.threads[0].createdAt,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: { categories: data },
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (error) {
    logger.error('Error fetching forum categories', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch forum categories');
  }
}
