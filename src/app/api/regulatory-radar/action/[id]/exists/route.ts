import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /regulatory-radar/action/[id] a real HTTP 404 for unknown ids. See the
// SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound() alone
// can't set the status code. These pages are in sitemap.ts, so a 200 on an
// unknown id is directly wasted crawl budget.
//
// The id-shape guard mirrors getRadarEntryById() in
// src/lib/regulatory-radar.ts, which returns null (→ the page's notFound())
// for anything that isn't a plausible cuid before it ever queries.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id || id.length > 64 || !/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    const action = await prisma.regulatoryAction.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!action) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Regulatory action existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
