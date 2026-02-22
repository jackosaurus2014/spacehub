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
  forbiddenError,
  internalError,
} from '@/lib/errors';
import { validateBody, editContentSchema } from '@/lib/validations';

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

/**
 * PATCH /api/community/forums/[slug]/[threadId]
 * Edit a forum thread (author or admin)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string; threadId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug, threadId } = params;

    const body = await req.json();
    const validation = validateBody(editContentSchema, body);
    if (!validation.success) {
      return validationError('Invalid content', validation.errors);
    }

    const { content, title } = validation.data;

    // Verify category exists
    const category = await (prisma as any).forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Find thread and verify it belongs to this category
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, categoryId: true, authorId: true },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    // Check authorization: must be author or admin
    if (thread.authorId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You can only edit your own threads');
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (content) updateData.content = content;
    if (title) updateData.title = title;

    if (Object.keys(updateData).length === 0) {
      return validationError('No fields to update');
    }

    const updatedThread = await (prisma as any).forumThread.update({
      where: { id: threadId },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    logger.info('Forum thread edited', {
      threadId,
      editedBy: session.user.id,
      isAdminEdit: thread.authorId !== session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedThread.id,
        title: updatedThread.title,
        content: updatedThread.content,
        author: updatedThread.author,
        isPinned: updatedThread.isPinned,
        isLocked: updatedThread.isLocked,
        viewCount: updatedThread.viewCount,
        postCount: updatedThread._count.posts,
        createdAt: updatedThread.createdAt,
        updatedAt: updatedThread.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error editing forum thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to edit forum thread');
  }
}

/**
 * DELETE /api/community/forums/[slug]/[threadId]
 * Delete a forum thread (author or admin). Cascade deletes all posts.
 */
export async function DELETE(
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

    // Find thread and verify it belongs to this category
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, categoryId: true, authorId: true },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    // Check authorization: must be author or admin
    if (thread.authorId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You can only delete your own threads');
    }

    // If admin deleting someone else's thread, log moderation action
    if (session.user.isAdmin && thread.authorId !== session.user.id) {
      await (prisma as any).moderationAction.create({
        data: {
          moderatorId: session.user.id,
          targetUserId: thread.authorId,
          action: 'delete_content',
          reason: 'Admin deleted forum thread',
          contentType: 'thread',
          contentId: threadId,
        },
      });
    }

    // Delete thread (cascade deletes all posts via Prisma onDelete: Cascade)
    await (prisma as any).forumThread.delete({
      where: { id: threadId },
    });

    logger.info('Forum thread deleted', {
      threadId,
      deletedBy: session.user.id,
      isAdminDelete: thread.authorId !== session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting forum thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete forum thread');
  }
}
