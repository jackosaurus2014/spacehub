import { NextResponse } from 'next/server';
import { initializeSpectrumData } from '@/lib/spectrum-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await initializeSpectrumData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize spectrum data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize spectrum data' },
      { status: 500 }
    );
  }
}
