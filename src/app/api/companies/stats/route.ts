import { NextResponse } from 'next/server';
import { getCompanyStats } from '@/lib/companies-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getCompanyStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to fetch company stats', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch company stats' },
      { status: 500 }
    );
  }
}
