import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/forums/[slug]/[threadId]
 * Get thread details with all posts, increment viewCount
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; threadId: string } }
) {
  try {
    const { slug, threadId } = params;

    // Verify category exists
    const category = await (prisma as any).forumCategory.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Fetch thread with posts
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        posts: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    // Increment view count (fire and forget)
    (prisma as any).forumThread
      .update({
        where: { id: threadId },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err: Error) => {
        logger.error('Failed to increment view count', {
          threadId,
          error: err.message,
        });
      });

    return NextResponse.json({
      success: true,
      data: {
        thread: {
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
        posts: thread.posts,
        category,
      },
    });
  } catch (error) {
    logger.error('Error fetching forum thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch forum thread');
  }
}

/**
 * POST /api/community/forums/[slug]/[threadId]
 * Reply to a thread (create a ForumPost)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; threadId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug, threadId } = params;

    // Verify category exists
    const category = await (prisma as any).forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Fetch thread to verify it exists and check locked status
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, categoryId: true, isLocked: true },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    if (thread.isLocked) {
      return forbiddenError('This thread is locked and cannot receive new replies');
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return validationError('Reply content is required');
    }

    if (content.length > 10000) {
      return validationError('Reply content must be 10000 characters or less');
    }

    // Create the post and update thread's updatedAt in a transaction
    const [post] = await (prisma as any).$transaction([
      (prisma as any).forumPost.create({
        data: {
          threadId,
          authorId: session.user.id,
          content: content.trim(),
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      (prisma as any).forumThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      }),
    ]);

    logger.info('Forum post created', {
      postId: post.id,
      threadId,
      authorId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: post },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating forum post', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create reply');
  }
}
