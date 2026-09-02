import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /countdown/[slug] a real HTTP 404 for unknown slugs. See the
// SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound() alone
// can't set the status code.
//
// Deliberately NOT the sibling [slug]/route.ts GET handler: that one bumps
// the widget's view counter, so calling it from middleware on every request
// would inflate `views`.
export async function GET(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const countdown = await prisma.countdownWidget.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!countdown) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Countdown existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
