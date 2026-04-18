import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { forbiddenError, internalError, unauthorizedError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mission-debriefs/events-search?q=...
 *
 * Admin only. Lightweight autocomplete over SpaceEvent for the "new debrief"
 * form. Searches name + mission + rocket. Returns up to 20 matches,
 * past launches preferred (most recent first).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (!session.user.isAdmin) return forbiddenError('Admin access required');

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 50);

    const where: Record<string, unknown> = {};
    if (q.length > 0) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { mission: { contains: q, mode: 'insensitive' } },
        { rocket: { contains: q, mode: 'insensitive' } },
      ];
    }

    const events = await prisma.spaceEvent.findMany({
      where,
      select: {
        id: true,
        name: true,
        launchDate: true,
        status: true,
        agency: true,
        rocket: true,
        country: true,
        mission: true,
      },
      orderBy: { launchDate: 'desc' },
      take: limit,
    });

    return NextResponse.json({ events });
  } catch (error) {
    logger.error('events-search failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Event search failed');
  }
}
