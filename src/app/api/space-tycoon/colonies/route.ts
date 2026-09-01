import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getColonyClaimCost, getColonyMaxSlots } from '@/lib/game/colonies';
import { isLedgerAvailable, recordLedger } from '@/lib/game/server-ledger';
import { validateBody, colonyClaimSchema } from '@/lib/validations';
import { validationError } from '@/lib/errors';
import type { BuildingInstance } from '@/lib/game/types';
import type { ShipInstance } from '@/lib/game/ships';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/colonies
 * Returns all colony claims across all players — who occupies which locations.
 * Public endpoint — any player can see who controls what.
 */
export async function GET(request: NextRequest) {
  try {
    const locationId = request.nextUrl.searchParams.get('location');

    const where = locationId ? { locationId } : {};
    const claims = await prisma.colonyClaim.findMany({
      where,
      select: {
        locationId: true,
        companyName: true,
        claimedAt: true,
        profile: {
          select: {
            netWorth: true,
            buildingCount: true,
            allianceMembership: {
              select: { alliance: { select: { tag: true, name: true } } },
            },
          },
        },
      },
      orderBy: { claimedAt: 'asc' },
    });

    // Group by location
    const byLocation: Record<string, { companyName: string; allianceTag: string | null; netWorth: number; claimedAt: string }[]> = {};
    for (const claim of claims) {
      if (!byLocation[claim.locationId]) byLocation[claim.locationId] = [];
      byLocation[claim.locationId].push({
        companyName: claim.companyName,
        allianceTag: claim.profile.allianceMembership?.alliance?.tag || null,
        netWorth: claim.profile.netWorth,
        claimedAt: claim.claimedAt.toISOString(),
      });
    }

    // Count totals per location
    const locationCounts: Record<string, number> = {};
    for (const [loc, players] of Object.entries(byLocation)) {
      locationCounts[loc] = players.length;
    }

    return NextResponse.json({ colonies: byLocation, counts: locationCounts, totalClaims: claims.length });
  } catch (error) {
    logger.error('Colony claims fetch error', { error: String(error) });
    return NextResponse.json({ colonies: {}, counts: {}, totalClaims: 0 });
  }
}

class InsufficientFundsError extends Error {}

