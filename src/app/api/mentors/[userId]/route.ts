import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notFoundError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentors/[userId]
 * Public mentor profile detail with user info and recent endorsements.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const resolved = await Promise.resolve(params);
    const { userId } = resolved;

    const profile = await prisma.mentorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return notFoundError('Mentor profile');
    }

    const [user, endorsements, endorsementCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          verifiedBadge: true,
          reputation: true,
        },
      }),
      prisma.skillEndorsement.findMany({
        where: { endorseeId: userId },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.skillEndorsement.count({ where: { endorseeId: userId } }),
    ]);

    // Build endorser map for the recent endorsements
    const endorserIds = Array.from(new Set(endorsements.map((e) => e.endorserId)));
    const endorsers = endorserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: endorserIds } },
          select: { id: true, name: true, verifiedBadge: true },
        })
      : [];
    const endorserMap = new Map(endorsers.map((u) => [u.id, u]));

    // Group endorsements by skill (count + most recent note per skill)
    const skillBuckets = new Map<
      string,
      { skill: string; count: number; recent: typeof endorsements }
    >();
    for (const e of endorsements) {
      const bucket = skillBuckets.get(e.skill) || {
        skill: e.skill,
        count: 0,
        recent: [],
      };
      bucket.count += 1;
      bucket.recent.push(e);
      skillBuckets.set(e.skill, bucket);
    }
    const skillSummary = Array.from(skillBuckets.values()).sort(
      (a, b) => b.count - a.count
    );

    return NextResponse.json({
      success: true,
      data: {
        profile,
        user,
        endorsementCount,
        endorsements: endorsements.map((e) => ({
          ...e,
          endorser: endorserMap.get(e.endorserId) || null,
        })),
        skillSummary,
      },
    });
  } catch (error) {
    logger.error('Error fetching mentor detail', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch mentor');
  }
}
