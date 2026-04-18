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
import { updateStudyGroupSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-groups/[slug]
 * Group detail with host, member summary, meetings, reading list.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const group = await prisma.studyGroup.findUnique({
      where: { slug },
      include: {
        _count: { select: { memberships: true, meetings: true } },
        meetings: {
          orderBy: { scheduledAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!group) {
      return notFoundError('Study group');
    }

    const host = await prisma.user.findUnique({
      where: { id: group.hostUserId },
      select: { id: true, name: true, email: true },
    });

    // Hide private group details unless user is a member
    let isMember = false;
    let isHost = false;
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const membership = await prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
        select: { role: true },
      });
      isMember = !!membership;
      isHost = membership?.role === 'host' || group.hostUserId === session.user.id;
    }

    if (group.isPrivate && !isMember) {
      return NextResponse.json({
        success: true,
        data: {
          id: group.id,
          slug: group.slug,
          name: group.name,
          description: group.description,
          topic: group.topic,
          meetingCadence: group.meetingCadence,
          memberLimit: group.memberLimit,
          isPrivate: group.isPrivate,
          host: host ? { id: host.id, name: host.name } : null,
          memberCount: group._count.memberships,
          meetingCount: group._count.meetings,
          meetings: [],
          readingList: [],
          isMember: false,
          isHost: false,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: group.id,
        slug: group.slug,
        name: group.name,
        description: group.description,
        topic: group.topic,
        meetingCadence: group.meetingCadence,
        memberLimit: group.memberLimit,
        isPrivate: group.isPrivate,
        host: host ? { id: host.id, name: host.name } : null,
        memberCount: group._count.memberships,
        meetingCount: group._count.meetings,
        meetings: group.meetings,
        readingList: Array.isArray(group.readingList) ? group.readingList : [],
        isMember,
        isHost,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching study group', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch study group');
  }
}

/**
 * PATCH /api/study-groups/[slug]
 * Update group (host only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug } = params;
    const group = await prisma.studyGroup.findUnique({
      where: { slug },
      select: { id: true, hostUserId: true },
    });
    if (!group) return notFoundError('Study group');
    if (group.hostUserId !== session.user.id) {
      return forbiddenError('Only the host can update this group');
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(updateStudyGroupSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.topic !== undefined) updateData.topic = data.topic;
    if (data.meetingCadence !== undefined)
      updateData.meetingCadence = data.meetingCadence;
    if (data.memberLimit !== undefined) updateData.memberLimit = data.memberLimit;
    if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;
    if (data.readingList !== undefined)
      updateData.readingList = data.readingList as object;

    const updated = await prisma.studyGroup.update({
      where: { id: group.id },
      data: updateData,
    });

    logger.info('Study group updated', {
      groupId: group.id,
      hostUserId: session.user.id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating study group', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update study group');
  }
}

/**
 * DELETE /api/study-groups/[slug]
 * Delete group (host only).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug } = params;
    const group = await prisma.studyGroup.findUnique({
      where: { slug },
      select: { id: true, hostUserId: true },
    });
    if (!group) return notFoundError('Study group');
    if (group.hostUserId !== session.user.id) {
      return forbiddenError('Only the host can delete this group');
    }

    await prisma.studyGroup.delete({ where: { id: group.id } });

    logger.info('Study group deleted', {
      groupId: group.id,
      hostUserId: session.user.id,
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Error deleting study group', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete study group');
  }
}
