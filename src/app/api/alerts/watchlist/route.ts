import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts/watchlist — fetch user's in-app watchlist alerts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: any = {
      userId: session.user.id,
      source: 'watchlist',
      channel: 'in_app',
    };
    if (unreadOnly) {
      where.readAt = null;
      where.status = { in: ['pending', 'delivered'] };
    }

    const [alerts, total, unreadCount] = await Promise.all([
      prisma.alertDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          message: true,
          data: true,
          status: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.alertDelivery.count({ where }),
      prisma.alertDelivery.count({
        where: {
          userId: session.user.id,
          source: 'watchlist',
          channel: 'in_app',
          readAt: null,
          status: { in: ['pending', 'delivered'] },
        },
      }),
    ]);

    return NextResponse.json({
      alerts,
      total,
      unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch watchlist alerts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch watchlist alerts');
  }
}

/**
 * PUT /api/alerts/watchlist — mark all watchlist alerts as read
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const updated = await prisma.alertDelivery.updateMany({
      where: {
        userId: session.user.id,
        source: 'watchlist',
        channel: 'in_app',
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: 'read',
      },
    });

    return NextResponse.json({
      success: true,
      marked: updated.count,
    });
  } catch (error) {
    logger.error('Failed to mark watchlist alerts as read', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to mark alerts as read');
  }
}
