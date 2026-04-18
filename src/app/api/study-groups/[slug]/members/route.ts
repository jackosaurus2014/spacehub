import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notFoundError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-groups/[slug]/members
 * List members of a study group.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const group = await prisma.studyGroup.findUnique({
      where: { slug },
      select: { id: true, isPrivate: true },
    });
    if (!group) return notFoundError('Study group');

    const memberships = await prisma.groupMembership.findMany({
      where: { groupId: group.id },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    const userIds = Array.from(new Set(memberships.map((m) => m.userId)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
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
        user: user ? { id: user.id, name: user.name } : null,
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
