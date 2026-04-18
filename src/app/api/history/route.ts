import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  internalError,
  validationError,
  forbiddenError,
  alreadyExistsError,
  constrainPagination,
} from '@/lib/errors';
import {
  createHistoryEventSchema,
  validateBody,
  HISTORY_CATEGORIES,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

type HistoryWhere = Prisma.SpaceHistoryEventWhereInput;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const decadeParam = searchParams.get('decade');
    const category = searchParams.get('category');
    const companyId = searchParams.get('companyId');
    const q = (searchParams.get('q') || '').trim();
    const featuredParam = searchParams.get('featured');
    const sort = (searchParams.get('sort') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const limitRaw = parseInt(searchParams.get('limit') || '25', 10);

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = constrainPagination(Number.isFinite(limitRaw) ? limitRaw : 25, 100);
    const offset = (page - 1) * limit;

    const where: HistoryWhere = {};

    if (decadeParam) {
      const decade = parseInt(decadeParam, 10);
      if (Number.isFinite(decade) && decade >= 1800 && decade <= 2100) {
        where.year = { gte: decade, lt: decade + 10 };
      }
    }

    if (category && (HISTORY_CATEGORIES as readonly string[]).includes(category)) {
      where.category = category;
    }

    if (companyId) {
      where.relatedCompanyIds = { has: companyId };
    }

    if (featuredParam === 'true') {
      where.featured = true;
    } else if (featuredParam === 'false') {
      where.featured = false;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.spaceHistoryEvent.findMany({
        where,
        orderBy: [{ eventDate: sort }],
        take: limit,
        skip: offset,
      }),
      prisma.spaceHistoryEvent.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to load history events', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load history events');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return validationError('Invalid JSON body');
    }

    const validation = validateBody(createHistoryEventSchema, body);
    if (!validation.success) {
      const first = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(first, validation.errors);
    }

    const input = validation.data;

    const existing = await prisma.spaceHistoryEvent.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      return alreadyExistsError(`History event with slug "${input.slug}"`);
    }

    const created = await prisma.spaceHistoryEvent.create({
      data: {
        slug: input.slug,
        title: input.title,
        description: input.description,
        eventDate: new Date(input.eventDate),
        monthDay: input.monthDay,
        year: input.year,
        category: input.category,
        imageUrl: input.imageUrl ?? null,
        sourceUrls: input.sourceUrls ?? [],
        relatedCompanyIds: input.relatedCompanyIds ?? [],
        featured: input.featured ?? false,
      },
    });

    logger.info('Space history event created', {
      id: created.id,
      slug: created.slug,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: created },
      { status: 201 },
    );
  } catch (error) {
    logger.error('Failed to create history event', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create history event');
  }
}
