import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** POST /api/teams/channels/[id]/join — add self for public channels */
export async function POST(
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

    if (channel.visibility !== 'public') {
      return forbiddenError('This channel is not open for self-join');
    }

    const existing = await prisma.channelMembership.findUnique({
      where: { channelId_userId: { channelId: params.id, userId: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        data: { membership: existing, alreadyMember: true },
      });
    }

    const membership = await prisma.channelMembership.create({
      data: {
        channelId: params.id,
        userId: session.user.id,
        role: 'member',
      },
    });

    logger.info('User joined public channel', {
      channelId: params.id,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: { membership } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Join channel error', {
      error: error instanceof Error ? error.message : String(error),
      channelId: params.id,
    });
    return internalError('Failed to join channel');
  }
}
