export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, forbiddenError, internalError } from '@/lib/errors';

/**
 * GET /api/admin/compliance-qa — list ComplianceQuestion rows for the /admin
 * Compliance Q&A tab. Admin-only. 'new' questions sort first (the founder's
 * answer queue), then answered, then archived; newest first within each
 * group. Guarded against the table not being migrated yet — returns an
 * empty list with tableMissing=true instead of a 500 (same pattern as
 * /api/admin/feedback).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    let questions: Array<{
      id: string;
      question: string;
      askerName: string | null;
      askerEmail: string | null;
      status: string;
      answer: string | null;
      answeredAt: Date | null;
      published: boolean;
      notifiedAt: Date | null;
      createdAt: Date;
    }> = [];
    let tableMissing = false;

    try {
      const rows = await prisma.complianceQuestion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
      });
      const statusRank: Record<string, number> = { new: 0, answered: 1, archived: 2 };
      questions = rows.sort(
        (a, b) => (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3)
      );
    } catch (dbError) {
      // Most likely the table hasn't been migrated yet
      tableMissing = true;
      logger.warn('Admin compliance Q&A list: ComplianceQuestion query failed (table missing?)', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    return NextResponse.json({ success: true, data: { questions, tableMissing } });
  } catch (err) {
    logger.error('Admin compliance Q&A GET failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError('Failed to load compliance questions');
  }
}
