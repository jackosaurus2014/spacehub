import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getGlobalGameDate } from '@/lib/game/server-time';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/bidding
 * List active bidding contracts with status, tier, bid count, time remaining.
 * Supports filtering by status (open, awarded, in_progress).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'open';
    const tierFilter = searchParams.get('tier');
    const typeFilter = searchParams.get('type');

    // Get the player's profile for reputation-gated info
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        money: true,
        bidReliability: true,
        totalBidsWon: true,
        totalBidsFailed: true,
        biddingCooldownUntil: true,
        researchCount: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    // Estimate reputation from research count (simple heuristic)
    const playerReputation = profile.researchCount * 30 + profile.totalBidsWon * 15;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (statusFilter === 'all') {
      // No status filter
    } else if (statusFilter) {
      where.status = statusFilter;
    }

    if (tierFilter) {
      where.tier = parseInt(tierFilter, 10);
    }

    if (typeFilter) {
      where.contractType = typeFilter;
    }

    // Fetch contracts
    const contracts = await prisma.biddingContract.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { biddingEndsAt: 'asc' },
      ],
      include: {
        winner: {
          select: { companyName: true },
        },
        bids: {
          where: { profileId: profile.id },
          select: {
            id: true,
            bidAmount: true,
            deliveryPromise: true,
            collateralLocked: true,
            status: true,
            compositeScore: true,
            createdAt: true,
          },
        },
        _count: {
          select: { bids: true },
        },
      },
      take: 50,
    });

    const gameDate = getGlobalGameDate();
    const now = new Date();

    // Map contracts with visibility rules
    const mappedContracts = contracts.map(contract => {
      const myBid = contract.bids[0] || null;
      const timeRemaining = contract.biddingEndsAt.getTime() - now.getTime();
      const isExpired = timeRemaining <= 0;

      // Bid count visibility based on reputation
      let bidCount: number | null = null;
      if (playerReputation >= 1000) {
        bidCount = contract._count.bids;
      }

      // Estimated value range visible at 500+ reputation
      let estimatedValueRange: string | null = null;
      if (playerReputation >= 500) {
        const low = Math.round(contract.minBid * 1.5);
        const high = Math.round(contract.maxBid * 0.75);
        estimatedValueRange = `$${formatShort(low)} - $${formatShort(high)}`;
      }

      return {
        id: contract.id,
        contractType: contract.contractType,
        tier: contract.tier,
        title: contract.title,
        description: contract.description,
        requirements: contract.requirements,
        minBid: contract.minBid,
        maxBid: contract.maxBid,
        collateralPct: contract.collateralPct,
        status: contract.status,
        biddingEndsAt: contract.biddingEndsAt.toISOString(),
        deliveryDeadline: contract.deliveryDeadline?.toISOString() || null,
        timeRemainingMs: Math.max(0, timeRemaining),
        isExpired,
        bidCount,
        estimatedValueRange,
        winnerCompany: contract.status === 'awarded' || contract.status === 'completed'
          ? (contract.winner?.companyName ?? null) : null,
        winningBid: contract.status === 'completed' ? contract.winningBid : null,
        baseReward: contract.baseReward,
        myBid: myBid ? {
          id: myBid.id,
          bidAmount: myBid.bidAmount,
          deliveryPromise: myBid.deliveryPromise,
          collateralLocked: myBid.collateralLocked,
          status: myBid.status,
          compositeScore: myBid.compositeScore,
        } : null,
      };
    });

    return NextResponse.json({
      contracts: mappedContracts,
      meta: {
        total: mappedContracts.length,
        gameMonth: gameDate.totalMonths,
        playerReputation,
        activeBidCount: await prisma.contractBid.count({
          where: { profileId: profile.id, status: 'pending' },
        }),
        playerMoney: profile.money,
        bidReliability: profile.bidReliability,
        biddingCooldownUntil: profile.biddingCooldownUntil?.toISOString() || null,
      },
    });
  } catch (error) {
    logger.error('Bidding contracts fetch error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch bidding contracts' },
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
