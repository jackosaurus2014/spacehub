import { NextResponse } from 'next/server';
import { getLegalSources, getLegalUpdates } from '@/lib/compliance-data';
import { filterRegulatoryRelevant } from '@/lib/legal-relevance';
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

    // Default to updates. The upstream LegalUpdate table is ingested
    // indiscriminately from feeds like Space Policy Online and mixes real
    // regulatory/legal items with generic space news (e.g. launch-failure
    // reports). Pull a larger pool than requested, apply the regulatory
    // relevance filter, then paginate over the filtered set so callers only
    // ever see items with genuine regulatory/legal substance.
    const POOL_SIZE = Math.min(Math.max(limit * 5, 100), 200);
    const { updates: pool } = await getLegalUpdates({
      sourceId,
      limit: POOL_SIZE,
      offset: 0,
    });

    const relevant = filterRegulatoryRelevant(pool);
    const updates = relevant.slice(offset, offset + limit);

    return NextResponse.json({ updates, total: relevant.length });
  } catch (error) {
    logger.error('Failed to fetch legal data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch legal data' },
      { status: 500 }
    );
  }
}
