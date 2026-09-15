export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  createSuccessResponse,
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { countRegistrations, getScheduledCall, listArchivedCalls } from '@/lib/research-call';

/**
 * THE ONE PLACE A BRIEFING CALL COMES INTO EXISTENCE.
 *
 * Everything else about the quarterly call is built — registration, the
 * calendar invite, the attendee list, the archive, the capability bullet on
 * /research. All of it is inert until a human puts a date here, and that is
 * deliberate: the call needs a host, and the site must not advertise an event
 * nobody has committed to hosting.
 *
 * WHAT THE FOUNDER SUPPLIES
 *   POST   { title, scheduledAt (ISO, UTC), durationMinutes?, joinUrl?,
 *            periodLabel?, agenda?: string[] }        → schedules a call
 *   PATCH  { id, recordingUrl?, slidesUrl?, summary?, status? }
 *                                                     → archives it afterwards
 *   GET                                               → what is scheduled now
 *
 * Admin-gated exactly like every other /api/admin route.
 */

const createSchema = z.object({
  title: z.string().min(4).max(200),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(240).optional(),
  joinUrl: z.string().url().max(500).optional(),
  periodLabel: z.string().max(40).optional(),
  agenda: z.array(z.string().max(300)).max(20).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  recordingUrl: z.string().url().max(500).nullable().optional(),
  slidesUrl: z.string().url().max(500).nullable().optional(),
  summary: z.string().max(8000).nullable().optional(),
  joinUrl: z.string().url().max(500).nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'held', 'canceled']).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: unauthorizedError() };
  if (!session.user.isAdmin) return { error: forbiddenError('Admin access required') };
  return { userId: session.user.id };
}

export async function GET() {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;

  const scheduled = await getScheduledCall();
  const archive = await listArchivedCalls(20);
  const registrations = scheduled ? await countRegistrations(scheduled.id) : 0;

  return createSuccessResponse({
    scheduled,
    registrations,
    archive,
    note: scheduled
      ? 'A call is scheduled. /research/call shows the date, the invite and registration to seat holders, and /research advertises the call only while this row exists.'
      : 'No call is scheduled. /research/call says so plainly and offers no registration; nothing on the site advertises a briefing call. POST a title and a scheduledAt to change that.',
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError('Send a JSON body.');
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      `title and scheduledAt (ISO 8601, UTC) are required. ${parsed.error.issues[0]?.message ?? ''}`
    );
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (scheduledAt.getTime() < Date.now()) {
    return validationError('scheduledAt is in the past.');
  }

  try {
    const call = await prisma.researchCall.create({
      data: {
        status: 'scheduled',
        title: parsed.data.title,
        periodLabel: parsed.data.periodLabel ?? null,
        scheduledAt,
        durationMinutes: parsed.data.durationMinutes ?? 45,
        joinUrl: parsed.data.joinUrl ?? null,
        agenda: parsed.data.agenda ?? [],
      },
      select: { id: true, title: true, scheduledAt: true },
    });
    logger.info('Research briefing call scheduled', {
      callId: call.id,
      scheduledAt: call.scheduledAt?.toISOString(),
    });
    return createSuccessResponse({
      call,
      next: 'Seat holders can now register at /research/call and download the calendar invite. Add recordingUrl or slidesUrl with PATCH after the call to archive it.',
    });
  } catch (error) {
    logger.error('Research call create failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not schedule that call.');
  }
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError('Send a JSON body.');
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(`id is required. ${parsed.error.issues[0]?.message ?? ''}`);
  }
  const { id, status, scheduledAt, ...rest } = parsed.data;

  try {
    const existing = await prisma.researchCall.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return notFoundError('No such call.');

    const call = await prisma.researchCall.update({
      where: { id },
      data: {
        ...rest,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(status ? { status } : {}),
        ...(status === 'held' ? { heldAt: new Date() } : {}),
        ...(status === 'canceled' ? { canceledAt: new Date() } : {}),
      },
      select: { id: true, status: true, recordingUrl: true, slidesUrl: true },
    });
    return createSuccessResponse({ call });
  } catch (error) {
    logger.error('Research call update failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not update that call.');
  }
}
