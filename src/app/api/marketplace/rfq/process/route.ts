import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// POST: Process RFQ deadlines (cron endpoint)
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Auto-transition open RFQs past deadline to evaluating
    const expiredRfqs = await prisma.rFQ.findMany({
      where: {
        status: 'open',
        deadline: { lt: now },
      },
      select: {
        id: true,
        title: true,
        buyerUserId: true,
        _count: { select: { proposals: true } },
      },
    });

    if (expiredRfqs.length > 0) {
      await prisma.rFQ.updateMany({
        where: {
          id: { in: expiredRfqs.map((r) => r.id) },
        },
        data: { status: 'evaluating' },
      });

      for (const rfq of expiredRfqs) {
        logger.info('RFQ auto-transitioned to evaluating', {
          rfqId: rfq.id,
          title: rfq.title,
          proposalCount: rfq._count.proposals,
        });
      }
    }

    // 2. Auto-close stale evaluating RFQs (no activity for 30 days)
    const staleRfqs = await prisma.rFQ.findMany({
      where: {
        status: 'evaluating',
        updatedAt: { lt: thirtyDaysAgo },
      },
      select: { id: true, title: true },
    });

    if (staleRfqs.length > 0) {
      await prisma.rFQ.updateMany({
        where: {
          id: { in: staleRfqs.map((r) => r.id) },
        },
        data: { status: 'closed' },
      });

      for (const rfq of staleRfqs) {
        logger.info('RFQ auto-closed (stale)', { rfqId: rfq.id, title: rfq.title });
      }
    }

    return NextResponse.json({
      success: true,
      transitionedToEvaluating: expiredRfqs.length,
      closedStale: staleRfqs.length,
    });
  } catch (error) {
    logger.error('RFQ processing error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to process RFQs');
  }
}
