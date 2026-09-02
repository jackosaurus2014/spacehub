import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { computeDailyBonusClaim, getBonusSchedule, getDailyBonusTierMultiplier } from '@/lib/game/daily-bonus';
import { tierFromProfileScalars } from '@/lib/game/corporation-tiers';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';

export const dynamic = 'force-dynamic';

/**
 * Server-side daily login bonus (audit A6 / hotlist #2).
 *
 * The legacy flow tracks claims in localStorage only — trivially resettable
 * into a perpetual $200M/week faucet. This route is the authoritative
 * tracker: claims are recorded on GameProfile (dailyBonusLastClaim /
 * dailyBonusStreak, one claim per UTC day) and the payout is credited via
 * the One Wallet ledger, so it settles into the client at the next sync.
 *
 * DailyBonusModal.tsx claims here for signed-in players; the localStorage
 * flow remains only for anonymous play.
 *
 * Tier indexing (GAME_DESIGN_REVIEW_2026-09 row 9): the payout is
 * base × DAILY_BONUS_TIER_MULT[tier], and the tier is derived HERE from the
 * persisted profile's scalar columns (tierFromProfileScalars — bounded by
 * ledgered totalEarned). The request body is never read; a client cannot
 * name its own tier.
 *
 * GET  → { claimable, streak, amount, lastClaimDate, tier, multiplier, schedule }
 * POST → claim; { success, amount, newStreak, tier } (409 if already claimed today)
 */

const TIER_SELECT = {
  totalEarned: true,
  buildingCount: true,
  researchCount: true,
  locationsUnlocked: true,
  serviceCount: true,
} as const;

function utcDate(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { dailyBonusLastClaim: true, dailyBonusStreak: true, ...TIER_SELECT },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }
    const tier = tierFromProfileScalars(profile);
    const lastClaimDate = profile.dailyBonusLastClaim
      ? profile.dailyBonusLastClaim.toISOString().split('T')[0]
      : null;
    const result = computeDailyBonusClaim(lastClaimDate, profile.dailyBonusStreak, utcDate(0), utcDate(-1), tier);
    return NextResponse.json({
      claimable: result.claimable,
      amount: result.amount,
      streak: profile.dailyBonusStreak,
      lastClaimDate,
      tier,
      multiplier: getDailyBonusTierMultiplier(tier),
      schedule: getBonusSchedule(tier),
    });
  } catch (error) {
    logger.error('Daily bonus GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to load daily bonus' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, dailyBonusLastClaim: true, dailyBonusStreak: true, ...TIER_SELECT },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    // Tier from the PERSISTED profile only (row 9) — never from the client.
    const tier = tierFromProfileScalars(profile);
    const today = utcDate(0);
    const lastClaimDate = profile.dailyBonusLastClaim
      ? profile.dailyBonusLastClaim.toISOString().split('T')[0]
      : null;
    const result = computeDailyBonusClaim(lastClaimDate, profile.dailyBonusStreak, today, utcDate(-1), tier);
    if (!result.claimable) {
      return NextResponse.json({ success: false, error: 'Already claimed today' }, { status: 409 });
    }

    const ledgerOn = await isLedgerAvailable();
    await prisma.$transaction(async (tx) => {
      // Guard against concurrent claims: only proceed if lastClaim unchanged.
      const updated = await tx.gameProfile.updateMany({
        where: { id: profile.id, dailyBonusLastClaim: profile.dailyBonusLastClaim },
        data: {
          dailyBonusLastClaim: new Date(),
          dailyBonusStreak: result.newStreak,
          money: { increment: result.amount },
          totalEarned: { increment: result.amount },
        },
      });
      if (updated.count === 0) {
        throw new Error('Concurrent claim detected');
      }
      if (ledgerOn) {
        await recordLedger(tx, {
          profileId: profile.id, moneyDelta: result.amount,
          reason: 'daily_bonus', refId: today,
        });
      }
    });

    return NextResponse.json({ success: true, amount: result.amount, newStreak: result.newStreak, tier });
  } catch (error) {
    logger.error('Daily bonus claim error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to claim daily bonus' }, { status: 500 });
  }
}
