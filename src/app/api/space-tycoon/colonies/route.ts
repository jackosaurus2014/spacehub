import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

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

/**
 * POST /api/space-tycoon/colonies
 * Claim a colony slot at a location. Limited slots per location.
 * Body: { locationId: string, companyName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const body = await request.json();
    const { locationId, companyName } = body;
    if (!locationId || !companyName) {
      return NextResponse.json({ error: 'Missing locationId or companyName' }, { status: 400 });
    }

    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    // Check if player already claimed this location
    const existing = await prisma.colonyClaim.findUnique({
      where: { locationId_profileId: { locationId, profileId: profile.id } },
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyClaimed: true });
    }

    // Check slot limits (from colonies.ts EXPANDED_LOCATIONS)
    const MAX_SLOTS: Record<string, number> = {
      mercury_surface: 50, venus_orbit: 30, ceres_surface: 100,
      io_surface: 20, europa_surface: 25, ganymede_surface: 60, callisto_surface: 40,
      titan_surface: 40, enceladus_surface: 15, titania_surface: 20,
      triton_surface: 10, pluto_surface: 5,
      // Base locations have unlimited slots
    };
    const maxSlots = MAX_SLOTS[locationId] || 999;
    const currentCount = await prisma.colonyClaim.count({ where: { locationId } });

    if (currentCount >= maxSlots) {
      return NextResponse.json({
        success: false,
        error: `Location ${locationId} is full (${currentCount}/${maxSlots} slots occupied)`,
        slotsUsed: currentCount,
        maxSlots,
      });
    }

    // Claim the slot
    const claim = await prisma.colonyClaim.create({
      data: {
        locationId,
        profileId: profile.id,
        companyName: String(companyName).slice(0, 50),
      },
    });

    // Log activity
    await prisma.playerActivity.create({
      data: {
        profileId: profile.id,
        companyName: String(companyName).slice(0, 50),
        type: 'colony_claimed',
        title: `${companyName} established presence at ${locationId.replace(/_/g, ' ')}`,
        metadata: { locationId, slotNumber: currentCount + 1, maxSlots },
      },
    });

    logger.info('Colony claimed', { locationId, companyName, slot: currentCount + 1, maxSlots });

    return NextResponse.json({
      success: true,
      claim: { locationId, companyName, claimedAt: claim.claimedAt },
      slotsUsed: currentCount + 1,
      maxSlots,
    });
  } catch (error) {
    logger.error('Colony claim error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to claim colony' }, { status: 500 });
  }
}
