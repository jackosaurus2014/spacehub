import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /company-profiles/[slug] a real HTTP 404 for unknown slugs. See the
// comment in middleware.ts ("Real 404s for a small set of high-value
// dynamic detail routes") for why this can't be done via notFound() alone.
//
// Deliberately NOT the full company-profiles/[slug] GET handler: that
// route does a multi-fallback query across three field sets — much more
// work than an existence check needs, and running it on every request
// (from both middleware and the page itself) would double the DB load.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Company profile existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
