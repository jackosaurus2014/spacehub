import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /space-talent/job/[id] a real HTTP 404 for unknown ids. See the
// SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound() alone
// can't set the status code.
//
// This is the highest-volume instance of the defect on the site: the ATS
// crawler keeps ~6,500 postings and jobs-sitemap.xml points at every one of
// them, so expired ids are exactly the URLs Google re-crawls most.
//
// Mirrors the page's gate: src/app/space-talent/job/[id]/page.tsx calls
// notFound() when the posting is missing OR !isActive, so a deactivated
// posting must report "does not exist" here too.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.spaceJobPosting.findUnique({
      where: { id: params.id },
      select: { id: true, isActive: true },
    });
    if (!job || !job.isActive) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Job posting existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