/**
 * POST /api/space-tycoon/colonies
 * Claim a colony slot at a location. Limited slots per location.
 * Body: { locationId: string, companyName?: string }
 *
 * 2026-09-01 hardening (docs/SECURITY_AUDIT_2026-08.md):
 *  - A claim is no longer free. Each location carries a one-time claim fee
 *    (colonies.ts `claimCost` / BASE_LOCATION_CLAIM_COSTS — $100M in LEO up to
 *    $5B at Pluto) debited through the server ledger and BURNED
 *    (BALANCE.md "The five money sinks": no matching credit). Rejected with
 *    400 on insufficient funds. Previously a free ColonyClaim row at
 *    pluto_surface satisfied cc_pluto_expedition's `colony_established`
 *    check for a $50B payout.
 *  - The player must already have a completed building or a built ship at
 *    the location (server-synced buildingsData / shipsData) — you cannot
 *    "establish presence" somewhere you have never been.
 *  - P10: `companyName` in the body is accepted and IGNORED; the claim and
 *    the activity-feed row are written under the session profile's name.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const parsed = validateBody(colonyClaimSchema, await request.json().catch(() => null));
    if (!parsed.success) {
      const first = Object.values(parsed.errors)[0]?.[0] || 'Missing locationId';
      return validationError(first, parsed.errors);
    }
    const { locationId } = parsed.data;

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true, money: true, buildingsData: true, shipsData: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }
    const companyName = profile.companyName.slice(0, 50);

    // Check if player already claimed this location
    const existing = await prisma.colonyClaim.findUnique({
      where: { locationId_profileId: { locationId, profileId: profile.id } },
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyClaimed: true });
    }

    // Known, claimable location?
    const claimCost = getColonyClaimCost(locationId);
    if (claimCost === null) {
      return NextResponse.json({ error: `Unknown or non-claimable location "${locationId}"` }, { status: 400 });
    }

    // Presence prerequisite: a completed building or a built ship there.
    const buildings = Array.isArray(profile.buildingsData) ? (profile.buildingsData as unknown as BuildingInstance[]) : [];
    const ships = Array.isArray(profile.shipsData) ? (profile.shipsData as unknown as ShipInstance[]) : [];
    const hasPresence =
      buildings.some(b => b && b.isComplete && b.locationId === locationId) ||
      ships.some(s => s && s.isBuilt && s.currentLocation === locationId);
    if (!hasPresence) {
      return NextResponse.json({
        error: `You need a completed building or a stationed ship at ${locationId.replace(/_/g, ' ')} before claiming a colony there.`,
      }, { status: 400 });
    }

    // Check slot limits (colonies.ts EXPANDED_LOCATIONS maxColonySlots; base
    // locations have unlimited slots).
    const maxSlots = getColonyMaxSlots(locationId);
    const currentCount = await prisma.colonyClaim.count({ where: { locationId } });

    if (currentCount >= maxSlots) {
      return NextResponse.json({
        success: false,
        error: `Location ${locationId} is full (${currentCount}/${maxSlots} slots occupied)`,
        slotsUsed: currentCount,
        maxSlots,
      });
    }

    // Affordability (fast-path; the transaction re-checks atomically).
    if (!Number.isFinite(profile.money) || profile.money < claimCost) {
      return NextResponse.json({
        error: `Insufficient funds: claiming ${locationId.replace(/_/g, ' ')} costs $${(claimCost / 1_000_000).toFixed(0)}M (you have $${(Math.max(0, profile.money) / 1_000_000).toFixed(0)}M).`,
        claimCost,
      }, { status: 400 });
    }

    // One Wallet (audit A1): probe ledger availability OUTSIDE the transaction.
    const ledgerOn = await isLedgerAvailable();

    let claim: { claimedAt: Date };
    try {
      claim = await prisma.$transaction(async (tx) => {
        // Atomic debit — only succeeds if the balance still covers the fee.
        const debited = await tx.gameProfile.updateMany({
          where: { id: profile.id, money: { gte: claimCost } },
          data: { money: { decrement: claimCost }, totalSpent: { increment: claimCost } },
        });
        if (debited.count !== 1) {
          throw new InsufficientFundsError('insufficient funds');
        }
        const created = await tx.colonyClaim.create({
          data: {
            locationId,
            profileId: profile.id,
            companyName,
          },
        });
        if (ledgerOn) {
          await recordLedger(tx, {
            profileId: profile.id,
            moneyDelta: -claimCost,
            reason: 'colony_claim_burn',
            refId: created.id,
          });
        }
        return created;
      });
    } catch (err: unknown) {
      if (err instanceof InsufficientFundsError) {
        return NextResponse.json({
          error: `Insufficient funds: claiming ${locationId.replace(/_/g, ' ')} costs $${(claimCost / 1_000_000).toFixed(0)}M.`,
          claimCost,
        }, { status: 400 });
      }
      // Unique-constraint race with a concurrent claim by the same profile.
      if ((err as { code?: string })?.code === 'P2002') {
        return NextResponse.json({ success: true, alreadyClaimed: true });
      }
      throw err;
    }

    // Log activity (P10: under the profile's own name)
    await prisma.playerActivity.create({
      data: {
        profileId: profile.id,
        companyName,
        type: 'colony_claimed',
        title: `${companyName} established presence at ${locationId.replace(/_/g, ' ')}`,
        metadata: { locationId, slotNumber: currentCount + 1, maxSlots, claimCost },
      },
    }).catch(() => { /* non-critical */ });

    logger.info('Colony claimed', { locationId, companyName, slot: currentCount + 1, maxSlots, claimCost });

    return NextResponse.json({
      success: true,
      claim: { locationId, companyName, claimedAt: claim.claimedAt },
      claimCost,
      slotsUsed: currentCount + 1,
      maxSlots,
    });
  } catch (error) {
    logger.error('Colony claim error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to claim colony' }, { status: 500 });
  }
}
