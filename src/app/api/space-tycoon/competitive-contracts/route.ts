import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { COMPETITIVE_CONTRACT_POOL } from '@/lib/game/competitive-contracts';
import { getGlobalGameDate } from '@/lib/game/server-time';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import { checkContractFulfillment, type GameProfileForFulfillment } from '@/lib/game/contract-bidding';

export const dynamic = 'force-dynamic';

/** Only 'colony_established' needs the extra ColonyClaim lookup. */
function requiresColonyCheck(requirementType: string): boolean {
  return requirementType === 'colony_established';
}

/**
 * GET /api/space-tycoon/competitive-contracts
 * Returns all active competitive contracts with their claim status.
 */
export async function GET() {
  try {
    const gameDate = getGlobalGameDate();

    // Get active contracts based on game month
    const activeContracts = COMPETITIVE_CONTRACT_POOL.filter(
      c => gameDate.totalMonths >= c.availableAfterGameMonth
    );

    // Get all claims from the database
    const claims = await prisma.playerActivity.findMany({
      where: { type: 'competitive_contract_claimed' },
      select: {
        companyName: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Map claims by contract ID
    const claimsByContract: Record<string, { companyName: string; claimedAt: string }[]> = {};
    for (const claim of claims) {
      const meta = claim.metadata as Record<string, unknown> | null;
      const contractId = meta?.contractId as string;
      if (contractId) {
        if (!claimsByContract[contractId]) claimsByContract[contractId] = [];
        claimsByContract[contractId].push({
          companyName: claim.companyName,
          claimedAt: claim.createdAt.toISOString(),
        });
      }
    }

    // Build response with claim status
    const contracts = activeContracts.map(c => ({
      ...c,
      winners: claimsByContract[c.id] || [],
      slotsRemaining: c.maxWinners - (claimsByContract[c.id]?.length || 0),
      isFull: (claimsByContract[c.id]?.length || 0) >= c.maxWinners,
    }));

    return NextResponse.json({
      contracts,
      gameMonth: gameDate.totalMonths,
      totalActive: contracts.length,
      totalFull: contracts.filter(c => c.isFull).length,
    });
  } catch (error) {
    logger.error('Competitive contracts fetch error', { error: String(error) });
    return NextResponse.json({ contracts: [], gameMonth: 0, totalActive: 0, totalFull: 0 });
  }
}

/**
 * POST /api/space-tycoon/competitive-contracts
 * Claim a competitive contract slot. First-come-first-served.
 * Body: { contractId: string, companyName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const body = await request.json();
    // P10 (docs/SECURITY_AUDIT_2026-08.md, 2026-09-01 hardening): body.companyName
    // is accepted for backward compatibility and IGNORED — the activity row
    // is written under the session profile's own name (see below).
    const { contractId } = body;

    if (!contractId || typeof contractId !== 'string') {
      return NextResponse.json({ error: 'Missing contractId' }, { status: 400 });
    }

    // Find the contract definition
    const contract = COMPETITIVE_CONTRACT_POOL.find(c => c.id === contractId);
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check if game month has reached availability
    const gameDate = getGlobalGameDate();
    if (gameDate.totalMonths < contract.availableAfterGameMonth) {
      return NextResponse.json({ error: 'Contract not yet available' }, { status: 400 });
    }

    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }
    const companyName = profile.companyName;

    // Check if this player already claimed this contract
    const existingClaim = await prisma.playerActivity.findFirst({
      where: {
        profileId: profile.id,
        type: 'competitive_contract_claimed',
        metadata: { path: ['contractId'], equals: contractId },
      },
    });
    if (existingClaim) {
      return NextResponse.json({ success: false, error: 'You already claimed this contract' });
    }

    // Check if slots are still available
    const currentClaims = await prisma.playerActivity.count({
      where: {
        type: 'competitive_contract_claimed',
        metadata: { path: ['contractId'], equals: contractId },
      },
    });

    if (currentClaims >= contract.maxWinners) {
      return NextResponse.json({
        success: false,
        error: `All ${contract.maxWinners} slots are filled`,
        slotsRemaining: 0,
      });
    }

    // ── Wave E1 (docs/ECONOMY_PVP_2026-08.md §E1, exploit #1): this route
    // used to pay out on timing/duplication/slot checks ONLY — a logged-in
    // user could curl `{contractId:'cc_pluto_expedition'}` for $50B with no
    // verification that they actually meet the contract's requirement.
    // checkContractFulfillment() existed (used by bidding/fulfill) and was
    // never called here. Verify against the profile's own server-synced
    // state before any payout; unverifiable requirement types (survey
    // discoveries, trade volume — see contract-bidding.ts) fail CLOSED.
    const colonyClaims = requiresColonyCheck(contract.requirement.type)
      ? await prisma.colonyClaim.findMany({ where: { profileId: profile.id }, select: { locationId: true } })
      : [];
    const fulfillmentProfile: GameProfileForFulfillment = {
      buildingsData: profile.buildingsData,
      resources: profile.resources,
      completedResearchList: profile.completedResearchList,
      shipsData: profile.shipsData,
      unlockedLocationsList: profile.unlockedLocationsList,
      netWorth: profile.netWorth,
      serviceCount: profile.serviceCount,
      colonyLocationIds: colonyClaims.map(c => c.locationId),
    };
    const fulfillment = checkContractFulfillment(
      {
        type: contract.requirement.type,
        target: contract.requirement.target,
        locationId: contract.requirement.locationId,
        resourceId: contract.requirement.resourceId,
        categoryId: contract.requirement.categoryId,
        label: contract.requirement.label,
      },
      fulfillmentProfile,
    );

    if (!fulfillment.isFulfilled) {
      // Logged rejection — this is the abuse path the exploit used to hit.
      logger.warn('Competitive contract claim rejected — requirement not met', {
        contractId, companyName, userId: session.user.id, profileId: profile.id,
        requirementType: contract.requirement.type,
        progress: fulfillment.details,
        percentage: fulfillment.percentage,
      });
      try {
        await prisma.marketAuditLog.create({
          data: {
            eventType: 'competitive_contract_unverified_claim',
            profileId: profile.id,
            details: {
              contractId,
              requirementType: contract.requirement.type,
              target: contract.requirement.target,
              percentage: fulfillment.percentage,
              details: fulfillment.details,
              claimedReward: contract.reward.money,
            },
            severity: 'warning',
          },
        });
      } catch { /* audit log is best-effort */ }
      return NextResponse.json({
        success: false,
        error: `Contract requirement not met: ${fulfillment.details}`,
        progress: { percentage: Math.round(fulfillment.percentage), details: fulfillment.details },
      }, { status: 400 });
    }

    // One Wallet (audit A1): probe ledger availability OUTSIDE the transaction.
    const ledgerOn = await isLedgerAvailable();

    // Claim the slot and pay the reward (previously the reward existed only
    // in the response JSON — nobody was ever credited)
    await prisma.$transaction(async (tx) => {
      await tx.playerActivity.create({
        data: {
          profileId: profile.id,
          companyName: companyName.slice(0, 50),
          type: 'competitive_contract_claimed',
          title: `${companyName} completed "${contract.title}"`,
          description: `Slot ${currentClaims + 1}/${contract.maxWinners} — Reward: $${(contract.reward.money / 1e6).toFixed(0)}M`,
          metadata: {
            contractId,
            slotNumber: currentClaims + 1,
            maxWinners: contract.maxWinners,
            reward: contract.reward.money,
            tier: contract.tier,
          },
        },
      });
      if (contract.reward.money > 0) {
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: {
            money: { increment: contract.reward.money },
            totalEarned: { increment: contract.reward.money },
          },
        });
        if (ledgerOn) {
          await recordLedger(tx, {
            profileId: profile.id, moneyDelta: contract.reward.money,
            reason: 'competitive_contract_reward', refId: contractId,
          });
        }
      }
    });

    logger.info('Competitive contract claimed', {
      contractId, companyName,
      slot: currentClaims + 1, maxWinners: contract.maxWinners,
      reward: contract.reward.money,
    });

    return NextResponse.json({
      success: true,
      slotNumber: currentClaims + 1,
      slotsRemaining: contract.maxWinners - currentClaims - 1,
      reward: contract.reward,
      exclusiveTitle: contract.reward.exclusiveTitle || null,
    });
  } catch (error) {
    logger.error('Competitive contract claim error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to claim contract' }, { status: 500 });
  }
}
