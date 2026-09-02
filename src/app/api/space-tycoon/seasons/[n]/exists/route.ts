import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /space-tycoon/seasons/[n] a real HTTP 404. See the SLUG_EXISTENCE_CHECKS
// comment in middleware.ts for why notFound() alone can't set the status.
//
// This route is a hybrid of the two failure modes the page has:
//   1. non-numeric [n] — the page's own notFound() case, which was landing
//      as an HTTP 200 like every other in-route notFound();
//   2. numeric but unsealed/nonexistent season — WORSE than a mis-status,
//      because the page renders a real 200 page with a "Season 9999"
//      heading and no content. /space-tycoon/seasons/<any integer> was an
//      unbounded supply of indexable thin pages.
// Both now resolve to a genuine 404 before the page renders.
//
// SEALED_FILTER is duplicated from src/lib/game/public-season-chronicle.ts
// rather than imported because that module isn't set up to export it, and
// this check must not pull down the (potentially large) `results` JSON
// column that getSealedSeasonChronicle() selects and parses.
const SEALED_FILTER = { not: Prisma.DbNull } as const;

export async function GET(request: NextRequest, props: { params: Promise<{ n: string }> }) {
  const params = await props.params;
  try {
    const { n } = params;
    // Reject anything that isn't a plain positive integer before querying:
    // parseInt('12abc') is 12, so a bare Number.isFinite check would let
    // /space-tycoon/seasons/12abc through as a duplicate of season 12.
    if (!/^\d{1,6}$/.test(n)) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    const seasonNumber = parseInt(n, 10);

    const row = await prisma.seasonalEvent.findFirst({
      where: { seasonNumber, results: SEALED_FILTER },
      select: { id: true },
    });
    if (!row) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Season chronicle existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
