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
 * GET /api/notifications
 * List notifications for the current user
 * Query params: ?unread=true (optional), ?limit=20 (default 20, max 50)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 50);

    // Build where clause
    const where: Record<string, unknown> = {
      userId: session.user.id,
    };
    if (unreadOnly) {
      where.read = false;
    }

    // Fetch notifications and unread count in parallel
    const [notifications, unreadCount] = await Promise.all([
      (prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      (prisma as any).notification.count({
        where: {
          userId: session.user.id,
          read: false,
        },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    logger.error('Failed to fetch notifications', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}

/**
 * PATCH /api/notifications
 * Mark multiple notifications as read
 * Body: { ids: string[] }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const { ids } = body;

    // Validate ids is a non-empty array of strings
    if (!Array.isArray(ids) || ids.length === 0) {
      return validationError('ids must be a non-empty array of strings');
    }

    if (!ids.every((id: unknown) => typeof id === 'string' && id.length > 0)) {
      return validationError('Each id must be a non-empty string');
    }

    // Update only notifications belonging to the current user
    const result = await (prisma as any).notification.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    logger.info('Notifications marked as read', {
      userId: session.user.id,
      updatedCount: result.count,
    });

    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error) {
    logger.error('Failed to mark notifications as read', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}
