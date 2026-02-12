import { NextResponse } from 'next/server';
import { getLegalSources, getLegalUpdates } from '@/lib/compliance-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sources' or 'updates'
    const sourceType = searchParams.get('sourceType') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
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
    logger.error('Failed to fetch legal data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch legal data' },
      { status: 500 }
    );
  }
}
