import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { internalError, unauthorizedError, validationError } from '@/lib/errors';

// Lesson completion for signed-in learners. Anonymous learners keep
// progress in localStorage (src/lib/learn-progress.ts); this is the
// cross-device sync and the data the "finish the course" email needs.
export const dynamic = 'force-dynamic';

const postSchema = z.object({
  moduleSlug: z.string().min(1).max(120),
  lessonSlug: z.string().min(1).max(120),
  completed: z.boolean(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ completed: [] });
  try {
    const rows = await prisma.lessonProgress.findMany({
      where: { userId: session.user.id },
      select: { completedAt: true, lesson: { select: { slug: true, module: { select: { slug: true } } } } },
    });
    return NextResponse.json({
      completed: rows.map((r) => ({ moduleSlug: r.lesson.module.slug, lessonSlug: r.lesson.slug, completedAt: r.completedAt.toISOString() })),
    });
  } catch (err) {
    logger.error('learn/progress GET failed', { error: err instanceof Error ? err.message : String(err) });
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues.map((i) => i.message).join('; '));
  const { moduleSlug, lessonSlug, completed } = parsed.data;
  try {
    const lesson = await prisma.lesson.findFirst({
      where: { slug: lessonSlug, module: { slug: moduleSlug, published: true } },
      select: { id: true },
    });
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    if (completed) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: session.user.id, lessonId: lesson.id } },
        update: { completedAt: new Date() },
        create: { userId: session.user.id, lessonId: lesson.id },
      });
    } else {
      await prisma.lessonProgress.deleteMany({ where: { userId: session.user.id, lessonId: lesson.id } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('learn/progress POST failed', { error: err instanceof Error ? err.message : String(err) });
    return internalError();
  }
}
