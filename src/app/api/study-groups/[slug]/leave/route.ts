import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/study-groups/[slug]/leave
 * Leave a study group. Host cannot leave (must delete or transfer).
 */
export async function DELETE(
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
      select: { id: true, hostUserId: true },
    });
    if (!group) return notFoundError('Study group');

    if (group.hostUserId === session.user.id) {
      return forbiddenError(
        'Hosts cannot leave their own group — delete the group instead'
      );
    }

    const membership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
      select: { id: true },
    });
    if (!membership) {
      return notFoundError('Membership');
    }

    await prisma.groupMembership.delete({ where: { id: membership.id } });

    logger.info('Study group leave', {
      groupId: group.id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: { left: true } });
  } catch (error) {
    logger.error('Error leaving study group', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to leave study group');
  }
}
