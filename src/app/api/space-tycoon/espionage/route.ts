import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  ESPIONAGE_ACTIONS,
  SECURITY_LEVELS,
  ESPIONAGE_CONSTANTS,
  isDailyReset,
  isActionUnlocked,
  type EspionageActionType,
} from '@/lib/game/espionage-system';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/espionage
 * Returns the player's espionage profile: security level, actions remaining today,
 * active intel reports, recent missions.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the player's GameProfile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        netWorth: true,
        money: true,
        completedResearchList: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found. Start playing first.' }, { status: 404 });
    }

    // Fetch or create EspionageProfile
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

    // Reset daily actions if needed
    if (isDailyReset(espProfile.lastActionReset)) {
      espProfile = await prisma.espionageProfile.update({
        where: { id: espProfile.id },
        data: {
          actionsToday: 0,
          lastActionReset: new Date(),
        },
      });
    }

    // Fetch recent missions (last 20)
    const recentMissions = await prisma.espionageMission.findMany({
      where: { attackerId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        actionType: true,
        succeeded: true,
        detected: true,
        tracedBack: true,
        cost: true,
        successRate: true,
        intelGathered: true,
        intelExpiresAt: true,
        createdAt: true,
        target: {
          select: { companyName: true },
        },
      },
    });

    // Active intel reports (succeeded missions with unexpired intel)
    const now = new Date();
    const activeIntel = recentMissions
      .filter(
        (m) =>
          m.succeeded &&
          m.intelGathered &&
          m.intelExpiresAt &&
          new Date(m.intelExpiresAt) > now,
      )
      .map((m) => ({
        missionId: m.id,
        actionType: m.actionType,
        targetCompanyName: m.target.companyName,
        intel: m.intelGathered,
        expiresAt: m.intelExpiresAt,
        gatheredAt: m.createdAt,
        isStale: false,
      }));

    // Stale intel (expired but within grace period)
    const staleGraceMs = ESPIONAGE_CONSTANTS.INTEL_STALE_GRACE_HOURS * 60 * 60 * 1000;
    const staleIntel = recentMissions
      .filter(
        (m) =>
          m.succeeded &&
          m.intelGathered &&
          m.intelExpiresAt &&
          new Date(m.intelExpiresAt) <= now &&
          new Date(m.intelExpiresAt).getTime() + staleGraceMs > now.getTime(),
      )
      .map((m) => ({
        missionId: m.id,
        actionType: m.actionType,
        targetCompanyName: m.target.companyName,
        intel: m.intelGathered,
        expiresAt: m.intelExpiresAt,
        gatheredAt: m.createdAt,
        isStale: true,
      }));

    // Determine unlocked actions
    const unlockedActions = (Object.keys(ESPIONAGE_ACTIONS) as EspionageActionType[]).filter(
      (at) => isActionUnlocked(at, profile.completedResearchList),
    );

    // Recent incoming attacks (detected)
    const incomingDetected = await prisma.espionageMission.findMany({
      where: {
        targetId: profile.id,
        detected: true,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        actionType: true,
        succeeded: true,
        detected: true,
        tracedBack: true,
        createdAt: true,
        attacker: {
          select: { companyName: true },
        },
      },
    });

    const securityDef = SECURITY_LEVELS[Math.min(espProfile.securityLevel, 10)];

    return NextResponse.json({
      profile: {
        securityLevel: espProfile.securityLevel,
        securityName: securityDef.name,
        defenseBonus: securityDef.defenseBonus,
        detectionChance: securityDef.detectionChance,
        monthlyCost: securityDef.monthlyCost,
        heightenedAlert: espProfile.heightenedAlert,
        alertExpiresAt: espProfile.alertExpiresAt,
        blacklist: espProfile.blacklist,
      },
      actions: {
        actionsToday: espProfile.actionsToday,
        maxActionsPerDay: ESPIONAGE_CONSTANTS.MAX_ACTIONS_PER_DAY,
        remaining: ESPIONAGE_CONSTANTS.MAX_ACTIONS_PER_DAY - espProfile.actionsToday,
        unlockedActions,
      },
      activeIntel,
      staleIntel,
      recentMissions: recentMissions.map((m) => ({
        id: m.id,
        actionType: m.actionType,
        targetCompanyName: m.target.companyName,
        succeeded: m.succeeded,
        detected: m.detected,
        tracedBack: m.tracedBack,
        cost: m.cost,
        successRate: m.successRate,
        createdAt: m.createdAt,
      })),
      incomingDetected: incomingDetected.map((m) => ({
        id: m.id,
        actionType: m.actionType,
        succeeded: m.succeeded,
        tracedBack: m.tracedBack,
        attackerName: m.tracedBack ? m.attacker.companyName : null,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch espionage profile' },
      { status: 500 },
    );
  }
}
