export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeSpaceMiningData } from '@/lib/space-mining-data';

export async function POST() {
  try {
    const result = await initializeSpaceMiningData();

    return NextResponse.json({
      success: true,
      message: `Initialized ${result.bodiesCreated} mining bodies, ${result.resourcesCreated} resources, and ${result.commoditiesCreated} commodities`,
      ...result,
    });
  } catch (error) {
    console.error('Error initializing space mining data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize space mining data' },
      { status: 500 }
    );
  }
}
