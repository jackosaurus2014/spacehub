import { NextResponse } from 'next/server';
import { initializeSolarExplorationData } from '@/lib/solar-exploration-data';

export async function POST() {
  try {
    const results = await initializeSolarExplorationData();
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Failed to initialize solar exploration data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize data' },
      { status: 500 }
    );
  }
}
