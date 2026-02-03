export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeSpaceInsuranceData } from '@/lib/space-insurance-data';

export async function POST() {
  try {
    const result = await initializeSpaceInsuranceData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to initialize space insurance data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize space insurance data', details: String(error) },
      { status: 500 }
    );
  }
}
