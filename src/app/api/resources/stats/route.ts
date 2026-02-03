import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getResourceStats } from '@/lib/resources-data';

export async function GET() {
  try {
    const stats = await getResourceStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch resource stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource stats' },
      { status: 500 }
    );
  }
}
