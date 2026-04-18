import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createLessonSchema, validateBody } from '@/lib/validations';
import {
  alreadyExistsError,
  forbiddenError,
  internalError,
  notFoundError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface RouteCtx {
  params: { slug: string };
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const mod = await prisma.courseModule.findUnique({
      where: { slug: params.slug },
      select: { id: true, published: true },
    });
    if (!mod) return notFoundError('Module');

    const session = await getServerSession(authOptions);
    if (!mod.published && !session?.user?.isAdmin) {
      return notFoundError('Module');
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId: mod.id },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        videoUrl: true,
        interactiveType: true,
        orderIndex: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ success: true, data: lessons });
  } catch (error) {
    logger.error('Failed to list lessons', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list lessons');
  }
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) return forbiddenError('Admin access required');

    const mod = await prisma.courseModule.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!mod) return notFoundError('Module');

    const body = await req.json();
    const validation = validateBody(createLessonSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const existing = await prisma.lesson.findUnique({
      where: { moduleId_slug: { moduleId: mod.id, slug: validation.data.slug } },
      select: { id: true },
    });
    if (existing) return alreadyExistsError('Lesson with that slug');

    const { interactiveConfig, ...rest } = validation.data;
    const lesson = await prisma.lesson.create({
      data: {
        ...rest,
        moduleId: mod.id,
        interactiveConfig: interactiveConfig
          ? (interactiveConfig as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    logger.info('Lesson created', {
      id: lesson.id,
      moduleSlug: params.slug,
      userId: session.user.id,
    });
    return NextResponse.json({ success: true, data: lesson }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create lesson', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create lesson');
  }
}
