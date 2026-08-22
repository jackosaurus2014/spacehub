import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /space-tycoon/corp/[id] a real HTTP 404 for unknown ids. See the
// SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound() alone
// can't set the status code.
//
// Deliberately NOT getPublicCorp() from src/lib/game/public-leaderboard.ts:
// that function additionally runs a full-table rank count() plus alliance
// and milestone joins, none of which an existence check needs. Only
// GameProfile.id is touched here — no public-safe field is even selected,
// so nothing about the corporation is disclosed beyond "this id resolves",
// which the page itself already tells any visitor.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await prisma.gameProfile.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Corporation existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
