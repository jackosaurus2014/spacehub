export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, forbiddenError, internalError } from '@/lib/errors';
import { isFeedbackStatus } from '@/lib/feedback';

/**
 * GET /api/admin/feedback — list FeedbackSubmission rows for triage in the
 * /admin Feedback tab. Admin-only. Optional ?status=new|reviewed|actioned
 * filter. Guarded against the table not being migrated yet (code can deploy
 * ahead of `prisma db push`) — returns an empty list with tableMissing=true
 * instead of a 500.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const statusParam = request.nextUrl.searchParams.get('status');
    const statusFilter = isFeedbackStatus(statusParam) ? statusParam : undefined;

    let submissions: Array<{
      id: string;
      category: string;
      message: string;
      page: string | null;
      email: string | null;
      userId: string | null;
      status: string;
      createdAt: Date;
    }> = [];
    let counts: Record<string, number> = {};
    let tableMissing = false;

    try {
      const [rows, grouped] = await Promise.all([
        prisma.feedbackSubmission.findMany({
          where: statusFilter ? { status: statusFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        prisma.feedbackSubmission.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
      ]);
      submissions = rows;
      counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
    } catch (dbError) {
      // Most likely the table hasn't been migrated yet
      tableMissing = true;
      logger.warn('Admin feedback list: FeedbackSubmission query failed (table missing?)', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    return NextResponse.json({
      success: true,
      data: { submissions, counts, tableMissing },
    });
  } catch (err) {
    logger.error('Admin feedback GET failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError('Failed to load feedback submissions');
  }
}
