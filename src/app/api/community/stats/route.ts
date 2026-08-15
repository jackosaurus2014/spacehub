import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/stats
 *
 * Real community counts. The /community hub previously rendered hardcoded
 * fallback numbers ("1,247 members") because this endpoint never existed —
 * the page now hides the stats bar entirely when this fails, so fabricated
 * numbers can never render.
 */
export async function GET() {
  try {
    const [totalMembers, activeThreads, messagesSent] = await Promise.all([
      prisma.user.count(),
      prisma.forumThread.count(),
      prisma.forumPost.count(),
    ]);

    return NextResponse.json(
      { totalMembers, activeThreads, messagesSent },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (error) {
    logger.error('Community stats query failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Stats unavailable' }, { status: 500 });
  }
}
