import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { allow as throttleAllow, throttledBody } from '@/lib/game/route-throttle';
import { getFlowMap, clampWindowDays, FLOW_MAP_CACHE_SECONDS } from '@/lib/game/flow-map';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/market/flows?resource=&days=
 * docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 3 — the commodity flow map:
 * production by location, lane volume, zone tolls, exporter/importer
 * rankings, chokepoints and NPC share, every figure from a persisted row
 * (src/lib/game/flow-map.ts lists what is NOT persisted as null + reason).
 *
 * Session required (any player — public scouting is legitimate, but the map
 * is a player surface, not an anonymous scrape target). Per-profile throttle
 * 20/min; the underlying read is unstable_cache'd for 10 minutes.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 403 });
    }
    const throttle = throttleAllow(profile.id, 'market-flows', 20, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json(throttledBody('market-flows', throttle), { status: 429 });
    }

    const { searchParams } = request.nextUrl;
    const resource = searchParams.get('resource');
    const windowDays = clampWindowDays(searchParams.get('days') ?? undefined);
    const report = await getFlowMap({ windowDays, resource: resource || null });
    return NextResponse.json(report, {
      headers: { 'Cache-Control': `private, max-age=${FLOW_MAP_CACHE_SECONDS}` },
    });
  } catch (error) {
    logger.error('Market flows GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to build the flow map' }, { status: 500 });
  }
}
