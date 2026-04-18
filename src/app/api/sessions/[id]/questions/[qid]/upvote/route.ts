import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  internalError,
  notFoundError,
  unauthorizedError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/[id]/questions/[qid]/upvote
 * Authenticated users can upvote a question.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; qid: string } }
) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const question = await prisma.sessionQuestion.findFirst({
      where: { id: params.qid, sessionId: params.id },
      select: { id: true },
    });
    if (!question) {
      return notFoundError('Question');
    }

    const updated = await prisma.sessionQuestion.update({
      where: { id: question.id },
      data: { upvotes: { increment: 1 } },
      select: { id: true, upvotes: true },
    });

    logger.info('Session question upvoted', {
      questionId: question.id,
      userId: auth.user.id,
      upvotes: updated.upvotes,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Upvote question error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
      qid: params.qid,
    });
    return internalError('Failed to upvote question');
  }
}
