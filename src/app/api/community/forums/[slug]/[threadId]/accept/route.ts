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
import { validateBody, acceptAnswerSchema } from '@/lib/validations';
import { createNotification } from '@/lib/notifications-server';

/**
 * POST /api/community/forums/[slug]/[threadId]/accept
 * Mark a post as the accepted answer. Only the thread author can accept.
 * Toggle: if the same post is already accepted, unaccept it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug, threadId } = await params;
    const body = await request.json();
    const validation = validateBody(acceptAnswerSchema, body);

    if (!validation.success) {
      return validationError('Invalid accept answer data', validation.errors);
    }

    const { postId } = validation.data;
    const userId = session.user.id;

    // Verify thread exists and user is the thread author
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, authorId: true, acceptedPostId: true },
    });

    if (!thread) {
      return notFoundError('Thread not found');
    }

    if (thread.authorId !== userId) {
      return forbiddenError('Only the thread author can accept an answer');
    }

    // Verify post exists and belongs to this thread
    const post = await (prisma as any).forumPost.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true, authorId: true },
    });

    if (!post) {
      return notFoundError('Post not found');
    }

    if (post.threadId !== threadId) {
      return notFoundError('Post does not belong to this thread');
    }

    let newAcceptedPostId: string | null;

    if (thread.acceptedPostId === postId) {
      // Toggle off: unaccept the currently accepted post
      await (prisma as any).forumPost.updateMany({
        where: { threadId, isAccepted: true },
        data: { isAccepted: false },
      });

      await (prisma as any).forumThread.update({
        where: { id: threadId },
        data: { acceptedPostId: null } as any,
      });

      newAcceptedPostId = null;

      logger.info('Accepted answer removed', {
        threadId,
        postId,
        userId,
      });
    } else {
      // Clear any previously accepted post
      await (prisma as any).forumPost.updateMany({
        where: { threadId, isAccepted: true },
        data: { isAccepted: false },
      });

      // Mark the new post as accepted
      await (prisma as any).forumPost.update({
        where: { id: postId },
        data: { isAccepted: true } as any,
      });

      // Update thread with accepted post reference
      await (prisma as any).forumThread.update({
        where: { id: threadId },
        data: { acceptedPostId: postId } as any,
      });

      newAcceptedPostId = postId;

      // Notify the post author that their answer was accepted
      await createNotification({
        userId: post.authorId,
        type: 'accepted_answer',
        title: 'Your answer was accepted!',
        message: 'Your reply has been marked as the accepted answer.',
        relatedUserId: userId,
        relatedContentType: 'forum_post',
        relatedContentId: postId,
        linkUrl: "/community/forums/" + slug + "/" + threadId,
      });

      logger.info('Accepted answer set', {
        threadId,
        postId,
        userId,
      });
    }

    return NextResponse.json({
      success: true,
      acceptedPostId: newAcceptedPostId,
    });
  } catch (error) {
    logger.error('Error accepting answer', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to accept answer');
  }
}
