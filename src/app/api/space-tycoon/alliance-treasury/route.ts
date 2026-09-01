import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  ALLIANCE_PERK_DEFINITIONS,
  depositToTreasury,
  activatePerk,
  getActivePerks,
  getPerkBonuses,
} from '@/lib/game/alliance-treasury';
import { awardAllianceXP } from '@/lib/game/alliance-xp';
import { validateBody, allianceTreasuryBodySchema } from '@/lib/validations';
import { validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/alliance-treasury
 * Returns treasury balance, active perks, perk catalog, and recent deposits.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const membership = await prisma.allianceMember.findUnique({
      where: { profileId: profile.id },
      select: { allianceId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    const alliance = await prisma.alliance.findUniqueOrThrow({
      where: { id: membership.allianceId },
      select: { id: true, treasury: true, level: true },
    });

    // Active perks
    const activePerks = await getActivePerks(prisma, alliance.id);
    const perkBonuses = getPerkBonuses(activePerks);

    // Recent treasury logs
    const recentLogs = await prisma.allianceLog.findMany({
      where: {
        allianceId: alliance.id,
        type: { in: ['treasury_deposit', 'perk_activated'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        type: true,
        actorName: true,
        title: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      treasury: alliance.treasury,
      allianceLevel: alliance.level,
      activePerks: activePerks.map(p => ({
        ...p,
        activatedAt: p.activatedAt.getTime(),
        expiresAt: p.expiresAt.getTime(),
      })),
      perkBonuses,
      perkCatalog: ALLIANCE_PERK_DEFINITIONS.map(p => ({
        ...p,
        canActivate: alliance.level >= p.minLevel && alliance.treasury >= p.treasuryCost,
        isActive: activePerks.some(ap => ap.perkId === p.perkId),
      })),
      recentLogs: recentLogs.map(l => ({
        ...l,
        createdAt: l.createdAt.getTime(),
      })),
      canManage: ['leader', 'officer'].includes(membership.role),
    });
  } catch (error) {
    logger.error('Alliance treasury GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to load treasury' }, { status: 500 });
  }
}

/**
 * POST /api/space-tycoon/alliance-treasury
 * Deposit money or activate a perk.
 *
 * Deposit: { action: "deposit", amount: number }
 * Activate: { action: "activate_perk", perkId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const membership = await prisma.allianceMember.findUnique({
      where: { profileId: profile.id },
      select: { allianceId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    // L5 (2026-09-01 hardening): zod-validated body instead of String()/Number().
    const parsed = validateBody(allianceTreasuryBodySchema, await request.json().catch(() => null));
    if (!parsed.success) {
      const first = Object.values(parsed.errors)[0]?.[0] || 'Invalid request body';
      return validationError(first, parsed.errors);
    }
    const body = parsed.data;

    if (body.action === 'deposit') {
      const amount = body.amount;

      const result = await depositToTreasury(prisma, membership.allianceId, profile.id, amount);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Award small XP for treasury deposits (scale with amount)
      const xpAmount = Math.min(50, Math.max(5, Math.floor(amount / 1_000_000_000)));
      await awardAllianceXP(prisma, membership.allianceId, xpAmount, 'treasury_deposit', profile.id, profile.companyName);

      return NextResponse.json({
        success: true,
        newTreasuryBalance: result.newTreasuryBalance,
        amountDeposited: result.amountDeposited,
        xpAwarded: xpAmount,
      });
    }

    if (body.action === 'activate_perk') {
      // P6 (docs/SECURITY_AUDIT_2026-08.md): spending the shared treasury is a
      // leader/officer action — same gate as alliance-research and
      // alliance-projects. Any member (including a recruit) could previously
      // drain it.
      if (!['leader', 'officer'].includes(membership.role)) {
        return NextResponse.json(
          { error: 'Only leaders and officers can activate treasury perks' },
          { status: 403 },
        );
      }
      const { perkId } = body;

      const result = await activatePerk(prisma, membership.allianceId, perkId, profile.id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        perk: result.perk
          ? {
              ...result.perk,
              expiresAt: result.perk.expiresAt.getTime(),
            }
          : null,
      });
    }

    return validationError('Invalid action. Use "deposit" or "activate_perk".');
  } catch (error) {
    logger.error('Alliance treasury POST error', { error: String(error) });
    return NextResponse.json({ error: 'Treasury operation failed' }, { status: 500 });
  }
}
