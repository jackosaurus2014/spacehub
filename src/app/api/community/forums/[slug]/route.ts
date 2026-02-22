import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkUserBanStatus } from '@/lib/moderation';
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
    const sort = searchParams.get('sort') || 'newest'; // newest | popular | top
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
    } else if (sort === 'top') {
      orderBy.push({ upvoteCount: 'desc' });
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

    // Transform to include postCount, tags, vote counts
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
      tags: t.tags || [],
      acceptedPostId: t.acceptedPostId || null,
      upvoteCount: t.upvoteCount || 0,
      downvoteCount: t.downvoteCount || 0,
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

    // Check if user is banned or muted
    const banStatus = await checkUserBanStatus(session.user.id);
    if (banStatus.isBanned) {
      return NextResponse.json(
        { error: 'Your account has been suspended' + (banStatus.banReason ? `: ${banStatus.banReason}` : '') },
        { status: 403 }
      );
    }
    if (banStatus.isMuted) {
      return NextResponse.json(
        { error: 'Your account has been temporarily muted. You cannot create new content at this time.' },
        { status: 403 }
      );
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
    const { title, content, tags } = body;

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

    // Validate tags if provided (max 5, must be from allowed list)
    const validTags = Array.isArray(tags) ? tags.filter((t: string) => typeof t === 'string').slice(0, 5) : [];

    const thread = await (prisma as any).forumThread.create({
      data: {
        categoryId: category.id,
        authorId: session.user.id,
        title: title.trim(),
        content: content.trim(),
        tags: validTags,
      } as any,
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

    // Auto-subscribe the thread author
    (prisma as any).threadSubscription
      .create({ data: { userId: session.user.id, threadId: thread.id } })
      .catch(() => {});

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
          tags: thread.tags || [],
          acceptedPostId: null,
          upvoteCount: 0,
          downvoteCount: 0,
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
