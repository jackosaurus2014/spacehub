export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getDebrisOverview,
  getConjunctionEvents,
  getNotableDebris,
} from '@/lib/debris-data';
import { logger } from '@/lib/logger';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { FALLBACK_DEBRIS_OVERVIEW } from '@/lib/fallback-space-weather';

const CACHE_KEY = 'debris-monitor-dashboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get('riskLevel') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const [overview, conjunctions, notableDebris] = await Promise.all([
      getDebrisOverview(),
      getConjunctionEvents({ riskLevel: riskLevel as any, limit }),
      getNotableDebris(limit),
    ]);

    const data = { overview, conjunctions, notableDebris };

    // Cache the successful response for future fallback use
    apiCache.set(CACHE_KEY, data, CacheTTL.DEFAULT);

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Failed to fetch debris monitor data', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Try stale cache first -- recent data is better than static fallback
    const stale = apiCache.getStale<Record<string, unknown>>(CACHE_KEY);
    if (stale) {
      logger.info('Serving stale cached debris monitor data', {
        ageMs: Date.now() - stale.storedAt,
      });
      return NextResponse.json({
        ...stale.value,
        _meta: { source: 'cache', isStale: true, age: Date.now() - stale.storedAt },
      });
    }

    // Fall back to static baseline derived from DEBRIS_STATS_SEED values
    logger.warn('No cached debris data available, serving static fallback');
    return NextResponse.json({
      ...FALLBACK_DEBRIS_OVERVIEW,
      _meta: { source: 'fallback', isFallback: true },
    });
  }
}
