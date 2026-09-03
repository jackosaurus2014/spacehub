import { NextRequest, NextResponse } from 'next/server';
import { withCache, CACHE_TTL } from '@/lib/api-cache';
import { getDiplomacyFeed } from '@/lib/game/corp-contracts-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/diplomacy/feed?limit=60 — public, unauthenticated.
 * The one diplomatic timeline (CLAUDE.md "Public diplomacy feed"): corp
 * contract signings / fulfilments / defaults / arbitration rulings, pact
 * signings and breaks, and the existing alliance treaties and wars, merged
 * newest-first. Cached 5 minutes (in-memory SWR + CDN headers).
 */
export async function GET(request: NextRequest) {
  const limit = Math.max(1, Math.min(100, parseInt(request.nextUrl.searchParams.get('limit') || '60', 10) || 60));
  try {
    const entries = await withCache(
      `space-tycoon:diplomacy-feed:${limit}`,
      () => getDiplomacyFeed(limit),
      { ttlSeconds: CACHE_TTL.FREQUENT, staleWhileRevalidate: true, fallbackToStale: true },
    );
    return NextResponse.json(
      { entries, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ entries: [], fetchedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  }
}
