export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeOperationalAwarenessData } from '@/lib/operational-awareness-data';

export async function POST() {
  try {
    const result = await initializeOperationalAwarenessData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to initialize operational awareness data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize operational awareness data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Also allow GET for easy testing
  try {
    const result = await initializeOperationalAwarenessData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to initialize operational awareness data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize operational awareness data' },
      { status: 500 }
    );
  }
}
