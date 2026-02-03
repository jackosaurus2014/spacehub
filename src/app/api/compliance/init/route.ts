import { NextResponse } from 'next/server';
import { initializeComplianceData } from '@/lib/compliance-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await initializeComplianceData();
    return NextResponse.json({
      success: true,
      message: `Initialized ${result.classifications} classifications, ${result.regulations} regulations, and ${result.sources} legal sources`,
      ...result,
    });
  } catch (error) {
    console.error('Failed to initialize compliance data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize compliance data', details: String(error) },
      { status: 500 }
    );
  }
}
