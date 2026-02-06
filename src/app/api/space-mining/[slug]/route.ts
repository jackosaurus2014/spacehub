export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getMiningBodyBySlug } from '@/lib/space-mining-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await getMiningBodyBySlug(slug);

    if (!body) {
      return NextResponse.json(
        { error: 'Mining body not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ body });
  } catch (error) {
    console.error('Failed to fetch mining body:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mining body' },
      { status: 500 }
    );
  }
}
