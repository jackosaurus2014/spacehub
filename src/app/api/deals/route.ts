import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getFilteredDeals,
  getDealStats,
  type DealType,
} from '@/lib/deal-flow-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/deals
 *
 * Query params:
 *   type         — funding_round | acquisition | ipo | spac | contract_win
 *   search       — free text search across title, description, parties
 *   minAmount    — minimum deal amount in USD
 *   maxAmount    — maximum deal amount in USD
 *   dateFrom     — ISO date string lower bound
 *   dateTo       — ISO date string upper bound
 *   company      — filter by company name or slug
 *   page         — page number (default: 1)
 *   limit        — items per page (default: 25, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = (searchParams.get('type') || '') as DealType | '';
    const search = searchParams.get('search') || '';
    const minAmountStr = searchParams.get('minAmount');
    const maxAmountStr = searchParams.get('maxAmount');
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const company = searchParams.get('company') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    const minAmount = minAmountStr ? parseFloat(minAmountStr) : undefined;
    const maxAmount = maxAmountStr ? parseFloat(maxAmountStr) : undefined;

    const validTypes: (DealType | '')[] = ['', 'funding_round', 'acquisition', 'ipo', 'spac', 'contract_win'];
    const safeType = validTypes.includes(type) ? type : '';

    const { deals, total, totalPages } = getFilteredDeals({
      type: safeType,
      search,
      minAmount,
      maxAmount,
      dateFrom,
      dateTo,
      company,
      page,
      limit,
    });

    const stats = getDealStats();

    return NextResponse.json({
      deals,
      total,
      page,
      totalPages,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch deals', { error });
    return NextResponse.json(
      { error: 'Failed to fetch deal data' },
      { status: 500 }
    );
  }
}
