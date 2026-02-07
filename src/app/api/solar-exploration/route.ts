import { NextResponse } from 'next/server';
import { getPlanetaryBodies } from '@/lib/solar-exploration-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const bodies = await getPlanetaryBodies();
    return NextResponse.json({ bodies });
  } catch (error) {
    logger.error('Failed to fetch planetary bodies', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch planetary bodies' },
      { status: 500 }
    );
  }
}
