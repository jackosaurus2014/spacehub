import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  PROJECT_DEFINITION_MAP,
  ALLIANCE_PROJECT_DEFINITIONS,
  calculateFundingProgress,
  calculateContributionShares,
  canProposeProject,
} from '@/lib/game/alliance-projects';

/**
 * GET /api/space-tycoon/alliance-projects
 * Returns:
 * - Active project (if any) with funding progress and contributions
 * - Completed projects with bonuses
 * - Available project types to propose
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const membership = await prisma.allianceMember.findUnique({
      where: { profileId: profile.id },
      select: { allianceId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    const alliance = await prisma.alliance.findUnique({
      where: { id: membership.allianceId },
      select: {
        id: true,
        name: true,
        level: true,
        tier: true,
        memberCount: true,
      },
    });
    if (!alliance) {
      return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
    }

    // Get all alliance projects
    const projects = await prisma.allianceProject.findMany({
      where: { allianceId: alliance.id },
      include: {
        contributions: {
          orderBy: { contributionShare: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get contributor names
    const allProfileIds = new Set<string>();
    for (const p of projects) {
      for (const c of p.contributions) {
        allProfileIds.add(c.profileId);
      }
    }

    const profileNames = new Map<string, string>();
    if (allProfileIds.size > 0) {
      const profiles = await prisma.gameProfile.findMany({
        where: { id: { in: Array.from(allProfileIds) } },
        select: { id: true, companyName: true },
      });
      for (const p of profiles) {
        profileNames.set(p.id, p.companyName);
      }
    }

    const activeProjects = projects.filter(p => p.status === 'funding' || p.status === 'building');
    const completedProjects = projects.filter(p => p.status === 'completed');

    const formatProject = (p: typeof projects[0]) => {
      const def = PROJECT_DEFINITION_MAP.get(p.projectType);
      const progress = calculateFundingProgress({
        moneyCost: p.moneyCost,
        moneyFunded: p.moneyFunded,
        resourceCosts: p.resourceCosts as Record<string, number>,
        resourceFunded: p.resourceFunded as Record<string, number>,
      });

      // Build time remaining (for building status)
      let buildTimeRemainingMs: number | null = null;
      if (p.status === 'building' && p.buildEndAt) {
        buildTimeRemainingMs = Math.max(0, p.buildEndAt.getTime() - Date.now());
      }

      return {
        id: p.id,
        projectType: p.projectType,
        name: p.name,
        status: p.status,
        icon: def?.icon ?? '?',
        description: def?.description ?? '',
        tier: def?.tier ?? 1,

        // Funding
        moneyCost: p.moneyCost,
        moneyFunded: p.moneyFunded,
        resourceCosts: p.resourceCosts as Record<string, number>,
        resourceFunded: p.resourceFunded as Record<string, number>,
        fundingProgressPct: progress,

        // Build timing
        buildStartAt: p.buildStartAt?.toISOString() ?? null,
        buildEndAt: p.buildEndAt?.toISOString() ?? null,
        buildTimeRemainingMs,
        completedAt: p.completedAt?.toISOString() ?? null,

        // Bonuses
        bonuses: p.bonuses,

        // Contributions
        contributions: p.contributions.map(c => ({
          profileId: c.profileId,
          companyName: profileNames.get(c.profileId) ?? 'Unknown',
          moneyContributed: c.moneyContributed,
          resourcesContributed: c.resourcesContributed,
          contributionShare: c.contributionShare,
          isYou: c.profileId === profile.id,
        })),

        // Your contribution
        myContribution: p.contributions.find(c => c.profileId === profile.id)
          ? {
              moneyContributed: p.contributions.find(c => c.profileId === profile.id)!.moneyContributed,
              resourcesContributed: p.contributions.find(c => c.profileId === profile.id)!.resourcesContributed,
              contributionShare: p.contributions.find(c => c.profileId === profile.id)!.contributionShare,
            }
          : null,
      };
    };

    // Check if alliance can propose new projects
    const activeCount = activeProjects.length;
    const completedCount = completedProjects.length;
    const proposalCheck = canProposeProject(alliance.level, activeCount, completedCount, alliance.tier);

    // Filter available project types (exclude already active/completed)
    const existingTypes = new Set(projects.filter(p => p.status !== 'decommissioned').map(p => p.projectType));
    const availableProjects = ALLIANCE_PROJECT_DEFINITIONS
      .filter(d => !existingTypes.has(d.type))
      .filter(d => {
        // Check min member requirement
        if (alliance.memberCount < d.minMembers) return false;
        // Check level requirements for premium projects
        if (d.type === 'colony_ship' && alliance.level < 20) return false;
        if (d.type === 'dyson_swarm' && alliance.level < 30) return false;
        return true;
      })
      .map(d => ({
        type: d.type,
        name: d.name,
        icon: d.icon,
        description: d.description,
        moneyCost: d.moneyCost,
        resourceCosts: d.resourceCosts,
        buildDurationDays: d.buildDurationDays,
        minMembers: d.minMembers,
        bonuses: d.bonuses,
        tier: d.tier,
        xpReward: d.xpReward,
      }));

    return NextResponse.json({
      activeProjects: activeProjects.map(formatProject),
      completedProjects: completedProjects.map(formatProject),
      availableProjects,
      canPropose: proposalCheck.allowed,
      proposeBlockReason: proposalCheck.reason ?? null,
      myRole: membership.role,
    });
  } catch (error) {
    logger.error('Alliance projects fetch error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to load alliance projects' }, { status: 500 });
  }
}

/**
 * POST /api/space-tycoon/alliance-projects
 * Propose a new shared project. Leader/officer only.
 *
 * Body: {
 *   projectType: string;
 *   name?: string;  // Custom name (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const membership = await prisma.allianceMember.findUnique({
      where: { profileId: profile.id },
      select: { allianceId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    // Only leader and officer can propose projects
    if (membership.role !== 'leader' && membership.role !== 'officer') {
      return NextResponse.json(
        { error: 'Only leaders and officers can propose projects' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { projectType, name } = body;

    if (!projectType) {
      return NextResponse.json({ error: 'projectType is required' }, { status: 400 });
    }

    const def = PROJECT_DEFINITION_MAP.get(projectType);
    if (!def) {
      return NextResponse.json({ error: 'Unknown project type' }, { status: 400 });
    }

    const alliance = await prisma.alliance.findUnique({
      where: { id: membership.allianceId },
      select: { id: true, level: true, tier: true, memberCount: true },
    });
    if (!alliance) {
      return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
    }

    // Check member requirement
    if (alliance.memberCount < def.minMembers) {
      return NextResponse.json(
        { error: `This project requires at least ${def.minMembers} members` },
        { status: 400 },
      );
    }

    // Check level requirements
    if (projectType === 'colony_ship' && alliance.level < 20) {
      return NextResponse.json({ error: 'Colony Ship requires alliance level 20' }, { status: 400 });
    }
    if (projectType === 'dyson_swarm' && alliance.level < 30) {
      return NextResponse.json({ error: 'Dyson Swarm requires alliance level 30' }, { status: 400 });
    }

    // Check project slot limits
    const existingProjects = await prisma.allianceProject.findMany({
      where: { allianceId: alliance.id, status: { not: 'decommissioned' } },
    });

    const activeCount = existingProjects.filter(p => p.status === 'funding' || p.status === 'building').length;
    const completedCount = existingProjects.filter(p => p.status === 'completed').length;

    const proposalCheck = canProposeProject(alliance.level, activeCount, completedCount, alliance.tier);
    if (!proposalCheck.allowed) {
      return NextResponse.json({ error: proposalCheck.reason }, { status: 400 });
    }

    // Check if this project type already exists (non-decommissioned)
    const duplicate = existingProjects.find(p => p.projectType === projectType);
    if (duplicate) {
      return NextResponse.json(
        { error: 'This project type already exists in your alliance' },
        { status: 400 },
      );
    }

    // Create the project
    const projectName = name ? String(name).slice(0, 50) : def.name;
    const project = await prisma.allianceProject.create({
      data: {
        allianceId: alliance.id,
        projectType: def.type,
        name: projectName,
        status: 'funding',
        moneyCost: def.moneyCost,
        resourceCosts: def.resourceCosts,
        resourceFunded: {},
        bonuses: def.bonuses,
      },
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        projectType: project.projectType,
        name: project.name,
        status: project.status,
        moneyCost: project.moneyCost,
        resourceCosts: project.resourceCosts,
      },
    });
  } catch (error) {
    logger.error('Alliance project creation error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
