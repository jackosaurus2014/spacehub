import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  validationError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/follow
 * Get follow stats for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const userId = session.user.id;

    const [followingCount, followersCount, following, companyFollows] =
      await Promise.all([
        (prisma as any).userFollow.count({
          where: { followerId: userId },
        }),
        (prisma as any).userFollow.count({
          where: { followingId: userId },
        }),
        (prisma as any).userFollow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        }),
        (prisma as any).companyFollow.findMany({
          where: { userId },
          select: { companyId: true },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        followingCount,
        followersCount,
        followingIds: following.map((f: { followingId: string }) => f.followingId),
        companyFollowIds: companyFollows.map((f: { companyId: string }) => f.companyId),
      },
    });
  } catch (error) {
    logger.error('Error fetching follow stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch follow stats');
  }
}

/**
 * POST /api/community/follow
 * Follow a user or company
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const { targetUserId, companyId } = body;

    if (!targetUserId && !companyId) {
      return validationError('Either targetUserId or companyId is required');
    }

    if (targetUserId && companyId) {
      return validationError('Provide only one of targetUserId or companyId');
    }

    if (targetUserId) {
      // Cannot follow yourself
      if (targetUserId === session.user.id) {
        return validationError('You cannot follow yourself');
      }

      // Check target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
      if (!targetUser) {
        return validationError('Target user not found');
      }

      // Create follow (ignore if already exists)
      await (prisma as any).userFollow.upsert({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: targetUserId,
          },
        },
        create: {
          followerId: session.user.id,
          followingId: targetUserId,
        },
        update: {},
      });

      logger.info('User followed', {
        followerId: session.user.id,
        followingId: targetUserId,
      });

      return NextResponse.json(
        { success: true, data: { type: 'user', targetUserId } },
        { status: 201 }
      );
    }

    // Company follow
    await (prisma as any).companyFollow.upsert({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId,
        },
      },
      create: {
        userId: session.user.id,
        companyId,
      },
      update: {},
    });

    logger.info('Company followed', {
      userId: session.user.id,
      companyId,
    });

    return NextResponse.json(
      { success: true, data: { type: 'company', companyId } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating follow', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to follow');
  }
}

/**
 * DELETE /api/community/follow
 * Unfollow a user or company
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const { targetUserId, companyId } = body;

    if (!targetUserId && !companyId) {
      return validationError('Either targetUserId or companyId is required');
    }

    if (targetUserId) {
      await (prisma as any).userFollow.deleteMany({
        where: {
          followerId: session.user.id,
          followingId: targetUserId,
        },
      });

      logger.info('User unfollowed', {
        followerId: session.user.id,
        followingId: targetUserId,
      });

      return NextResponse.json({
        success: true,
        data: { type: 'user', targetUserId },
      });
    }

    // Company unfollow
    await (prisma as any).companyFollow.deleteMany({
      where: {
        userId: session.user.id,
        companyId,
      },
    });

    logger.info('Company unfollowed', {
      userId: session.user.id,
      companyId,
    });

    return NextResponse.json({
      success: true,
      data: { type: 'company', companyId },
    });
  } catch (error) {
    logger.error('Error removing follow', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to unfollow');
  }
}
