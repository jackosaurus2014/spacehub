import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  validationError,
  notFoundError,
  alreadyExistsError,
  internalError,
} from '@/lib/errors';
import { mentorRequestSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mentors/[userId]/request
 * Body: { message }
 * Creates a MentorMatch (status=pending) and notifies the mentor.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to request mentorship');
    }

    const resolved = await Promise.resolve(params);
    const { userId: mentorUserId } = resolved;
    const menteeUserId = session.user.id;

    if (mentorUserId === menteeUserId) {
      return validationError('You cannot request mentorship from yourself');
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(mentorRequestSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { message } = validation.data;

    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId: mentorUserId },
    });
    if (!mentor) {
      return notFoundError('Mentor profile');
    }
    if (!mentor.acceptingMentees) {
      return validationError('This mentor is not currently accepting mentees');
    }

    // Prevent dupes for an active request
    const existing = await prisma.mentorMatch.findFirst({
      where: {
        mentorId: mentor.id,
        menteeUserId,
        status: { in: ['pending', 'accepted'] },
      },
    });
    if (existing) {
      return alreadyExistsError(
        'You already have an active mentorship request with this mentor'
      );
    }

    const match = await prisma.mentorMatch.create({
      data: {
        mentorId: mentor.id,
        menteeUserId,
        message,
        status: 'pending',
      },
    });

    // Best-effort notification to mentor
    try {
      const requester = await prisma.user.findUnique({
        where: { id: menteeUserId },
        select: { name: true },
      });
      const who = requester?.name || 'A SpaceNexus member';
      await prisma.notification.create({
        data: {
          userId: mentorUserId,
          type: 'mentor_request',
          title: 'New mentorship request',
          message: `${who} would like to be mentored by you.`,
          relatedUserId: menteeUserId,
          relatedContentType: 'mentor_match',
          relatedContentId: match.id,
          linkUrl: '/mentors/my-mentees',
        },
      });
    } catch (notifyError) {
      logger.warn('Failed to create mentor request notification', {
        matchId: match.id,
        error:
          notifyError instanceof Error
            ? notifyError.message
            : String(notifyError),
      });
    }

    logger.info('Mentor request created', {
      matchId: match.id,
      mentorUserId,
      menteeUserId,
    });

    return NextResponse.json(
      { success: true, data: { id: match.id, status: match.status } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating mentor request', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create mentorship request');
  }
}
