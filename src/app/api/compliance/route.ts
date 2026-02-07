import { NextResponse } from 'next/server';
import { getComplianceStats } from '@/lib/compliance-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getComplianceStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to fetch compliance stats', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch compliance stats' },
      { status: 500 }
    );
  }
}
