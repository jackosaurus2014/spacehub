import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  notFoundError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notifications/[id]
 * Mark a single notification as read
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = await params;

    // Update only if it belongs to the current user
    const result = await (prisma as any).notification.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    if (result.count === 0) {
      return notFoundError('Notification');
    }

    logger.info('Notification marked as read', {
      userId: session.user.id,
      notificationId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to mark notification as read', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}
