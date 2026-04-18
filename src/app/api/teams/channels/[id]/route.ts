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
} from '@/lib/errors';
import { updateChannelSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function getMembership(channelId: string, userId: string) {
  return prisma.channelMembership.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
}

/** GET /api/teams/channels/[id] — channel detail + last 50 messages */
export async function GET(
  _req: NextRequest,
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

    const membership = await getMembership(params.id, session.user.id);
    const isPublic = channel.visibility === 'public';
    if (!membership && !isPublic) {
      return forbiddenError('You are not a member of this channel');
    }

    const [messages, memberships, company] = await Promise.all([
      prisma.channelMessage.findMany({
        where: { channelId: params.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.channelMembership.findMany({
        where: { channelId: params.id },
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.companyProfile.findUnique({
        where: { id: channel.companyId },
        select: { id: true, slug: true, name: true, logoUrl: true },
      }),
    ]);

    // Hydrate authors / member users
    const userIds = Array.from(
      new Set([
        ...messages.map((m) => m.authorId),
        ...memberships.map((m) => m.userId),
      ])
    );
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, verifiedBadge: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const hydratedMessages = messages
      .reverse()
      .map((m) => ({ ...m, author: userMap.get(m.authorId) || null }));
    const hydratedMembers = memberships.map((m) => ({
      ...m,
      user: userMap.get(m.userId) || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        channel,
        company,
        messages: hydratedMessages,
        members: hydratedMembers,
        currentMembership: membership,
      },
    });
  } catch (error) {
    logger.error('Get channel error', {
      error: error instanceof Error ? error.message : String(error),
      channelId: params.id,
    });
    return internalError('Failed to load channel');
  }
}

/** PATCH /api/teams/channels/[id] — owner/admin only */
export async function PATCH(
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

    const membership = await getMembership(params.id, session.user.id);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return forbiddenError('Only owners or admins can update this channel');
    }

    const body = await req.json();
    const validation = validateBody(updateChannelSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const updated = await prisma.corporateChannel.update({
      where: { id: params.id },
      data: validation.data,
    });

    logger.info('Channel updated', { channelId: params.id, userId: session.user.id });
    return NextResponse.json({ success: true, data: { channel: updated } });
  } catch (error) {
    logger.error('Update channel error', {
      error: error instanceof Error ? error.message : String(error),
      channelId: params.id,
    });
    return internalError('Failed to update channel');
  }
}

/** DELETE /api/teams/channels/[id] — owner only */
export async function DELETE(
  _req: NextRequest,
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

    const membership = await getMembership(params.id, session.user.id);
    if (!membership || membership.role !== 'owner') {
      return forbiddenError('Only the channel owner can delete this channel');
    }

    await prisma.corporateChannel.delete({ where: { id: params.id } });

    logger.info('Channel deleted', { channelId: params.id, userId: session.user.id });
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Delete channel error', {
      error: error instanceof Error ? error.message : String(error),
      channelId: params.id,
    });
    return internalError('Failed to delete channel');
  }
}
