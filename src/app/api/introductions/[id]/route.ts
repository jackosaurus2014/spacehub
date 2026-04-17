import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError, unauthorizedError, forbiddenError, notFoundError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const respondSchema = z.object({
  status: z.enum(['accepted', 'declined']),
  responseMessage: z.string().max(2000).optional().transform((v) => v?.trim() || null),
});

/**
 * PATCH /api/introductions/[id]
 * Facilitator accepts or declines an introduction request.
 * Only the toUserId (facilitator) can respond.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorizedError('Authentication required');
  }

  try {
    const { id } = await params;

    const body = await req.json();
    const parsed = respondSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        fieldErrors[key] = issue.message;
      }
      return validationError('Invalid response data', fieldErrors);
    }

    const { status, responseMessage } = parsed.data;

    // Find the introduction request
    const introduction = await prisma.introductionRequest.findUnique({
      where: { id },
    });

    if (!introduction) {
      return notFoundError('Introduction request');
    }

    // Only the facilitator (toUserId) can respond
    if (introduction.toUserId !== session.user.id) {
      return forbiddenError('Only the facilitator can respond to this introduction request');
    }

    // Cannot respond to already-responded requests
    if (introduction.status !== 'pending') {
      return validationError(`This introduction request has already been ${introduction.status}`);
    }

    // Update the introduction request
    const updated = await prisma.introductionRequest.update({
      where: { id },
      data: {
        status,
        responseMessage,
        respondedAt: new Date(),
      },
    });

    // If accepted, create notifications for both the requester and the target
    if (status === 'accepted') {
      await prisma.notification.createMany({
        data: [
          {
            userId: introduction.fromUserId,
            type: 'introduction',
            title: 'Introduction Accepted',
            message: `Your introduction request has been accepted by the facilitator.`,
            relatedContentType: 'introduction',
            relatedContentId: id,
            linkUrl: '/account?tab=introductions',
          },
          {
            userId: introduction.aboutUserId,
            type: 'introduction',
            title: 'New Introduction',
            message: `Someone would like to be introduced to you.`,
            relatedContentType: 'introduction',
            relatedContentId: id,
            linkUrl: '/account?tab=introductions',
          },
        ],
      });

      logger.info('Introduction accepted, notifications sent', {
        id,
        fromUserId: introduction.fromUserId,
        aboutUserId: introduction.aboutUserId,
      });
    } else {
      logger.info('Introduction declined', { id });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('PATCH /api/introductions/[id] error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update introduction request');
  }
}
