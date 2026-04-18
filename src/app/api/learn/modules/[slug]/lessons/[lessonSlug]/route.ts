import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { updateLessonSchema, validateBody } from '@/lib/validations';
import {
  forbiddenError,
  internalError,
  notFoundError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface RouteCtx {
  params: { slug: string; lessonSlug: string };
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const lesson = await prisma.lesson.findFirst({
      where: {
        slug: params.lessonSlug,
        module: { slug: params.slug },
      },
      include: {
        module: {
          select: {
            id: true,
            slug: true,
            title: true,
            track: true,
            published: true,
          },
        },
      },
    });
    if (!lesson) return notFoundError('Lesson');

    const session = await getServerSession(authOptions);
    if (!lesson.module.published && !session?.user?.isAdmin) {
      return notFoundError('Lesson');
    }

    return NextResponse.json({ success: true, data: lesson });
  } catch (error) {
    logger.error('Failed to fetch lesson', {
      moduleSlug: params.slug,
      lessonSlug: params.lessonSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch lesson');
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) return forbiddenError('Admin access required');

    const lesson = await prisma.lesson.findFirst({
      where: { slug: params.lessonSlug, module: { slug: params.slug } },
      select: { id: true },
    });
    if (!lesson) return notFoundError('Lesson');

    const body = await req.json();
    const validation = validateBody(updateLessonSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const { interactiveConfig, ...rest } = validation.data;
    const updated = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        ...rest,
        ...(interactiveConfig !== undefined && {
          interactiveConfig: interactiveConfig as Prisma.InputJsonValue,
        }),
      },
    });

    logger.info('Lesson updated', { id: updated.id, userId: session.user.id });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update lesson', {
      moduleSlug: params.slug,
      lessonSlug: params.lessonSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update lesson');
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) return forbiddenError('Admin access required');

    const lesson = await prisma.lesson.findFirst({
      where: { slug: params.lessonSlug, module: { slug: params.slug } },
      select: { id: true },
    });
    if (!lesson) return notFoundError('Lesson');

    await prisma.lesson.delete({ where: { id: lesson.id } });
    logger.info('Lesson deleted', { id: lesson.id, userId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete lesson', {
      moduleSlug: params.slug,
      lessonSlug: params.lessonSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete lesson');
  }
}
