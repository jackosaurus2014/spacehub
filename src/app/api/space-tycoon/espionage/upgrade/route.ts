import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  SECURITY_LEVELS,
  getSecurityUpgradeCost,
} from '@/lib/game/espionage-system';

/**
 * POST /api/space-tycoon/espionage/upgrade
 * Upgrade the player's corporate security level.
 *
 * Body: { targetLevel: number }
 *
 * Validates:
 *   - Authenticated user with game profile
 *   - Sequential upgrade only (current + 1)
 *   - Sufficient money for one-time upgrade cost
 *   - Target level within valid range (1-10)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetLevel } = body as { targetLevel: number };

    // ── Validate target level ──
    if (typeof targetLevel !== 'number' || targetLevel < 1 || targetLevel > 10 || !Number.isInteger(targetLevel)) {
      return NextResponse.json({
        error: 'Target level must be an integer between 1 and 10.',
      }, { status: 400 });
    }

    // ── Fetch player profile ──
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, money: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found.' }, { status: 404 });
    }

    // ── Fetch or create espionage profile ──
    let espProfile = await prisma.espionageProfile.findUnique({
      where: { profileId: profile.id },
    });

    if (!espProfile) {
      espProfile = await prisma.espionageProfile.create({
        data: {
          profileId: profile.id,
          securityLevel: 0,
          actionsToday: 0,
          lastActionReset: new Date(),
        },
      });
    }

    // ── Sequential upgrade check ──
    if (targetLevel !== espProfile.securityLevel + 1) {
      return NextResponse.json({
        error: `Security must be upgraded sequentially. Current level: ${espProfile.securityLevel}. You can only upgrade to level ${espProfile.securityLevel + 1}.`,
      }, { status: 400 });
    }

    // ── Cost calculation ──
    const upgradeCost = getSecurityUpgradeCost(targetLevel);

    if (profile.money < upgradeCost) {
      return NextResponse.json({
        error: `Insufficient funds. Upgrade cost: $${(upgradeCost / 1_000_000).toFixed(1)}M. Available: $${(profile.money / 1_000_000).toFixed(1)}M.`,
      }, { status: 400 });
    }

    // ── Execute upgrade in a transaction ──
    const newSecDef = SECURITY_LEVELS[targetLevel];

    await prisma.$transaction(async (tx) => {
      // Deduct cost
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: {
          money: { decrement: upgradeCost },
          totalSpent: { increment: upgradeCost },
        },
      });

      // Upgrade security level
      await tx.espionageProfile.update({
        where: { id: espProfile!.id },
        data: { securityLevel: targetLevel },
      });
    });

    return NextResponse.json({
      newSecurityLevel: targetLevel,
      securityName: newSecDef.name,
      upgradeCost,
      newMonthlyCost: newSecDef.monthlyCost,
      newDefenseBonus: newSecDef.defenseBonus,
      newDetectionChance: newSecDef.detectionChance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upgrade security level.' },
      { status: 500 },
    );
  }
}
