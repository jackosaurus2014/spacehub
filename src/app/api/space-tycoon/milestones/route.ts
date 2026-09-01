import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { MILESTONES } from '@/lib/game/milestones';

const MILESTONE_MAP = new Map(MILESTONES.map(m => [m.id, m]));

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
 * Body: { milestoneId: string, companyName?: string, reward?: number }
 *
 * 2026-09-01 hardening (docs/SECURITY_AUDIT_2026-08.md P10): `companyName`
 * and `reward` in the body are accepted for backward compatibility and
 * IGNORED. The row is written under the session profile's own name, and the
 * publicly rendered reward is derived from the milestone definition in
 * milestones.ts (full reward inside the target window, 25% after — the same
 * rule checkMilestones() applies client-side). No money is credited here.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const milestoneId = body && typeof body === 'object' ? (body as { milestoneId?: unknown }).milestoneId : undefined;

    if (!milestoneId || typeof milestoneId !== 'string') {
      return NextResponse.json({ error: 'Missing milestoneId' }, { status: 400 });
    }

    const definition = MILESTONE_MAP.get(milestoneId);
    if (!definition) {
      return NextResponse.json({ error: 'Unknown milestone' }, { status: 404 });
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
      select: { id: true, companyName: true, createdAt: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    const companyName = profile.companyName.slice(0, 50);

    // Reward derived server-side from the definition (see header).
    const accountAgeDays = (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const withinDeadline = accountAgeDays <= definition.targetDays;
    const reward = withinDeadline ? definition.reward : Math.round(definition.reward * 0.25);

    // Claim the milestone (race condition safe — unique constraint on milestoneId)
    try {
      const milestone = await prisma.globalMilestone.create({
        data: {
          milestoneId,
          claimedById: profile.id,
          companyName,
          reward,
        },
      });

      // Log to global activity feed
      await prisma.playerActivity.create({
        data: {
          profileId: profile.id,
          companyName,
          type: 'milestone_claimed',
          title: `${companyName} achieved "${definition.name}"!`,
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
          reward: milestone.reward,
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
