import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, updateSessionSchema } from '@/lib/validations';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionRecord = await prisma.expertSession.findUnique({
      where: { id: params.id },
    });
    if (!sessionRecord) {
      return notFoundError('Session');
    }

    const [host, questions, rsvpCount, authSession] = await Promise.all([
      prisma.user.findUnique({
        where: { id: sessionRecord.hostUserId },
        select: { id: true, name: true,  verifiedBadge: true },
      }),
      prisma.sessionQuestion.findMany({
        where: { sessionId: sessionRecord.id },
        orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
        take: 200,
      }),
      prisma.sessionRSVP.count({ where: { sessionId: sessionRecord.id } }),
      getServerSession(authOptions),
    ]);

    const currentUserId = authSession?.user?.id;
    const askerIds = Array.from(new Set(questions.map((q) => q.askerId)));
    const askers = askerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: askerIds } },
          select: { id: true, name: true,  },
        })
      : [];
    const askerMap = new Map(askers.map((a) => [a.id, a]));

    let userRsvp = null;
    if (currentUserId) {
      userRsvp = await prisma.sessionRSVP.findUnique({
        where: {
          sessionId_userId: {
            sessionId: sessionRecord.id,
            userId: currentUserId,
          },
        },
      });
    }

    const isHost = currentUserId === sessionRecord.hostUserId;

    return NextResponse.json({
      success: true,
      data: {
        session: sessionRecord,
        host,
        questions: questions.map((q) => ({
          ...q,
          asker: askerMap.get(q.askerId) || null,
        })),
        rsvpCount,
        userRsvp,
        isHost,
      },
    });
  } catch (error) {
    logger.error('Get session error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
    });
    return internalError('Failed to fetch session');
  }
}

/**
 * PATCH /api/sessions/[id] — host only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const existing = await prisma.expertSession.findUnique({
      where: { id: params.id },
      select: { id: true, hostUserId: true },
    });
    if (!existing) {
      return notFoundError('Session');
    }
    if (existing.hostUserId !== auth.user.id) {
      return forbiddenError('Only the session host can update this session');
    }

    const body = await request.json();
    const validation = validateBody(updateSessionSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const updated = await prisma.expertSession.update({
      where: { id: existing.id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.scheduledAt !== undefined
          ? { scheduledAt: new Date(data.scheduledAt) }
          : {}),
        ...(data.durationMin !== undefined
          ? { durationMin: data.durationMin }
          : {}),
        ...(data.maxAttendees !== undefined
          ? { maxAttendees: data.maxAttendees }
          : {}),
        ...(data.streamUrl !== undefined ? { streamUrl: data.streamUrl } : {}),
        ...(data.recordingUrl !== undefined
          ? { recordingUrl: data.recordingUrl }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
      },
    });

    logger.info('Session updated', {
      sessionId: updated.id,
      hostUserId: auth.user.id,
    });

    return NextResponse.json({ success: true, data: { session: updated } });
  } catch (error) {
    logger.error('Update session error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
    });
    return internalError('Failed to update session');
  }
}

/**
 * DELETE /api/sessions/[id] — host only
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const existing = await prisma.expertSession.findUnique({
      where: { id: params.id },
      select: { id: true, hostUserId: true },
    });
    if (!existing) {
      return notFoundError('Session');
    }
    if (existing.hostUserId !== auth.user.id) {
      return forbiddenError('Only the session host can delete this session');
    }

    await prisma.expertSession.delete({ where: { id: existing.id } });

    logger.info('Session deleted', {
      sessionId: params.id,
      hostUserId: auth.user.id,
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Delete session error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
    });
    return internalError('Failed to delete session');
  }
}
