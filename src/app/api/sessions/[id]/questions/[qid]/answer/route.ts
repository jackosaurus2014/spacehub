import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications-server';
import { validateBody, answerQuestionSchema } from '@/lib/validations';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/sessions/[id]/questions/[qid]/answer
 * Host only — mark a question answered and optionally include an answer.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; qid: string } }
) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const sessionRow = await prisma.expertSession.findUnique({
      where: { id: params.id },
      select: { id: true, hostUserId: true, title: true },
    });
    if (!sessionRow) {
      return notFoundError('Session');
    }
    if (sessionRow.hostUserId !== auth.user.id) {
      return forbiddenError('Only the session host can answer questions');
    }

    const question = await prisma.sessionQuestion.findFirst({
      where: { id: params.qid, sessionId: sessionRow.id },
      select: { id: true, askerId: true, body: true },
    });
    if (!question) {
      return notFoundError('Question');
    }

    const body = await request.json();
    const validation = validateBody(answerQuestionSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const { answerText, answered } = validation.data;
    const nowAnswered = answered ?? true;

    const updated = await prisma.sessionQuestion.update({
      where: { id: question.id },
      data: {
        answered: nowAnswered,
        answerText: answerText ?? null,
        answeredAt: nowAnswered ? new Date() : null,
      },
    });

    logger.info('Session question answered', {
      sessionId: sessionRow.id,
      questionId: question.id,
      hostUserId: auth.user.id,
      answered: nowAnswered,
    });

    // Notify the asker
    if (nowAnswered && question.askerId !== auth.user.id) {
      createNotification({
        userId: question.askerId,
        type: 'system',
        title: 'Your question was answered',
        message: `Your question on "${sessionRow.title}" has been answered.`,
        relatedUserId: auth.user.id,
        relatedContentType: 'session_question',
        relatedContentId: question.id,
        linkUrl: `/amas/${sessionRow.id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: { question: updated } });
  } catch (error) {
    logger.error('Answer question error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
      qid: params.qid,
    });
    return internalError('Failed to update question');
  }
}
