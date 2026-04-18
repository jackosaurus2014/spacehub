import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  internalError,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  validationError,
} from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateBody, updateCompanyAnnouncementSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

async function loadOwnedAnnouncement(
  announcementId: string,
  companyId: string,
  userId: string
) {
  const announcement = await prisma.companyAnnouncement.findUnique({
    where: { id: announcementId },
    include: { company: { select: { id: true, claimedByUserId: true, slug: true } } },
  });
  if (!announcement || announcement.companyId !== companyId) {
    return { error: notFoundError('Announcement') as NextResponse };
  }
  if (announcement.company.claimedByUserId !== userId) {
    return { error: forbiddenError('Only the profile owner can modify announcements') as NextResponse };
  }
  return { announcement };
}

// PATCH: Owner updates an announcement
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to update announcements');
    }

    const { id, announcementId } = await params;
    const loaded = await loadOwnedAnnouncement(announcementId, id, session.user.id);
    if ('error' in loaded) return loaded.error;

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(updateCompanyAnnouncementSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const updated = await prisma.companyAnnouncement.update({
      where: { id: announcementId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl ?? null }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.pinned !== undefined && { pinned: data.pinned }),
      },
    });

    logger.info('Company announcement updated', {
      announcementId,
      companyId: id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, announcement: updated });
  } catch (error) {
    logger.error('Update announcement error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update announcement');
  }
}

// DELETE: Owner deletes an announcement
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to delete announcements');
    }

    const { id, announcementId } = await params;
    const loaded = await loadOwnedAnnouncement(announcementId, id, session.user.id);
    if ('error' in loaded) return loaded.error;

    await prisma.companyAnnouncement.delete({ where: { id: announcementId } });

    logger.info('Company announcement deleted', {
      announcementId,
      companyId: id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete announcement error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete announcement');
  }
}
