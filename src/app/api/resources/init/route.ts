import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { initializeResources } from '@/lib/resources-data';

export async function POST() {
  try {
    const result = await initializeResources();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to initialize resources:', error);
    return NextResponse.json(
      { error: 'Failed to initialize resources' },
      { status: 500 }
    );
  }
}
