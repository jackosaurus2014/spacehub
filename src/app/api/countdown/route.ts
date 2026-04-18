import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  internalError,
  conflictError,
  constrainPagination,
  constrainOffset,
} from '@/lib/errors';
import { createCountdownSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Generate a URL-safe slug from a string, with random suffix for uniqueness. */
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : `countdown-${suffix}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '24'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));
    const upcomingOnly = searchParams.get('upcoming') === 'true';

    const where: Record<string, unknown> = {};
    if (upcomingOnly) {
      where.targetTime = { gt: new Date() };
    }

    const [countdowns, total] = await Promise.all([
      prisma.countdownWidget.findMany({
        where,
        orderBy: { targetTime: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.countdownWidget.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        countdowns,
        total,
        hasMore: offset + countdowns.length < total,
      },
    });
  } catch (error) {
    logger.error('Error listing countdowns', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load countdowns');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to create a countdown');
    }

    const body = await req.json();
    const validation = validateBody(createCountdownSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const { missionName, targetTime, eventId, theme, slug: providedSlug } =
      validation.data;

    // Resolve slug (provided or generated). On collision, retry with new suffix.
    let slug = providedSlug?.toLowerCase() || slugify(missionName);
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.countdownWidget.findUnique({ where: { slug } });
      if (!existing) break;
      if (providedSlug) {
        return conflictError('A countdown with that slug already exists');
      }
      slug = slugify(missionName);
      attempts++;
    }

    const countdown = await prisma.countdownWidget.create({
      data: {
        slug,
        missionName,
        targetTime: new Date(targetTime),
        eventId: eventId || null,
        theme,
        createdById: session.user.id,
      },
    });

    logger.info('Countdown created', {
      id: countdown.id,
      slug: countdown.slug,
      createdById: session.user.id,
    });

    return NextResponse.json({ success: true, data: countdown }, { status: 201 });
  } catch (error) {
    logger.error('Error creating countdown', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create countdown');
  }
}
