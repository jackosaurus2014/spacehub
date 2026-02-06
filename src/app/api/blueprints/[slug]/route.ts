export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getBlueprintBySlug } from '@/lib/blueprint-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const blueprint = await getBlueprintBySlug(slug);

    if (!blueprint) {
      return NextResponse.json(
        { error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error('Failed to fetch blueprint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blueprint' },
      { status: 500 }
    );
  }
}
