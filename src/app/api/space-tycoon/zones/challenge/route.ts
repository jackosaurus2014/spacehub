import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { canChallengeGovernor, CHALLENGE_DURATION_MS, ZONE_MAP } from '@/lib/game/zone-influence';

/**
 * POST /api/space-tycoon/zones/challenge
 * Initiate a governance challenge for a zone (72-hour window).
 *
 * Body: { zoneSlug: string }
 *
 * Validates:
 * - Player is authenticated and has a game profile
 * - Zone exists and has a governor
 * - Player is not already the governor
 * - Player has enough IP (80%+ of governor's)
 * - No active challenge already exists for this zone from this player
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { zoneSlug } = body;

    if (!zoneSlug || !ZONE_MAP.has(zoneSlug)) {
      return NextResponse.json({ error: 'Invalid zone' }, { status: 400 });
    }

    // Get the player's profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    // Find the zone in DB
    const zone = await prisma.zone.findUnique({
      where: { slug: zoneSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        governorId: true,
        governorName: true,
      },
    });

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found in database' }, { status: 404 });
    }

    // Validate: zone must have a governor
    if (!zone.governorId) {
      return NextResponse.json(
        { error: 'This zone has no governor. Build up your influence to claim governance automatically.' },
        { status: 400 }
      );
    }

    // Validate: player is not already the governor
    if (zone.governorId === profile.id) {
      return NextResponse.json(
        { error: 'You are already the governor of this zone' },
        { status: 400 }
      );
    }

    // Check for existing active challenge in this zone
    const existingChallenge = await prisma.governanceChallenge.findFirst({
      where: {
        zoneId: zone.id,
        status: 'active',
      },
    });

    if (existingChallenge) {
      if (existingChallenge.challengerId === profile.id) {
        return NextResponse.json(
          { error: 'You already have an active challenge for this zone' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'There is already an active governance challenge for this zone' },
        { status: 400 }
      );
    }

    // Get challenger's influence in the zone
    const challengerInfluence = await prisma.zoneInfluence.findFirst({
      where: {
        zoneId: zone.id,
        profileId: profile.id,
      },
      select: { influencePoints: true, sharePercent: true },
    });

    if (!challengerInfluence || challengerInfluence.influencePoints <= 0) {
      return NextResponse.json(
        { error: 'You have no influence in this zone. Build infrastructure and run services to earn influence.' },
        { status: 400 }
      );
    }

    // Get governor's influence in the zone
    const governorInfluence = await prisma.zoneInfluence.findFirst({
      where: {
        zoneId: zone.id,
        profileId: zone.governorId,
      },
      select: { influencePoints: true, sharePercent: true },
    });

    const governorIp = governorInfluence?.influencePoints || 0;
    const challengerIp = challengerInfluence.influencePoints;

    // Validate: challenger must have 80%+ of governor's IP
    if (!canChallengeGovernor(challengerIp, governorIp)) {
      const requiredIp = Math.ceil(governorIp * 0.8);
      return NextResponse.json(
        {
          error: `Insufficient influence. You need at least ${requiredIp.toFixed(0)} IP (80% of governor's ${governorIp.toFixed(0)} IP). You have ${challengerIp.toFixed(0)} IP.`,
        },
        { status: 400 }
      );
    }

    // Create the governance challenge
    const endsAt = new Date(Date.now() + CHALLENGE_DURATION_MS);

    const challenge = await prisma.governanceChallenge.create({
      data: {
        zoneId: zone.id,
        challengerId: profile.id,
        currentGovernor: zone.governorId,
        challengerIP: challengerIp,
        governorIP: governorIp,
        status: 'active',
        endsAt,
      },
    });

    return NextResponse.json({
      success: true,
      challenge: {
        id: challenge.id,
        zoneSlug: zone.slug,
        zoneName: zone.name,
        challengerName: profile.companyName,
        governorName: zone.governorName,
        challengerIP: challengerIp,
        governorIP: governorIp,
        endsAt: endsAt.toISOString(),
        hoursRemaining: 72,
      },
    });
  } catch (error) {
    console.error('POST /api/space-tycoon/zones/challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate governance challenge' },
      { status: 500 }
    );
  }
}
