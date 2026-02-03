import { NextRequest, NextResponse } from 'next/server';
import { getPlanetaryBodyBySlug } from '@/lib/solar-exploration-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await getPlanetaryBodyBySlug(slug);

    if (!body) {
      return NextResponse.json(
        { error: 'Planetary body not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ body });
  } catch (error) {
    console.error('Failed to fetch planetary body:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planetary body' },
      { status: 500 }
    );
  }
}
