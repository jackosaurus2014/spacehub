import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { DATE_RE } from '@/lib/morning-brief/archive';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /brief/am/[date] a real HTTP 404 for unknown or unsent dates (2026-09-12).
// See the SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound()
// alone can't set the status code. Mirrors the page's own gate: a
// MorningBrief row in status 'sent' with issue JSON.
export async function GET(_request: NextRequest, props: { params: Promise<{ date: string }> }) {
  const { date } = await props.params;
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }
  try {
    const row = await prisma.morningBrief.findFirst({
      where: { date, status: 'sent', issue: { not: null } },
      select: { id: true },
    });
    if (!row) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Morning brief existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404.
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
