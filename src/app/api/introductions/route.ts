import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError, unauthorizedError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createIntroductionSchema = z.object({
  toUserId: z.string().min(1, 'Facilitator user ID is required'),
  aboutUserId: z.string().min(1, 'Target user ID is required'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000).transform((v) => v.trim()),
});

/**
 * GET /api/introductions
 * List the current user's introduction requests (sent + received as facilitator).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorizedError('Authentication required');
  }

  try {
    const userId = session.user.id;

    const [sent, received] = await Promise.all([
      prisma.introductionRequest.findMany({
        where: { fromUserId: userId },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.introductionRequest.findMany({
        where: { toUserId: userId },
        orderBy: { requestedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { sent, received },
    });
  } catch (error) {
    logger.error('GET /api/introductions error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch introduction requests');
  }
}

/**
 * POST /api/introductions
 * Request an introduction. fromUserId = session user, toUserId = facilitator, aboutUserId = target.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorizedError('Authentication required');
  }

  try {
    const body = await req.json();
    const parsed = createIntroductionSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        fieldErrors[key] = issue.message;
      }
      return validationError('Invalid introduction request', fieldErrors);
    }

    const { toUserId, aboutUserId, message } = parsed.data;
    const fromUserId = session.user.id;

    // Prevent self-introductions
    if (fromUserId === aboutUserId) {
      return validationError('You cannot request an introduction to yourself');
    }

    if (fromUserId === toUserId) {
      return validationError('You cannot be both the requester and the facilitator');
    }

    if (toUserId === aboutUserId) {
      return validationError('The facilitator and the target cannot be the same person');
    }

    // Validate all 3 users exist
    const [fromUser, toUser, aboutUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: aboutUserId }, select: { id: true } }),
    ]);

    if (!fromUser) {
      return validationError('Requesting user not found');
    }
    if (!toUser) {
      return validationError('Facilitator user not found');
    }
    if (!aboutUser) {
      return validationError('Target user not found');
    }

    // Check for duplicate pending request
    const existing = await prisma.introductionRequest.findUnique({
      where: {
        fromUserId_toUserId_aboutUserId: {
          fromUserId,
          toUserId,
          aboutUserId,
        },
      },
    });

    if (existing) {
      return validationError('An introduction request already exists for this combination');
    }

    const introduction = await prisma.introductionRequest.create({
      data: {
        fromUserId,
        toUserId,
        aboutUserId,
        message,
      },
    });

    logger.info('Introduction request created', {
      id: introduction.id,
      fromUserId,
      toUserId,
      aboutUserId,
    });

    return NextResponse.json({ success: true, data: introduction }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/introductions error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create introduction request');
  }
}
