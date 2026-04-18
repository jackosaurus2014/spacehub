import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** DELETE /api/teams/channels/[id]/members/[userId] — owner/admin only */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const channel = await prisma.corporateChannel.findUnique({
      where: { id: params.id },
    });
    if (!channel) {
      return notFoundError('Channel');
    }

    const acting = await prisma.channelMembership.findUnique({
      where: {
        channelId_userId: { channelId: params.id, userId: session.user.id },
      },
    });
    if (!acting || (acting.role !== 'owner' && acting.role !== 'admin')) {
      return forbiddenError('Only owners or admins can remove members');
    }

    const target = await prisma.channelMembership.findUnique({
      where: {
        channelId_userId: { channelId: params.id, userId: params.userId },
      },
    });
    if (!target) {
      return notFoundError('Membership');
    }

    if (target.role === 'owner' && acting.role !== 'owner') {
      return forbiddenError('Only the owner can remove another owner');
    }

    if (target.userId === session.user.id) {
      return validationError('Use the leave endpoint to remove yourself');
    }

    await prisma.channelMembership.delete({
      where: {
        channelId_userId: { channelId: params.id, userId: params.userId },
      },
    });

    logger.info('Member removed from channel', {
      channelId: params.id,
      removedUserId: params.userId,
      actingUserId: session.user.id,
    });

    return NextResponse.json({ success: true, data: { removed: true } });
  } catch (error) {
    logger.error('Remove member error', {
      error: error instanceof Error ? error.message : String(error),
      channelId: params.id,
      userId: params.userId,
    });
    return internalError('Failed to remove member');
  }
}
