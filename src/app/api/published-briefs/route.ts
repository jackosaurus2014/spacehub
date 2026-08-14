export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { constrainPagination, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const VALID_TYPES = new Set(['weekly_intelligence', 'economy', 'hiring', 'special']);

/**
 * GET /api/published-briefs
 *
 * Backs the unified brief hub at /intelligence-brief. Reads from
 * PublishedBrief (prisma/schema.prisma) — populated by
 * scripts/backfill-published-briefs.ts and auto-mirrored going forward by
 * the weekly economy/hiring crons (src/lib/published-briefs.ts).
 *
 * Query params:
 *   type  — optional briefType filter ('weekly_intelligence' | 'economy' | 'hiring' | 'special')
 *   limit — max rows, default 20, capped by constrainPagination
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20', 10));

    if (type && !VALID_TYPES.has(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${Array.from(VALID_TYPES).join(', ')}` }, { status: 400 });
    }

    const where = type ? { briefType: type } : {};

    const briefs = await prisma.publishedBrief.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        briefType: true,
        summary: true,
        contentMd: true,
        publishedAt: true,
        sourceInsightId: true,
      },
    });

    return NextResponse.json({ briefs, total: briefs.length });
  } catch (error) {
    // Table may not exist yet if this deploys ahead of `prisma db push` —
    // return an empty list rather than a 500 so the page still renders.
    logger.error('Error fetching published briefs', {
      error: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error && /does not exist|Unknown arg|relation/i.test(error.message)) {
      return NextResponse.json({ briefs: [], total: 0 });
    }
    return internalError('Failed to fetch published briefs');
  }
}
