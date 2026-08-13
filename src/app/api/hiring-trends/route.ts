import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getHiringSeries, getHiringMovers, TOTAL_SENTINEL, PRIVATE_TOTAL_SENTINEL } from '@/lib/hiring-snapshots';

// Hiring-velocity data changes at most once a day (one snapshot/day) — cache
// for an hour at the CDN, same as the jobs widget.
export const revalidate = 3600;

/**
 * GET /api/hiring-trends
 * GET /api/hiring-trends?company={slug}
 *
 * Without `company`: site-wide totals series (_TOTAL, _PRIVATE_TOTAL) plus
 * the top hiring-velocity movers over the trailing 30 days.
 * With `company`: that company's own active-job time series (accepts a
 * CompanyProfile slug or a raw company name).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (company) {
      const series = await getHiringSeries(company);
      return NextResponse.json(
        { series },
        { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
      );
    }

    const [total, privateTotal, movers] = await Promise.all([
      getHiringSeries(TOTAL_SENTINEL),
      getHiringSeries(PRIVATE_TOTAL_SENTINEL),
      getHiringMovers(30),
    ]);

    return NextResponse.json(
      {
        totals: { total, privateTotal },
        movers,
        updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (error) {
    logger.error('Failed to load hiring trends', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to load hiring trends' },
      { status: 500, headers: { 'Cache-Control': 'public, s-maxage=60' } }
    );
  }
}
