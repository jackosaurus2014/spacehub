import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  proposeDiplomacy,
  respondToDiplomacy,
  getActiveDiplomacy,
  getDiplomacyBonuses,
  TREATY_DEFINITIONS,
  WAR_DEFINITION,
} from '@/lib/game/alliance-diplomacy';
import type { DiplomacyType, WarObjective } from '@/lib/game/alliance-diplomacy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/alliance-diplomacy
 * Returns active treaties, wars, and pending proposals.
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
      select: { id: true, level: true, warWins: true, warLosses: true },
    });

    const { active, pending } = await getActiveDiplomacy(prisma, alliance.id);
    const diplomacyBonuses = getDiplomacyBonuses(active);

    // Get list of alliances for proposing new diplomacy
    const otherAlliances = await prisma.alliance.findMany({
      where: { id: { not: alliance.id } },
      select: { id: true, name: true, tag: true, level: true, memberCount: true },
      orderBy: { totalNetWorth: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      allianceLevel: alliance.level,
      warRecord: { wins: alliance.warWins, losses: alliance.warLosses },
      active: active.map(d => ({
        ...d,
        startsAt: d.startsAt?.getTime() ?? null,
        endsAt: d.endsAt?.getTime() ?? null,
      })),
      pending: pending.map(d => ({
        ...d,
        startsAt: d.startsAt?.getTime() ?? null,
        endsAt: d.endsAt?.getTime() ?? null,
      })),
      diplomacyBonuses,
      treatyDefinitions: TREATY_DEFINITIONS,
      warDefinition: WAR_DEFINITION,
      otherAlliances,
      canManage: ['leader', 'officer'].includes(membership.role),
    });
  } catch (error) {
    logger.error('Alliance diplomacy GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to load diplomacy' }, { status: 500 });
  }
}

/**
 * POST /api/space-tycoon/alliance-diplomacy
 * Propose a new treaty or declare war.
 *
 * Body: { targetAllianceId: string, type: DiplomacyType, warObjective?: WarObjective }
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
      select: { allianceId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    const body = await request.json();
    const { targetAllianceId, type, warObjective } = body;

    if (!targetAllianceId || !type) {
      return NextResponse.json({ error: 'Missing targetAllianceId or type' }, { status: 400 });
    }

    const validTypes: DiplomacyType[] = ['trade_agreement', 'non_aggression', 'alliance_pact', 'war'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid diplomacy type' }, { status: 400 });
    }

    const result = await proposeDiplomacy(
      prisma,
      membership.allianceId,
      targetAllianceId,
      type as DiplomacyType,
      profile.id,
      warObjective as WarObjective | undefined,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      diplomacyId: result.diplomacyId,
    });
  } catch (error) {
    logger.error('Alliance diplomacy POST error', { error: String(error) });
    return NextResponse.json({ error: 'Diplomacy proposal failed' }, { status: 500 });
  }
}

/**
 * PATCH /api/space-tycoon/alliance-diplomacy
 * Respond to a pending treaty proposal (accept or reject).
 *
 * Body: { diplomacyId: string, accept: boolean }
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { diplomacyId, accept } = body;

    if (!diplomacyId || typeof accept !== 'boolean') {
      return NextResponse.json({ error: 'Missing diplomacyId or accept (boolean)' }, { status: 400 });
    }

    const result = await respondToDiplomacy(prisma, diplomacyId, accept, profile.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
    });
  } catch (error) {
    logger.error('Alliance diplomacy PATCH error', { error: String(error) });
    return NextResponse.json({ error: 'Diplomacy response failed' }, { status: 500 });
  }
}
