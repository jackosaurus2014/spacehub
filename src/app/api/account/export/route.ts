export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError } from '@/lib/errors';

/**
 * GET /api/account/export
 * Export all user data as a downloadable JSON file (GDPR-compliant data portability)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const userId = session.user.id;

    // Core user data (excluding password hash)
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        isAdmin: true,
        emailVerified: true,
      },
    });

    if (!userData) {
      return unauthorizedError();
    }

    // Query related data separately with try/catch for each
    // so missing models don't break the export

    let professionalProfile = null;
    try {
      professionalProfile = await (prisma as any).professionalProfile.findUnique({
        where: { userId },
      });
    } catch {
      // Model may not exist yet
    }

    let forumThreads = null;
    try {
      forumThreads = await (prisma as any).forumThread.findMany({
        where: { authorId: userId },
        include: {
          posts: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    let forumPosts = null;
    try {
      forumPosts = await (prisma as any).forumPost.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          threadId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    let directMessages = null;
    try {
      directMessages = await (prisma as any).directMessage.findMany({
        where: { senderId: userId },
        select: {
          id: true,
          conversationId: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    let conversations = null;
    try {
      const participations = await (prisma as any).conversationParticipant.findMany({
        where: { userId },
        select: {
          conversationId: true,
          lastReadAt: true,
          createdAt: true,
        },
      });
      conversations = participations;
    } catch {
      // Model may not exist yet
    }

    let following = null;
    try {
      following = await (prisma as any).userFollow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    let followers = null;
    try {
      followers = await (prisma as any).userFollow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    let companyFollows = null;
    try {
      companyFollows = await (prisma as any).companyFollow.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    let alertRules = null;
    try {
      alertRules = await (prisma as any).alertRule.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    let savedSearches = null;
    try {
      savedSearches = await (prisma as any).savedSearch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    let companyWatchlistItems = null;
    try {
      companyWatchlistItems = await (prisma as any).companyWatchlistItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Model may not exist yet
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      user: userData,
      professionalProfile,
      forumThreads,
      forumPosts,
      directMessages,
      conversations,
      following,
      followers,
      companyFollows,
      alertRules,
      savedSearches,
      companyWatchlistItems,
    };

    logger.info('User data export requested', { userId });

    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="spacenexus-data-export-${dateStr}.json"`,
      },
    });
  } catch (error) {
    logger.error('Error exporting user data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to export user data');
  }
}
