import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  unauthorizedError,
  notFoundError,
  internalError,
  validationError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createReactionSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * POST /api/live-chat/reaction
 * Body: { messageId, emoji }
 *
 * Adds a reaction to a chat message. Unique per (userId, messageId, emoji).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('Sign in to react');
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationError('Invalid JSON body');
    }
    const validation = validateBody(createReactionSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Invalid reaction';
      return validationError(firstError, validation.errors);
    }
    const { messageId, emoji } = validation.data;

    const message = await prisma.launchChatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, eventId: true },
    });
    if (!message) {
      return notFoundError('Chat message');
    }

    const phaseKey = `msg:${messageId}`;

    // Manual upsert: ensure (userId, messageId, emoji) is unique
    const existing = await prisma.launchReaction.findFirst({
      where: {
        eventId: message.eventId,
        userId,
        emoji,
        phase: phaseKey,
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.launchReaction.create({
        data: {
          eventId: message.eventId,
          userId,
          emoji,
          phase: phaseKey,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('live-chat reaction POST failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to add reaction');
  }
}

/**
 * DELETE /api/live-chat/reaction
 * Body or query: { messageId, emoji }
 *
 * Removes a reaction by the current user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('Sign in to remove a reaction');
    }
    const userId = session.user.id;

    let messageId: string | null = null;
    let emoji: string | null = null;

    // Try body first, fall back to query string
    try {
      const body = await req.json();
      messageId = body?.messageId ?? null;
      emoji = body?.emoji ?? null;
    } catch {
      const url = new URL(req.url);
      messageId = url.searchParams.get('messageId');
      emoji = url.searchParams.get('emoji');
    }

    const validation = validateBody(createReactionSchema, { messageId, emoji });
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Invalid reaction';
      return validationError(firstError, validation.errors);
    }

    const phaseKey = `msg:${validation.data.messageId}`;

    await prisma.launchReaction.deleteMany({
      where: {
        userId,
        emoji: validation.data.emoji,
        phase: phaseKey,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('live-chat reaction DELETE failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to remove reaction');
  }
}
