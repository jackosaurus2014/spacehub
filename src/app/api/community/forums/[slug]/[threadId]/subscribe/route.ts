import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  notFoundError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/community/forums/[slug]/[threadId]/subscribe
 * Subscribe to a thread for notifications
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { threadId } = await params;

    // Verify thread exists
    const thread = await (prisma as any).forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, title: true },
    });

    if (!thread) {
      return notFoundError('Forum thread');
    }

    // Upsert subscription (userId+threadId unique)
    await (prisma as any).threadSubscription.upsert({
      where: {
        userId_threadId: {
          userId: session.user.id,
          threadId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        threadId,
      },
    });

    logger.info('User subscribed to thread', {
      userId: session.user.id,
      threadId,
    });

    return NextResponse.json({ success: true, subscribed: true });
  } catch (error) {
    logger.error('Failed to subscribe to thread', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}

/**
 * DELETE /api/community/forums/[slug]/[threadId]/subscribe
 * Unsubscribe from a thread
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { threadId } = await params;

    await (prisma as any).threadSubscription.deleteMany({
      where: {
        userId: session.user.id,
        threadId,
      },
    });

    logger.info('User unsubscribed from thread', {
      userId: session.user.id,
      threadId,
    });

    return NextResponse.json({ success: true, subscribed: false });
  } catch (error) {
    logger.error('Failed to unsubscribe from thread', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}

/**
 * GET /api/community/forums/[slug]/[threadId]/subscribe
 * Check subscription status for current user
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { threadId } = await params;

    const subscription = await (prisma as any).threadSubscription.findUnique({
      where: {
        userId_threadId: {
          userId: session.user.id,
          threadId,
        },
      },
    });

    return NextResponse.json({ subscribed: !!subscription });
  } catch (error) {
    logger.error('Failed to check thread subscription', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return internalError();
  }
}
