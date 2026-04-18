import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError, forbiddenError, unauthorizedError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/data-room/[id]/view — record access (auth optional)
// Data room documents don't have a dedicated view-log model, so we only
// enforce visibility here and log via the structured logger.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const doc = await prisma.dataRoomDocument.findUnique({
      where: { id },
      include: { company: { select: { id: true, claimedByUserId: true } } },
    });
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

    logger.info('Data room document viewed', {
      documentId: doc.id,
      companyId: doc.companyId,
      userId,
      docType: doc.docType,
      visibility: doc.visibility,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Record data room view error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to record view');
  }
}
