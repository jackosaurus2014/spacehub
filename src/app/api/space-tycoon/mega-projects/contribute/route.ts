import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import {
  calculateMPPWithBonuses,
  calculateProjectTotalRequirement,
  getContributionTier,
  getTierInfo,
  validatePhaseResources,
  checkPhaseCompletion,
  calculateGlobalProgress,
  MEGA_PROJECT_MAP,
  MIN_CASH_CONTRIBUTION,
  MAX_CASH_PERCENT_PER_TX,
  type PhaseRequirement,
} from '@/lib/game/mega-projects';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import { computeSpotPrice } from '@/lib/game/spot-price';
import { loadAuthoritativeInventory, auditServerInventoryGate } from '@/lib/game/server-inventory';

/**
 * POST /api/space-tycoon/mega-projects/contribute
 * Contribute money and/or resources to the active mega-project.
 *
 * Body: { money?: number, resources?: { titanium: 100, iron: 50, ... } }
 *
 * All contribution logic runs inside a Prisma transaction for atomicity:
 *  1. Validate player has funds/resources, project is active
 *  2. Deduct from player GameProfile
 *  3. Create/update MegaProjectContribution
 *  4. Update project global progress
 *  5. Update MPP, alliance score, player progress
 *  6. Check for phase completion
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { money = 0, resources = {} } = body as {
      money?: number;
      resources?: Partial<Record<string, number>>;
    };

    // Basic validation
    const cashAmount = typeof money === 'number' ? Math.floor(money) : 0;
    const resourceContributions: Partial<Record<ResourceId, number>> = {};
    let hasAnyContribution = false;

    if (cashAmount > 0) {
      if (cashAmount < MIN_CASH_CONTRIBUTION) {
        return NextResponse.json(
          { error: `Minimum cash contribution is $${MIN_CASH_CONTRIBUTION.toLocaleString()}` },
          { status: 400 }
        );
      }
      hasAnyContribution = true;
    }

    // Validate resource inputs
    if (resources && typeof resources === 'object') {
      for (const [id, qty] of Object.entries(resources)) {
        if (typeof qty !== 'number' || qty <= 0) continue;
        const intQty = Math.floor(qty);
        if (intQty <= 0) continue;
        if (!RESOURCE_MAP.has(id as ResourceId)) {
          return NextResponse.json(
            { error: `Unknown resource: ${id}` },
            { status: 400 }
          );
        }
        resourceContributions[id as ResourceId] = intQty;
        hasAnyContribution = true;
      }
    }

    if (!hasAnyContribution) {
      return NextResponse.json(
        { error: 'Must contribute money and/or resources' },
        { status: 400 }
      );
    }

    // Find the active project
    const project = await prisma.megaProject.findFirst({
      where: { status: { in: ['active', 'extended'] } },
      orderBy: { startsAt: 'desc' },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'No active mega-project at this time' },
        { status: 400 }
      );
    }

    // Check project deadline
    if (new Date() > new Date(project.endsAt)) {
      return NextResponse.json(
        { error: 'This mega-project has reached its deadline' },
        { status: 400 }
      );
    }

    const definition = MEGA_PROJECT_MAP.get(project.projectType);
    if (!definition) {
      return NextResponse.json({ error: 'Unknown project type' }, { status: 500 });
    }

    // Validate resources are for the current phase
    if (Object.keys(resourceContributions).length > 0) {
      const validation = validatePhaseResources(
        project.projectType,
        project.currentPhase,
        resourceContributions,
      );
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Get player profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        allianceMembership: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Game profile not found' }, { status: 404 });
    }

    // Validate player has sufficient funds
    if (cashAmount > 0) {
      if (cashAmount > profile.money) {
        return NextResponse.json(
          { error: 'Insufficient funds' },
          { status: 400 }
        );
      }
      const maxPerTx = Math.floor(profile.money * MAX_CASH_PERCENT_PER_TX);
      if (cashAmount > maxPerTx) {
        return NextResponse.json(
          { error: `Maximum cash per transaction is 10% of your balance ($${maxPerTx.toLocaleString()})` },
          { status: 400 }
        );
      }
    }

    // Validate player has sufficient resources. Server-authoritative
    // inventory phase 2 (docs/SECURITY_AUDIT_2026-09.md): verified against
    // SERVER TRUTH when the profile has a serverResources map; the client
    // view (`playerResources`) is what gets debited below — server truth is
    // debited by the ledger rows.
    const playerResources = (profile.resources || {}) as Record<string, number>;
    const inventory = await loadAuthoritativeInventory(profile);
    for (const [id, qty] of Object.entries(resourceContributions)) {
      if (!qty) continue;
      const available = inventory.resources[id] || 0;
      if (available < qty) {
        if (inventory.source === 'server' && (playerResources[id] || 0) >= qty) {
          await auditServerInventoryGate(prisma, {
            profileId: profile.id, resourceSlug: id, path: 'mega_project_contribute',
            quantity: qty, raw: playerResources[id] || 0, held: available, refId: project.id,
          });
        }
        const resourceDef = RESOURCE_MAP.get(id as ResourceId);
        return NextResponse.json(
          { error: `Insufficient ${resourceDef?.name || id}: have ${available}, need ${qty}` },
          { status: 400 }
        );
      }
    }

    // Get existing contribution record to check if this is their first ever contribution
    const existingContribution = await prisma.megaProjectContribution.findUnique({
      where: {
        projectId_profileId: {
          projectId: project.id,
          profileId: profile.id,
        },
      },
    });

    // Check if this is the player's first-ever mega-project contribution (across all projects)
    let isFirstEverContribution = false;
    if (!existingContribution) {
      const anyPriorContribution = await prisma.megaProjectContribution.findFirst({
        where: { profileId: profile.id },
      });
      isFirstEverContribution = !anyPriorContribution;
    }

    // Calculate MPP
    const projectTotalReq = calculateProjectTotalRequirement(definition);
    const existingMpp = existingContribution?.totalMPP || 0;

    // Wave E2 (§2.5 "one price truth"): value the contributed resources at
    // LIVE SPOT, not the static base. Build a band-clamped spot map from the
    // shared MarketResource rows for exactly the slugs being contributed, so
    // contributing a crashed commodity earns proportionally less MPP (and a
    // scarce one earns more). The project *requirement* (calculateProjectTotal
    // Requirement) stays base-anchored — it's the reference weight, not a
    // payout — so only the earned MPP floats with the market.
    const spotOverrides: Record<string, number> = {};
    try {
      const contributedSlugs = Object.keys(resourceContributions);
      if (contributedSlugs.length > 0) {
        const rows = await prisma.marketResource.findMany({
          where: { slug: { in: contributedSlugs } },
          select: { slug: true, currentPrice: true, basePrice: true, minPrice: true, maxPrice: true },
        });
        for (const row of rows) {
          spotOverrides[row.slug] = computeSpotPrice({
            currentPrice: row.currentPrice,
            basePrice: row.basePrice,
            minPrice: row.minPrice,
            maxPrice: row.maxPrice,
          });
        }
      }
    } catch { /* spot map best-effort — falls back to base pricing in calculateMPP */ }

    const { finalMpp, smallBonus } = calculateMPPWithBonuses(
      cashAmount,
      resourceContributions,
      existingMpp,
      projectTotalReq,
      1.0, // streak multiplier (simplified for now)
      isFirstEverContribution,
      spotOverrides,
    );

    // One Wallet (audit A1): probe ledger availability OUTSIDE the transaction.
    const ledgerOn = await isLedgerAvailable();

    // Execute everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct money from player (+ledger, audit A1 — contributions were
      // previously free: the debit vanished at the next client sync)
      if (cashAmount > 0) {
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: {
            money: { decrement: cashAmount },
            totalSpent: { increment: cashAmount },
          },
        });
        if (ledgerOn) {
          await recordLedger(tx, {
            profileId: profile.id, moneyDelta: -cashAmount,
            reason: 'mega_project_contribution', refId: project.id,
          });
        }
      }

      // 2. Deduct resources from player
      if (Object.keys(resourceContributions).length > 0) {
        const updatedResources = { ...playerResources };
        for (const [id, qty] of Object.entries(resourceContributions)) {
          if (!qty) continue;
          updatedResources[id] = Math.max(0, (updatedResources[id] || 0) - qty);
        }
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: { resources: updatedResources },
        });
        if (ledgerOn) {
          for (const [id, qty] of Object.entries(resourceContributions)) {
            if (!qty) continue;
            await recordLedger(tx, {
              profileId: profile.id, resourceSlug: id, resourceDelta: -qty,
              reason: 'mega_project_resources', refId: project.id,
            });
          }
        }
      }

      // 3. Upsert contribution record
      const existingResources = (existingContribution?.resourcesContributed || {}) as Record<string, number>;
      const mergedResources: Record<string, number> = { ...existingResources };
      for (const [id, qty] of Object.entries(resourceContributions)) {
        if (!qty) continue;
        mergedResources[id] = (mergedResources[id] || 0) + qty;
      }

      const newTotalMpp = existingMpp + finalMpp;
      const newTotalCash = (existingContribution?.moneyContributed || 0) + cashAmount;

      const contribution = await tx.megaProjectContribution.upsert({
        where: {
          projectId_profileId: {
            projectId: project.id,
            profileId: profile.id,
          },
        },
        create: {
          projectId: project.id,
          profileId: profile.id,
          moneyContributed: cashAmount,
          resourcesContributed: mergedResources,
          totalMPP: finalMpp,
        },
        update: {
          moneyContributed: newTotalCash,
          resourcesContributed: mergedResources,
          totalMPP: newTotalMpp,
        },
      });

      // 4. Update project global progress
      const phaseProgress = (project.totalResourceFunded || {}) as Record<string, Record<string, number>>;
      const currentPhaseKey = String(project.currentPhase);
      if (!phaseProgress[currentPhaseKey]) {
        phaseProgress[currentPhaseKey] = {};
      }

      // Add cash contribution to current phase
      if (cashAmount > 0) {
        phaseProgress[currentPhaseKey]['cash'] = (phaseProgress[currentPhaseKey]['cash'] || 0) + cashAmount;
      }

      // Add resource contributions to current phase
      for (const [id, qty] of Object.entries(resourceContributions)) {
        if (!qty) continue;
        phaseProgress[currentPhaseKey][id] = (phaseProgress[currentPhaseKey][id] || 0) + qty;
      }

      // Calculate new global progress
      const phaseCosts = project.phaseCosts as unknown as PhaseRequirement[];
      const globalPct = calculateGlobalProgress(phaseCosts, phaseProgress, project.currentPhase);

      await tx.megaProject.update({
        where: { id: project.id },
        data: {
          totalMoneyFunded: { increment: cashAmount },
          totalResourceFunded: phaseProgress,
        },
      });

      // 5. Update player progress and tier
      const newTier = getContributionTier(contribution.totalMPP);

      await tx.megaProjectPlayerProgress.upsert({
        where: {
          profileId: profile.id,
        },
        create: {
          projectId: project.id,
          profileId: profile.id,
          contributionTier: newTier,
        },
        update: {
          contributionTier: newTier,
        },
      });

      // 6. Update alliance score if applicable
      if (profile.allianceMembership?.allianceId) {
        const allianceId = profile.allianceMembership.allianceId;

        // Count contributing members
        const contributingMembers = await tx.megaProjectContribution.count({
          where: {
            projectId: project.id,
            profile: {
              allianceMembership: {
                allianceId: allianceId,
              },
            },
          },
        });

        // Sum alliance total MPP
        const allianceMppResult = await tx.megaProjectContribution.aggregate({
          where: {
            projectId: project.id,
            profile: {
              allianceMembership: {
                allianceId: allianceId,
              },
            },
          },
          _sum: { totalMPP: true },
        });

        const allianceTotalMpp = allianceMppResult._sum.totalMPP || 0;
        const perCapita = contributingMembers > 0 ? allianceTotalMpp / contributingMembers : 0;

        await tx.megaProjectAllianceScore.upsert({
          where: {
            projectId_allianceId: {
              projectId: project.id,
              allianceId: allianceId,
            },
          },
          create: {
            projectId: project.id,
            allianceId: allianceId,
            totalMPP: allianceTotalMpp,
            perCapitaMPP: perCapita,
          },
          update: {
            totalMPP: allianceTotalMpp,
            perCapitaMPP: perCapita,
          },
        });
      }

      // 7. Check for phase completion
      let phaseAdvanced = false;
      let newPhase = project.currentPhase;
      let projectCompleted = false;

      const advanceTo = checkPhaseCompletion(
        project.projectType,
        project.currentPhase,
        phaseProgress,
      );

      if (advanceTo === -1) {
        // Project is fully completed
        projectCompleted = true;
        await tx.megaProject.update({
          where: { id: project.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      } else if (advanceTo !== null) {
        // Phase advanced
        phaseAdvanced = true;
        newPhase = advanceTo;
        await tx.megaProject.update({
          where: { id: project.id },
          data: { currentPhase: advanceTo },
        });
      }

      return {
        contribution,
        mppEarned: finalMpp,
        newTotalMpp: contribution.totalMPP,
        newTier,
        previousTier: existingContribution
          ? getContributionTier(existingMpp)
          : 0,
        smallBonus,
        phaseAdvanced,
        newPhase,
        projectCompleted,
        globalPct,
      };
    });

    // Build response
    const tierInfo = getTierInfo(result.newTotalMpp);
    const tierUp = result.newTier > result.previousTier;

    return NextResponse.json({
      success: true,
      contribution: {
        mppEarned: result.mppEarned,
        newTotalMpp: result.newTotalMpp,
        newTier: result.newTier,
        tierName: tierInfo.tierName,
        tierUp,
        smallBonus: result.smallBonus,
        progressToNext: tierInfo.progressToNext,
      },
      projectProgress: {
        globalPct: Math.round(result.globalPct * 100) / 100,
        phaseAdvanced: result.phaseAdvanced,
        newPhase: result.newPhase,
        projectCompleted: result.projectCompleted,
      },
    });
  } catch (error) {
    logger.error('Mega-project contribute error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
