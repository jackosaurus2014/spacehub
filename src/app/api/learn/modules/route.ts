import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  createCourseModuleSchema,
  validateBody,
  LEARNING_TRACKS,
} from '@/lib/validations';
import {
  alreadyExistsError,
  forbiddenError,
  internalError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const track = searchParams.get('track');
    const publishedParam = searchParams.get('published');
    const session = await getServerSession(authOptions);

    const where: Record<string, unknown> = {};
    if (track && (LEARNING_TRACKS as readonly string[]).includes(track)) {
      where.track = track;
    }
    // Only admins can see unpublished modules
    if (publishedParam === 'false' && session?.user?.isAdmin) {
      where.published = false;
    } else if (publishedParam === 'all' && session?.user?.isAdmin) {
      // no filter
    } else {
      where.published = true;
    }

    const modules = await prisma.courseModule.findMany({
      where,
      orderBy: [{ track: 'asc' }, { orderIndex: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        track: true,
        level: true,
        estimatedMinutes: true,
        heroImageUrl: true,
        published: true,
        orderIndex: true,
        updatedAt: true,
        _count: { select: { lessons: true } },
      },
    });

    return NextResponse.json({ success: true, data: modules });
  } catch (error) {
    logger.error('Failed to list course modules', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list modules');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await req.json();
    const validation = validateBody(createCourseModuleSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const existing = await prisma.courseModule.findUnique({
      where: { slug: validation.data.slug },
      select: { id: true },
    });
    if (existing) return alreadyExistsError('Course module with that slug');

    const mod = await prisma.courseModule.create({
      data: validation.data,
    });

    logger.info('Course module created', { id: mod.id, slug: mod.slug, userId: session.user.id });
    return NextResponse.json({ success: true, data: mod }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create course module', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create module');
  }
}
