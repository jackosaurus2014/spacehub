import { NextResponse } from 'next/server';
import { fetchUSASpendingData } from '@/lib/usaspending-fetcher';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { agencySpending, recentAwards, totalSpending, fetchedAt } =
      await fetchUSASpendingData();

    return NextResponse.json(
      { agencySpending, recentAwards, totalSpending, fetchedAt },
      {
        headers: {
          'Cache-Control':
            'public, max-age=14400, s-maxage=14400, stale-while-revalidate=1800',
        },
      },
    );
  } catch (error) {
    logger.error('Error fetching USAspending data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch federal spending data');
  }
}
