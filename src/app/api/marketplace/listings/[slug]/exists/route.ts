import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /marketplace/listings/[slug] a real HTTP 404 for unknown slugs. See the
// comment in middleware.ts ("Real 404s for a small set of high-value
// dynamic detail routes") for why this can't be done via notFound() alone.
//
// Deliberately NOT the full [slug]/route.ts GET handler: that route
// increments the listing's viewCount as a side effect, so hitting it from
// middleware on every request would double-count views.
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const listing = await prisma.serviceListing.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!listing) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Marketplace listing existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
