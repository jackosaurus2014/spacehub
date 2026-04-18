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
import { mentorMatchActionSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/mentors/matches/[matchId]
 * Body: { action: 'accept' | 'decline' }
 * Only the mentor (owner of MentorProfile) may respond. Notifies the mentee.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> | { matchId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const resolved = await Promise.resolve(params);
    const { matchId } = resolved;

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(mentorMatchActionSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { action } = validation.data;

    const match = await prisma.mentorMatch.findUnique({
      where: { id: matchId },
      include: { mentor: true },
    });
    if (!match) {
      return notFoundError('Mentor match');
    }

    if (match.mentor.userId !== session.user.id) {
      return forbiddenError('Only the mentor can respond to this request');
    }

    if (match.status !== 'pending') {
      return validationError(
        `This mentorship request has already been ${match.status}`
      );
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const now = new Date();

    const updated = await prisma.mentorMatch.update({
      where: { id: matchId },
      data: {
        status: newStatus,
        respondedAt: now,
      },
    });

    // Notify the mentee
    try {
      const mentorUser = await prisma.user.findUnique({
        where: { id: match.mentor.userId },
        select: { name: true },
      });
      const who = mentorUser?.name || 'Your mentor';
      await prisma.notification.create({
        data: {
          userId: match.menteeUserId,
          type:
            action === 'accept'
              ? 'mentor_request_accepted'
              : 'mentor_request_declined',
          title:
            action === 'accept'
              ? 'Mentorship request accepted'
              : 'Mentorship request declined',
          message:
            action === 'accept'
              ? `${who} has accepted your mentorship request.`
              : `${who} has declined your mentorship request.`,
          relatedUserId: match.mentor.userId,
          relatedContentType: 'mentor_match',
          relatedContentId: match.id,
          linkUrl: '/mentors/my-mentors',
        },
      });
    } catch (notifyError) {
      logger.warn('Failed to notify mentee of mentor match decision', {
        matchId: match.id,
        error:
          notifyError instanceof Error
            ? notifyError.message
            : String(notifyError),
      });
    }

    logger.info('Mentor match updated', {
      matchId,
      status: newStatus,
      mentorUserId: match.mentor.userId,
      menteeUserId: match.menteeUserId,
    });

    return NextResponse.json({
      success: true,
      data: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    logger.error('Error updating mentor match', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update mentor match');
  }
}
