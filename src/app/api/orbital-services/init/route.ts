import { NextResponse } from 'next/server';
import { initializeOrbitalServices } from '@/lib/orbital-services-data';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const result = await initializeOrbitalServices();

    return NextResponse.json({
      success: true,
      message: `Initialized ${result.services} orbital services and ${result.contracts} contracts`,
      ...result,
    });
  } catch (error) {
    logger.error('Error initializing orbital services', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize orbital services' },
      { status: 500 }
    );
  }
}
