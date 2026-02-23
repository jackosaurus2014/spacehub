/**
 * Community Reputation / Karma System
 *
 * Tracks user reputation points based on forum activity.
 * Points are awarded for creating threads, posts, receiving upvotes,
 * having answers accepted, etc.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// Point values for each reputation-earning action
export const REPUTATION_POINTS = {
  THREAD_CREATED: 5,
  POST_CREATED: 2,
  UPVOTE_RECEIVED: 10,
  DOWNVOTE_RECEIVED: -2,
  ACCEPTED_ANSWER: 25,
  ACCEPTED_ANSWER_REVOKED: -25,
} as const;

// Reputation levels with thresholds, labels, colors, and badge icons
export const REPUTATION_LEVELS = [
  { min: 0, label: 'Novice', color: 'text-gray-400', badge: '\u{1F311}' },         // New Moon
  { min: 50, label: 'Contributor', color: 'text-blue-400', badge: '\u{1F312}' },    // Waxing Crescent
  { min: 200, label: 'Active Member', color: 'text-green-400', badge: '\u{1F313}' },// First Quarter
  { min: 500, label: 'Expert', color: 'text-purple-400', badge: '\u{1F314}' },      // Waxing Gibbous
  { min: 1000, label: 'Trusted', color: 'text-yellow-400', badge: '\u{1F315}' },    // Full Moon
  { min: 2500, label: 'Space Authority', color: 'text-amber-400', badge: '\u2B50' },// Star
] as const;

export interface ReputationLevel {
  label: string;
  color: string;
  badge: string;
  min: number;
  nextMin?: number;
}

/**
 * Get the reputation level info for a given reputation score.
 * Returns the matching level plus the threshold for the next level (if any).
 */
export function getReputationLevel(reputation: number): ReputationLevel {
  let currentIndex = 0;

  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (reputation >= REPUTATION_LEVELS[i].min) {
      currentIndex = i;
      break;
    }
  }

  const current = REPUTATION_LEVELS[currentIndex];
  const next = REPUTATION_LEVELS[currentIndex + 1];

  return {
    label: current.label,
    color: current.color,
    badge: current.badge,
    min: current.min,
    nextMin: next ? next.min : undefined,
  };
}

/**
 * Update a user's reputation by a given number of points.
 * Reputation cannot drop below 0.
 */
export async function updateReputation(
  userId: string,
  points: number,
  reason: string
): Promise<void> {
  try {
    // Get current reputation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { reputation: true } as any,
    });

    if (!user) {
      logger.warn('Cannot update reputation: user not found', { userId });
      return;
    }

    const currentRep = (user as any).reputation ?? 0;
    const newRep = Math.max(0, currentRep + points);

    await prisma.user.update({
      where: { id: userId },
      data: { reputation: newRep } as any,
    });

    logger.info('Reputation updated', {
      userId,
      points,
      reason,
      oldReputation: currentRep,
      newReputation: newRep,
    });
  } catch (error) {
    logger.error('Failed to update reputation', {
      userId,
      points,
      reason,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Recalculate a user's reputation from scratch based on all their activity.
 * Returns the new reputation score.
 */
export async function recalculateReputation(userId: string): Promise<number> {
  try {
    // Count threads created by the user
    const threadCount = await (prisma as any).forumThread.count({
      where: { authorId: userId },
    });

    // Count posts created by the user
    const postCount = await (prisma as any).forumPost.count({
      where: { authorId: userId },
    });

    // Count upvotes received on threads authored by the user
    const threadUpvotes = await (prisma as any).threadVote.count({
      where: {
        value: 1,
        thread: { authorId: userId },
      },
    });

    // Count downvotes received on threads authored by the user
    const threadDownvotes = await (prisma as any).threadVote.count({
      where: {
        value: -1,
        thread: { authorId: userId },
      },
    });

    // Count upvotes received on posts authored by the user
    const postUpvotes = await (prisma as any).postVote.count({
      where: {
        value: 1,
        post: { authorId: userId },
      },
    });

    // Count downvotes received on posts authored by the user
    const postDownvotes = await (prisma as any).postVote.count({
      where: {
        value: -1,
        post: { authorId: userId },
      },
    });

    // Count accepted answers (posts by this user that are accepted)
    const acceptedAnswers = await (prisma as any).forumPost.count({
      where: {
        authorId: userId,
        isAccepted: true,
      },
    });

    const reputation = Math.max(
      0,
      threadCount * REPUTATION_POINTS.THREAD_CREATED +
        postCount * REPUTATION_POINTS.POST_CREATED +
        threadUpvotes * REPUTATION_POINTS.UPVOTE_RECEIVED +
        threadDownvotes * Math.abs(REPUTATION_POINTS.DOWNVOTE_RECEIVED) * -1 +
        postUpvotes * REPUTATION_POINTS.UPVOTE_RECEIVED +
        postDownvotes * Math.abs(REPUTATION_POINTS.DOWNVOTE_RECEIVED) * -1 +
        acceptedAnswers * REPUTATION_POINTS.ACCEPTED_ANSWER
    );

    // Update user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        reputation,
        forumPostCount: postCount + threadCount,
        acceptedAnswerCount: acceptedAnswers,
      } as any,
    });

    logger.info('Reputation recalculated', {
      userId,
      reputation,
      threadCount,
      postCount,
      threadUpvotes,
      threadDownvotes,
      postUpvotes,
      postDownvotes,
      acceptedAnswers,
    });

    return reputation;
  } catch (error) {
    logger.error('Failed to recalculate reputation', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
