import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
} from '@/lib/errors';
import { PUBLIC_USER_SELECT } from '@/lib/public-user-select';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-groups/[slug]/members
 * List members of a study group.
 *
 * Requires a session. Private groups only reveal their roster to their own
 * members (docs/SECURITY_AUDIT_2026-08.md P8). Never returns emails.
 */
export async function GET(
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
      select: { id: true, isPrivate: true },
    });
    if (!group) return notFoundError('Study group');

    if (group.isPrivate) {
      const mine = await prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
        select: { id: true },
      });
      if (!mine) {
        return forbiddenError('This study group is private');
      }
    }

    const memberships = await prisma.groupMembership.findMany({
      where: { groupId: group.id },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    const userIds = Array.from(new Set(memberships.map((m) => m.userId)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: PUBLIC_USER_SELECT,
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = memberships.map((m) => {
      const user = userMap.get(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: user ? { id: user.id, name: user.name, verifiedBadge: user.verifiedBadge } : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: { members: data },
    });
  } catch (error) {
    logger.error('Error listing study group members', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list members');
  }
}
