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
 *
 * List notifications for the current user.
 *
 * Query params:
 *  - ?unread=true  — only return unread notifications
 *  - ?page=N       — 1-indexed page (default 1)
 *  - ?pageSize=25  — page size (default 25, max 100)
 *  - ?limit=N      — legacy alias for pageSize, kept for existing callers
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

    const legacyLimit = searchParams.get('limit');
    const pageSizeParam = parseInt(
      searchParams.get('pageSize') || legacyLimit || '25',
      10
    );
    const pageSize = Math.min(
      Math.max(1, isNaN(pageSizeParam) ? 25 : pageSizeParam),
      100
    );

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    logger.error('Failed to fetch notifications', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}

/**
 * PATCH /api/notifications
 * Mark multiple notifications as read. Kept for backwards compatibility —
 * prefer POST /api/notifications/mark-read.
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

    if (!Array.isArray(ids) || ids.length === 0) {
      return validationError('ids must be a non-empty array of strings');
    }

    if (!ids.every((id: unknown) => typeof id === 'string' && id.length > 0)) {
      return validationError('Each id must be a non-empty string');
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
      data: { read: true },
    });

    logger.info('Notifications marked as read (PATCH)', {
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
