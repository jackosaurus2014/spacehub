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
import { updateGroupMeetingSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

async function assertHost(slug: string, userId: string) {
  const group = await prisma.studyGroup.findUnique({
    where: { slug },
    select: { id: true, hostUserId: true },
  });
  if (!group) return { error: notFoundError('Study group') };
  if (group.hostUserId !== userId) {
    return { error: forbiddenError('Only the host can modify meetings') };
  }
  return { group };
}

/**
 * PATCH /api/study-groups/[slug]/meetings/[id]
 * Update a meeting (host only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { slug, id } = params;
    const hostCheck = await assertHost(slug, session.user.id);
    if (hostCheck.error) return hostCheck.error;
    const group = hostCheck.group!;

    const meeting = await prisma.groupMeeting.findUnique({
      where: { id },
      select: { id: true, groupId: true },
    });
    if (!meeting || meeting.groupId !== group.id) {
      return notFoundError('Meeting');
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(updateGroupMeetingSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.scheduledAt !== undefined)
      updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.durationMin !== undefined) updateData.durationMin = data.durationMin;
    if (data.streamUrl !== undefined) updateData.streamUrl = data.streamUrl;
    if (data.agendaMd !== undefined) updateData.agendaMd = data.agendaMd;

    const updated = await prisma.groupMeeting.update({
      where: { id },
      data: updateData,
    });

    logger.info('Group meeting updated', {
      groupId: group.id,
      meetingId: id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating group meeting', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update meeting');
  }
}

/**
 * DELETE /api/study-groups/[slug]/meetings/[id]
 * Delete a meeting (host only).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { slug, id } = params;
    const hostCheck = await assertHost(slug, session.user.id);
    if (hostCheck.error) return hostCheck.error;
    const group = hostCheck.group!;

    const meeting = await prisma.groupMeeting.findUnique({
      where: { id },
      select: { id: true, groupId: true },
    });
    if (!meeting || meeting.groupId !== group.id) {
      return notFoundError('Meeting');
    }

    await prisma.groupMeeting.delete({ where: { id } });

    logger.info('Group meeting deleted', {
      groupId: group.id,
      meetingId: id,
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Error deleting group meeting', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete meeting');
  }
}
