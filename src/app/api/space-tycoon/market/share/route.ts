import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getResourceShare,
  getOverallShare,
  getAllResourceTopTraders,
  hasActiveMarketIntel,
  DEFAULT_SHARE_WINDOW_DAYS,
} from '@/lib/game/market-share';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/market/share
 * Wave E6 (docs/ECONOMY_PVP_2026-08.md §E6) — market-share telemetry for the
 * in-game Market Intelligence panel. Closes §1d: "No market-share telemetry
 * of any kind exists."
 *
 * No auth required to READ the free tier (top-5 per resource + overall —
 * same "already public" posture as /api/space-tycoon/leaderboard). If the
 * caller IS authenticated and holds an active `market_spy` intel report,
 * `full: true` unlocks the complete per-participant table — canon §5 item 1:
 * "Never free, never perfect."
 *
 * Query params:
 *   resourceSlug?: string  — single-resource report; omit for the overview
 *   windowDays?: number    — default 30, clamped [1, 90]
 *   all?: '1'               — every traded resource's free-tier top-5 (no resourceSlug)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const resourceSlug = searchParams.get('resourceSlug');
    const windowDays = Math.max(1, Math.min(90, parseInt(searchParams.get('windowDays') || String(DEFAULT_SHARE_WINDOW_DAYS), 10) || DEFAULT_SHARE_WINDOW_DAYS));
    const wantAll = searchParams.get('all') === '1';

    // Earned-tier gate: an authenticated caller with an active market_spy
    // intel report can request the full participant table.
    let earnedTier = false;
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const profile = await prisma.gameProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (profile) earnedTier = await hasActiveMarketIntel(profile.id);
    }

    if (wantAll) {
      const reports = await getAllResourceTopTraders(windowDays);
      return NextResponse.json({ mode: 'all', earnedTier, windowDays, resources: reports });
    }

    if (resourceSlug) {
      const report = await getResourceShare(resourceSlug, { windowDays, full: earnedTier });
      return NextResponse.json({ mode: 'resource', earnedTier, ...report });
    }

    const overall = await getOverallShare({ windowDays, full: earnedTier });
    return NextResponse.json({ mode: 'overall', earnedTier, ...overall });
  } catch (error) {
    console.error('Market share GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
