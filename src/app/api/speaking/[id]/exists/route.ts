import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts so
// unknown speaking opportunity ids get a real HTTP 404 instead of a soft 200.
// See SLUG_EXISTENCE_CHECKS in middleware.ts for the mechanism.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const row = await prisma.speakingOpportunity.findFirst({
      where: { id: params.id },
      select: { id: true },
    });
    if (!row) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Speaking opportunity existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open — the middleware treats non-404 as present.
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
