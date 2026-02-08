import { NextResponse } from 'next/server';
import { initializeLaunchWindowsData } from '@/lib/launch-windows-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await initializeLaunchWindowsData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize launch windows data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize data' },
      { status: 500 }
    );
  }
}
