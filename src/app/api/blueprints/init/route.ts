export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeBlueprintData } from '@/lib/blueprint-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await initializeBlueprintData();

    return NextResponse.json({
      success: true,
      message: `Initialized blueprints: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`,
      ...result,
    });
  } catch (error) {
    logger.error('Error initializing blueprint data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize blueprint data' },
      { status: 500 }
    );
  }
}
