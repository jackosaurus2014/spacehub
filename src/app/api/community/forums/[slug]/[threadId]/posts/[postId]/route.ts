export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
  internalError,
} from '@/lib/errors';
import { validateBody, editContentSchema } from '@/lib/validations';

/**
 * PATCH /api/community/forums/[slug]/[threadId]/posts/[postId]
 * Edit a forum post (author or admin)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug, threadId, postId } = await params;

    const body = await req.json();
    const validation = validateBody(editContentSchema, body);
    if (!validation.success) {
      return validationError('Invalid content', validation.errors);
    }

    const { content } = validation.data;

    // Verify category exists
    const category = await (prisma as any).forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Find the post and verify it belongs to this thread
    const post = await (prisma as any).forumPost.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true, authorId: true },
    });

    if (!post || post.threadId !== threadId) {
      return notFoundError('Forum post');
    }

    // Verify the thread belongs to this category
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, categoryId: true },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    // Check authorization: must be author or admin
    if (post.authorId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You can only edit your own posts');
    }

    // Update the post
    const updatedPost = await (prisma as any).forumPost.update({
      where: { id: postId },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logger.info('Forum post edited', {
      postId,
      threadId,
      editedBy: session.user.id,
      isAdminEdit: post.authorId !== session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: updatedPost,
    });
  } catch (error) {
    logger.error('Error editing forum post', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to edit forum post');
  }
}

/**
 * DELETE /api/community/forums/[slug]/[threadId]/posts/[postId]
 * Delete a forum post (author or admin)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug, threadId, postId } = await params;

    // Verify category exists
    const category = await (prisma as any).forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Find the post
    const post = await (prisma as any).forumPost.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true, authorId: true },
    });

    if (!post || post.threadId !== threadId) {
      return notFoundError('Forum post');
    }

    // Verify the thread belongs to this category
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, categoryId: true },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    // Check authorization: must be author or admin
    if (post.authorId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You can only delete your own posts');
    }

    // If admin deleting someone else's post, log moderation action
    if (session.user.isAdmin && post.authorId !== session.user.id) {
      await (prisma as any).moderationAction.create({
        data: {
          moderatorId: session.user.id,
          targetUserId: post.authorId,
          action: 'delete_content',
          reason: 'Admin deleted forum post',
          contentType: 'post',
          contentId: postId,
        },
      });
    }

    // Delete the post
    await (prisma as any).forumPost.delete({
      where: { id: postId },
    });

    logger.info('Forum post deleted', {
      postId,
      threadId,
      deletedBy: session.user.id,
      isAdminDelete: post.authorId !== session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting forum post', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete forum post');
  }
}
