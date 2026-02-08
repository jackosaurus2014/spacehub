import { NextResponse } from 'next/server';
import { initializeOrbitalData } from '@/lib/orbital-slots-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const results = await initializeOrbitalData();
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('Failed to initialize orbital data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize data' },
      { status: 500 }
    );
  }
}
