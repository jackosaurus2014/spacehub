import { NextResponse } from 'next/server';
import { getComplianceStats } from '@/lib/compliance-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getComplianceStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch compliance stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance stats' },
      { status: 500 }
    );
  }
}
