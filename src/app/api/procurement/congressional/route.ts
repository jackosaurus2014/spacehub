import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError, createSuccessResponse } from '@/lib/errors';
import { validateSearchParams, congressionalQuerySchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(congressionalQuerySchema, searchParams);

    if (!validation.success) {
      return validationError('Invalid query parameters', validation.errors);
    }

    const { type, committee, dateAfter, dateBefore, limit, offset } = validation.data;

    const where: Prisma.CongressionalActivityWhereInput = {};

    if (type) {
      where.type = type;
    }
    if (committee) {
      where.committee = { contains: committee, mode: 'insensitive' };
    }
    if (dateAfter || dateBefore) {
      const dateFilter: Record<string, Date> = {};
      if (dateAfter) dateFilter.gte = dateAfter;
      if (dateBefore) dateFilter.lte = dateBefore;
      where.date = dateFilter;
    }

    const [activities, total] = await Promise.all([
      prisma.congressionalActivity.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          committee: true,
          subcommittee: true,
          title: true,
          description: true,
          date: true,
          status: true,
          billNumber: true,
          witnesses: true,
          relevance: true,
          sourceUrl: true,
          createdAt: true,
        },
      }),
      prisma.congressionalActivity.count({ where }),
    ]);

    return createSuccessResponse({
      activities,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch congressional activities', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch congressional activities');
  }
}
