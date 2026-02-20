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
import { chatMessageSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// In-memory rate limit for chat: userId -> lastMessageTimestamp
const chatRateLimits = new Map<string, number>();

// Cleanup old entries periodically
const RATE_LIMIT_WINDOW_MS = 5000; // 1 message per 5 seconds

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

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('Sign in to send chat messages');
    }

    const userId = session.user.id;

    // Rate limiting: 1 message per 5 seconds per user
    const lastMessage = chatRateLimits.get(userId);
    const now = Date.now();
    if (lastMessage && now - lastMessage < RATE_LIMIT_WINDOW_MS) {
      const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastMessage)) / 1000);
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
    const validation = validateBody(chatMessageSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { message } = validation.data;

    const chatMessage = await prisma.launchChatMessage.create({
      data: {
        eventId,
        userId,
        userName: session.user.name || session.user.email?.split('@')[0] || 'Anonymous',
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

    // Update rate limit
    chatRateLimits.set(userId, now);

    // Periodic cleanup of old rate limit entries
    if (Math.random() < 0.1) {
      const cutoff = now - RATE_LIMIT_WINDOW_MS * 2;
      for (const key of Array.from(chatRateLimits.keys())) {
        const val = chatRateLimits.get(key);
        if (val && val < cutoff) {
          chatRateLimits.delete(key);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: chatMessage,
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
