import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { updateBuildGuideSchema, validateBody } from '@/lib/validations';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface RouteCtx {
  params: { slug: string };
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const guide = await prisma.buildGuide.findUnique({
      where: { slug: params.slug },
    });
    if (!guide) return notFoundError('Build guide');

    const session = await getServerSession(authOptions);
    const canSeeUnpublished =
      session?.user?.isAdmin || session?.user?.id === guide.authorUserId;
    if (!guide.published && !canSeeUnpublished) {
      return notFoundError('Build guide');
    }

    let authorName: string | null = null;
    if (guide.authorUserId) {
      const author = await prisma.user.findUnique({
        where: { id: guide.authorUserId },
        select: { name: true },
      });
      authorName = author?.name ?? null;
    }

    return NextResponse.json({ success: true, data: { ...guide, authorName } });
  } catch (error) {
    logger.error('Failed to fetch build guide', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch build guide');
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const guide = await prisma.buildGuide.findUnique({
      where: { slug: params.slug },
      select: { id: true, authorUserId: true },
    });
    if (!guide) return notFoundError('Build guide');

    const isAuthor = guide.authorUserId && guide.authorUserId === session.user.id;
    if (!isAuthor && !session.user.isAdmin) {
      return forbiddenError('Only the author or an admin can edit this guide');
    }

    const body = await req.json();
    const validation = validateBody(updateBuildGuideSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const { materialsList, steps, ...rest } = validation.data;
    const updated = await prisma.buildGuide.update({
      where: { id: guide.id },
      data: {
        ...rest,
        ...(materialsList !== undefined && {
          materialsList: materialsList as unknown as Prisma.InputJsonValue,
        }),
        ...(steps !== undefined && { steps: steps as unknown as Prisma.InputJsonValue }),
      },
    });

    logger.info('Build guide updated', {
      id: updated.id,
      slug: updated.slug,
      userId: session.user.id,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update build guide', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update build guide');
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const guide = await prisma.buildGuide.findUnique({
      where: { slug: params.slug },
      select: { id: true, authorUserId: true },
    });
    if (!guide) return notFoundError('Build guide');

    const isAuthor = guide.authorUserId && guide.authorUserId === session.user.id;
    if (!isAuthor && !session.user.isAdmin) {
      return forbiddenError('Only the author or an admin can delete this guide');
    }

    await prisma.buildGuide.delete({ where: { id: guide.id } });
    logger.info('Build guide deleted', { id: guide.id, userId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete build guide', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete build guide');
  }
}
