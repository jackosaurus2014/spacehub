import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  internalError,
} from '@/lib/errors';
import { updateCountdownSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const countdown = await prisma.countdownWidget.findUnique({
      where: { slug: params.slug },
    });
    if (!countdown) return notFoundError('Countdown');
    return NextResponse.json({ success: true, data: countdown });
  } catch (error) {
    logger.error('Error fetching countdown', {
      error: error instanceof Error ? error.message : String(error),
      slug: params.slug,
    });
    return internalError('Failed to load countdown');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const existing = await prisma.countdownWidget.findUnique({
      where: { slug: params.slug },
    });
    if (!existing) return notFoundError('Countdown');
    if (existing.createdById !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You do not own this countdown');
    }

    const body = await req.json();
    const validation = validateBody(updateCountdownSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const data: Record<string, unknown> = {};
    if (validation.data.missionName !== undefined) data.missionName = validation.data.missionName;
    if (validation.data.targetTime !== undefined)
      data.targetTime = new Date(validation.data.targetTime);
    if (validation.data.eventId !== undefined) data.eventId = validation.data.eventId || null;
    if (validation.data.theme !== undefined) data.theme = validation.data.theme;

    const updated = await prisma.countdownWidget.update({
      where: { slug: params.slug },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating countdown', {
      error: error instanceof Error ? error.message : String(error),
      slug: params.slug,
    });
    return internalError('Failed to update countdown');
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const existing = await prisma.countdownWidget.findUnique({
      where: { slug: params.slug },
    });
    if (!existing) return notFoundError('Countdown');
    if (existing.createdById !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You do not own this countdown');
    }

    await prisma.countdownWidget.delete({ where: { slug: params.slug } });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Error deleting countdown', {
      error: error instanceof Error ? error.message : String(error),
      slug: params.slug,
    });
    return internalError('Failed to delete countdown');
  }
}
