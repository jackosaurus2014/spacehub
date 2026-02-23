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
import { updateReputation, REPUTATION_POINTS } from '@/lib/reputation';

/**
 * POST /api/community/forums/[slug]/[threadId]/vote
 * Upvote or downvote a thread. Toggle off if same vote exists.
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
    const validation = validateBody(voteSchema, body);

    if (!validation.success) {
      return validationError('Invalid vote data', validation.errors);
    }

    const { value } = validation.data;
    const userId = session.user.id;

    // Verify thread exists
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, authorId: true },
    });

    if (!thread) {
      return notFoundError('Thread not found');
    }

    // Check for existing vote
    const existingVote = await (prisma as any).threadVote.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId,
        },
      },
    });

    let userVote: number | null = value;

    if (existingVote) {
      if (existingVote.value === value) {
        // Same vote value -- toggle off (remove vote)
        await (prisma as any).threadVote.delete({
          where: {
            threadId_userId: {
              threadId,
              userId,
            },
          },
        });
        userVote = null;
      } else {
        // Different vote value -- update
        await (prisma as any).threadVote.update({
          where: {
            threadId_userId: {
              threadId,
              userId,
            },
          },
          data: { value },
        });
      }
    } else {
      // No existing vote -- create
      await (prisma as any).threadVote.create({
        data: {
          threadId,
          userId,
          value,
        },
      });
    }

    // Recalculate vote counts
    const upvoteCount = await (prisma as any).threadVote.count({
      where: { threadId, value: 1 },
    });

    const downvoteCount = await (prisma as any).threadVote.count({
      where: { threadId, value: -1 },
    });

    // Update thread with new counts
    await (prisma as any).forumThread.update({
      where: { id: threadId },
      data: { upvoteCount, downvoteCount } as any,
    });

    // Update thread author's reputation (don't award rep for voting on own thread)
    if (thread.authorId && thread.authorId !== userId) {
      if (existingVote) {
        if (existingVote.value === value) {
          // Vote was toggled off -- reverse the previous vote's reputation effect
          const reversePoints = existingVote.value === 1
            ? -REPUTATION_POINTS.UPVOTE_RECEIVED
            : -REPUTATION_POINTS.DOWNVOTE_RECEIVED;
          await updateReputation(thread.authorId, reversePoints, 'thread_vote_removed');
        } else {
          // Vote was changed (e.g., upvote -> downvote)
          // Reverse old vote and apply new one
          const reverseOld = existingVote.value === 1
            ? -REPUTATION_POINTS.UPVOTE_RECEIVED
            : -REPUTATION_POINTS.DOWNVOTE_RECEIVED;
          const applyNew = value === 1
            ? REPUTATION_POINTS.UPVOTE_RECEIVED
            : REPUTATION_POINTS.DOWNVOTE_RECEIVED;
          await updateReputation(thread.authorId, reverseOld + applyNew, 'thread_vote_changed');
        }
      } else {
        // New vote
        const points = value === 1
          ? REPUTATION_POINTS.UPVOTE_RECEIVED
          : REPUTATION_POINTS.DOWNVOTE_RECEIVED;
        await updateReputation(thread.authorId, points, 'thread_vote_received');
      }
    }

    logger.info('Thread vote recorded', {
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
    logger.error('Error voting on thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to vote on thread');
  }
}
