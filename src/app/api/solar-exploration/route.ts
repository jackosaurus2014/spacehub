import { NextResponse } from 'next/server';
import { getPlanetaryBodies } from '@/lib/solar-exploration-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const bodies = await getPlanetaryBodies();
    return NextResponse.json({ bodies });
  } catch (error) {
    console.error('Failed to fetch planetary bodies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planetary bodies' },
      { status: 500 }
    );
  }
}
