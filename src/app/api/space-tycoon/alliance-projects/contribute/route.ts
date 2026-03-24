import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  PROJECT_DEFINITION_MAP,
  calculateActualContribution,
  calculateContributionShares,
  calculateFundingProgress,
} from '@/lib/game/alliance-projects';

/**
 * POST /api/space-tycoon/alliance-projects/contribute
 * Contribute money and/or resources to an alliance project.
 * Deducts from the player's game state and adds to the project.
 *
 * Body: {
 *   projectId: string;
 *   money: number;               // Amount of money to contribute
 *   resources: Record<string, number>;  // Resources to contribute
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
      select: { id: true, money: true, resources: true },
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

    const body = await request.json();
    const { projectId, money: proposedMoney = 0, resources: proposedResources = {} } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (proposedMoney <= 0 && Object.keys(proposedResources).length === 0) {
      return NextResponse.json(
        { error: 'Must contribute money or resources' },
        { status: 400 },
      );
    }

    // Find the project
    const project = await prisma.allianceProject.findUnique({
      where: { id: projectId },
      include: { contributions: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.allianceId !== membership.allianceId) {
      return NextResponse.json({ error: 'Project belongs to a different alliance' }, { status: 403 });
    }
    if (project.status !== 'funding') {
      return NextResponse.json(
        { error: 'This project is not currently accepting contributions' },
        { status: 400 },
      );
    }

    // Recruit role: max 5% of project cost per contribution
    if (membership.role === 'recruit') {
      const maxMoney = project.moneyCost * 0.05;
      if (proposedMoney > maxMoney) {
        return NextResponse.json(
          { error: `Recruits can contribute at most ${Math.round(maxMoney)} per contribution` },
          { status: 400 },
        );
      }
    }

    // Validate player has enough money
    if (proposedMoney > 0 && profile.money < proposedMoney) {
      return NextResponse.json(
        { error: 'Not enough money' },
        { status: 400 },
      );
    }

    // Validate player has enough resources
    const playerResources = (profile.resources ?? {}) as Record<string, number>;
    for (const [resourceId, qty] of Object.entries(proposedResources)) {
      if (typeof qty !== 'number' || qty <= 0) continue;
      const playerQty = playerResources[resourceId] ?? 0;
      if (playerQty < qty) {
        return NextResponse.json(
          { error: `Not enough ${resourceId}. You have ${playerQty}, need ${qty}.` },
          { status: 400 },
        );
      }
    }

    // Calculate actual contribution (capped to what the project needs)
    const { money: actualMoney, resources: actualResources, fundingCompleted } =
      calculateActualContribution(
        {
          moneyCost: project.moneyCost,
          moneyFunded: project.moneyFunded,
          resourceCosts: project.resourceCosts as Record<string, number>,
          resourceFunded: project.resourceFunded as Record<string, number>,
        },
        proposedMoney,
        proposedResources,
      );

    if (actualMoney <= 0 && Object.keys(actualResources).length === 0) {
      return NextResponse.json(
        { error: 'Project is already fully funded for the offered contributions' },
        { status: 400 },
      );
    }

    // Deduct from player's game profile
    const updatedResources = { ...playerResources };
    for (const [resourceId, qty] of Object.entries(actualResources)) {
      updatedResources[resourceId] = (updatedResources[resourceId] ?? 0) - qty;
    }

    await prisma.gameProfile.update({
      where: { id: profile.id },
      data: {
        money: { decrement: actualMoney },
        resources: updatedResources,
      },
    });

    // Upsert the contribution record
    const existingContrib = project.contributions.find(c => c.profileId === profile.id);

    if (existingContrib) {
      const existingResources = (existingContrib.resourcesContributed ?? {}) as Record<string, number>;
      const mergedResources = { ...existingResources };
      for (const [resourceId, qty] of Object.entries(actualResources)) {
        mergedResources[resourceId] = (mergedResources[resourceId] ?? 0) + qty;
      }
      await prisma.allianceProjectContribution.update({
        where: { id: existingContrib.id },
        data: {
          moneyContributed: { increment: actualMoney },
          resourcesContributed: mergedResources,
        },
      });
    } else {
      await prisma.allianceProjectContribution.create({
        data: {
          projectId,
          profileId: profile.id,
          moneyContributed: actualMoney,
          resourcesContributed: actualResources,
        },
      });
    }

    // Update project funding totals
    const currentResourceFunded = (project.resourceFunded ?? {}) as Record<string, number>;
    const updatedResourceFunded = { ...currentResourceFunded };
    for (const [resourceId, qty] of Object.entries(actualResources)) {
      updatedResourceFunded[resourceId] = (updatedResourceFunded[resourceId] ?? 0) + qty;
    }

    const newMoneyFunded = project.moneyFunded + actualMoney;

    // If fully funded, start construction
    const def = PROJECT_DEFINITION_MAP.get(project.projectType);
    const buildDurationDays = def?.buildDurationDays ?? 7;

    const projectUpdate: Record<string, unknown> = {
      moneyFunded: newMoneyFunded,
      resourceFunded: updatedResourceFunded,
    };

    if (fundingCompleted) {
      const buildStart = new Date();
      const buildEnd = new Date(buildStart.getTime() + buildDurationDays * 24 * 60 * 60 * 1000);
      projectUpdate.status = 'building';
      projectUpdate.buildStartAt = buildStart;
      projectUpdate.buildEndAt = buildEnd;
    }

    await prisma.allianceProject.update({
      where: { id: projectId },
      data: projectUpdate,
    });

    // Recalculate contribution shares for all contributors
    const allContributions = await prisma.allianceProjectContribution.findMany({
      where: { projectId },
    });

    const shares = calculateContributionShares(
      allContributions.map(c => ({
        profileId: c.profileId,
        moneyContributed: c.moneyContributed,
        resourcesContributed: (c.resourcesContributed ?? {}) as Record<string, number>,
      })),
    );

    // Update all contribution shares
    for (const c of allContributions) {
      const share = shares.get(c.profileId) ?? 0;
      await prisma.allianceProjectContribution.update({
        where: { id: c.id },
        data: { contributionShare: share },
      });
    }

    // Update member activity
    await prisma.allianceMember.update({
      where: { profileId: profile.id },
      data: { lastActiveAt: new Date(), status: 'active' },
    });

    // Calculate new funding progress
    const newProgress = calculateFundingProgress({
      moneyCost: project.moneyCost,
      moneyFunded: newMoneyFunded,
      resourceCosts: project.resourceCosts as Record<string, number>,
      resourceFunded: updatedResourceFunded,
    });

    return NextResponse.json({
      success: true,
      moneyContributed: actualMoney,
      resourcesContributed: actualResources,
      fundingCompleted,
      fundingProgressPct: newProgress,
      contributionShare: shares.get(profile.id) ?? 0,
    });
  } catch (error) {
    logger.error('Alliance project contribution error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to contribute to project' },
      { status: 500 },
    );
  }
}
