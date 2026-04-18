import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  notFoundError,
  forbiddenError,
  unauthorizedError,
  validationError,
  internalError,
} from '@/lib/errors';
import {
  updateSpeakingOpportunitySchema,
  validateBody,
} from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/speaking/[id]
 *
 * Returns an opportunity. Approved opportunities are public. Non-approved
 * are visible only to the original submitter or an admin. Contact info is
 * hidden from anonymous users.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const opportunity = await prisma.speakingOpportunity.findUnique({
      where: { id: params.id },
      include: {
        submittedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!opportunity) {
      return notFoundError('Speaking opportunity');
    }

    const isAdmin = Boolean(session?.user?.isAdmin);
    const isOwner = Boolean(
      session?.user?.id && opportunity.submittedById === session.user.id
    );

    if (opportunity.status !== 'approved' && !isAdmin && !isOwner) {
      return notFoundError('Speaking opportunity');
    }

    const isAuthed = Boolean(session?.user?.id);
    const payload = isAuthed
      ? opportunity
      : { ...opportunity, contactEmail: null, contactName: null };

    return NextResponse.json({ success: true, data: { opportunity: payload } });
  } catch (error) {
    logger.error('Error fetching speaking opportunity', {
      error: error instanceof Error ? error.message : String(error),
      id: params.id,
    });
    return internalError('Failed to load speaking opportunity');
  }
}

/**
 * PATCH /api/speaking/[id]
 *
 * Submitter can edit (while pending), admin can edit anytime AND change
 * status / featured. Non-admin edits always reset the row to pending so
 * it goes through moderation again.
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

    const existing = await prisma.speakingOpportunity.findUnique({
      where: { id: params.id },
      select: { id: true, submittedById: true, status: true },
    });
    if (!existing) {
      return notFoundError('Speaking opportunity');
    }

    const isAdmin = Boolean(session.user.isAdmin);
    const isOwner = existing.submittedById === session.user.id;
    if (!isAdmin && !isOwner) {
      return forbiddenError();
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return validationError('Invalid request body');
    }

    const validation = validateBody(updateSpeakingOpportunitySchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const d = validation.data;

    // Build the update payload — strip undefined so we don't wipe values
    const data: Record<string, unknown> = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.organization !== undefined) data.organization = d.organization;
    if (d.conferenceName !== undefined) data.conferenceName = d.conferenceName ?? null;
    if (d.topic !== undefined) data.topic = d.topic;
    if (d.description !== undefined) data.description = d.description;
    if (d.eventDate !== undefined) data.eventDate = d.eventDate;
    if (d.submissionDeadline !== undefined) data.submissionDeadline = d.submissionDeadline ?? null;
    if (d.location !== undefined) data.location = d.location ?? null;
    if (d.isRemote !== undefined) data.isRemote = d.isRemote;
    if (d.compensation !== undefined) data.compensation = d.compensation ?? null;
    if (d.audienceSize !== undefined) data.audienceSize = d.audienceSize ?? null;
    if (d.cfpUrl !== undefined) data.cfpUrl = d.cfpUrl ?? null;
    if (d.contactEmail !== undefined) data.contactEmail = d.contactEmail ?? null;
    if (d.contactName !== undefined) data.contactName = d.contactName ?? null;
    if (d.tags !== undefined) data.tags = d.tags;

    // Admin-only fields
    if (isAdmin) {
      if (d.status !== undefined) data.status = d.status;
      if (d.featured !== undefined) data.featured = d.featured;
    } else {
      // Non-admin edits require re-moderation
      data.status = 'pending';
      data.featured = false;
    }

    const updated = await prisma.speakingOpportunity.update({
      where: { id: params.id },
      data,
    });

    logger.info('Speaking opportunity updated', {
      id: updated.id,
      actorId: session.user.id,
      isAdmin,
      newStatus: updated.status,
    });

    return NextResponse.json({ success: true, data: { opportunity: updated } });
  } catch (error) {
    logger.error('Error updating speaking opportunity', {
      error: error instanceof Error ? error.message : String(error),
      id: params.id,
    });
    return internalError('Failed to update speaking opportunity');
  }
}

/**
 * DELETE /api/speaking/[id]
 *
 * Admin can always delete. Submitter can delete only while status=pending.
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

    const existing = await prisma.speakingOpportunity.findUnique({
      where: { id: params.id },
      select: { id: true, submittedById: true, status: true },
    });
    if (!existing) {
      return notFoundError('Speaking opportunity');
    }

    const isAdmin = Boolean(session.user.isAdmin);
    const isOwner = existing.submittedById === session.user.id;

    if (!isAdmin && !(isOwner && existing.status === 'pending')) {
      return forbiddenError('You cannot delete this opportunity');
    }

    await prisma.speakingOpportunity.delete({ where: { id: params.id } });

    logger.info('Speaking opportunity deleted', {
      id: params.id,
      actorId: session.user.id,
      isAdmin,
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Error deleting speaking opportunity', {
      error: error instanceof Error ? error.message : String(error),
      id: params.id,
    });
    return internalError('Failed to delete speaking opportunity');
  }
}
