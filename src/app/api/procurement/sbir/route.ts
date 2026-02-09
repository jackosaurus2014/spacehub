import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError, createSuccessResponse } from '@/lib/errors';
import { validateSearchParams, sbirQuerySchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(sbirQuerySchema, searchParams);

    if (!validation.success) {
      return validationError('Invalid query parameters', validation.errors);
    }

    const { agency, program, isActive, search, limit, offset } = validation.data;

    const where: Prisma.SBIRSolicitationWhereInput = {};

    if (agency) {
      where.agency = { contains: agency, mode: 'insensitive' };
    }
    if (program) {
      where.program = program.toUpperCase();
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (search) {
      where.OR = [
        { topicTitle: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { topicNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [solicitations, total] = await Promise.all([
      prisma.sBIRSolicitation.findMany({
        where,
        orderBy: { closeDate: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          program: true,
          agency: true,
          topicNumber: true,
          topicTitle: true,
          description: true,
          phase: true,
          awardAmount: true,
          openDate: true,
          closeDate: true,
          url: true,
          keywords: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.sBIRSolicitation.count({ where }),
    ]);

    return createSuccessResponse({
      solicitations,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch SBIR solicitations', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch SBIR solicitations');
  }
}
