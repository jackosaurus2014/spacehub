export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError } from '@/lib/errors';

/**
 * POST /api/ai-insights/bulk-publish
 *
 * Publishes all AI insights currently in "pending_review" status.
 * Requires admin session ONLY — no CRON_SECRET to prevent automated bypass of human review.
 */
export async function POST(request: NextRequest) {
  try {
    // Admin session required — no CRON_SECRET bypass for publishing
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return unauthorizedError('Admin session required to bulk-publish');
    }

    // Find all pending_review insights
    const pending = await (prisma.aIInsight as any).findMany({
      where: { status: 'pending_review' },
      select: { id: true, title: true, slug: true, generatedAt: true, factCheckNote: true },
      orderBy: { generatedAt: 'asc' },
    });

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending insights to publish',
        published: 0,
      });
    }

    // Bulk update all pending_review → published
    const result = await (prisma.aIInsight as any).updateMany({
      where: { status: 'pending_review' },
      data: { status: 'published', reviewToken: null },
    });

    logger.info('Bulk-published pending AI insights', {
      count: result.count,
      slugs: pending.map((p: any) => p.slug),
    });

    return NextResponse.json({
      success: true,
      published: result.count,
      insights: pending.map((p: any) => ({
        title: p.title,
        slug: p.slug,
        generatedAt: p.generatedAt,
      })),
    });
  } catch (error) {
    logger.error('Bulk-publish failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to bulk-publish insights' }, { status: 500 });
  }
}
