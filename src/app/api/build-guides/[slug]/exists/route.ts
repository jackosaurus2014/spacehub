import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /build-guides/[slug] a real HTTP 404 for unknown slugs. See the
// SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound() alone
// can't set the status code.
//
// Mirrors the page's own gate exactly: src/app/build-guides/[slug]/page.tsx
// calls notFound() when the guide is missing OR unpublished, so an
// unpublished guide must report "does not exist" here too.
export async function GET(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const guide = await prisma.buildGuide.findUnique({
      where: { slug: params.slug },
      select: { id: true, published: true },
    });
    if (!guide || !guide.published) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Build guide existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
