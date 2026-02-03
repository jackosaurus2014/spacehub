import { NextResponse } from 'next/server';
import { initializeWorkforceData } from '@/lib/workforce-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await initializeWorkforceData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to initialize workforce data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize workforce data', details: String(error) },
      { status: 500 }
    );
  }
}
