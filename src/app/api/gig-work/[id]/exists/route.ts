import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /gig-work/[id] a real HTTP 404 for unknown ids. See the
// SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound() alone
// can't set the status code.
//
// Mirrors src/app/gig-work/[id]/page.tsx's gate, which calls notFound()
// purely on "row missing" — status/visibility filtering happens in the page
// body, not the 404 decision, so this must not filter either.
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const gig = await prisma.gigOpportunity.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!gig) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Gig existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
