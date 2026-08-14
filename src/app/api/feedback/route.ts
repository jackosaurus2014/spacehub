import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { authOptions } from '@/lib/auth';
import {
  validationError,
  internalError,
  forbiddenError,
  unauthorizedError,
} from '@/lib/errors';
import { feedbackSubmissionSchema, sendFeedbackNotificationEmail } from '@/lib/feedback';

const feedbackSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(2000).transform(v => v.replace(/<[^>]*>/g, '')).optional(),
  pageUrl: z.string().max(500).optional(),
});

/** Best-effort userId lookup — anonymous feedback is always fine. */
async function resolveUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      return user?.id ?? null;
    }
  } catch {
    // Proceed without userId
  }
  return null;
}

/** UTC midnight of "today" — window for the daily notification cap. */
function utcDayStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Handle the structured questionnaire shape from /feedback
 * ({ category, message, page?, email? }) — stores a FeedbackSubmission row
 * and sends a capped founder notification email (see src/lib/feedback.ts).
 */
async function handleQuestionnaireSubmission(body: unknown): Promise<NextResponse> {
  const validation = feedbackSubmissionSchema.safeParse(body);
  if (!validation.success) {
    return validationError('Invalid feedback data');
  }

  const userId = await resolveUserId();
  const { category, message, page, email } = validation.data;

  const submission = await prisma.feedbackSubmission.create({
    data: {
      category,
      message,
      page: page || null,
      email: email || null,
      userId,
      status: 'new',
    },
  });

  logger.info('Feedback submission recorded', {
    id: submission.id,
    category,
    page: page || null,
    hasEmail: !!email,
    userId: userId || 'anonymous',
  });

  // Founder notification — best-effort, capped per UTC day so a burst rolls
  // into the weekly CEO brief instead of spamming the inbox.
  try {
    const submissionNumberToday = await prisma.feedbackSubmission.count({
      where: { createdAt: { gte: utcDayStart() } },
    });
    await sendFeedbackNotificationEmail({
      id: submission.id,
      category,
      message,
      page,
      email,
      userId,
      submissionNumberToday,
    });
  } catch (notifyError) {
    logger.warn('Feedback: notification step failed (submission stored)', {
      id: submission.id,
      error: notifyError instanceof Error ? notifyError.message : String(notifyError),
    });
  }

  return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
}

/**
 * POST /api/feedback — Submit in-app feedback.
 *
 * Accepts two shapes (both work for authenticated and anonymous users):
 *  - Questionnaire (from /feedback): { category, message, page?, email? }
 *    → FeedbackSubmission row + capped founder notification email.
 *  - Legacy NPS widget: { score, comment?, pageUrl? } → UserFeedback row.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Questionnaire shape is distinguished by the presence of `category`.
    if (body && typeof body === 'object' && 'category' in body) {
      return await handleQuestionnaireSubmission(body);
    }

    const validation = feedbackSchema.safeParse(body);
    if (!validation.success) {
      return validationError('Invalid feedback data');
    }

    const userId = await resolveUserId();

    const userAgent = request.headers.get('user-agent') || undefined;

    await prisma.userFeedback.create({
      data: {
        userId,
        score: validation.data.score,
        comment: validation.data.comment || null,
        pageUrl: validation.data.pageUrl || null,
        userAgent: userAgent
          ? userAgent.substring(0, 500)
          : null,
      },
    });

    logger.info('User feedback recorded', {
      userId: userId || 'anonymous',
      score: validation.data.score,
      hasComment: !!validation.data.comment,
      pageUrl: validation.data.pageUrl,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error('Feedback: failed to record', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return internalError('Failed to save feedback');
  }
}

/**
 * GET /api/feedback — Aggregate feedback stats (admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorizedError();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return forbiddenError();
    }

    const [totalCount, responses] = await Promise.all([
      prisma.userFeedback.count(),
      prisma.userFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          score: true,
          comment: true,
          pageUrl: true,
          createdAt: true,
          userId: true,
        },
      }),
    ]);

    const scores = responses.map((r) => r.score);
    const promoters = scores.filter((s) => s >= 9).length;
    const detractors = scores.filter((s) => s <= 6).length;
    const sampleSize = scores.length;
    const npsScore =
      sampleSize > 0
        ? Math.round(((promoters - detractors) / sampleSize) * 100)
        : 0;
    const avgScore =
      sampleSize > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / sampleSize) * 10) /
          10
        : 0;

    const withComments = responses.filter((r) => r.comment);

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        npsScore,
        avgScore,
        breakdown: {
          promoters,
          passives: sampleSize - promoters - detractors,
          detractors,
        },
        recentResponses: responses.slice(0, 25),
        recentComments: withComments.slice(0, 15),
      },
    });
  } catch (error) {
    logger.error('Feedback: failed to fetch stats', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return internalError('Failed to fetch feedback stats');
  }
}
