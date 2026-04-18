import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { updateCourseModuleSchema, validateBody } from '@/lib/validations';
import {
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
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            orderIndex: true,
            interactiveType: true,
          },
        },
      },
    });
    if (!mod) return notFoundError('Module');

    const session = await getServerSession(authOptions);
    if (!mod.published && !session?.user?.isAdmin) {
      return notFoundError('Module');
    }

    return NextResponse.json({ success: true, data: mod });
  } catch (error) {
    logger.error('Failed to fetch module', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch module');
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) return forbiddenError('Admin access required');

    const body = await req.json();
    const validation = validateBody(updateCourseModuleSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const existing = await prisma.courseModule.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!existing) return notFoundError('Module');

    const updated = await prisma.courseModule.update({
      where: { id: existing.id },
      data: validation.data,
    });
    logger.info('Course module updated', {
      id: updated.id,
      slug: updated.slug,
      userId: session.user.id,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update module', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update module');
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) return forbiddenError('Admin access required');

    const existing = await prisma.courseModule.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!existing) return notFoundError('Module');

    await prisma.courseModule.delete({ where: { id: existing.id } });
    logger.info('Course module deleted', { id: existing.id, userId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete module', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete module');
  }
}
