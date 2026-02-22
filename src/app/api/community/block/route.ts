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

/**
 * GET /api/community/block
 * Get list of blocked user IDs for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const blocks = await (prisma as any).userBlock.findMany({
      where: { blockerId: session.user.id },
      select: { blockedId: true },
    });

    return NextResponse.json({
      success: true,
      blockedIds: blocks.map((b: { blockedId: string }) => b.blockedId),
    });
  } catch (error) {
    logger.error('Error fetching blocked users', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch blocked users');
  }
}

/**
 * POST /api/community/block
 * Block a user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim().length === 0) {
      return validationError('targetUserId is required');
    }

    // Prevent self-block
    if (targetUserId === session.user.id) {
      return validationError('You cannot block yourself');
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return notFoundError('Target user');
    }

    // Create block (upsert to handle duplicates gracefully)
    await (prisma as any).userBlock.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: targetUserId,
        },
      },
      create: {
        blockerId: session.user.id,
        blockedId: targetUserId,
      },
      update: {},
    });

    logger.info('User blocked', {
      blockerId: session.user.id,
      blockedId: targetUserId,
    });

    return NextResponse.json(
      { success: true },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error blocking user', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to block user');
  }
}

/**
 * DELETE /api/community/block
 * Unblock a user
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim().length === 0) {
      return validationError('targetUserId is required');
    }

    await (prisma as any).userBlock.deleteMany({
      where: {
        blockerId: session.user.id,
        blockedId: targetUserId,
      },
    });

    logger.info('User unblocked', {
      blockerId: session.user.id,
      blockedId: targetUserId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error unblocking user', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to unblock user');
  }
}
