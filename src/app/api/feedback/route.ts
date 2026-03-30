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

const feedbackSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(2000).transform(v => v.replace(/<[^>]*>/g, '')).optional(),
  pageUrl: z.string().max(500).optional(),
});

/**
 * POST /api/feedback — Submit in-app feedback (NPS score + optional comment)
 * Works for both authenticated and anonymous users.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = feedbackSchema.safeParse(body);
    if (!validation.success) {
      return validationError('Invalid feedback data');
    }

    // Try to get user ID if logged in (but don't require it)
    let userId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });
        userId = user?.id ?? null;
      }
    } catch {
      // Proceed without userId — anonymous feedback is fine
    }

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
