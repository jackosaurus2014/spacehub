import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  MEGA_PROJECT_MAP,
  calculateGlobalProgress,
  getTierInfo,
  type PhaseRequirement,
} from '@/lib/game/mega-projects';

/**
 * GET /api/space-tycoon/mega-projects
 * Returns the active mega-project with global progress, phase details,
 * the player's contribution info, contribution tier, and alliance ranking.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the active mega-project
    const project = await prisma.megaProject.findFirst({
      where: { status: { in: ['active', 'extended'] } },
      orderBy: { startsAt: 'desc' },
    });

    if (!project) {
      return NextResponse.json({
        project: null,
        message: 'No active mega-project at this time.',
      });
    }

    // Get the project definition for phase info
    const definition = MEGA_PROJECT_MAP.get(project.projectType);
    if (!definition) {
      return NextResponse.json({ error: 'Unknown project type' }, { status: 500 });
    }

    // Get player's profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        allianceMembership: {
          include: { alliance: { select: { id: true, name: true, tag: true } } },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Game profile not found' }, { status: 404 });
    }

    // Get player's contribution to this project
    const contribution = await prisma.megaProjectContribution.findUnique({
      where: {
        projectId_profileId: {
          projectId: project.id,
          profileId: profile.id,
        },
      },
    });

    // Get player's progress/tier
    const playerProgress = await prisma.megaProjectPlayerProgress.findFirst({
      where: {
        projectId: project.id,
        profileId: profile.id,
      },
    });

    // Calculate player's rank among all contributors
    let playerRank: number | null = null;
    if (contribution && contribution.totalMPP > 0) {
      const higherCount = await prisma.megaProjectContribution.count({
        where: {
          projectId: project.id,
          totalMPP: { gt: contribution.totalMPP },
        },
      });
      playerRank = higherCount + 1;
    }

    // Parse phase data
    const phaseCosts = project.phaseCosts as unknown as PhaseRequirement[];
    const phaseProgress = (project.totalResourceFunded || {}) as Record<string, Record<string, number>>;

    // Calculate global progress
    const globalPct = calculateGlobalProgress(phaseCosts, phaseProgress, project.currentPhase);

    // Get alliance score if applicable
    let allianceProgress = null;
    if (profile.allianceMembership?.allianceId) {
      const allianceScore = await prisma.megaProjectAllianceScore.findUnique({
        where: {
          projectId_allianceId: {
            projectId: project.id,
            allianceId: profile.allianceMembership.allianceId,
          },
        },
      });
      if (allianceScore) {
        allianceProgress = {
          allianceId: allianceScore.allianceId,
          allianceName: profile.allianceMembership.alliance.name,
          allianceTag: profile.allianceMembership.alliance.tag,
          totalMpp: allianceScore.totalMPP,
          rank: allianceScore.rank,
          perCapitaMpp: allianceScore.perCapitaMPP,
        };
      }
    }

    // Get top 5 alliances for compact leaderboard
    const topAlliances = await prisma.megaProjectAllianceScore.findMany({
      where: { projectId: project.id },
      orderBy: { totalMPP: 'desc' },
      take: 5,
      include: {
        alliance: { select: { name: true, tag: true, memberCount: true } },
      },
    });

    // Get top 10 individual contributors for compact leaderboard
    const topIndividuals = await prisma.megaProjectContribution.findMany({
      where: { projectId: project.id, totalMPP: { gt: 0 } },
      orderBy: { totalMPP: 'desc' },
      take: 10,
      include: {
        profile: {
          select: {
            companyName: true,
            allianceMembership: {
              include: { alliance: { select: { tag: true } } },
            },
          },
        },
      },
    });

    // Build current phase detail
    const currentPhaseReq = phaseCosts.find(p => p.phase === project.currentPhase);
    const currentPhaseProgress = phaseProgress[String(project.currentPhase)] || {};

    // Player tier info
    const totalPlayerMpp = contribution?.totalMPP || 0;
    const tierInfo = getTierInfo(totalPlayerMpp);

    // Time remaining
    const deadline = project.endsAt;
    const msRemaining = new Date(deadline).getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      project: {
        id: project.id,
        type: project.projectType,
        title: project.title,
        description: project.description,
        status: project.status,
        currentPhase: project.currentPhase,
        totalPhases: project.totalPhases,
        startsAt: project.startsAt,
        endsAt: project.endsAt,
        completedAt: project.completedAt,
        completionPct: Math.round(globalPct * 100) / 100,
        totalMoneyFunded: project.totalMoneyFunded,
        daysRemaining,
        permanentBonus: definition.permanentBonus,
      },
      phases: phaseCosts.map((phase) => {
        const progress = phaseProgress[String(phase.phase)] || {};
        const isLocked = phase.phase > project.currentPhase;
        const isComplete = phase.phase < project.currentPhase;
        return {
          phase: phase.phase,
          name: phase.name,
          moneyCost: phase.moneyCost,
          resourceCosts: phase.resourceCosts,
          progress: isLocked ? {} : progress,
          isLocked,
          isComplete,
          isCurrent: phase.phase === project.currentPhase,
        };
      }),
      currentPhase: currentPhaseReq ? {
        phase: currentPhaseReq.phase,
        name: currentPhaseReq.name,
        moneyCost: currentPhaseReq.moneyCost,
        moneyContributed: currentPhaseProgress['cash'] || 0,
        resourceCosts: currentPhaseReq.resourceCosts,
        resourceProgress: Object.fromEntries(
          Object.entries(currentPhaseReq.resourceCosts).map(([id, required]) => [
            id,
            { contributed: currentPhaseProgress[id] || 0, required: required || 0 },
          ])
        ),
      } : null,
      playerProgress: {
        totalMpp: totalPlayerMpp,
        totalCash: contribution?.moneyContributed || 0,
        totalResources: contribution?.resourcesContributed || {},
        tier: tierInfo.tier,
        tierName: tierInfo.tierName,
        tierIcon: tierInfo.tierIcon,
        nextTier: tierInfo.nextTier,
        nextTierName: tierInfo.nextTierName,
        nextTierThreshold: tierInfo.nextTierThreshold,
        progressToNext: tierInfo.progressToNext,
        rank: playerRank,
        contributionTier: playerProgress?.contributionTier || 0,
      },
      allianceProgress,
      compactLeaderboard: {
        alliances: topAlliances.map((a, i) => ({
          rank: i + 1,
          allianceName: a.alliance.name,
          allianceTag: a.alliance.tag,
          totalMpp: a.totalMPP,
          memberCount: a.alliance.memberCount,
          perCapitaMpp: a.perCapitaMPP,
        })),
        individuals: topIndividuals.map((c, i) => ({
          rank: i + 1,
          companyName: c.profile.companyName,
          allianceTag: c.profile.allianceMembership?.alliance?.tag || null,
          totalMpp: c.totalMPP,
        })),
      },
    });
  } catch (error) {
    logger.error('Mega-project GET error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
