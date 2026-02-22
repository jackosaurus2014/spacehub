import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkUserBanStatus, isUserBlocked } from '@/lib/moderation';
import {
  unauthorizedError,
  validationError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages
 * List conversations for the current user, sorted by lastMessageAt desc
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const userId = session.user.id;

    // Find all conversations the user participates in
    const participations = await (prisma as any).conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });

    if (participations.length === 0) {
      return NextResponse.json({
        success: true,
        data: { conversations: [] },
      });
    }

    const conversationIds = participations.map(
      (p: { conversationId: string }) => p.conversationId
    );
    const lastReadMap = new Map(
      participations.map((p: { conversationId: string; lastReadAt: Date | null }) => [
        p.conversationId,
        p.lastReadAt,
      ])
    );

    // Fetch conversations with last message and other participant info
    const conversations = await (prisma as any).conversation.findMany({
      where: { id: { in: conversationIds } },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Build response with unread counts
    const conversationsWithMeta = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conversations.map(async (conv: any) => {
        const lastRead = lastReadMap.get(conv.id) as Date | null;
        const unreadCount = lastRead
          ? await (prisma as any).directMessage.count({
              where: {
                conversationId: conv.id,
                senderId: { not: userId },
                createdAt: { gt: lastRead },
              },
            })
          : await (prisma as any).directMessage.count({
              where: {
                conversationId: conv.id,
                senderId: { not: userId },
              },
            });

        // Get the other participant(s)
        const otherParticipants = conv.participants
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((p: any) => p.userId !== userId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => p.user);

        return {
          id: conv.id,
          lastMessageAt: conv.lastMessageAt,
          lastMessage: conv.messages[0] || null,
          otherParticipants,
          unreadCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { conversations: conversationsWithMeta },
    });
  } catch (error) {
    logger.error('Error fetching conversations', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch conversations');
  }
}

/**
 * POST /api/messages
 * Send a message. Creates a conversation if one doesn't exist between the two users.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Check if user is banned or muted
    const banStatus = await checkUserBanStatus(session.user.id);
    if (banStatus.isBanned) {
      return NextResponse.json(
        { error: 'Your account has been suspended' },
        { status: 403 }
      );
    }
    if (banStatus.isMuted) {
      return NextResponse.json(
        { error: 'Your account has been temporarily muted' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { recipientId, content } = body;

    if (!recipientId || typeof recipientId !== 'string') {
      return validationError('recipientId is required');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return validationError('Message content is required');
    }

    if (content.length > 5000) {
      return validationError('Message content must be 5000 characters or less');
    }

    if (recipientId === session.user.id) {
      return validationError('You cannot message yourself');
    }

    // Check if recipient has blocked the sender
    const blocked = await isUserBlocked(recipientId, session.user.id);
    if (blocked) {
      return NextResponse.json(
        { error: 'Unable to message this user' },
        { status: 403 }
      );
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });

    if (!recipient) {
      return validationError('Recipient not found');
    }

    const userId = session.user.id;

    // Find existing conversation between these two users
    const existingParticipation = await (prisma as any).conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    let conversationId: string | null = null;

    if (existingParticipation.length > 0) {
      const convIds = existingParticipation.map(
        (p: { conversationId: string }) => p.conversationId
      );

      // Check if the recipient is also in any of these conversations
      const sharedParticipation = await (prisma as any).conversationParticipant.findFirst({
        where: {
          userId: recipientId,
          conversationId: { in: convIds },
        },
        select: { conversationId: true },
      });

      if (sharedParticipation) {
        conversationId = sharedParticipation.conversationId;
      }
    }

    const now = new Date();

    // If no existing conversation, create one
    if (!conversationId) {
      const conversation = await (prisma as any).conversation.create({
        data: {
          lastMessageAt: now,
          participants: {
            create: [
              { userId, lastReadAt: now },
              { userId: recipientId },
            ],
          },
        },
      });
      conversationId = conversation.id;
    } else {
      // Update lastMessageAt on existing conversation
      await (prisma as any).conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      });
    }

    // Create the message
    const message = await (prisma as any).directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });

    // Update sender's lastReadAt to now
    await (prisma as any).conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: { lastReadAt: now },
    });

    logger.info('Direct message sent', {
      conversationId,
      senderId: userId,
      recipientId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message,
          conversationId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error sending message', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to send message');
  }
}
