import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, submitQuestionSchema } from '@/lib/validations';
import {
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/[id]/questions
 * Anyone can list questions; sorted by upvotes desc.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await prisma.expertSession.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!session) {
      return notFoundError('Session');
    }

    const questions = await prisma.sessionQuestion.findMany({
      where: { sessionId: params.id },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
      take: 500,
    });

    const askerIds = Array.from(new Set(questions.map((q) => q.askerId)));
    const askers = askerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: askerIds } },
          select: { id: true, name: true,  },
        })
      : [];
    const askerMap = new Map(askers.map((a) => [a.id, a]));

    return NextResponse.json({
      success: true,
      data: {
        questions: questions.map((q) => ({
          ...q,
          asker: askerMap.get(q.askerId) || null,
        })),
      },
    });
  } catch (error) {
    logger.error('List questions error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
    });
    return internalError('Failed to fetch questions');
  }
}

/**
 * POST /api/sessions/[id]/questions
 * Attendees submit a question.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const sessionRow = await prisma.expertSession.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!sessionRow) {
      return notFoundError('Session');
    }
    if (sessionRow.status === 'cancelled') {
      return validationError('This session has been cancelled');
    }

    const body = await request.json();
    const validation = validateBody(submitQuestionSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const question = await prisma.sessionQuestion.create({
      data: {
        sessionId: sessionRow.id,
        askerId: auth.user.id,
        body: validation.data.body,
      },
    });

    logger.info('Session question submitted', {
      sessionId: sessionRow.id,
      questionId: question.id,
      askerId: auth.user.id,
    });

    return NextResponse.json(
      { success: true, data: { question } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Submit question error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
    });
    return internalError('Failed to submit question');
  }
}
