import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/unread
 * Returns the total unread message count for the current user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const userId = session.user.id;

    // Find all conversations the user participates in
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });

    if (participations.length === 0) {
      return NextResponse.json({ success: true, data: { unreadCount: 0 } });
    }

    // Sum unread messages across all conversations
    let totalUnread = 0;

    for (const p of participations) {
      const where: Record<string, unknown> = {
        conversationId: p.conversationId,
        senderId: { not: userId },
      };

      if (p.lastReadAt) {
        where.createdAt = { gt: p.lastReadAt };
      }

      const count = await prisma.directMessage.count({ where });
      totalUnread += count;
    }

    return NextResponse.json({
      success: true,
      data: { unreadCount: totalUnread },
    });
  } catch (error) {
    logger.error('Error fetching unread count', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch unread count');
  }
}
