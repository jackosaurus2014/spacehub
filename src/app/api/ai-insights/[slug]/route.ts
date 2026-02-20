export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const insight = await prisma.aIInsight.findUnique({
      where: { slug },
    });

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ insight });
  } catch (error) {
    logger.error('Error fetching AI insight', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch AI insight');
  }
}
