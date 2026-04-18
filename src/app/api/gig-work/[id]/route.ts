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
import { updateGigSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const EMPLOYER_INCLUDE = {
  select: {
    id: true,
    userId: true,
    companyName: true,
    companySlug: true,
    description: true,
    website: true,
    industry: true,
    size: true,
    location: true,
    logoUrl: true,
    verified: true,
  },
} as const;

/**
 * GET /api/gig-work/[id] — Fetch gig detail.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gig = await prisma.gigOpportunity.findUnique({
      where: { id: params.id },
      include: { employer: EMPLOYER_INCLUDE },
    });

    if (!gig) {
      return notFoundError('Gig');
    }

    return NextResponse.json({ success: true, data: { gig } });
  } catch (error) {
    logger.error('Failed to fetch gig detail', {
      gigId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch gig');
  }
}

/**
 * PATCH /api/gig-work/[id] — Update gig (owner only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const existing = await prisma.gigOpportunity.findUnique({
      where: { id: params.id },
      include: { employer: { select: { userId: true } } },
    });

    if (!existing) {
      return notFoundError('Gig');
    }

    if (existing.employer.userId !== session.user.id) {
      return forbiddenError('You can only update gigs you posted');
    }

    const body = await req.json();
    const validation = validateBody(updateGigSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const source = data as Record<string, any>;
    // Only set fields that were actually provided
    const fields = [
      'title',
      'description',
      'category',
      'skills',
      'workType',
      'duration',
      'hoursPerWeek',
      'budgetMin',
      'budgetMax',
      'budgetType',
      'location',
      'remoteOk',
      'clearanceRequired',
      'isActive',
    ] as const;
    for (const key of fields) {
      if (source[key] !== undefined) {
        updateData[key] = source[key];
      }
    }

    const gig = await prisma.gigOpportunity.update({
      where: { id: params.id },
      data: updateData,
      include: { employer: EMPLOYER_INCLUDE },
    });

    logger.info('Gig updated', {
      gigId: gig.id,
      userId: session.user.id,
      fields: Object.keys(updateData),
    });

    return NextResponse.json({ success: true, data: { gig } });
  } catch (error) {
    logger.error('Failed to update gig', {
      gigId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update gig');
  }
}

/**
 * DELETE /api/gig-work/[id] — Delete gig (owner only).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const existing = await prisma.gigOpportunity.findUnique({
      where: { id: params.id },
      include: { employer: { select: { userId: true } } },
    });

    if (!existing) {
      return notFoundError('Gig');
    }

    if (existing.employer.userId !== session.user.id) {
      return forbiddenError('You can only delete gigs you posted');
    }

    await prisma.gigOpportunity.delete({ where: { id: params.id } });

    logger.info('Gig deleted', {
      gigId: params.id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Failed to delete gig', {
      gigId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete gig');
  }
}
