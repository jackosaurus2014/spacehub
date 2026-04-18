import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications-server';
import { validateBody, bookOfficeHourSchema } from '@/lib/validations';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/office-hours/slots/[id]/book
 * Attendees book a slot.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const body = await request.json();
    const validation = validateBody(bookOfficeHourSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const slot = await prisma.officeHourSlot.findUnique({
      where: { id: params.id },
    });
    if (!slot) {
      return notFoundError('Slot');
    }
    if (slot.mentorUserId === auth.user.id) {
      return forbiddenError('You cannot book your own office-hour slot');
    }
    if (slot.status !== 'open') {
      return validationError('This slot is no longer open');
    }
    if (slot.startTime.getTime() < Date.now()) {
      return validationError('This slot is in the past');
    }

    const updated = await prisma.officeHourSlot.updateMany({
      where: { id: slot.id, status: 'open' },
      data: {
        status: 'booked',
        bookedByUserId: auth.user.id,
        topic: validation.data.topic,
        notes: validation.data.notes ?? slot.notes ?? null,
      },
    });

    if (updated.count === 0) {
      return validationError('This slot was just booked by someone else');
    }

    logger.info('Office-hour slot booked', {
      slotId: slot.id,
      mentorUserId: slot.mentorUserId,
      bookedByUserId: auth.user.id,
    });

    const fresh = await prisma.officeHourSlot.findUnique({
      where: { id: slot.id },
    });

    // Notify the mentor
    const booker = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { name: true },
    });
    createNotification({
      userId: slot.mentorUserId,
      type: 'system',
      title: 'Office-hour slot booked',
      message: `${booker?.name || 'A mentee'} booked your slot — topic: ${validation.data.topic}`,
      relatedUserId: auth.user.id,
      relatedContentType: 'office_hour_slot',
      relatedContentId: slot.id,
      linkUrl: `/office-hours`,
    }).catch(() => {});

    // Reminder 30 min before
    const reminderAt = new Date(slot.startTime.getTime() - 30 * 60 * 1000);
    if (reminderAt.getTime() > Date.now()) {
      createNotification({
        userId: auth.user.id,
        type: 'system',
        title: 'Office-hour reminder scheduled',
        message: `Your office-hour session starts soon — we'll remind you 30 minutes before.`,
        relatedContentType: 'office_hour_slot',
        relatedContentId: slot.id,
        linkUrl: `/office-hours/my-bookings`,
      }).catch(() => {});
    }

    return NextResponse.json(
      { success: true, data: { slot: fresh } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Book office-hour slot error', {
      error: error instanceof Error ? error.message : String(error),
      slotId: params.id,
    });
    return internalError('Failed to book slot');
  }
}

/**
 * DELETE /api/office-hours/slots/[id]/book
 * Cancel a booking. Attendee who booked, or the mentor.
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

    const slot = await prisma.officeHourSlot.findUnique({
      where: { id: params.id },
    });
    if (!slot) {
      return notFoundError('Slot');
    }

    const isAttendee = slot.bookedByUserId === auth.user.id;
    const isMentor = slot.mentorUserId === auth.user.id;
    if (!isAttendee && !isMentor) {
      return forbiddenError('You cannot cancel this booking');
    }
    if (slot.status !== 'booked') {
      return validationError('This slot is not booked');
    }

    const updated = await prisma.officeHourSlot.update({
      where: { id: slot.id },
      data: {
        status: isMentor ? 'cancelled' : 'open',
        bookedByUserId: null,
        topic: null,
      },
    });

    logger.info('Office-hour booking cancelled', {
      slotId: slot.id,
      cancelledBy: auth.user.id,
      role: isMentor ? 'mentor' : 'attendee',
    });

    // Notify the other party
    const otherUserId = isMentor ? slot.bookedByUserId : slot.mentorUserId;
    if (otherUserId) {
      createNotification({
        userId: otherUserId,
        type: 'system',
        title: 'Office-hour booking cancelled',
        message: isMentor
          ? 'The mentor cancelled an office-hour slot you had booked.'
          : 'Your office-hour booking was cancelled by the attendee.',
        relatedUserId: auth.user.id,
        relatedContentType: 'office_hour_slot',
        relatedContentId: slot.id,
        linkUrl: '/office-hours',
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: { slot: updated } });
  } catch (error) {
    logger.error('Cancel office-hour booking error', {
      error: error instanceof Error ? error.message : String(error),
      slotId: params.id,
    });
    return internalError('Failed to cancel booking');
  }
}
