import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentors/matches?role=mentor|mentee&status=...
 * List MentorMatch records for the current user (as mentor or as mentee).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') === 'mentor' ? 'mentor' : 'mentee';
    const status = searchParams.get('status') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (role === 'mentor') {
      const myMentorProfile = await prisma.mentorProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!myMentorProfile) {
        return NextResponse.json({ success: true, data: [] });
      }
      where.mentorId = myMentorProfile.id;
    } else {
      where.menteeUserId = userId;
    }

    if (status) {
      where.status = status;
    }

    const matches = await prisma.mentorMatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { mentor: true },
      take: 200,
    });

    // Eager-load related users (mentor user + mentee user)
    const userIds = Array.from(
      new Set(matches.flatMap((m) => [m.mentor.userId, m.menteeUserId]))
    );
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, verifiedBadge: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = matches.map((m) => ({
      id: m.id,
      status: m.status,
      message: m.message,
      respondedAt: m.respondedAt,
      createdAt: m.createdAt,
      mentor: {
        ...m.mentor,
        user: userMap.get(m.mentor.userId) || null,
      },
      mentee: userMap.get(m.menteeUserId) || null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Error listing mentor matches', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list matches');
  }
}
