import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  internalError,
} from '@/lib/errors';
import { alertDeliveryQuerySchema, validateSearchParams } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/alerts/deliveries - List user's alert deliveries (paginated)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(req.url);
    const validation = validateSearchParams(alertDeliveryQuerySchema, searchParams);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { channel, status, limit, offset } = validation.data;

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (channel) where.channel = channel;
    if (status) where.status = status;

    const [deliveries, total] = await Promise.all([
      prisma.alertDelivery.findMany({
        where,
        include: {
          alertRule: {
            select: {
              name: true,
              triggerType: true,
              priority: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.alertDelivery.count({ where }),
    ]);

    // Count unread in-app notifications
    const unreadCount = await prisma.alertDelivery.count({
      where: {
        userId: session.user.id,
        channel: 'in_app',
        status: { in: ['delivered', 'sent'] },
        readAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deliveries,
        total,
        unreadCount,
        hasMore: offset + deliveries.length < total,
      },
    });
  } catch (error) {
    logger.error('Error fetching alert deliveries', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch alert deliveries');
  }
}

// PUT /api/alerts/deliveries - Mark deliveries as read
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return validationError('ids must be a non-empty array of delivery IDs');
    }

    if (ids.length > 100) {
      return validationError('Cannot mark more than 100 deliveries at once');
    }

    // Only mark deliveries that belong to this user
    const result = await prisma.alertDelivery.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
        readAt: null, // Only update if not already read
      },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });

    logger.info('Alert deliveries marked as read', {
      userId: session.user.id,
      requestedCount: ids.length,
      updatedCount: result.count,
    });

    return NextResponse.json({
      success: true,
      data: {
        markedAsRead: result.count,
      },
    });
  } catch (error) {
    logger.error('Error marking deliveries as read', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to mark deliveries as read');
  }
}
