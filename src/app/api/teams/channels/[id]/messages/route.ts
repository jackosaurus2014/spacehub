import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
  constrainPagination,
} from '@/lib/errors';
import { postMessageSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { parseMentions } from '@/lib/mentions';
import { createNotification } from '@/lib/notifications/create';

export const dynamic = 'force-dynamic';

/** GET /api/teams/channels/[id]/messages?before=ISO&limit=50 — paginated */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const channel = await prisma.corporateChannel.findUnique({
      where: { id: params.id },
    });
    if (!channel) {
      return notFoundError('Channel');
    }

    const membership = await prisma.channelMembership.findUnique({
      where: { channelId_userId: { channelId: params.id, userId: session.user.id } },
    });
    if (!membership && channel.visibility !== 'public') {
      return forbiddenError('You are not a member of this channel');
    }

    const { searchParams } = new URL(req.url);
    const beforeRaw = searchParams.get('before');
    const limit = constrainPagination(
      parseInt(searchParams.get('limit') || '50', 10),
      100
    );

    const where: Record<string, unknown> = { channelId: params.id };
    if (beforeRaw && !Number.isNaN(Date.parse(beforeRaw))) {
      where.createdAt = { lt: new Date(beforeRaw) };
    }

    const messages = await prisma.channelMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = Array.from(new Set(messages.map((m) => m.authorId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, verifiedBadge: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const hydrated = messages
      .reverse()
      .map((m) => ({ ...m, author: userMap.get(m.authorId) || null }));

    return NextResponse.json({
      success: true,
      data: {
        messages: hydrated,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    logger.error('List messages error', {
      error: error instanceof Error ? error.message : String(error),
      channelId: params.id,
    });
    return internalError('Failed to load messages');
  }
}

/** POST /api/teams/channels/[id]/messages — post (membership required) */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const channel = await prisma.corporateChannel.findUnique({
      where: { id: params.id },
    });
    if (!channel) {
      return notFoundError('Channel');
    }

    const membership = await prisma.channelMembership.findUnique({
      where: { channelId_userId: { channelId: params.id, userId: session.user.id } },
    });
    if (!membership) {
      return forbiddenError('Membership required to post in this channel');
    }
    if (membership.role === 'readonly') {
      return forbiddenError('You have read-only access to this channel');
    }

    const body = await req.json();
    const validation = validateBody(postMessageSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { body: messageBody, parentMessageId } = validation.data;

    const message = await prisma.channelMessage.create({
      data: {
        channelId: params.id,
        authorId: session.user.id,
        body: messageBody,
        parentMessageId: parentMessageId || null,
      },
    });

    // Parse @mentions and notify mentioned users (only if they are members)
    const mentionedNames = parseMentions(messageBody);
    if (mentionedNames.length > 0) {
      try {
        // Build a candidate set of user IDs from name matches (case-insensitive),
        // intersected with channel membership.
        const memberUsers = await prisma.channelMembership.findMany({
          where: { channelId: params.id },
          select: { userId: true },
        });
        const memberIds = new Set(memberUsers.map((m) => m.userId));

        const mentionedUsers = await prisma.user.findMany({
          where: {
            id: { in: Array.from(memberIds) },
            OR: mentionedNames.flatMap((name) => [
              { name: { equals: name, mode: 'insensitive' as const } },
              { email: { startsWith: `${name.toLowerCase()}@` } },
            ]),
          },
          select: { id: true },
        });

        const authorName = session.user.name || session.user.email || 'Someone';
        const link = `/teams/${params.id}`;
        await Promise.all(
          mentionedUsers.map((u) =>
            createNotification({
              userId: u.id,
              type: 'mention',
              title: `${authorName} mentioned you in #${channel.name}`,
              body: messageBody.slice(0, 200),
              link,
              relatedUserId: session.user.id,
              relatedContentType: 'channel_message',
              relatedContentId: message.id,
            })
          )
        );
      } catch (notifyError) {
        logger.warn('Failed to dispatch mention notifications', {
          error:
            notifyError instanceof Error
              ? notifyError.message
              : String(notifyError),
          messageId: message.id,
        });
      }
    }

    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, verifiedBadge: true },
    });

    return NextResponse.json(
      { success: true, data: { message: { ...message, author } } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Post message error', {
      error: error instanceof Error ? error.message : String(error),
      channelId: params.id,
    });
    return internalError('Failed to post message');
  }
}
