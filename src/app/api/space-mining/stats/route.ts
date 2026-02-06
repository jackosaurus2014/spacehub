export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSpaceMiningStats } from '@/lib/space-mining-data';

export async function GET() {
  try {
    const stats = await getSpaceMiningStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch space mining stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space mining stats' },
      { status: 500 }
    );
  }
}
