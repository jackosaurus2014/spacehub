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
import { createGroupMeetingSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-groups/[slug]/meetings
 * List meetings (upcoming first, then past).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'all'; // all | upcoming | past

    const group = await prisma.studyGroup.findUnique({
      where: { slug },
      select: { id: true, isPrivate: true },
    });
    if (!group) return notFoundError('Study group');

    // Private groups: require membership
    if (group.isPrivate) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) return forbiddenError('Members only');
      const mem = await prisma.groupMembership.findUnique({
        where: {
          groupId_userId: { groupId: group.id, userId: session.user.id },
        },
        select: { id: true },
      });
      if (!mem) return forbiddenError('Members only');
    }

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { groupId: group.id };
    if (scope === 'upcoming') where.scheduledAt = { gte: now };
    else if (scope === 'past') where.scheduledAt = { lt: now };

    const meetings = await prisma.groupMeeting.findMany({
      where,
      orderBy: { scheduledAt: scope === 'past' ? 'desc' : 'asc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: { meetings },
    });
  } catch (error) {
    logger.error('Error listing group meetings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list meetings');
  }
}

/**
 * POST /api/study-groups/[slug]/meetings
 * Schedule a meeting (host only).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { slug } = params;
    const group = await prisma.studyGroup.findUnique({
      where: { slug },
      select: { id: true, hostUserId: true },
    });
    if (!group) return notFoundError('Study group');
    if (group.hostUserId !== session.user.id) {
      return forbiddenError('Only the host can schedule meetings');
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(createGroupMeetingSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;
    const meeting = await prisma.groupMeeting.create({
      data: {
        groupId: group.id,
        title: data.title,
        scheduledAt: new Date(data.scheduledAt),
        durationMin: data.durationMin ?? 60,
        streamUrl: data.streamUrl ?? null,
        agendaMd: data.agendaMd ?? null,
      },
    });

    logger.info('Group meeting created', {
      groupId: group.id,
      meetingId: meeting.id,
    });

    return NextResponse.json(
      { success: true, data: meeting },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating group meeting', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create meeting');
  }
}
