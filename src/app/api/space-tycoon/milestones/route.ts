import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { MILESTONES } from '@/lib/game/milestones';
import { allow as throttleAllow, throttledBody } from '@/lib/game/route-throttle';
import {
  verifyMilestone,
  MILESTONE_SNAPSHOT_AGE_MS,
  MILESTONE_SNAPSHOT_SCAN_LIMIT,
  type MilestoneSnapshotFacts,
} from '@/lib/game/milestone-verification';

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
 *
 * Game exploit batch 2026-09-02 (H-3, docs/SECURITY_AUDIT_2026-09.md): the
 * condition is now VERIFIED SERVER-SIDE before the row is written
 * (milestone-verification.ts). Money milestones read the clamped profile
 * balance; presence milestones accept a ColonyClaim row (server-owned) or a
 * completed building at the location that has been in the profile for
 * >= 24 h (EconomicSnapshot); building / research / service milestones are
 * snapshot-aged the same way. No aged snapshot yet → 409 'verification
 * pending'. The 25 %-late rule uses the qualifying time, not the claim time,
 * so the 24 h wait never penalises an honest player.
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

    // Get player's game profile — the server-owned / client-reported columns
    // the verifier reads.
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true, companyName: true, createdAt: true, money: true,
        buildingsData: true, activeServicesData: true, completedResearchList: true, unlockedLocationsList: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    // M-7: per-profile budget.
    const throttle = throttleAllow(profile.id, 'milestones', 5, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json(throttledBody('milestones', throttle), { status: 429 });
    }

    // H-3: server-side verification.
    let colonyClaimLocations: string[] = [];
    try {
      const claims = await prisma.colonyClaim.findMany({
        where: { profileId: profile.id },
        select: { locationId: true },
        take: 100,
      });
      colonyClaimLocations = claims.map(c => c.locationId);
    } catch { /* table may lag — no server-owned presence facts */ }

    let agedSnapshots: MilestoneSnapshotFacts[] = [];
    try {
      const rows = await prisma.economicSnapshot.findMany({
        where: { profileId: profile.id, takenAt: { lte: new Date(Date.now() - MILESTONE_SNAPSHOT_AGE_MS) } },
        orderBy: { takenAt: 'asc' },
        take: MILESTONE_SNAPSHOT_SCAN_LIMIT,
        select: { takenAt: true, buildingsData: true, activeServicesData: true, completedResearchList: true },
      });
      agedSnapshots = rows;
    } catch { /* table may lag — treated as "no aged snapshot" → 409 */ }

    const verification = verifyMilestone(
      milestoneId,
      {
        money: profile.money,
        buildingsData: profile.buildingsData,
        activeServicesData: profile.activeServicesData,
        completedResearchList: profile.completedResearchList,
        unlockedLocationsList: profile.unlockedLocationsList,
        colonyClaimLocations,
        createdAt: profile.createdAt,
      },
      agedSnapshots,
    );
    if (!verification.ok) {
      logger.info('Milestone claim refused by server verification', {
        milestoneId, profileId: profile.id, status: verification.status, reason: verification.error,
      });
      return NextResponse.json(
        { success: false, error: verification.error, verificationPending: verification.status === 409 },
        { status: verification.status },
      );
    }

    const companyName = profile.companyName.slice(0, 50);

    // Reward derived server-side from the definition (see header). The
    // deadline is measured at the QUALIFYING time (first aged snapshot that
    // carries the fact, or now for server-verified facts).
    const accountAgeDays = (verification.qualifiedAt.getTime() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24);
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
          metadata: { milestoneId, reward, verifiedBy: verification.method },
        },
      });

      logger.info('Global milestone claimed', { milestoneId, companyName, reward, verifiedBy: verification.method });

      return NextResponse.json({
        success: true,
        verifiedBy: verification.method,
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
