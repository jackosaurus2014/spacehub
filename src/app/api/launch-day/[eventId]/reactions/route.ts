import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, launchReactionSchema } from '@/lib/validations';
import { validationError } from '@/lib/errors';
import {
  BoundedRateLimiter,
  COOKIES_REQUIRED_MESSAGE,
  resolveLaunchDayActor,
} from '@/lib/launch-day-identity';

export const dynamic = 'force-dynamic';

const VALID_EMOJIS = ['rocket', 'fire', 'star', 'heart', '100'];

// 1 reaction per 2s per actor (signed-in user id or anonymous sn_vid cookie).
// In-memory and per-instance — see BoundedRateLimiter. Reactions are cheap and
// bounded (one row, five emoji) so an N× ceiling across instances is fine.
const REACTION_MIN_GAP_MS = 2000;
const reactionLimiter = new BoundedRateLimiter({ minGapMs: REACTION_MIN_GAP_MS });

// GET — aggregate reaction counts for last 30 seconds
export async function GET(_request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const thirtySecondsAgo = new Date(Date.now() - 30000);

    // Get counts per emoji in the last 30 seconds
    const recentReactions = await prisma.launchReaction.groupBy({
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
    const totalReactions = await prisma.launchReaction.groupBy({
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

// POST — send a reaction (rate limited: 1 per 2 seconds per actor).
// Anonymous visitors may react; identity comes from the sn_vid cookie.
export async function POST(request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const actor = await resolveLaunchDayActor(request);
    if (!actor) {
      return NextResponse.json({ error: COOKIES_REQUIRED_MESSAGE }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(launchReactionSchema, body);
    if (!validation.success) {
      return validationError('Invalid reaction', validation.errors);
    }
    const { emoji, phase } = validation.data;
    if (!VALID_EMOJIS.includes(emoji)) {
      return validationError('Invalid reaction', { emoji: ['Unknown emoji'] });
    }

    const retryAfter = reactionLimiter.hit(actor.voterKey);
    if (retryAfter !== null) {
      const res = NextResponse.json({ error: 'Too fast! Wait a moment.' }, { status: 429 });
      res.headers.set('Retry-After', String(retryAfter));
      return res;
    }

    await prisma.launchReaction.create({
      data: {
        eventId: params.eventId,
        userId: actor.userId,
        emoji,
        phase: phase || null,
      },
    });

    return NextResponse.json({ success: true, data: { anonymous: actor.anonymous } }, { status: 201 });
  } catch (error) {
    logger.error('Error creating reaction', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Failed to send reaction' }, { status: 500 });
  }
}
