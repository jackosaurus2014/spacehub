import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, createOfficeHourSlotSchema } from '@/lib/validations';
import {
  forbiddenError,
  internalError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/office-hours/slots?mentorUserId=&status=&from=&to=
 * List office-hour slots. Open by default.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorUserId = searchParams.get('mentorUserId');
    const status = searchParams.get('status') || 'open';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10) || 50,
      200
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10) || 0,
      0
    );

    const where: Record<string, unknown> = {};
    if (mentorUserId) where.mentorUserId = mentorUserId;
    if (status && status !== 'any') where.status = status;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from && !Number.isNaN(new Date(from).getTime())) {
        range.gte = new Date(from);
      }
      if (to && !Number.isNaN(new Date(to).getTime())) {
        range.lte = new Date(to);
      }
      if (Object.keys(range).length) {
        where.startTime = range;
      }
    }
    // Default to future slots if no explicit range filter
    if (!where.startTime) {
      where.startTime = { gte: new Date() };
    }

    const [slots, total] = await Promise.all([
      prisma.officeHourSlot.findMany({
        where: where as never,
        orderBy: { startTime: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.officeHourSlot.count({ where: where as never }),
    ]);

    const mentorIds = Array.from(new Set(slots.map((s) => s.mentorUserId)));
    const mentors = mentorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mentorIds } },
          select: {
            id: true,
            name: true,
            
            verifiedBadge: true,
          },
        })
      : [];
    const mentorMap = new Map(mentors.map((m) => [m.id, m]));

    return NextResponse.json({
      success: true,
      data: {
        slots: slots.map((s) => ({
          ...s,
          mentor: mentorMap.get(s.mentorUserId) || null,
        })),
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('List office-hour slots error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch office-hour slots');
  }
}

/**
 * POST /api/office-hours/slots
 * Mentor-only. Creates a batch of slots.
 * body: { slots: [{ startTime, endTime, notes? }, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId: auth.user.id },
      select: { id: true, userId: true },
    });
    if (!mentor) {
      return forbiddenError('You must have a mentor profile to create slots');
    }

    const body = await request.json();
    const validation = validateBody(createOfficeHourSlotSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const now = Date.now();
    const input = validation.data.slots.map((s) => ({
      mentorUserId: auth.user.id!,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      notes: s.notes ?? null,
      status: 'open',
    }));

    const futureOnly = input.filter(
      (s) => s.startTime.getTime() > now - 60 * 1000
    );

    if (futureOnly.length === 0) {
      return validationError('All provided slots are in the past');
    }

    const created = await prisma.officeHourSlot.createMany({
      data: futureOnly,
      skipDuplicates: true,
    });

    logger.info('Office-hour slots created', {
      mentorUserId: auth.user.id,
      count: created.count,
    });

    return NextResponse.json(
      {
        success: true,
        data: { created: created.count, skipped: input.length - futureOnly.length },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create office-hour slots error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create office-hour slots');
  }
}
