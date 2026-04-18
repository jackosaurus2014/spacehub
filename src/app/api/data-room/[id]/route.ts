import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, updateDataRoomDocSchema } from '@/lib/validations';
import { validationError, internalError, unauthorizedError, forbiddenError, notFoundError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function loadDocWithOwner(id: string) {
  return prisma.dataRoomDocument.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, slug: true, claimedByUserId: true } },
    },
  });
}

// GET /api/data-room/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = await loadDocWithOwner(id);
    if (!doc) return notFoundError('Document');

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    const isAdmin = Boolean(session?.user?.isAdmin);
    const isOwner = Boolean(userId && doc.company.claimedByUserId === userId);

    if (doc.visibility === 'invite_only' && !isOwner && !isAdmin) {
      return forbiddenError('This document is not visible to you');
    }
    if (doc.visibility === 'logged_in' && !userId) {
      return unauthorizedError('Sign in to view this document');
    }

    return NextResponse.json({ document: doc, isOwner, isAdmin });
  } catch (error) {
    logger.error('Get data room document error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch document');
  }
}

// PATCH /api/data-room/[id] — owner only
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { id } = await params;
    const doc = await loadDocWithOwner(id);
    if (!doc) return notFoundError('Document');

    const isOwner = doc.company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can update this document');
    }

    const body = await request.json();
    const validation = validateBody(updateDataRoomDocSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const updated = await prisma.dataRoomDocument.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
        ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
        ...(data.docType !== undefined && { docType: data.docType }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
      },
    });

    logger.info('Data room document updated', { documentId: id, userId: session.user.id });
    return NextResponse.json({ success: true, document: updated });
  } catch (error) {
    logger.error('Update data room document error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update document');
  }
}

// DELETE /api/data-room/[id] — owner only
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { id } = await params;
    const doc = await loadDocWithOwner(id);
    if (!doc) return notFoundError('Document');

    const isOwner = doc.company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can delete this document');
    }

    await prisma.dataRoomDocument.delete({ where: { id } });

    logger.info('Data room document deleted', { documentId: id, userId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete data room document error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to delete document');
  }
}
