export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getOperationalOverview } from '@/lib/operational-awareness-data';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const overview = await getOperationalOverview();

    return NextResponse.json(overview);
  } catch (error) {
    logger.error('Failed to fetch operational awareness overview', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch operational awareness overview' },
      { status: 500 }
    );
  }
}
