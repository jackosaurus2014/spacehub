import { NextResponse } from 'next/server';
import { initializeLaunchWindowsData } from '@/lib/launch-windows-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await initializeLaunchWindowsData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to initialize launch windows data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize data' },
      { status: 500 }
    );
  }
}
