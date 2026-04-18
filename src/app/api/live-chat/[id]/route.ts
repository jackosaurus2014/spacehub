import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  unauthorizedError,
  notFoundError,
  forbiddenError,
  internalError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/live-chat/[id]
 * Deletes a chat message. Allowed for the message author or any admin.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('Sign in to delete chat messages');
    }

    const message = await prisma.launchChatMessage.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, eventId: true },
    });

    if (!message) {
      return notFoundError('Chat message');
    }

    const isAuthor = message.userId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);

    if (!isAuthor && !isAdmin) {
      return forbiddenError('You can only delete your own messages');
    }

    // Remove any per-message reactions (stored with phase = msg:<id>)
    await prisma.launchReaction.deleteMany({
      where: {
        eventId: message.eventId,
        phase: `msg:${message.id}`,
      },
    });

    await prisma.launchChatMessage.delete({
      where: { id: message.id },
    });

    logger.info('live-chat message deleted', {
      messageId: message.id,
      deletedBy: session.user.id,
      asAdmin: !isAuthor && isAdmin,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('live-chat DELETE failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete message');
  }
}
