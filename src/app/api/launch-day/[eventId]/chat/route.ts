import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  notFoundError,
  unauthorizedError,
  internalError,
  validationError,
  rateLimitedError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { chatMessageSchema, validateBody } from '@/lib/validations';
import {
  BoundedRateLimiter,
  COOKIES_REQUIRED_MESSAGE,
  resolveLaunchDayActor,
} from '@/lib/launch-day-identity';

export const dynamic = 'force-dynamic';

// Chat rate limit, keyed by voterKey (signed-in user id or anonymous sn_vid
// cookie): 1 message / 5s AND at most 30 messages / 10 min. Bounded in-memory
// Map (5,000 keys, LRU eviction) — PER INSTANCE, so on a multi-instance deploy
// the ceiling is N× this. Fine for chat; not a security boundary.
const CHAT_MIN_GAP_MS = 5_000;
const CHAT_BURST_MAX = 30;
const CHAT_BURST_WINDOW_MS = 10 * 60_000;
const chatLimiter = new BoundedRateLimiter({
  minGapMs: CHAT_MIN_GAP_MS,
  max: CHAT_BURST_MAX,
  windowMs: CHAT_BURST_WINDOW_MS,
});

// Anonymous actors may not post links (cheapest spam vector); signed-in users may.
const LINK_RE = /https?:\/\//i;

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return notFoundError('Launch event');
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50), 200);
    const before = searchParams.get('before');

    const where: Record<string, unknown> = { eventId };
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        where.createdAt = { lt: beforeDate };
      }
    }

    const messages = await prisma.launchChatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        userName: true,
        message: true,
        type: true,
        createdAt: true,
        userId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    logger.error('Error fetching chat messages', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch chat messages');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    // Anonymous visitors may chat; identity comes from the sn_vid cookie.
    const actor = await resolveLaunchDayActor(req);
    if (!actor) {
      return unauthorizedError(COOKIES_REQUIRED_MESSAGE);
    }

    const retryAfter = chatLimiter.hit(actor.voterKey);
    if (retryAfter !== null) {
      return rateLimitedError(retryAfter);
    }

    const event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return notFoundError('Launch event');
    }

    const body = await req.json();
    // chatMessageSchema enforces 1-500 chars and strips HTML tags.
    const validation = validateBody(chatMessageSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { message } = validation.data;

    if (actor.anonymous && LINK_RE.test(message)) {
      return validationError('Sign in to share links in chat', {
        message: ['Links are not allowed from anonymous visitors'],
      });
    }

    const chatMessage = await prisma.launchChatMessage.create({
      data: {
        eventId,
        userId: actor.userId,
        userName: actor.displayName || 'Anonymous',
        message,
        type: 'chat',
      },
      select: {
        id: true,
        userName: true,
        message: true,
        type: true,
        createdAt: true,
        userId: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...chatMessage, anonymous: actor.anonymous },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error sending chat message', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to send chat message');
  }
}
