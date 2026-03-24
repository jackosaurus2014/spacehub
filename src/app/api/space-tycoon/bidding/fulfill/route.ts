import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  checkContractFulfillment,
  calculatePenalty,
  updateReliability,
  CONTRACT_TYPES,
  SECONDS_PER_GAME_MONTH,
  type ContractRequirements,
  type FulfillmentOutcome,
} from '@/lib/game/contract-bidding';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/bidding/fulfill
 * Mark a won contract as completed or failed.
 *
 * Body: { contractId: string, action: 'claim' | 'abandon' }
 *
 * - 'claim': Check if the player has fulfilled the contract requirements
 * - 'abandon': Voluntarily abandon the contract (50% collateral forfeit)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const body = await request.json();
    const { contractId, action } = body;

    if (!contractId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing contractId or action' },
        { status: 400 }
      );
    }

    if (!['claim', 'abandon'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be "claim" or "abandon"' },
        { status: 400 }
      );
    }

    // Load the contract
    const contract = await prisma.biddingContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      );
    }

    if (contract.status !== 'awarded') {
      return NextResponse.json(
        { success: false, error: 'Contract is not in awarded status' },
        { status: 400 }
      );
    }

    // Load the player's profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'No game profile found' },
        { status: 404 }
      );
    }

    // Verify this player is the winner
    if (contract.winnerId !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'You are not the winner of this contract' },
        { status: 403 }
      );
    }

    // Load the winning bid
    const winningBid = await prisma.contractBid.findFirst({
      where: { contractId: contract.id, profileId: profile.id, status: 'won' },
    });

    if (!winningBid) {
      return NextResponse.json(
        { success: false, error: 'Winning bid not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const requirements = contract.requirements as unknown as ContractRequirements;
    const contractDef = CONTRACT_TYPES[contract.contractType];

    // ── Handle Abandon ────────────────────────────────────────────────

    if (action === 'abandon') {
      const collateralLost = Math.round(winningBid.collateralLocked * 0.50);
      const collateralReturned = winningBid.collateralLocked - collateralLost;

      const newReliability = updateReliability(profile.bidReliability, 'abandoned');
      const cooldownUntil = new Date(now.getTime() + 1 * SECONDS_PER_GAME_MONTH * 1000);

      await prisma.$transaction(async (tx) => {
        // Update contract
        await tx.biddingContract.update({
          where: { id: contract.id },
          data: {
            status: 'failed',
            completedAt: now,
          },
        });

        // Update bid
        await tx.contractBid.update({
          where: { id: winningBid.id },
          data: { status: 'withdrawn' },
        });

        // Update profile: return partial collateral, apply penalties
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: {
            money: { increment: collateralReturned },
            bidReliability: newReliability,
            totalBidsFailed: { increment: 1 },
            biddingCooldownUntil: cooldownUntil,
          },
        });

        // Activity feed
        await tx.playerActivity.create({
          data: {
            profileId: profile.id,
            companyName: profile.companyName,
            type: 'bidding_contract_abandoned',
            title: `${profile.companyName} abandoned "${contract.title}"`,
            description: `Collateral lost: $${formatShort(collateralLost)}`,
            metadata: {
              contractId: contract.id,
              collateralLost,
              collateralReturned,
            },
          },
        });
      });

      logger.info('Contract abandoned', {
        contractId: contract.id,
        profileId: profile.id,
        collateralLost,
      });

      return NextResponse.json({
        success: true,
        result: 'abandoned',
        collateralLost,
        collateralReturned,
        reputationChange: -10,
        cooldownUntil: cooldownUntil.toISOString(),
        newReliability,
      });
    }

    // ── Handle Claim ──────────────────────────────────────────────────

    // Check fulfillment
    const fulfillment = checkContractFulfillment(requirements, {
      buildingsData: profile.buildingsData,
      resources: profile.resources,
      completedResearchList: profile.completedResearchList,
      shipsData: profile.shipsData,
      unlockedLocationsList: profile.unlockedLocationsList,
    });

    if (!fulfillment.isFulfilled) {
      // Not yet fulfilled -- return progress report
      const deadline = contract.deliveryDeadline;
      const timeRemaining = deadline
        ? Math.max(0, deadline.getTime() - now.getTime())
        : 0;

      return NextResponse.json({
        success: false,
        result: 'incomplete',
        progress: {
          percentage: Math.round(fulfillment.percentage),
          details: fulfillment.details,
          remainingTimeMs: timeRemaining,
          deadline: deadline?.toISOString() || null,
        },
      });
    }

    // Contract is fulfilled!
    const bidAmount = winningBid.bidAmount;
    const supportsPartial = contractDef?.supportsPartialFulfillment || false;

    // Determine outcome
    let outcome: FulfillmentOutcome = 'fulfilled_on_time';
    let bonusMultiplier = 1.0;

    // Check if fulfilled early (speed bonus)
    if (contract.deliveryDeadline) {
      const totalTime = contract.deliveryDeadline.getTime() - (contract.completedAt?.getTime() || contract.updatedAt.getTime());
      const elapsed = now.getTime() - (contract.completedAt?.getTime() || contract.updatedAt.getTime());
      if (elapsed < totalTime * 0.5) {
        outcome = 'fulfilled_with_bonus';
        bonusMultiplier = 1.10; // 10% speed bonus
      }
    }

    const newReliability = updateReliability(profile.bidReliability, outcome);
    const payment = Math.round(bidAmount * bonusMultiplier);
    const collateralReturned = winningBid.collateralLocked;
    const reputationGain = outcome === 'fulfilled_with_bonus' ? 25 : 15;

    await prisma.$transaction(async (tx) => {
      // Update contract
      await tx.biddingContract.update({
        where: { id: contract.id },
        data: {
          status: 'completed',
          completedAt: now,
        },
      });

      // Update bid
      await tx.contractBid.update({
        where: { id: winningBid.id },
        data: { status: 'won' }, // Keep as won (completed)
      });

      // Deduct resources if it's a resource delivery contract
      if (requirements.type === 'resources_delivered' && requirements.resourceId) {
        const currentResources = (profile.resources as Record<string, number>) || {};
        const newResources = { ...currentResources };
        newResources[requirements.resourceId] = Math.max(
          0,
          (newResources[requirements.resourceId] || 0) - requirements.target
        );

        await tx.gameProfile.update({
          where: { id: profile.id },
          data: { resources: newResources },
        });
      }

      // Pay the player: bid amount + returned collateral
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: {
          money: { increment: payment + collateralReturned },
          bidReliability: newReliability,
        },
      });

      // Activity feed
      const bonuses: string[] = [];
      if (outcome === 'fulfilled_with_bonus') bonuses.push('Speed Bonus (+10%)');

      await tx.playerActivity.create({
        data: {
          profileId: profile.id,
          companyName: profile.companyName,
          type: 'bidding_contract_fulfilled',
          title: `${profile.companyName} completed "${contract.title}"`,
          description: bonuses.length > 0
            ? `Earned ${bonuses.join(', ')} bonuses! Payment: $${formatShort(payment)}`
            : `Contract fulfilled on time. Payment: $${formatShort(payment)}`,
          metadata: {
            contractId: contract.id,
            paymentReceived: payment,
            bonusReceived: payment - bidAmount,
            collateralReturned,
          },
        },
      });
    });

    logger.info('Contract fulfilled', {
      contractId: contract.id,
      profileId: profile.id,
      payment,
      outcome,
    });

    return NextResponse.json({
      success: true,
      result: 'fulfilled',
      payment,
      bonuses: {
        speedBonus: outcome === 'fulfilled_with_bonus' ? payment - bidAmount : null,
      },
      collateralReturned,
      reputationChange: reputationGain,
      newReliability,
    });

  } catch (error) {
    logger.error('Fulfillment error', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to process fulfillment' },
      { status: 500 }
    );
  }
}

function formatShort(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return `${amount}`;
}
