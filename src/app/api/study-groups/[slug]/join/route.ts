import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-groups/[slug]/join
 * Join a study group (auth required, enforces memberLimit).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    const { slug } = params;

    const group = await prisma.studyGroup.findUnique({
      where: { slug },
      select: {
        id: true,
        isPrivate: true,
        memberLimit: true,
        _count: { select: { memberships: true } },
      },
    });
    if (!group) return notFoundError('Study group');

    if (group.isPrivate) {
      return forbiddenError('This group is private — ask the host for an invite');
    }

    // Already a member?
    const existing = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
      select: { id: true },
    });
    if (existing) {
      return conflictError('You are already a member of this group');
    }

    if (group.memberLimit && group._count.memberships >= group.memberLimit) {
      return forbiddenError('This group has reached its member limit');
    }

    const membership = await prisma.groupMembership.create({
      data: {
        groupId: group.id,
        userId: session.user.id,
        role: 'member',
      },
    });

    logger.info('Study group join', {
      groupId: group.id,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: membership },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error joining study group', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to join study group');
  }
}
