import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { allow as throttleAllow, throttledBody } from '@/lib/game/route-throttle';
import { loadPublicClaimFeed } from '@/lib/game/server-mining';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/claims — the public asteroid claim feed (mining
 * Phase B, docs/SPACE_MINING_DESIGN_2026-09-12.md §3 "Claims", docs/POLICY.md
 * "Asteroid claims").
 *
 * Every ACTIVE claim in the world with the holder's corporation NAME, the
 * rock, the field, when it was staked, when it was last worked and when it
 * lapses — plus per-rock activity (how many corporations have a mining
 * order pending on each rock), the count the extraction-pressure quote
 * uses. Deliberately NOT anonymised (asteroid-claims.ts header): a claim is
 * a filed, on-ledger right and a public register is what makes "no
 * claim-jumping by force" enforceable in the open. What the feed never
 * carries: profile ids, fees, upkeep state, extraction rates.
 *
 * Session required (a player surface, not a scrape target); per-profile
 * throttle 30/min; the feed is built at most once a minute for everyone.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const me = await prisma.gameProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!me) {
      return NextResponse.json({ error: 'No game profile' }, { status: 403 });
    }
    const throttle = throttleAllow(me.id, 'claims', 30, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json(throttledBody('claims', throttle), { status: 429 });
    }
    const feed = await loadPublicClaimFeed(prisma);
    return NextResponse.json(feed, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Failed to load the claim feed' }, { status: 500 });
  }
}
