import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getOpportunityStats } from '@/lib/opportunities-data';

export async function GET() {
  try {
    const stats = await getOpportunityStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch opportunity stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunity stats' },
      { status: 500 }
    );
  }
}
