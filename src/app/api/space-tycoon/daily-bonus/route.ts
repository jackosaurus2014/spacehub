import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { computeDailyBonusClaim } from '@/lib/game/daily-bonus';
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
 * NOTE: the client UI (page.tsx daily-bonus modal) still runs the
 * localStorage flow — it is owned by the concurrent UI wave. Once it is
 * switched to POST here (and stops granting locally), the faucet closes.
 * Until then this route has no callers and grants nothing.
 *
 * GET  → { claimable, streak, amount, lastClaimDate }
 * POST → claim; { success, amount, newStreak } (409 if already claimed today)
 */

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
      select: { dailyBonusLastClaim: true, dailyBonusStreak: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }
    const lastClaimDate = profile.dailyBonusLastClaim
      ? profile.dailyBonusLastClaim.toISOString().split('T')[0]
      : null;
    const result = computeDailyBonusClaim(lastClaimDate, profile.dailyBonusStreak, utcDate(0), utcDate(-1));
    return NextResponse.json({
      claimable: result.claimable,
      amount: result.amount,
      streak: profile.dailyBonusStreak,
      lastClaimDate,
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
      select: { id: true, dailyBonusLastClaim: true, dailyBonusStreak: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const today = utcDate(0);
    const lastClaimDate = profile.dailyBonusLastClaim
      ? profile.dailyBonusLastClaim.toISOString().split('T')[0]
      : null;
    const result = computeDailyBonusClaim(lastClaimDate, profile.dailyBonusStreak, today, utcDate(-1));
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

    return NextResponse.json({ success: true, amount: result.amount, newStreak: result.newStreak });
  } catch (error) {
    logger.error('Daily bonus claim error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to claim daily bonus' }, { status: 500 });
  }
}
