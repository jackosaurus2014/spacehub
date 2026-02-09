import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError, createSuccessResponse } from '@/lib/errors';
import { validateSearchParams, budgetQuerySchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(budgetQuerySchema, searchParams);

    if (!validation.success) {
      return validationError('Invalid query parameters', validation.errors);
    }

    const { agency, fiscalYear, category } = validation.data;

    const where: Prisma.SpaceBudgetItemWhereInput = {};

    if (agency) {
      where.agency = { contains: agency, mode: 'insensitive' };
    }
    if (fiscalYear) {
      where.fiscalYear = fiscalYear;
    }
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const budgetItems = await prisma.spaceBudgetItem.findMany({
      where,
      orderBy: [{ fiscalYear: 'desc' }, { agency: 'asc' }, { category: 'asc' }],
      select: {
        id: true,
        agency: true,
        fiscalYear: true,
        category: true,
        subcategory: true,
        program: true,
        requestAmount: true,
        enactedAmount: true,
        previousYear: true,
        changePercent: true,
        notes: true,
        source: true,
      },
    });

    // Also compute aggregates by agency and fiscal year
    const aggregates = await prisma.spaceBudgetItem.groupBy({
      by: ['agency', 'fiscalYear'],
      where,
      _sum: {
        requestAmount: true,
        enactedAmount: true,
        previousYear: true,
      },
    });

    return createSuccessResponse({
      budgetItems,
      aggregates: aggregates.map((a) => ({
        agency: a.agency,
        fiscalYear: a.fiscalYear,
        totalRequest: a._sum.requestAmount,
        totalEnacted: a._sum.enactedAmount,
        totalPreviousYear: a._sum.previousYear,
      })),
      total: budgetItems.length,
    });
  } catch (error) {
    logger.error('Failed to fetch budget data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch budget data');
  }
}
