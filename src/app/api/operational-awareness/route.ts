export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getOperationalOverview } from '@/lib/operational-awareness-data';

export async function GET() {
  try {
    const overview = await getOperationalOverview();

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Failed to fetch operational awareness overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operational awareness overview' },
      { status: 500 }
    );
  }
}
