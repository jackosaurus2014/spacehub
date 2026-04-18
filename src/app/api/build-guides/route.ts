import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  createBuildGuideSchema,
  validateBody,
  BUILD_TRACKS,
} from '@/lib/validations';
import {
  alreadyExistsError,
  internalError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const track = searchParams.get('track');
    const session = await getServerSession(authOptions);
    const authorMine = searchParams.get('mine') === 'true' && session?.user?.id;

    const where: Record<string, unknown> = {};
    if (track && (BUILD_TRACKS as readonly string[]).includes(track)) {
      where.track = track;
    }
    if (authorMine) {
      where.authorUserId = session!.user!.id;
    } else if (!session?.user?.isAdmin) {
      where.published = true;
    }

    const guides = await prisma.buildGuide.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        track: true,
        difficulty: true,
        estimatedHours: true,
        published: true,
        authorUserId: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, data: guides });
  } catch (error) {
    logger.error('Failed to list build guides', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list build guides');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await req.json();
    const validation = validateBody(createBuildGuideSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const existing = await prisma.buildGuide.findUnique({
      where: { slug: validation.data.slug },
      select: { id: true },
    });
    if (existing) return alreadyExistsError('Build guide with that slug');

    const { materialsList, steps, ...rest } = validation.data;
    const guide = await prisma.buildGuide.create({
      data: {
        ...rest,
        authorUserId: session.user.id,
        materialsList: materialsList as unknown as Prisma.InputJsonValue,
        steps: steps as unknown as Prisma.InputJsonValue,
      },
    });

    logger.info('Build guide created', {
      id: guide.id,
      slug: guide.slug,
      userId: session.user.id,
    });
    return NextResponse.json({ success: true, data: guide }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create build guide', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create build guide');
  }
}
