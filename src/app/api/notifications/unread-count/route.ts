import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 *
 * Returns `{ count: number }` of unread notifications for the current
 * user. Designed to be cheap — it's polled frequently by the bell badge.
 * We attach a private 30s cache header so repeated browser-tab polls
 * within that window can reuse the response.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const count = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });

    const res = NextResponse.json({ count });
    // Private cache — safe only for the current user's browser.
    res.headers.set(
      'Cache-Control',
      'private, max-age=30, stale-while-revalidate=60'
    );
    return res;
  } catch (error) {
    logger.error('Failed to fetch unread count', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}
