import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
  internalError,
} from '@/lib/errors';
import { respondIntroSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/introductions/[id]
 * Respond to an introduction request. Body: { action: 'accept' | 'decline', responseMessage? }.
 * Only the target (toUserId) can respond.
 *
 * On accept: creates a Conversation between requester + target, seeds it with the
 * original request message and a system "Introduction accepted" message, and
 * notifies the requester.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const resolved = await Promise.resolve(params);
    const { id } = resolved;

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(respondIntroSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { action, responseMessage } = validation.data;

    const intro = await prisma.introductionRequest.findUnique({ where: { id } });
    if (!intro) {
      return notFoundError('Introduction request');
    }

    if (intro.toUserId !== session.user.id) {
      return forbiddenError('Only the target can respond to this introduction request');
    }

    if (intro.status !== 'pending') {
      return validationError(
        `This introduction request has already been ${intro.status}`
      );
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const now = new Date();

    const updated = await prisma.introductionRequest.update({
      where: { id },
      data: {
        status: newStatus,
        responseMessage: responseMessage || null,
        respondedAt: now,
      },
    });

    if (action === 'accept') {
      // Create a Conversation and seed with the original request + system message
      try {
        const conversation = await prisma.conversation.create({
          data: {
            lastMessageAt: now,
            participants: {
              create: [
                { userId: intro.fromUserId },
                { userId: intro.toUserId },
              ],
            },
          },
        });

        await prisma.directMessage.createMany({
          data: [
            {
              conversationId: conversation.id,
              senderId: intro.fromUserId,
              content: intro.message,
            },
            {
              conversationId: conversation.id,
              senderId: intro.toUserId,
              content: responseMessage
                ? `Introduction accepted. ${responseMessage}`
                : 'Introduction accepted.',
            },
          ],
        });

        // Notify requester
        await prisma.notification.create({
          data: {
            userId: intro.fromUserId,
            type: 'introduction_accepted',
            title: 'Introduction accepted',
            message: 'Your introduction request was accepted. A conversation has been started.',
            relatedUserId: intro.toUserId,
            relatedContentType: 'introduction_request',
            relatedContentId: intro.id,
            linkUrl: `/messages?conversationId=${conversation.id}`,
          },
        });

        logger.info('Introduction accepted and conversation seeded', {
          id: intro.id,
          conversationId: conversation.id,
        });
      } catch (acceptError) {
        logger.error('Error seeding conversation after accepted intro', {
          id: intro.id,
          error: acceptError instanceof Error ? acceptError.message : String(acceptError),
        });
        // Non-fatal — the intro is marked accepted even if conversation seeding fails
      }
    } else {
      // Decline — notify requester
      try {
        await prisma.notification.create({
          data: {
            userId: intro.fromUserId,
            type: 'introduction_declined',
            title: 'Introduction declined',
            message: 'Your introduction request was declined.',
            relatedUserId: intro.toUserId,
            relatedContentType: 'introduction_request',
            relatedContentId: intro.id,
            linkUrl: '/introductions?tab=sent',
          },
        });
      } catch (notifyError) {
        logger.warn('Failed to notify requester of declined intro', {
          id: intro.id,
          error: notifyError instanceof Error ? notifyError.message : String(notifyError),
        });
      }
      logger.info('Introduction declined', { id: intro.id });
    }

    return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } });
  } catch (error) {
    logger.error('Error responding to introduction request', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update introduction request');
  }
}

/**
 * DELETE /api/introductions/[id]
 * Cancel a pending introduction request. Only the requester can cancel.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const resolved = await Promise.resolve(params);
    const { id } = resolved;

    const intro = await prisma.introductionRequest.findUnique({ where: { id } });
    if (!intro) {
      return notFoundError('Introduction request');
    }

    if (intro.fromUserId !== session.user.id) {
      return forbiddenError('Only the requester can cancel this introduction request');
    }

    if (intro.status !== 'pending') {
      return validationError(
        `This introduction request has already been ${intro.status} and cannot be cancelled`
      );
    }

    await prisma.introductionRequest.delete({ where: { id } });

    logger.info('Introduction request cancelled', {
      id,
      fromUserId: session.user.id,
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    logger.error('Error cancelling introduction request', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to cancel introduction request');
  }
}
