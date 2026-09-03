import { NextResponse } from 'next/server';
import { withCache, CACHE_TTL } from '@/lib/api-cache';
import { listPublicPacts } from '@/lib/game/corp-pacts-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/corp-pacts/registry — public, unauthenticated.
 * Every signed corp-to-corp pact (active, expired, broken) with both
 * parties named: "signed on-chain in the game's ledger and visible to the
 * public" (CLAUDE.md). Cached 5 minutes.
 */
export async function GET() {
  try {
    const pacts = await withCache(
      'space-tycoon:corp-pacts:registry',
      () => listPublicPacts(100),
      { ttlSeconds: CACHE_TTL.FREQUENT, staleWhileRevalidate: true, fallbackToStale: true },
    );
    return NextResponse.json(
      { pacts, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ pacts: [], fetchedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  }
}
