import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_EMOJIS = ['rocket', 'fire', 'star', 'heart', '100'];

// GET — aggregate reaction counts for last 30 seconds
export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const thirtySecondsAgo = new Date(Date.now() - 30000);

    // Get counts per emoji in the last 30 seconds
    const recentReactions = await (prisma as any).launchReaction.groupBy({
      by: ['emoji'],
      where: {
        eventId: params.eventId,
        createdAt: { gte: thirtySecondsAgo },
      },
      _count: { emoji: true },
    });

    // Build counts map
    const counts: Record<string, number> = {};
    for (const r of recentReactions) {
      counts[r.emoji] = r._count.emoji;
    }

    // Also get total all-time counts
    const totalReactions = await (prisma as any).launchReaction.groupBy({
      by: ['emoji'],
      where: { eventId: params.eventId },
      _count: { emoji: true },
    });

    const totals: Record<string, number> = {};
    for (const r of totalReactions) {
      totals[r.emoji] = r._count.emoji;
    }

    return NextResponse.json({
      success: true,
      data: {
        recent: counts,
        totals,
        windowSeconds: 30,
      },
    });
  } catch (error) {
    logger.error('Error fetching reactions', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Failed to fetch reactions' }, { status: 500 });
  }
}

// POST — send a reaction (rate limited: 1 per 2 seconds)
export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to react' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { emoji, phase } = body;

    if (!emoji || !VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json({
        error: `Invalid emoji. Use one of: ${VALID_EMOJIS.join(', ')}`,
      }, { status: 400 });
    }

    // Rate limit: check last reaction from this user
    const twoSecondsAgo = new Date(Date.now() - 2000);
    const recentFromUser = await (prisma as any).launchReaction.findFirst({
      where: {
        eventId: params.eventId,
        userId,
        createdAt: { gte: twoSecondsAgo },
      },
    });

    if (recentFromUser) {
      return NextResponse.json({ error: 'Too fast! Wait a moment.' }, { status: 429 });
    }

    await (prisma as any).launchReaction.create({
      data: {
        eventId: params.eventId,
        userId,
        emoji,
        phase: phase || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error creating reaction', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Failed to send reaction' }, { status: 500 });
  }
}
