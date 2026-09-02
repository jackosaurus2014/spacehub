import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /gallery/[eventId] a real HTTP 404 for unknown ids. See the
// SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound() alone
// can't set the status code.
//
// Mirrors the page's own gate exactly: src/lib/gallery.ts getGalleryItem()
// resolves only a SpaceEvent that has both an imageUrl and a rocket.
export async function GET(_request: NextRequest, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const event = await prisma.spaceEvent.findFirst({
      where: { id: params.eventId, imageUrl: { not: null }, rocket: { not: null } },
      select: { id: true },
    });
    if (!event) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Gallery item existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
