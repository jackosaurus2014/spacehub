import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { authOptions } from '@/lib/auth';

const npsSchema = z.object({
  score: z.number().int().min(0).max(10),
  feedback: z.string().max(1000).optional(),
});

/**
 * POST /api/nps — Submit NPS score
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = npsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await (prisma as any).npsResponse.create({
      data: {
        userId: user.id,
        score: validation.data.score,
        feedback: validation.data.feedback || null,
      },
    });

    logger.info('NPS response recorded', {
      userId: user.id,
      score: validation.data.score,
      hasFeedback: !!validation.data.feedback,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('NPS: failed to record response', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/nps — Get NPS stats (admin only) or redirect from email links
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scoreParam = searchParams.get('score');

  // If score param present, this is a click from an email NPS link
  if (scoreParam) {
    const score = parseInt(scoreParam, 10);
    if (score >= 0 && score <= 10) {
      // Redirect to app with score pre-filled (handled by client-side)
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';
      return NextResponse.redirect(`${APP_URL}/mission-control?nps=${score}`);
    }
  }

  // Otherwise return aggregate stats for admin
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const responses = await (prisma as any).npsResponse.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      score: true,
      feedback: true,
      createdAt: true,
    },
  });

  const total = responses.length;
  const promoters = responses.filter((r: any) => r.score >= 9).length;
  const passives = responses.filter((r: any) => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter((r: any) => r.score <= 6).length;
  const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  return NextResponse.json({
    npsScore,
    total,
    promoters,
    passives,
    detractors,
    recentResponses: responses.slice(0, 20),
  });
}
