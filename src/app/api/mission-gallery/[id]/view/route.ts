import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// POST /api/mission-gallery/[id]/view — increment view counter (no auth required)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const photo = await prisma.missionPhoto.findUnique({
      where: { id },
      select: { id: true, approved: true },
    });
    if (!photo || !photo.approved) {
      return notFoundError('Mission photo');
    }

    await prisma.missionPhoto.update({
      where: { id: photo.id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Record mission photo view error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to record view');
  }
}
