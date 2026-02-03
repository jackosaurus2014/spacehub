import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { initializeOpportunities } from '@/lib/opportunities-data';

export async function POST() {
  try {
    const result = await initializeOpportunities();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to initialize opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to initialize opportunities' },
      { status: 500 }
    );
  }
}
