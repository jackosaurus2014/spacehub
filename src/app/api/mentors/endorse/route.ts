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
import { endorsementSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mentors/endorse
 * Body: { endorseeId, skill, note? }
 * Creates a SkillEndorsement (unique on endorser/endorsee/skill).
 * If the endorsee has a MentorProfile, increment endorsementCount.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to endorse');
    }
    const endorserId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(endorsementSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { endorseeId, skill, note } = validation.data;

    if (endorseeId === endorserId) {
      return validationError('You cannot endorse yourself');
    }

    const endorsee = await prisma.user.findUnique({
      where: { id: endorseeId },
      select: { id: true },
    });
    if (!endorsee) {
      return notFoundError('User');
    }

    // Check the unique constraint up-front for a friendlier error
    const existing = await prisma.skillEndorsement.findUnique({
      where: {
        endorserId_endorseeId_skill: {
          endorserId,
          endorseeId,
          skill,
        },
      },
    });
    if (existing) {
      return alreadyExistsError(
        `You have already endorsed this person for "${skill}"`
      );
    }

    const endorsement = await prisma.skillEndorsement.create({
      data: {
        endorserId,
        endorseeId,
        skill,
        note: note || null,
      },
    });

    // If endorsee has a mentor profile, bump endorsementCount
    try {
      await prisma.mentorProfile.updateMany({
        where: { userId: endorseeId },
        data: { endorsementCount: { increment: 1 } },
      });
    } catch (incError) {
      logger.warn('Failed to increment mentor endorsementCount', {
        endorseeId,
        error:
          incError instanceof Error ? incError.message : String(incError),
      });
    }

    // Best-effort notify
    try {
      const endorser = await prisma.user.findUnique({
        where: { id: endorserId },
        select: { name: true },
      });
      const who = endorser?.name || 'A SpaceNexus member';
      await prisma.notification.create({
        data: {
          userId: endorseeId,
          type: 'skill_endorsement',
          title: 'New skill endorsement',
          message: `${who} endorsed you for ${skill}.`,
          relatedUserId: endorserId,
          relatedContentType: 'skill_endorsement',
          relatedContentId: endorsement.id,
        },
      });
    } catch (notifyError) {
      logger.warn('Failed to notify endorsee of endorsement', {
        endorsementId: endorsement.id,
        error:
          notifyError instanceof Error
            ? notifyError.message
            : String(notifyError),
      });
    }

    logger.info('Skill endorsement created', {
      endorserId,
      endorseeId,
      skill,
      endorsementId: endorsement.id,
    });

    return NextResponse.json(
      { success: true, data: endorsement },
      { status: 201 }
    );
  } catch (error) {
    // Handle race condition on the unique constraint
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return alreadyExistsError('You have already endorsed this skill');
    }
    logger.error('Error creating skill endorsement', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create endorsement');
  }
}
