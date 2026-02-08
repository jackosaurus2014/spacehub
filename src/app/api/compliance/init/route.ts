import { NextResponse } from 'next/server';
import { initializeComplianceData } from '@/lib/compliance-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await initializeComplianceData();
    return NextResponse.json({
      success: true,
      message: `Initialized ${result.classifications} classifications, ${result.regulations} regulations, and ${result.sources} legal sources`,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to initialize compliance data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize compliance data' },
      { status: 500 }
    );
  }
}
