import { NextResponse } from 'next/server';
import { getLegalSources, getLegalUpdates } from '@/lib/compliance-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sources' or 'updates'
    const sourceType = searchParams.get('sourceType') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (type === 'sources') {
      const sources = await getLegalSources({
        type: sourceType,
        isActive: true,
      });
      return NextResponse.json({ sources });
    }

    // Default to updates
    const { updates, total } = await getLegalUpdates({
      sourceId,
      limit,
      offset,
    });

    return NextResponse.json({ updates, total });
  } catch (error) {
    console.error('Failed to fetch legal data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legal data' },
      { status: 500 }
    );
  }
}
