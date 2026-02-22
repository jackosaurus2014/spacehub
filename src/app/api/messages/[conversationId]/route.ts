import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  internalError,
  constrainPagination,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/[conversationId]
 * Get messages in a conversation (paginated), auto-marks as read
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { conversationId } = params;
    const userId = session.user.id;

    // Verify the user is a participant
    const participant = await (prisma as any).conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      return forbiddenError('You are not a participant in this conversation');
    }

    // Parse pagination params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = constrainPagination(
      parseInt(searchParams.get('limit') || '50', 10),
      100
    );
    const skip = (page - 1) * limit;

    // Fetch messages with sender info
    const [messages, total] = await Promise.all([
      (prisma as any).directMessage.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      (prisma as any).directMessage.count({
        where: { conversationId },
      }),
    ]);

    // Auto-mark conversation as read
    const now = new Date();
    await (prisma as any).conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { lastReadAt: now },
    });

    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching conversation messages', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch messages');
  }
}

/**
 * POST /api/messages/[conversationId]
 * Mark conversation as read (update lastReadAt)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { conversationId } = params;
    const userId = session.user.id;

    // Verify conversation exists
    const conversation = await (prisma as any).conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      return notFoundError('Conversation');
    }

    // Verify user is a participant
    const participant = await (prisma as any).conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      return forbiddenError('You are not a participant in this conversation');
    }

    // Update lastReadAt
    const now = new Date();
    await (prisma as any).conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { lastReadAt: now },
    });

    return NextResponse.json({
      success: true,
      data: { lastReadAt: now },
    });
  } catch (error) {
    logger.error('Error marking conversation as read', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to mark conversation as read');
  }
}
