import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications-server';
import {
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/[id]/rsvp — attendee RSVP
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const sessionRow = await prisma.expertSession.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        maxAttendees: true,
        attendeeCount: true,
        status: true,
        hostUserId: true,
      },
    });
    if (!sessionRow) {
      return notFoundError('Session');
    }
    if (sessionRow.status === 'cancelled') {
      return validationError('This session has been cancelled');
    }
    if (
      sessionRow.maxAttendees &&
      sessionRow.attendeeCount >= sessionRow.maxAttendees
    ) {
      return validationError('This session is full');
    }

    const existing = await prisma.sessionRSVP.findUnique({
      where: {
        sessionId_userId: {
          sessionId: sessionRow.id,
          userId: auth.user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: { rsvp: existing, already: true },
      });
    }

    const [rsvp] = await prisma.$transaction([
      prisma.sessionRSVP.create({
        data: {
          sessionId: sessionRow.id,
          userId: auth.user.id,
        },
      }),
      prisma.expertSession.update({
        where: { id: sessionRow.id },
        data: { attendeeCount: { increment: 1 } },
      }),
    ]);

    logger.info('Session RSVP created', {
      sessionId: sessionRow.id,
      userId: auth.user.id,
    });

    // Schedule a reminder notification ~30min before the session.
    // We create it now with a title flagged as a reminder — a
    // downstream cron/sweeper is expected to surface it at the right time.
    const reminderAt = new Date(
      new Date(sessionRow.scheduledAt).getTime() - 30 * 60 * 1000
    );
    if (reminderAt.getTime() > Date.now()) {
      createNotification({
        userId: auth.user.id,
        type: 'system',
        title: 'Session reminder scheduled',
        message: `Starts soon: "${sessionRow.title}" — we'll remind you 30 minutes before.`,
        relatedContentType: 'expert_session',
        relatedContentId: sessionRow.id,
        linkUrl: `/amas/${sessionRow.id}`,
      }).catch(() => {});
    }

    return NextResponse.json(
      { success: true, data: { rsvp, already: false } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Session RSVP error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
    });
    return internalError('Failed to RSVP');
  }
}

/**
 * DELETE /api/sessions/[id]/rsvp — cancel RSVP
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

    const existing = await prisma.sessionRSVP.findUnique({
      where: {
        sessionId_userId: {
          sessionId: params.id,
          userId: auth.user.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({
        success: true,
        data: { removed: false },
      });
    }

    await prisma.$transaction([
      prisma.sessionRSVP.delete({
        where: {
          sessionId_userId: {
            sessionId: params.id,
            userId: auth.user.id,
          },
        },
      }),
      prisma.expertSession.update({
        where: { id: params.id },
        data: { attendeeCount: { decrement: 1 } },
      }),
    ]);

    logger.info('Session RSVP cancelled', {
      sessionId: params.id,
      userId: auth.user.id,
    });

    return NextResponse.json({ success: true, data: { removed: true } });
  } catch (error) {
    logger.error('Cancel session RSVP error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
    });
    return internalError('Failed to cancel RSVP');
  }
}
