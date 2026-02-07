export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSpaceMiningStats } from '@/lib/space-mining-data';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const stats = await getSpaceMiningStats();
    return NextResponse.json({ stats });
  } catch (error) {
    logger.error('Failed to fetch space mining stats', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch space mining stats' },
      { status: 500 }
    );
  }
}
