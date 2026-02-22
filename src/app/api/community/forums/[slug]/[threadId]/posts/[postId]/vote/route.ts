export const dynamic = 'force-dynamic';

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
} from '@/lib/errors';
import { validateBody, voteSchema } from '@/lib/validations';

/**
 * POST /api/community/forums/[slug]/[threadId]/posts/[postId]/vote
 * Upvote or downvote a post. Toggle off if same vote exists.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug, threadId, postId } = await params;
    const body = await request.json();
    const validation = validateBody(voteSchema, body);

    if (!validation.success) {
      return validationError('Invalid vote data', validation.errors);
    }

    const { value } = validation.data;
    const userId = session.user.id;

    // Verify post exists and belongs to the thread
    const post = await (prisma as any).forumPost.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true },
    });

    if (!post) {
      return notFoundError('Post not found');
    }

    if (post.threadId !== threadId) {
      return notFoundError('Post does not belong to this thread');
    }

    // Check for existing vote
    const existingVote = await (prisma as any).postVote.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    let userVote: number | null = value;

    if (existingVote) {
      if (existingVote.value === value) {
        // Same vote value -- toggle off (remove vote)
        await (prisma as any).postVote.delete({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
        });
        userVote = null;
      } else {
        // Different vote value -- update
        await (prisma as any).postVote.update({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
          data: { value },
        });
      }
    } else {
      // No existing vote -- create
      await (prisma as any).postVote.create({
        data: {
          postId,
          userId,
          value,
        },
      });
    }

    // Recalculate vote counts
    const upvoteCount = await (prisma as any).postVote.count({
      where: { postId, value: 1 },
    });

    const downvoteCount = await (prisma as any).postVote.count({
      where: { postId, value: -1 },
    });

    // Update post with new counts
    await (prisma as any).forumPost.update({
      where: { id: postId },
      data: { upvoteCount, downvoteCount } as any,
    });

    logger.info('Post vote recorded', {
      postId,
      threadId,
      userId,
      vote: userVote,
      upvoteCount,
      downvoteCount,
    });

    return NextResponse.json({
      success: true,
      userVote,
      upvoteCount,
      downvoteCount,
    });
  } catch (error) {
    logger.error('Error voting on post', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to vote on post');
  }
}
