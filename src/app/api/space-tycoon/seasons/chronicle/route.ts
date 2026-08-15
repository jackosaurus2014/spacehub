import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { derivePrestigeTitles } from '@/lib/game/season-chronicle';
import { getSealedSeasonChronicle, getRecentSealedSeasons } from '@/lib/game/public-season-chronicle';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/seasons/chronicle
 *
 * Live-Service Wave LS7 (docs/LIVE_SERVICE_2026-08.md §LS7): public read
 * route for the permanent Season Chronicle archive — no auth required, same
 * "already public" posture as /api/space-tycoon/seasons/leaderboard
 * (companyName/score/rank are already served unauthenticated there). Feeds
 * both SeasonPanel's in-game history tab and the public
 * /space-tycoon/seasons/[n] archive pages. DB access goes through
 * public-season-chronicle.ts so the page and this route share one query
 * path (no drift between what's "public" in each place).
 *
 * Query params:
 *   ?season=N   — a single sealed season by number (null if unsealed or
 *                 doesn't exist).
 *   ?limit=N    — most-recent-first list (default 12, max 50).
 *
 * When the caller is signed in, the response also includes `myTitles` —
 * this player's cosmetic prestige titles (derivePrestigeTitles) computed
 * across EVERY sealed season, not just the returned page, so a returning
 * veteran's month-2 title still shows on a month-4 visit even if it has
 * scrolled off the default 12-season list.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonParam = searchParams.get('season');

    const session = await getServerSession(authOptions);
    let myTitles: ReturnType<typeof derivePrestigeTitles> = [];
    if (session?.user?.id) {
      const profile = await prisma.gameProfile.findUnique({
        where: { userId: session.user.id },
        select: { companyName: true },
      });
      if (profile) {
        const allSealed = await getRecentSealedSeasons(200);
        myTitles = derivePrestigeTitles(allSealed, profile.companyName);
      }
    }

    if (seasonParam) {
      const seasonNumber = parseInt(seasonParam, 10);
      if (!Number.isFinite(seasonNumber)) {
        return NextResponse.json({ error: 'Invalid season number' }, { status: 400 });
      }
      const record = await getSealedSeasonChronicle(seasonNumber);
      return NextResponse.json({ record, myTitles });
    }

    const limitParam = parseInt(searchParams.get('limit') || '12', 10);
    const limit = Math.max(1, Math.min(50, Number.isFinite(limitParam) ? limitParam : 12));
    const records = await getRecentSealedSeasons(limit);

    return NextResponse.json({ records, myTitles });
  } catch (error) {
    console.error('Seasons chronicle GET error:', error);
    return NextResponse.json({ records: [], record: null, myTitles: [] }, { status: 500 });
  }
}
