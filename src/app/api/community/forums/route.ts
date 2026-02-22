import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/forums
 * List forum categories with thread count and latest thread info
 */
export async function GET() {
  try {
    const categories = await (prisma as any).forumCategory.findMany({
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
      latestThread: cat.threads[0] || null,
    }));

    return NextResponse.json({
      success: true,
      data: { categories: data },
    });
  } catch (error) {
    logger.error('Error fetching forum categories', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch forum categories');
  }
}
