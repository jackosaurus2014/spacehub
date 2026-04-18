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
import { updateMessageSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** PATCH /api/teams/messages/[id] — edit own only */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const message = await prisma.channelMessage.findUnique({
      where: { id: params.id },
    });
    if (!message) {
      return notFoundError('Message');
    }

    if (message.authorId !== session.user.id) {
      return forbiddenError('You can only edit your own messages');
    }

    const body = await req.json();
    const validation = validateBody(updateMessageSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const updated = await prisma.channelMessage.update({
      where: { id: params.id },
      data: {
        body: validation.data.body,
        editedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: { message: updated } });
  } catch (error) {
    logger.error('Edit message error', {
      error: error instanceof Error ? error.message : String(error),
      messageId: params.id,
    });
    return internalError('Failed to edit message');
  }
}

/** DELETE /api/teams/messages/[id] — author or admin */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const message = await prisma.channelMessage.findUnique({
      where: { id: params.id },
    });
    if (!message) {
      return notFoundError('Message');
    }

    let allowed = message.authorId === session.user.id;
    if (!allowed) {
      const membership = await prisma.channelMembership.findUnique({
        where: {
          channelId_userId: {
            channelId: message.channelId,
            userId: session.user.id,
          },
        },
      });
      allowed = !!membership && (membership.role === 'owner' || membership.role === 'admin');
    }
    if (!allowed) {
      return forbiddenError('Only the author or a channel admin can delete this message');
    }

    await prisma.channelMessage.delete({ where: { id: params.id } });

    logger.info('Channel message deleted', {
      messageId: params.id,
      userId: session.user.id,
    });
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Delete message error', {
      error: error instanceof Error ? error.message : String(error),
      messageId: params.id,
    });
    return internalError('Failed to delete message');
  }
}
