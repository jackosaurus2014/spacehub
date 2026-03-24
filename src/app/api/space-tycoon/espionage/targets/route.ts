import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  BRACKETS,
  getBracket,
  isNewcomerShielded,
  ESPIONAGE_ACTIONS,
  getSecurityIndicator,
  type EspionageActionType,
} from '@/lib/game/espionage-system';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/espionage/targets
 * List potential espionage targets (players within +/-1 bracket).
 *
 * Returns: company name, net worth bracket, security level indicator,
 *          cooldown status per action type.
 *
 * Excludes:
 *   - Alliance members
 *   - Blacklisted players (by target's blacklist)
 *   - Newcomer-shielded players
 *   - The player themselves
 *
 * Query params:
 *   - search: string (optional, search by company name)
 *   - limit: number (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50);

    // ── Fetch attacker's profile ──
    const attackerProfile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        netWorth: true,
        allianceMembership: {
          select: { allianceId: true },
        },
      },
    });

    if (!attackerProfile) {
      return NextResponse.json({ error: 'No game profile found.' }, { status: 404 });
    }

    const myBracket = getBracket(attackerProfile.netWorth);

    // Determine valid net worth range (+/- 1 bracket)
    const minBracketId = Math.max(0, myBracket.id - 1);
    const maxBracketId = Math.min(BRACKETS.length - 1, myBracket.id + 1);
    const minNetWorth = BRACKETS[minBracketId].minNetWorth;
    const maxNetWorth = BRACKETS[maxBracketId].maxNetWorth;

    // ── Fetch alliance member IDs to exclude ──
    let allianceMemberIds: string[] = [];
    if (attackerProfile.allianceMembership) {
      const allianceMembers = await prisma.allianceMember.findMany({
        where: { allianceId: attackerProfile.allianceMembership.allianceId },
        select: { profileId: true },
      });
      allianceMemberIds = allianceMembers.map((m) => m.profileId);
    }

    // ── Query potential targets ──
    const whereClause: Record<string, unknown> = {
      id: {
        notIn: [attackerProfile.id, ...allianceMemberIds],
      },
      netWorth: {
        gte: minNetWorth,
        ...(maxNetWorth < Infinity ? { lte: maxNetWorth } : {}),
      },
    };

    if (searchQuery) {
      whereClause.companyName = {
        contains: searchQuery,
        mode: 'insensitive',
      };
    }

    const potentialTargets = await prisma.gameProfile.findMany({
      where: whereClause,
      orderBy: { netWorth: 'desc' },
      take: limit,
      select: {
        id: true,
        companyName: true,
        netWorth: true,
        lastSyncAt: true,
        createdAt: true,
        allianceMembership: {
          select: {
            alliance: {
              select: { tag: true },
            },
          },
        },
        espionageProfile: {
          select: {
            securityLevel: true,
            blacklist: true,
          },
        },
      },
    });

    // ── Filter out newcomer-shielded players ──
    const now = Date.now();
    const validTargets = potentialTargets.filter(
      (t) => !isNewcomerShielded(t.createdAt),
    );

    // ── Fetch cooldowns for the attacker against these targets ──
    const targetIds = validTargets.map((t) => t.id);
    const recentMissions = await prisma.espionageMission.findMany({
      where: {
        attackerId: attackerProfile.id,
        targetId: { in: targetIds },
        createdAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) }, // Last 72h covers max cooldown
      },
      select: {
        targetId: true,
        actionType: true,
        createdAt: true,
      },
    });

    // Build cooldown map: targetId → { actionType → cooldownUntil }
    const cooldownMap = new Map<string, Map<string, Date>>();
    for (const mission of recentMissions) {
      const actionDef = ESPIONAGE_ACTIONS[mission.actionType as EspionageActionType];
      if (!actionDef) continue;
      const cooldownUntil = new Date(mission.createdAt.getTime() + actionDef.cooldownHours * 60 * 60 * 1000);
      if (cooldownUntil.getTime() > now) {
        if (!cooldownMap.has(mission.targetId)) {
          cooldownMap.set(mission.targetId, new Map());
        }
        const existing = cooldownMap.get(mission.targetId)!.get(mission.actionType);
        if (!existing || cooldownUntil > existing) {
          cooldownMap.get(mission.targetId)!.set(mission.actionType, cooldownUntil);
        }
      }
    }

    // ── Build response ──
    const targets = validTargets.map((t) => {
      const bracket = getBracket(t.netWorth);
      const secLevel = t.espionageProfile?.securityLevel ?? 0;
      const isOnline = (now - new Date(t.lastSyncAt).getTime()) < 5 * 60 * 1000;

      // Build cooldown object
      const cooldowns: Record<string, string | null> = {};
      const targetCooldowns = cooldownMap.get(t.id);
      for (const actionType of Object.keys(ESPIONAGE_ACTIONS)) {
        cooldowns[actionType] = targetCooldowns?.get(actionType)?.toISOString() ?? null;
      }

      const hasAnyCooldown = targetCooldowns ? targetCooldowns.size > 0 : false;

      return {
        profileId: t.id,
        companyName: t.companyName,
        bracket: bracket.id,
        bracketName: bracket.name,
        allianceTag: t.allianceMembership?.alliance?.tag ?? null,
        securityIndicator: getSecurityIndicator(secLevel),
        isOnline,
        recentlyTargeted: hasAnyCooldown,
        cooldowns,
      };
    });

    return NextResponse.json({
      targets,
      myBracket: myBracket.id,
      myBracketName: myBracket.name,
      total: targets.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch espionage targets.' },
      { status: 500 },
    );
  }
}
