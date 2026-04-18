import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  notFoundError,
  unauthorizedError,
  internalError,
  validationError,
  rateLimitedError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createChatMessageSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// In-memory rate limit: userId -> last message timestamp
const chatRateLimits = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 2000; // 1 message per 2s per user

/**
 * GET /api/live-chat?eventId=...&afterId=...
 *
 * Returns chat messages for a live event after a given message ID (polling).
 * Limited to 50 newest messages.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const afterId = searchParams.get('afterId');

    if (!eventId) {
      return validationError('eventId is required');
    }

    const event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return notFoundError('Launch event');
    }

    // If afterId provided, look up that message's createdAt to fetch newer ones
    let afterDate: Date | null = null;
    if (afterId) {
      const anchor = await prisma.launchChatMessage.findUnique({
        where: { id: afterId },
        select: { createdAt: true },
      });
      if (anchor) {
        afterDate = anchor.createdAt;
      }
    }

    const where: Record<string, unknown> = { eventId };
    if (afterDate) {
      where.createdAt = { gt: afterDate };
    }

    const messages = await prisma.launchChatMessage.findMany({
      where,
      orderBy: { createdAt: afterDate ? 'asc' : 'desc' },
      take: 50,
      select: {
        id: true,
        userId: true,
        userName: true,
        message: true,
        type: true,
        createdAt: true,
        user: {
          select: {
            verifiedBadge: true,
          },
        },
      },
    });

    // Get reactions for these messages (stored in LaunchReaction with phase = "msg:<id>")
    const messageIds = messages.map((m) => m.id);
    let reactions: Array<{
      phase: string | null;
      emoji: string;
      userId: string | null;
    }> = [];
    if (messageIds.length > 0) {
      const phaseKeys = messageIds.map((id) => `msg:${id}`);
      reactions = await prisma.launchReaction.findMany({
        where: {
          eventId,
          phase: { in: phaseKeys },
        },
        select: {
          phase: true,
          emoji: true,
          userId: true,
        },
      });
    }

    // Aggregate reactions: { messageId: { emoji: count, byUser: emoji[] } }
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id || null;

    const reactionsByMessage: Record<
      string,
      { counts: Record<string, number>; mine: string[] }
    > = {};
    for (const r of reactions) {
      if (!r.phase || !r.phase.startsWith('msg:')) continue;
      const mid = r.phase.slice(4);
      if (!reactionsByMessage[mid]) {
        reactionsByMessage[mid] = { counts: {}, mine: [] };
      }
      reactionsByMessage[mid].counts[r.emoji] =
        (reactionsByMessage[mid].counts[r.emoji] || 0) + 1;
      if (currentUserId && r.userId === currentUserId) {
        reactionsByMessage[mid].mine.push(r.emoji);
      }
    }

    const enriched = messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.userName,
      verifiedBadge: m.user?.verifiedBadge || null,
      message: m.message,
      type: m.type,
      createdAt: m.createdAt,
      reactions: reactionsByMessage[m.id] || { counts: {}, mine: [] },
    }));

    // If we fetched in desc order (no afterId), reverse for chronological display
    const ordered = afterDate ? enriched : enriched.reverse();

    return NextResponse.json({
      success: true,
      data: {
        messages: ordered,
        currentUserId,
      },
    });
  } catch (error) {
    logger.error('live-chat GET failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch chat messages');
  }
}

/**
 * POST /api/live-chat
 * Body: { eventId, message, parentId? }
 *
 * Posts a chat message. Auth required. Rate-limited 1 msg/2s per user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('Sign in to send chat messages');
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationError('Invalid JSON body');
    }

    const validation = validateBody(createChatMessageSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { eventId, message } = validation.data;

    // Rate limit check
    const now = Date.now();
    const last = chatRateLimits.get(userId);
    if (last && now - last < RATE_LIMIT_WINDOW_MS) {
      const retryAfter = Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (now - last)) / 1000
      );
      return rateLimitedError(retryAfter || 1);
    }

    const event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      return notFoundError('Launch event');
    }

    // Lookup user once for displayName + verifiedBadge
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, verifiedBadge: true },
    });

    const userName =
      user?.name?.trim() ||
      user?.email?.split('@')[0] ||
      session.user.name ||
      'Anonymous';

    const created = await prisma.launchChatMessage.create({
      data: {
        eventId,
        userId,
        userName,
        message,
        type: 'chat',
      },
      select: {
        id: true,
        userId: true,
        userName: true,
        message: true,
        type: true,
        createdAt: true,
      },
    });

    chatRateLimits.set(userId, now);

    // Periodic cleanup
    if (Math.random() < 0.05) {
      const cutoff = now - RATE_LIMIT_WINDOW_MS * 4;
      for (const key of Array.from(chatRateLimits.keys())) {
        const v = chatRateLimits.get(key);
        if (v && v < cutoff) chatRateLimits.delete(key);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...created,
          verifiedBadge: user?.verifiedBadge || null,
          reactions: { counts: {}, mine: [] },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('live-chat POST failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to send chat message');
  }
}
