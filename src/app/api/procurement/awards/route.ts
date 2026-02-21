import { logger } from '@/lib/logger';
import { internalError, validationError, createSuccessResponse } from '@/lib/errors';
import { validateSearchParams, awardsQuerySchema } from '@/lib/validations';
import { fetchSpaceContractAwards } from '@/lib/procurement/usaspending';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(awardsQuerySchema, searchParams);

    if (!validation.success) {
      return validationError('Invalid query parameters', validation.errors);
    }

    const { search, agency, dateRange, minAmount, page, limit } =
      validation.data;

    const result = await fetchSpaceContractAwards({
      search: search || undefined,
      agency: agency || undefined,
      dateRange,
      minAmount,
      page,
      limit,
    });

    const hasMore = page * limit < result.totalCount;

    return createSuccessResponse({
      awards: result.awards,
      totalCount: result.totalCount,
      page: result.page,
      hasMore,
    });
  } catch (error) {
    logger.error('Failed to fetch contract awards', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch contract awards');
  }
}
