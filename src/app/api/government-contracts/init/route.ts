import { NextResponse } from 'next/server';
import { initializeGovernmentContracts } from '@/lib/government-contracts-data';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const result = await initializeGovernmentContracts();
    return NextResponse.json({
      success: true,
      message: `Initialized ${result.count} government contracts`,
      count: result.count,
    });
  } catch (error) {
    logger.error('Failed to initialize government contracts', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize government contracts' },
      { status: 500 }
    );
  }
}
