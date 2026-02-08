export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeSpaceMiningData } from '@/lib/space-mining-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await initializeSpaceMiningData();

    return NextResponse.json({
      success: true,
      message: `Initialized ${result.bodiesCreated} mining bodies, ${result.resourcesCreated} resources, and ${result.commoditiesCreated} commodities`,
      ...result,
    });
  } catch (error) {
    logger.error('Error initializing space mining data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize space mining data' },
      { status: 500 }
    );
  }
}
