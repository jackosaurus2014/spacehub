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
import { createChannelSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** GET /api/teams/channels — list channels the current user is a member of (+ company info) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const memberships = await prisma.channelMembership.findMany({
      where: { userId: session.user.id },
      orderBy: { joinedAt: 'desc' },
      include: {
        channel: true,
      },
    });

    const channels = memberships.map((m) => m.channel);
    const companyIds = Array.from(new Set(channels.map((c) => c.companyId)));

    const companies = await prisma.companyProfile.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, slug: true, name: true, logoUrl: true },
    });
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    const result = memberships.map((m) => ({
      ...m.channel,
      role: m.role,
      joinedAt: m.joinedAt,
      mutedUntil: m.mutedUntil,
      company: companyMap.get(m.channel.companyId) || null,
    }));

    return NextResponse.json({ success: true, data: { channels: result } });
  } catch (error) {
    logger.error('List channels error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list channels');
  }
}

/** POST /api/teams/channels — claimed-company owner creates a new channel */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(createChannelSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { companyId, name, description, channelType, visibility } =
      validation.data;

    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: { id: true, claimedByUserId: true, name: true },
    });

    if (!company) {
      return notFoundError('Company');
    }

    if (company.claimedByUserId !== session.user.id) {
      return forbiddenError('Only the claimed-company owner can create channels');
    }

    const channel = await prisma.corporateChannel.create({
      data: {
        companyId,
        name,
        description,
        channelType,
        visibility,
        memberships: {
          create: {
            userId: session.user.id,
            role: 'owner',
          },
        },
      },
    });

    logger.info('Corporate channel created', {
      channelId: channel.id,
      companyId,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: { channel } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create channel error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create channel');
  }
}
