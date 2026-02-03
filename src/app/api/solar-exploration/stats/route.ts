import { NextResponse } from 'next/server';
import { getSolarExplorationStats } from '@/lib/solar-exploration-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getSolarExplorationStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch solar exploration stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
