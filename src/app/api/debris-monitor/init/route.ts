export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeDebrisData } from '@/lib/debris-data';

export async function POST() {
  try {
    const result = await initializeDebrisData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to initialize debris data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize debris data' },
      { status: 500 }
    );
  }
}
