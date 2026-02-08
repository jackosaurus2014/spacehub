export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeOperationalAwarenessData } from '@/lib/operational-awareness-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await initializeOperationalAwarenessData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize operational awareness data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize operational awareness data' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await initializeOperationalAwarenessData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize operational awareness data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize operational awareness data' },
      { status: 500 }
    );
  }
}
