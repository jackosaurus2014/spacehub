export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeBlueprintData } from '@/lib/blueprint-data';

export async function POST() {
  try {
    const result = await initializeBlueprintData();

    return NextResponse.json({
      success: true,
      message: `Initialized blueprints: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`,
      ...result,
    });
  } catch (error) {
    console.error('Error initializing blueprint data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize blueprint data' },
      { status: 500 }
    );
  }
}
