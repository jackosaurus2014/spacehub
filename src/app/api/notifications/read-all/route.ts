import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/read-all
 * Mark all unread notifications as read for the current user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const result = await (prisma as any).notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    logger.info('All notifications marked as read', {
      userId: session.user.id,
      updatedCount: result.count,
    });

    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error) {
    logger.error('Failed to mark all notifications as read', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}
