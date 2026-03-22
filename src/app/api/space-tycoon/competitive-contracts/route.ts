import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { COMPETITIVE_CONTRACT_POOL } from '@/lib/game/competitive-contracts';
import { getGlobalGameDate } from '@/lib/game/server-time';

export const dynamic = 'force-dynamic';

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
    const { contractId, companyName } = body;

    if (!contractId || !companyName) {
      return NextResponse.json({ error: 'Missing contractId or companyName' }, { status: 400 });
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

    // Claim the slot
    await prisma.playerActivity.create({
      data: {
        profileId: profile.id,
        companyName: String(companyName).slice(0, 50),
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
