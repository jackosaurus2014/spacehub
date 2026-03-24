import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  calculateCollateral,
  MAX_CONCURRENT_BIDS,
  MAX_CONCURRENT_WON,
  MIN_BALANCE_AFTER_COLLATERAL,
} from '@/lib/game/contract-bidding';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/bidding/bid
 * Place a bid on a contract.
 *
 * Body: { contractId: string, bidAmount: number, deliveryPromise: number }
 *
 * Validates:
 * - Max 3 concurrent bids
 * - Tier requirements
 * - Sufficient collateral
 * - Bidding still open
 * - Locks collateral from player's money
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const body = await request.json();
    const { contractId, bidAmount, deliveryPromise } = body;

    if (!contractId || bidAmount == null || deliveryPromise == null) {
      return NextResponse.json(
        { success: false, error: 'Missing contractId, bidAmount, or deliveryPromise', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (typeof bidAmount !== 'number' || bidAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'bidAmount must be a positive number', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (typeof deliveryPromise !== 'number' || deliveryPromise < 1) {
      return NextResponse.json(
        { success: false, error: 'deliveryPromise must be at least 1 game month', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Execute bid placement in a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Load player profile
      const profile = await tx.gameProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!profile) {
        throw new BidError('No game profile found', 'NO_PROFILE');
      }

      // 2. Check bidding cooldown
      if (profile.biddingCooldownUntil && profile.biddingCooldownUntil > new Date()) {
        throw new BidError(
          `Bidding cooldown active until ${profile.biddingCooldownUntil.toISOString()}`,
          'COOLDOWN_ACTIVE'
        );
      }

      // 3. Count active bids
      const activeBidCount = await tx.contractBid.count({
        where: { profileId: profile.id, status: 'pending' },
      });

      if (activeBidCount >= MAX_CONCURRENT_BIDS) {
        throw new BidError(
          `Maximum ${MAX_CONCURRENT_BIDS} concurrent bids allowed`,
          'MAX_BIDS_REACHED'
        );
      }

      // 4. Count active won contracts
      const wonCount = await tx.biddingContract.count({
        where: {
          winnerId: profile.id,
          status: { in: ['awarded', 'in_progress'] },
        },
      });

      if (wonCount >= MAX_CONCURRENT_WON) {
        throw new BidError(
          `Maximum ${MAX_CONCURRENT_WON} active won contracts allowed`,
          'MAX_WON_REACHED'
        );
      }

      // 5. Load the contract
      const contract = await tx.biddingContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        throw new BidError('Contract not found', 'CONTRACT_NOT_FOUND');
      }

      // 6. Check contract is open for bidding
      if (contract.status !== 'open') {
        throw new BidError('Contract is not open for bidding', 'CONTRACT_CLOSED');
      }

      if (contract.biddingEndsAt <= new Date()) {
        throw new BidError('Bidding window has closed', 'CONTRACT_CLOSED');
      }

      // 7. Validate bid amount range
      if (bidAmount < contract.minBid) {
        throw new BidError(
          `Bid must be at least $${contract.minBid.toLocaleString()}`,
          'BID_OUT_OF_RANGE'
        );
      }

      if (bidAmount > contract.maxBid) {
        throw new BidError(
          `Bid cannot exceed $${contract.maxBid.toLocaleString()}`,
          'BID_OUT_OF_RANGE'
        );
      }

      // 8. Validate delivery promise
      const maxDelivery = (contract.requirements as { leaseDurationMonths?: number })?.leaseDurationMonths || 12;
      if (deliveryPromise > maxDelivery && deliveryPromise > 12) {
        throw new BidError(
          `Delivery promise cannot exceed ${maxDelivery} game months`,
          'VALIDATION_ERROR'
        );
      }

      // 9. Check for existing bid on this contract
      const existingBid = await tx.contractBid.findUnique({
        where: {
          contractId_profileId: {
            contractId: contract.id,
            profileId: profile.id,
          },
        },
      });

      if (existingBid) {
        throw new BidError(
          'You already have a bid on this contract',
          'ALREADY_BID'
        );
      }

      // 10. Calculate collateral
      // Count recent wins (last 24 hours) for escalation
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000);
      const recentWins = await tx.biddingContract.count({
        where: {
          winnerId: profile.id,
          completedAt: { gte: twentyFourHoursAgo },
        },
      });

      const { collateralPct, collateralAmount } = calculateCollateral(
        contract.tier,
        bidAmount,
        recentWins,
      );

      // 11. Check player can afford collateral
      if (profile.money - collateralAmount < MIN_BALANCE_AFTER_COLLATERAL) {
        throw new BidError(
          `Insufficient funds. Need $${(collateralAmount + MIN_BALANCE_AFTER_COLLATERAL).toLocaleString()} (collateral + minimum balance)`,
          'INSUFFICIENT_FUNDS'
        );
      }

      // 12. Calculate reputation snapshot
      const reputationAtBid = profile.researchCount * 30 + profile.totalBidsWon * 15;

      // 13. Create the bid
      const bid = await tx.contractBid.create({
        data: {
          contractId: contract.id,
          profileId: profile.id,
          bidAmount,
          deliveryPromise,
          collateralLocked: collateralAmount,
          compositeScore: null, // Computed at resolution time
          status: 'pending',
        },
      });

      // 14. Deduct collateral from player balance
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: {
          money: { decrement: collateralAmount },
        },
      });

      // 15. Increment contract bid count
      await tx.biddingContract.update({
        where: { id: contract.id },
        data: {
          bidCount: { increment: 1 },
        },
      });

      return {
        bid: {
          id: bid.id,
          contractId: bid.contractId,
          bidAmount: bid.bidAmount,
          deliveryPromise: bid.deliveryPromise,
          collateralLocked: bid.collateralLocked,
          collateralPct,
          status: bid.status,
        },
        profile: {
          money: profile.money - collateralAmount,
          activeBidCount: activeBidCount + 1,
        },
      };
    });

    logger.info('Bid placed', {
      contractId,
      bidAmount,
      collateral: result.bid.collateralLocked,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      ...result,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof BidError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 400 }
      );
    }

    logger.error('Bid placement error', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}

class BidError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'BidError';
  }
}
