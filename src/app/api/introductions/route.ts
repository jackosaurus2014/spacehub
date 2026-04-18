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
import { createIntroRequestSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

type Direction = 'sent' | 'received' | 'accepted' | 'all';

function isDirection(v: string | null): v is Direction {
  return v === 'sent' || v === 'received' || v === 'accepted' || v === 'all';
}

/**
 * POST /api/introductions
 * Request a direct introduction.
 * Body: { targetUserId | targetCompanyId, message, reason? }
 *
 * Writes to IntroductionRequest with toUserId === aboutUserId (direct intro).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to request an introduction');
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(createIntroRequestSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { targetUserId, targetCompanyId, message, reason } = validation.data;
    const fromUserId = session.user.id;

    // Resolve the destination user ID
    let toUserId: string | null = null;

    if (targetUserId) {
      if (targetUserId === fromUserId) {
        return validationError('You cannot request an introduction to yourself');
      }
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
      if (!targetUser) {
        return notFoundError('Target user');
      }
      toUserId = targetUser.id;
    } else if (targetCompanyId) {
      const company = await prisma.companyProfile.findUnique({
        where: { id: targetCompanyId },
        select: { id: true, name: true, claimedByUserId: true },
      });
      if (!company) {
        return notFoundError('Target company');
      }
      if (!company.claimedByUserId) {
        return validationError(
          'This company profile has not been claimed yet, so no introduction target is available'
        );
      }
      if (company.claimedByUserId === fromUserId) {
        return validationError('You cannot request an introduction to your own company');
      }
      toUserId = company.claimedByUserId;
    } else {
      return validationError('Provide targetUserId or targetCompanyId');
    }

    // For a direct intro, the target user is both the recipient AND the subject.
    const aboutUserId = toUserId;

    // Prevent duplicates for an active request
    const existing = await prisma.introductionRequest.findFirst({
      where: {
        fromUserId,
        toUserId,
        aboutUserId,
        status: { in: ['pending', 'accepted'] },
      },
    });
    if (existing) {
      return alreadyExistsError('You already have an active introduction request for this target');
    }

    // Build message body, prefixing reason if provided
    const reasonLabel = reason ? `[${reason.replace(/_/g, ' ')}] ` : '';
    const fullMessage = `${reasonLabel}${message}`;

    const intro = await prisma.introductionRequest.create({
      data: {
        fromUserId,
        toUserId,
        aboutUserId,
        message: fullMessage,
        status: 'pending',
      },
    });

    // Best-effort notification to target
    try {
      const requester = await prisma.user.findUnique({
        where: { id: fromUserId },
        select: { name: true },
      });
      const who = requester?.name || 'A SpaceNexus member';
      await prisma.notification.create({
        data: {
          userId: toUserId,
          type: 'introduction_request',
          title: 'Introduction request',
          message: `${who} would like an introduction.`,
          relatedUserId: fromUserId,
          relatedContentType: 'introduction_request',
          relatedContentId: intro.id,
          linkUrl: '/introductions?tab=received',
        },
      });
    } catch (notifyError) {
      logger.warn('Failed to create intro request notification', {
        introId: intro.id,
        error: notifyError instanceof Error ? notifyError.message : String(notifyError),
      });
    }

    logger.info('Introduction request created', {
      id: intro.id,
      fromUserId,
      toUserId,
      via: targetCompanyId ? 'company' : 'user',
    });

    return NextResponse.json(
      { success: true, data: { id: intro.id, status: intro.status } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating introduction request', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create introduction request');
  }
}

/**
 * GET /api/introductions?direction=sent|received|accepted|all
 * List introduction requests for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const rawDirection = searchParams.get('direction');
    const direction: Direction = isDirection(rawDirection) ? rawDirection : 'all';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (direction === 'sent') {
      where.fromUserId = userId;
    } else if (direction === 'received') {
      where.toUserId = userId;
    } else if (direction === 'accepted') {
      where.status = 'accepted';
      where.OR = [{ fromUserId: userId }, { toUserId: userId }];
    } else {
      where.OR = [{ fromUserId: userId }, { toUserId: userId }];
    }

    const intros = await prisma.introductionRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      take: 200,
    });

    // Eagerly fetch user info for requester + target
    const userIds = Array.from(
      new Set(intros.flatMap((i) => [i.fromUserId, i.toUserId, i.aboutUserId]))
    );
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
            subscriptionTier: true,
          },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = intros.map((intro) => ({
      id: intro.id,
      status: intro.status,
      message: intro.message,
      responseMessage: intro.responseMessage,
      requestedAt: intro.requestedAt,
      respondedAt: intro.respondedAt,
      completedAt: intro.completedAt,
      fromUserId: intro.fromUserId,
      toUserId: intro.toUserId,
      aboutUserId: intro.aboutUserId,
      requester: userMap.get(intro.fromUserId) || null,
      target: userMap.get(intro.toUserId) || null,
      direction:
        intro.fromUserId === userId ? ('sent' as const) : ('received' as const),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Error listing introduction requests', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list introduction requests');
  }
}
