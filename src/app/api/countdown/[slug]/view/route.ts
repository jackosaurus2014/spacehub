import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { notFoundError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const isEmbed = searchParams.get('embed') === 'true';

    const existing = await prisma.countdownWidget.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!existing) return notFoundError('Countdown');

    const data: Record<string, unknown> = { views: { increment: 1 } };
    if (isEmbed) {
      data.embedsCount = { increment: 1 };
    }

    const updated = await prisma.countdownWidget.update({
      where: { slug: params.slug },
      data,
      select: { views: true, embedsCount: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error recording countdown view', {
      error: error instanceof Error ? error.message : String(error),
      slug: params.slug,
    });
    return internalError('Failed to record view');
  }
}
