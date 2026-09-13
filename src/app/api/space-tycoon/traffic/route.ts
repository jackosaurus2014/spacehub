import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { notQaProfile } from '@/lib/qa-accounts';
import { allow as throttleAllow, throttledBody } from '@/lib/game/route-throttle';
import { loadTrafficFeed, FLEET_REVEAL_ACTION_LIST, type TrafficSourceProfile } from '@/lib/game/ship-traffic-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/traffic
 * Ship traffic layer (docs/GRAPHICS_REVIEW_2026-09-12.md addendum point 3;
 * docs/POLICY.md "Ship visibility"). Other corporations' ships as
 * ANONYMISED contacts — hull class, lane/location, progress, ETA — plus a
 * deterministic NPC backdrop. Identity (corporation, cargo, destination) is
 * attached only for owners the requester holds an active fleet reveal on:
 * a succeeded EspionageMission of a FLEET_REVEAL_ACTIONS type whose
 * intelExpiresAt is still in the future.
 *
 * Session required (a player surface, not a scrape target); QA profiles and
 * the requester's own ships are excluded; per-profile throttle 30/min; the
 * anonymised pool is built at most once a minute for everyone.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const me = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, unlockedLocationsList: true, hqLocationId: true },
    });
    if (!me) {
      return NextResponse.json({ error: 'No game profile' }, { status: 403 });
    }
    const throttle = throttleAllow(me.id, 'traffic', 30, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json(throttledBody('traffic', throttle), { status: 429 });
    }

    const feed = await loadTrafficFeed(
      {
        loadProfiles: async (sinceMs): Promise<TrafficSourceProfile[]> =>
          prisma.gameProfile.findMany({
            where: { ...notQaProfile, lastSyncAt: { gte: new Date(sinceMs) } },
            select: { id: true, companyName: true, shipsData: true },
          }),
        loadRevealedOwners: async (requesterId, nowMs) => {
          const rows = await prisma.espionageMission.findMany({
            where: {
              attackerId: requesterId,
              actionType: { in: FLEET_REVEAL_ACTION_LIST },
              succeeded: true,
              intelExpiresAt: { gt: new Date(nowMs) },
            },
            select: { targetId: true },
          });
          return rows.map(r => r.targetId);
        },
      },
      { id: me.id, holdings: [...(me.unlockedLocationsList ?? []), me.hqLocationId ?? 'earth_surface'] },
    );

    return NextResponse.json(feed, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Failed to load ship traffic' }, { status: 500 });
  }
}
