import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  validationError,
  notFoundError,
  internalError,
  constrainPagination,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/forums/[slug]
 * List threads in a forum category (pinned first, then by sort)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = constrainPagination(
      parseInt(searchParams.get('limit') || '20', 10),
      50
    );
    const sort = searchParams.get('sort') || 'newest'; // newest | popular
    const skip = (page - 1) * limit;

    // Find the category
    const category = await (prisma as any).forumCategory.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, description: true, icon: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Build sort order: pinned first, then by chosen sort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any[] = [{ isPinned: 'desc' }];
    if (sort === 'popular') {
      orderBy.push({ viewCount: 'desc' });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const where = { categoryId: category.id };

    const [threads, total] = await Promise.all([
      (prisma as any).forumThread.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true },
          },
          _count: {
            select: { posts: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      (prisma as any).forumThread.count({ where }),
    ]);

    // Transform to include postCount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threadsData = threads.map((t: any) => ({
      id: t.id,
      title: t.title,
      content: t.content,
      author: t.author,
      isPinned: t.isPinned,
      isLocked: t.isLocked,
      viewCount: t.viewCount,
      postCount: t._count.posts,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        category,
        threads: threadsData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching forum threads', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch forum threads');
  }
}

/**
 * POST /api/community/forums/[slug]
 * Create a new thread in a forum category
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug } = params;

    // Find the category
    const category = await (prisma as any).forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    const body = await req.json();
    const { title, content } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return validationError('Thread title is required');
    }

    if (title.trim().length > 200) {
      return validationError('Thread title must be 200 characters or less');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return validationError('Thread content is required');
    }

    if (content.length > 10000) {
      return validationError('Thread content must be 10000 characters or less');
    }

    const thread = await (prisma as any).forumThread.create({
      data: {
        categoryId: category.id,
        authorId: session.user.id,
        title: title.trim(),
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    logger.info('Forum thread created', {
      threadId: thread.id,
      categorySlug: slug,
      authorId: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: thread.id,
          title: thread.title,
          content: thread.content,
          author: thread.author,
          isPinned: thread.isPinned,
          isLocked: thread.isLocked,
          viewCount: thread.viewCount,
          postCount: thread._count.posts,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating forum thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create forum thread');
  }
}
