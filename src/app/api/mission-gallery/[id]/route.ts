import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, updateMissionPhotoSchema } from '@/lib/validations';
import {
  validationError,
  internalError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/mission-gallery/[id] — public detail (only approved unless admin/uploader)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const photo = await prisma.missionPhoto.findUnique({ where: { id } });
    if (!photo) return notFoundError('Mission photo');

    if (!photo.approved) {
      const session = await getServerSession(authOptions);
      const isAdmin = Boolean(session?.user?.isAdmin);
      const isUploader = Boolean(
        session?.user?.id && photo.uploadedById === session.user.id
      );
      if (!isAdmin && !isUploader) {
        return notFoundError('Mission photo');
      }
    }

    return NextResponse.json({ photo });
  } catch (error) {
    logger.error('Get mission photo error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch mission photo');
  }
}

// PATCH /api/mission-gallery/[id] — admin only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { id } = await params;
    const photo = await prisma.missionPhoto.findUnique({ where: { id } });
    if (!photo) return notFoundError('Mission photo');

    const body = await request.json();
    const validation = validateBody(updateMissionPhotoSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const updated = await prisma.missionPhoto.update({
      where: { id },
      data: {
        ...(data.missionName !== undefined && { missionName: data.missionName }),
        ...(data.missionSlug !== undefined && {
          missionSlug: data.missionSlug || null,
        }),
        ...(data.eventId !== undefined && { eventId: data.eventId || null }),
        ...(data.companyId !== undefined && {
          companyId: data.companyId || null,
        }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        ...(data.thumbnailUrl !== undefined && {
          thumbnailUrl: data.thumbnailUrl || null,
        }),
        ...(data.credit !== undefined && { credit: data.credit || null }),
        ...(data.creditUrl !== undefined && {
          creditUrl: data.creditUrl || null,
        }),
        ...(data.takenAt !== undefined && {
          takenAt: data.takenAt ? new Date(data.takenAt) : null,
        }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.category !== undefined && { category: data.category || null }),
        ...(data.featured !== undefined && { featured: data.featured }),
        ...(data.approved !== undefined && { approved: data.approved }),
      },
    });

    logger.info('Mission photo updated', {
      photoId: id,
      adminId: session.user.id,
    });

    return NextResponse.json({ success: true, photo: updated });
  } catch (error) {
    logger.error('Update mission photo error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update mission photo');
  }
}

// DELETE /api/mission-gallery/[id] — admin only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { id } = await params;
    const photo = await prisma.missionPhoto.findUnique({ where: { id } });
    if (!photo) return notFoundError('Mission photo');

    await prisma.missionPhoto.delete({ where: { id } });

    logger.info('Mission photo deleted', {
      photoId: id,
      adminId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete mission photo error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete mission photo');
  }
}
