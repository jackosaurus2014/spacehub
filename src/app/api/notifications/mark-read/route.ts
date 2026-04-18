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
 * POST /api/notifications/mark-read
 *
 * Body: `{ ids: string[] }` OR `{ all: true }`
 * Marks the specified notifications (or all unread) as read for the
 * current user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      return validationError('Request body must be JSON');
    }

    const { ids, all } = (body ?? {}) as {
      ids?: unknown;
      all?: unknown;
    };

    if (all === true) {
      const result = await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });

      logger.info('All notifications marked as read', {
        userId: session.user.id,
        updatedCount: result.count,
      });

      return NextResponse.json({
        success: true,
        updatedCount: result.count,
      });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return validationError(
        'Provide either { all: true } or a non-empty ids array'
      );
    }

    if (!ids.every((id) => typeof id === 'string' && id.length > 0)) {
      return validationError('Each id must be a non-empty string');
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: ids as string[] },
        userId: session.user.id,
      },
      data: { read: true },
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
