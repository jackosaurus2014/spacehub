import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  evaluateBids,
  generateBiddingContracts,
  CONTRACT_TYPES,
  type BidForEvaluation,
  type ContractForEvaluation,
  SECONDS_PER_GAME_MONTH,
} from '@/lib/game/contract-bidding';
import { getGlobalGameDate } from '@/lib/game/server-time';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/bidding/resolve
 * Cron job endpoint: resolve expired bidding contracts and generate new ones.
 *
 * 1. Find all contracts where status='open' AND biddingEndsAt <= NOW()
 * 2. For each: run evaluateBids, award to winner, refund losing collateral
 * 3. Update BiddingContract status
 * 4. Generate new contracts if below minimum
 *
 * This should be called every 5 minutes by a cron job.
 * Security: In production, protect with a cron secret header.
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: verify cron secret for production
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let contractsResolved = 0;
    let contractsGenerated = 0;
    let deadlinesExpired = 0;

    // ── Phase 1: Resolve expired bidding windows ──────────────────────

    const expiredContracts = await prisma.biddingContract.findMany({
      where: {
        status: 'open',
        biddingEndsAt: { lte: now },
      },
      include: {
        bids: {
          where: { status: 'pending' },
          include: {
            profile: {
              select: {
                id: true,
                companyName: true,
                researchCount: true,
                totalBidsWon: true,
                bidReliability: true,
              },
            },
          },
        },
      },
      orderBy: { biddingEndsAt: 'asc' },
    });

    for (const contract of expiredContracts) {
      try {
        if (contract.bids.length === 0) {
          // No bids -- mark as expired
          await prisma.biddingContract.update({
            where: { id: contract.id },
            data: { status: 'expired' },
          });
          contractsResolved++;
          continue;
        }

        // Convert bids for evaluation
        const bidsForEval: BidForEvaluation[] = contract.bids.map(bid => ({
          id: bid.id,
          profileId: bid.profileId,
          companyName: bid.profile.companyName,
          priceOffer: bid.bidAmount,
          deliveryPromise: bid.deliveryPromise || 1,
          collateralLocked: bid.collateralLocked,
          reputationAtBid: bid.profile.researchCount * 30 + bid.profile.totalBidsWon * 15,
          reliabilityAtBid: bid.profile.bidReliability,
          createdAt: bid.createdAt,
        }));

        const contractDef = CONTRACT_TYPES[contract.contractType];
        const deliveryMonths = contractDef?.deliveryMonthsByTier[contract.tier] ?? 3;

        const contractForEval: ContractForEvaluation = {
          id: contract.id,
          contractType: contract.contractType,
          minBid: contract.minBid,
          maxBid: contract.maxBid,
          deliveryMonths,
          tier: contract.tier,
        };

        // Evaluate bids
        const results = evaluateBids(contractForEval, bidsForEval);
        const winner = results.find(r => r.isWinner);

        if (!winner) {
          // Edge case: no valid winner
          await prisma.biddingContract.update({
            where: { id: contract.id },
            data: { status: 'expired' },
          });
          // Refund all collateral
          for (const bid of contract.bids) {
            await refundCollateral(bid.profileId, bid.collateralLocked, bid.id);
          }
          contractsResolved++;
          continue;
        }

        // Calculate delivery deadline
        const winnerBid = contract.bids.find(b => b.id === winner.bidId);
        const winnerDeliveryMonths = winnerBid?.deliveryPromise || 3;
        const deliveryDeadline = new Date(
          now.getTime() + winnerDeliveryMonths * SECONDS_PER_GAME_MONTH * 1000
        );

        // Award contract to winner in a transaction
        await prisma.$transaction(async (tx) => {
          // Update contract status
          await tx.biddingContract.update({
            where: { id: contract.id },
            data: {
              status: 'awarded',
              winnerId: winner.profileId,
              winningBid: bidsForEval.find(b => b.id === winner.bidId)?.priceOffer,
              deliveryDeadline,
              completedAt: null,
            },
          });

          // Update winning bid
          await tx.contractBid.update({
            where: { id: winner.bidId },
            data: {
              status: 'won',
              compositeScore: winner.compositeScore,
            },
          });

          // Update winner's profile
          await tx.gameProfile.update({
            where: { id: winner.profileId },
            data: {
              totalBidsWon: { increment: 1 },
            },
          });

          // Mark losing bids and refund collateral
          for (const result of results) {
            if (result.isWinner) continue;
            const losingBid = contract.bids.find(b => b.id === result.bidId);
            if (!losingBid) continue;

            await tx.contractBid.update({
              where: { id: result.bidId },
              data: {
                status: 'lost',
                compositeScore: result.compositeScore,
              },
            });

            // Refund collateral to losing bidder
            await tx.gameProfile.update({
              where: { id: losingBid.profileId },
              data: {
                money: { increment: losingBid.collateralLocked },
              },
            });
          }

          // Create activity feed entry
          await tx.playerActivity.create({
            data: {
              profileId: winner.profileId,
              companyName: winner.companyName,
              type: 'bidding_contract_won',
              title: `${winner.companyName} won "${contract.title}"`,
              description: `Winning bid: $${formatShort(bidsForEval.find(b => b.id === winner.bidId)?.priceOffer || 0)} (${contract.bids.length} bids)`,
              metadata: {
                contractId: contract.id,
                contractType: contract.contractType,
                contractTier: contract.tier,
                winningBid: bidsForEval.find(b => b.id === winner.bidId)?.priceOffer,
                totalBids: contract.bids.length,
              },
            },
          });
        });

        contractsResolved++;

        logger.info('Contract resolved', {
          contractId: contract.id,
          winnerId: winner.profileId,
          winnerCompany: winner.companyName,
          winnerScore: winner.compositeScore,
          totalBids: contract.bids.length,
        });

      } catch (resolveError) {
        logger.error('Failed to resolve individual contract', {
          contractId: contract.id,
          error: String(resolveError),
        });
      }
    }

    // ── Phase 2: Check awarded contracts approaching/past deadline ────

    const overdueContracts = await prisma.biddingContract.findMany({
      where: {
        status: 'awarded',
        deliveryDeadline: { lte: now },
      },
    });

    for (const contract of overdueContracts) {
      try {
        // Mark as failed (the fulfill endpoint handles actual fulfillment claims)
        await prisma.biddingContract.update({
          where: { id: contract.id },
          data: { status: 'failed' },
        });

        // Find winning bid
        const winningBid = await prisma.contractBid.findFirst({
          where: { contractId: contract.id, status: 'won' },
        });

        if (winningBid && contract.winnerId) {
          // Forfeit collateral (full forfeit for deadline expiry)
          await prisma.gameProfile.update({
            where: { id: contract.winnerId },
            data: {
              totalBidsFailed: { increment: 1 },
              bidReliability: { decrement: 0.1 },
              biddingCooldownUntil: new Date(now.getTime() + 2 * SECONDS_PER_GAME_MONTH * 1000),
            },
          });

          // Update bid status
          await prisma.contractBid.update({
            where: { id: winningBid.id },
            data: { status: 'lost' },
          });

          // Activity feed
          await prisma.playerActivity.create({
            data: {
              profileId: contract.winnerId,
              companyName: 'System',
              type: 'bidding_contract_failed',
              title: `Contract deadline expired: "${contract.title}"`,
              description: `Collateral of $${formatShort(winningBid.collateralLocked)} forfeited.`,
              metadata: {
                contractId: contract.id,
                collateralLost: winningBid.collateralLocked,
              },
            },
          });
        }

        deadlinesExpired++;
      } catch (deadlineError) {
        logger.error('Failed to process deadline expiry', {
          contractId: contract.id,
          error: String(deadlineError),
        });
      }
    }

    // ── Phase 3: Generate new contracts if below minimum ─────────────

    const activeCount = await prisma.biddingContract.count({
      where: { status: 'open' },
    });

    // Count active players (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const playerCount = await prisma.gameProfile.count({
      where: { lastSyncAt: { gte: twentyFourHoursAgo } },
    });

    const newContracts = generateBiddingContracts(activeCount, playerCount);

    for (const contractData of newContracts) {
      try {
        // Check max same type active
        const sameTypeCount = await prisma.biddingContract.count({
          where: { status: 'open', contractType: contractData.contractType },
        });

        if (sameTypeCount >= 3) continue; // Skip if already 3 of this type

        await prisma.biddingContract.create({
          data: {
            contractType: contractData.contractType,
            tier: contractData.tier,
            title: contractData.title,
            description: contractData.description,
            requirements: JSON.parse(JSON.stringify(contractData.requirements)),
            baseReward: contractData.baseReward,
            minBid: contractData.minBid,
            maxBid: contractData.maxBid,
            collateralPct: contractData.collateralPct,
            biddingEndsAt: contractData.biddingEndsAt,
            status: 'open',
          },
        });

        contractsGenerated++;
      } catch (genError) {
        logger.error('Failed to generate contract', {
          contractType: contractData.contractType,
          error: String(genError),
        });
      }
    }

    logger.info('Bidding resolution cycle complete', {
      contractsResolved,
      contractsGenerated,
      deadlinesExpired,
      activeCount: activeCount + contractsGenerated,
    });

    return NextResponse.json({
      success: true,
      contractsResolved,
      contractsGenerated,
      deadlinesExpired,
    });

  } catch (error) {
    logger.error('Bidding resolution error', { error: String(error) });
    return NextResponse.json(
      { error: 'Resolution cycle failed' },
      { status: 500 }
    );
  }
}

async function refundCollateral(profileId: string, amount: number, bidId: string) {
  await prisma.$transaction([
    prisma.gameProfile.update({
      where: { id: profileId },
      data: { money: { increment: amount } },
    }),
    prisma.contractBid.update({
      where: { id: bidId },
      data: { status: 'lost' },
    }),
  ]);
}

function formatShort(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return `${amount}`;
}
