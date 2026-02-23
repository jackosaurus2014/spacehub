export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, forbiddenError, internalError } from '@/lib/errors';

/**
 * GET /api/admin/moderation/actions
 * List all moderation actions (paginated)
 * Query params: page, limit, targetUserId, moderatorId
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const targetUserId = url.searchParams.get('targetUserId')?.trim() || '';
    const moderatorId = url.searchParams.get('moderatorId')?.trim() || '';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (targetUserId) {
      where.targetUserId = targetUserId;
    }

    if (moderatorId) {
      where.moderatorId = moderatorId;
    }

    // Fetch actions with moderator and target user info
    const [actions, total] = await Promise.all([
      (prisma as any).moderationAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).moderationAction.count({ where }),
    ]);

    // Gather unique user IDs for moderators and targets
    const userIds = new Set<string>();
    for (const action of actions) {
      userIds.add(action.moderatorId);
      userIds.add(action.targetUserId);
    }

    // Fetch user names in bulk
    const userMap: Record<string, { name: string | null; email: string | null }> = {};
    if (userIds.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true, email: true },
      });
      for (const u of users) {
        userMap[u.id] = { name: u.name, email: u.email };
      }
    }

    // Enrich actions with user names
    const enrichedActions = actions.map((action: any) => ({
      ...action,
      moderatorName: userMap[action.moderatorId]?.name || userMap[action.moderatorId]?.email || action.moderatorId,
      targetUserName: userMap[action.targetUserId]?.name || userMap[action.targetUserId]?.email || action.targetUserId,
    }));

    return NextResponse.json({
      success: true,
      data: {
        actions: enrichedActions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error listing moderation actions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list moderation actions');
  }
}
