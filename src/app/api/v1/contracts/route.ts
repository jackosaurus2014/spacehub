import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import { getGovernmentContracts, ContractAgency, ContractType, ContractStatus, ContractCategory } from '@/lib/government-contracts-data';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/contracts
 * Public API: Fetch government contracts.
 *
 * Params: limit, offset, agency, type, status, category
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));
    const agency = (searchParams.get('agency') || undefined) as ContractAgency | undefined;
    const type = (searchParams.get('type') || undefined) as ContractType | undefined;
    const status = (searchParams.get('status') || undefined) as ContractStatus | undefined;
    const category = (searchParams.get('category') || undefined) as ContractCategory | undefined;

    const result = await getGovernmentContracts({
      agency,
      type,
      status,
      category,
      limit,
      offset,
    });

    const response = NextResponse.json({
      success: true,
      data: result.contracts || [],
      pagination: {
        limit,
        offset,
        total: result.total || 0,
      },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/contracts error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch contracts');
  }
}
