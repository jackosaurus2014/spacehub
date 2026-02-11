import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notFoundError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const explainer = await (prisma as any).regulationExplainer.findUnique({
      where: { slug },
    });

    if (!explainer) {
      return notFoundError('Regulation explainer');
    }

    // Increment view count (fire-and-forget)
    (prisma as any).regulationExplainer.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    // Parse JSON fields
    let affectedCompanyTypes: string[] = [];
    let sourceUrls: string[] = [];
    try { affectedCompanyTypes = JSON.parse(explainer.affectedCompanyTypes || '[]'); } catch {}
    try { sourceUrls = JSON.parse(explainer.sourceUrls || '[]'); } catch {}

    return NextResponse.json({
      ...explainer,
      affectedCompanyTypes,
      sourceUrls,
    });
  } catch (error) {
    logger.error('Failed to fetch regulation explainer detail', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch regulation explainer');
  }
}
