import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/space-tycoon/milestones
 * Returns all globally claimed milestones.
 */
export async function GET() {
  try {
    const milestones = await prisma.globalMilestone.findMany({
      orderBy: { claimedAt: 'asc' },
      select: {
        milestoneId: true,
        companyName: true,
        reward: true,
        claimedAt: true,
      },
    });
    return NextResponse.json({ milestones });
  } catch (error) {
    return NextResponse.json({ milestones: [] });
  }
}

/**
 * POST /api/space-tycoon/milestones
 * Attempt to claim a milestone. First player to claim wins.
 * Body: { milestoneId: string, companyName: string, reward: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const body = await request.json();
    const { milestoneId, companyName, reward } = body;

    if (!milestoneId || !companyName) {
      return NextResponse.json({ error: 'Missing milestoneId or companyName' }, { status: 400 });
    }

    // Check if already claimed by anyone
    const existing = await prisma.globalMilestone.findUnique({
      where: { milestoneId },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        alreadyClaimed: true,
        claimedBy: existing.companyName,
        claimedAt: existing.claimedAt,
      });
    }

    // Get player's game profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    // Claim the milestone (race condition safe — unique constraint on milestoneId)
    try {
      const milestone = await prisma.globalMilestone.create({
        data: {
          milestoneId,
          claimedById: profile.id,
          companyName: String(companyName).slice(0, 50),
          reward: reward || 0,
        },
      });

      // Log to global activity feed
      await prisma.playerActivity.create({
        data: {
          profileId: profile.id,
          companyName: String(companyName).slice(0, 50),
          type: 'milestone_claimed',
          title: `${companyName} achieved "${milestoneId.replace(/_/g, ' ')}"!`,
          description: reward > 0 ? `Earned $${(reward / 1_000_000).toFixed(0)}M reward` : undefined,
          metadata: { milestoneId, reward },
        },
      });

      logger.info('Global milestone claimed', { milestoneId, companyName, reward });

      return NextResponse.json({
        success: true,
        milestone: {
          milestoneId: milestone.milestoneId,
          companyName: milestone.companyName,
          claimedAt: milestone.claimedAt,
        },
      });
    } catch (err: unknown) {
      // Unique constraint violation = someone else claimed it first
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        const existing = await prisma.globalMilestone.findUnique({ where: { milestoneId } });
        return NextResponse.json({
          success: false,
          alreadyClaimed: true,
          claimedBy: existing?.companyName || 'Unknown',
        });
      }
      throw err;
    }
  } catch (error) {
    logger.error('Milestone claim error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to claim milestone' }, { status: 500 });
  }
}
