import { NextResponse } from 'next/server';
import { initializeSolarFlareData } from '@/lib/solar-flare-data';

export async function POST() {
  try {
    const results = await initializeSolarFlareData();
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Failed to initialize solar flare data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize data' },
      { status: 500 }
    );
  }
}
