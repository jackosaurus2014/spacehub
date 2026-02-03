import { NextResponse } from 'next/server';
import { initializeOrbitalData } from '@/lib/orbital-slots-data';

export async function POST() {
  try {
    const results = await initializeOrbitalData();
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Failed to initialize orbital data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize data' },
      { status: 500 }
    );
  }
}
