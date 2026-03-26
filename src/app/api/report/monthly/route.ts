import { NextResponse } from 'next/server';
import { generateMonthlyReport } from '@/lib/monthly-report-generator';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = await generateMonthlyReport();

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    logger.error('Monthly report generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to generate monthly report' },
      { status: 500 }
    );
  }
}
