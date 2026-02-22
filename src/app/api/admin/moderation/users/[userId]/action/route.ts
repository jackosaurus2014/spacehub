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
import { validateBody, moderationActionSchema } from '@/lib/validations';

/**
 * POST /api/admin/moderation/users/[userId]/action
 * Execute a moderation action against a user (admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { userId } = await params;

    const body = await req.json();
    const validation = validateBody(moderationActionSchema, body);
    if (!validation.success) {
      return validationError('Invalid moderation action', validation.errors);
    }

    const { action, reason, duration, contentType, contentId } = validation.data;

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return notFoundError('User');
    }

    // Prevent admins from moderating themselves
    if (userId === session.user.id) {
      return validationError('Cannot moderate your own account');
    }

    let moderationAction;

    switch (action) {
      case 'warn': {
        moderationAction = await (prisma as any).moderationAction.create({
          data: {
            moderatorId: session.user.id,
            targetUserId: userId,
            action: 'warn',
            reason,
            metadata: { duration: null } as any,
          },
        });
        break;
      }

      case 'mute': {
        if (!duration) {
          return validationError('Duration is required for mute action');
        }
        await prisma.user.update({
          where: { id: userId },
          data: {
            isMuted: true,
            mutedUntil: new Date(Date.now() + duration * 60000),
          } as any,
        });
        moderationAction = await (prisma as any).moderationAction.create({
          data: {
            moderatorId: session.user.id,
            targetUserId: userId,
            action: 'mute',
            reason,
            metadata: { duration } as any,
          },
        });
        break;
      }

      case 'unmute': {
        await prisma.user.update({
          where: { id: userId },
          data: {
            isMuted: false,
            mutedUntil: null,
          } as any,
        });
        moderationAction = await (prisma as any).moderationAction.create({
          data: {
            moderatorId: session.user.id,
            targetUserId: userId,
            action: 'unmute',
            reason,
          },
        });
        break;
      }

      case 'ban': {
        await prisma.user.update({
          where: { id: userId },
          data: {
            isBanned: true,
            bannedAt: new Date(),
            bannedUntil: duration ? new Date(Date.now() + duration * 60000) : null,
            banReason: reason,
          } as any,
        });
        moderationAction = await (prisma as any).moderationAction.create({
          data: {
            moderatorId: session.user.id,
            targetUserId: userId,
            action: 'ban',
            reason,
            metadata: { duration: duration || null } as any,
          },
        });
        break;
      }

      case 'unban': {
        await prisma.user.update({
          where: { id: userId },
          data: {
            isBanned: false,
            bannedAt: null,
            bannedUntil: null,
            banReason: null,
          } as any,
        });
        moderationAction = await (prisma as any).moderationAction.create({
          data: {
            moderatorId: session.user.id,
            targetUserId: userId,
            action: 'unban',
            reason,
          },
        });
        break;
      }

      case 'delete_content': {
        if (!contentType || !contentId) {
          return validationError('contentType and contentId are required for delete_content action');
        }

        // Delete the specified content based on type
        switch (contentType) {
          case 'thread':
            await (prisma as any).forumThread.delete({
              where: { id: contentId },
            });
            break;
          case 'post':
            await (prisma as any).forumPost.delete({
              where: { id: contentId },
            });
            break;
          case 'message':
            await (prisma as any).directMessage.delete({
              where: { id: contentId },
            });
            break;
          default:
            return validationError(`Unsupported content type: ${contentType}`);
        }

        moderationAction = await (prisma as any).moderationAction.create({
          data: {
            moderatorId: session.user.id,
            targetUserId: userId,
            action: 'delete_content',
            reason,
            contentType,
            contentId,
          },
        });
        break;
      }

      default:
        return validationError(`Unknown action: ${action}`);
    }

    logger.info('Moderation action executed', {
      moderatorId: session.user.id,
      targetUserId: userId,
      action,
      actionId: moderationAction.id,
    });

    return NextResponse.json({
      success: true,
      action: moderationAction,
    });
  } catch (error) {
    logger.error('Error executing moderation action', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to execute moderation action');
  }
}

/**
 * GET /api/admin/moderation/users/[userId]/action
 * Get moderation history for a specific user (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { userId } = await params;

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return notFoundError('User');
    }

    const actions = await (prisma as any).moderationAction.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      actions,
      total: actions.length,
    });
  } catch (error) {
    logger.error('Error fetching moderation history', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch moderation history');
  }
}
