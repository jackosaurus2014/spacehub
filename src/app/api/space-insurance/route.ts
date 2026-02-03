export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { InsuranceMissionType, InsuranceStatus } from '@/types';
import {
  getInsurancePolicies,
  getInsuranceMarketHistory,
  getInsuranceStats,
} from '@/lib/space-insurance-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const missionType = (searchParams.get('missionType') || undefined) as InsuranceMissionType | undefined;
    const status = (searchParams.get('status') || undefined) as InsuranceStatus | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const [policies, marketHistory, stats] = await Promise.all([
      getInsurancePolicies({ missionType, status, limit }),
      getInsuranceMarketHistory(),
      getInsuranceStats(),
    ]);

    return NextResponse.json({
      policies,
      marketHistory,
      stats,
    });
  } catch (error) {
    console.error('Failed to fetch space insurance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space insurance data' },
      { status: 500 }
    );
  }
}
