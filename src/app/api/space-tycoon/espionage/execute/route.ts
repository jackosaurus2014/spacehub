import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  ESPIONAGE_ACTIONS,
  ESPIONAGE_CONSTANTS,
  getBracket,
  isWithinBracketRange,
  isNewcomerShielded,
  isDailyReset,
  isActionUnlocked,
  getActionCost,
  executeEspionageAction,
  type EspionageActionType,
  type AttackerProfile,
  type TargetEspionageProfile,
  type TargetGameProfile,
} from '@/lib/game/espionage-system';

/**
 * POST /api/space-tycoon/espionage/execute
 * Execute an espionage action against a target.
 *
 * Body: { targetId: string, actionType: EspionageActionType }
 *
 * CRITICAL — SOFT PvP GUARANTEE:
 * This endpoint NEVER modifies the target's money, resources, buildings,
 * workers, contracts, research, security, or alliance membership.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetId, actionType } = body as { targetId: string; actionType: string };

    // ── Validate action type ──
    if (!actionType || !(actionType in ESPIONAGE_ACTIONS)) {
      return NextResponse.json({ error: 'Invalid action type.' }, { status: 400 });
    }
    const validActionType = actionType as EspionageActionType;

    // ── Fetch attacker profile ──
    const attackerGameProfile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        netWorth: true,
        money: true,
        completedResearchList: true,
        createdAt: true,
      },
    });

    if (!attackerGameProfile) {
      return NextResponse.json({ error: 'No game profile found.' }, { status: 404 });
    }

    // ── Self-targeting check ──
    if (attackerGameProfile.id === targetId) {
      return NextResponse.json({ error: 'You cannot spy on yourself.' }, { status: 400 });
    }

    // ── Minimum net worth check ──
    if (attackerGameProfile.netWorth < ESPIONAGE_CONSTANTS.MIN_NET_WORTH_TO_ESPIONAGE) {
      return NextResponse.json({
        error: `Requires minimum $200M net worth. Current: $${Math.round(attackerGameProfile.netWorth / 1_000_000)}M.`,
      }, { status: 400 });
    }

    // ── Newcomer shield (attacker) ──
    if (isNewcomerShielded(attackerGameProfile.createdAt)) {
      return NextResponse.json({
        error: 'Espionage is unavailable during your newcomer protection period.',
      }, { status: 400 });
    }

    // ── Research unlock check ──
    if (!isActionUnlocked(validActionType, attackerGameProfile.completedResearchList)) {
      const action = ESPIONAGE_ACTIONS[validActionType];
      return NextResponse.json({
        error: `Action locked. Requires research: ${action.unlockRequirement}.`,
      }, { status: 400 });
    }

    // ── Fetch or create attacker espionage profile ──
    let attackerEspProfile = await prisma.espionageProfile.findUnique({
      where: { profileId: attackerGameProfile.id },
    });

    if (!attackerEspProfile) {
      attackerEspProfile = await prisma.espionageProfile.create({
        data: {
          profileId: attackerGameProfile.id,
          securityLevel: 0,
          actionsToday: 0,
          lastActionReset: new Date(),
        },
      });
    }

    // ── Daily reset check ──
    if (isDailyReset(attackerEspProfile.lastActionReset)) {
      attackerEspProfile = await prisma.espionageProfile.update({
        where: { id: attackerEspProfile.id },
        data: { actionsToday: 0, lastActionReset: new Date() },
      });
    }

    // ── Daily action limit ──
    if (attackerEspProfile.actionsToday >= ESPIONAGE_CONSTANTS.MAX_ACTIONS_PER_DAY) {
      return NextResponse.json({
        error: `Daily action limit reached (${ESPIONAGE_CONSTANTS.MAX_ACTIONS_PER_DAY}/day). Resets at midnight UTC.`,
      }, { status: 400 });
    }

    // ── Fetch target profile ──
    const targetGameProfile = await prisma.gameProfile.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        companyName: true,
        netWorth: true,
        money: true,
        totalEarned: true,
        buildingCount: true,
        researchCount: true,
        serviceCount: true,
        locationsUnlocked: true,
        resources: true,
        completedResearchList: true,
        buildingsData: true,
        activeServicesData: true,
        workforceData: true,
        shipsData: true,
        createdAt: true,
        allianceMembership: {
          select: { allianceId: true },
        },
      },
    });

    if (!targetGameProfile) {
      return NextResponse.json({ error: 'Target not found.' }, { status: 404 });
    }

    // ── Newcomer shield (target) ──
    if (isNewcomerShielded(targetGameProfile.createdAt)) {
      return NextResponse.json({
        error: 'Target is protected by newcomer shield (first 7 days).',
      }, { status: 400 });
    }

    // ── Bracket range check ──
    if (!isWithinBracketRange(attackerGameProfile.netWorth, targetGameProfile.netWorth)) {
      const attackerBracket = getBracket(attackerGameProfile.netWorth);
      const targetBracket = getBracket(targetGameProfile.netWorth);
      return NextResponse.json({
        error: `Target is outside your bracket range. You: ${attackerBracket.name}, Target: ${targetBracket.name}. Must be within 1 bracket.`,
      }, { status: 400 });
    }

    // ── Alliance member check — cannot spy on own alliance ──
    const attackerMembership = await prisma.allianceMember.findUnique({
      where: { profileId: attackerGameProfile.id },
      select: { allianceId: true },
    });

    if (
      attackerMembership &&
      targetGameProfile.allianceMembership &&
      attackerMembership.allianceId === targetGameProfile.allianceMembership.allianceId
    ) {
      return NextResponse.json({
        error: 'Cannot perform espionage against alliance members.',
      }, { status: 400 });
    }

    // ── Per-target cooldown check ──
    const action = ESPIONAGE_ACTIONS[validActionType];
    const cooldownMs = action.cooldownHours * 60 * 60 * 1000;
    const recentSameAction = await prisma.espionageMission.findFirst({
      where: {
        attackerId: attackerGameProfile.id,
        targetId: targetId,
        actionType: validActionType,
        createdAt: { gte: new Date(Date.now() - cooldownMs) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentSameAction) {
      const cooldownEnd = new Date(recentSameAction.createdAt.getTime() + cooldownMs);
      const remainingMs = cooldownEnd.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      return NextResponse.json({
        error: `Cooldown active for ${action.name} against this target. ${remainingHours}h remaining.`,
        cooldownUntil: cooldownEnd.toISOString(),
      }, { status: 400 });
    }

    // ── Per-target incoming limit (5/day) ──
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const targetIncomingToday = await prisma.espionageMission.count({
      where: {
        targetId: targetId,
        createdAt: { gte: todayStart },
      },
    });

    if (targetIncomingToday >= ESPIONAGE_CONSTANTS.MAX_INCOMING_PER_TARGET_PER_DAY) {
      return NextResponse.json({
        error: 'Target is on high alert — too many incoming operations today. Try again tomorrow.',
      }, { status: 400 });
    }

    // ── Cost check ──
    const cost = getActionCost(validActionType, attackerGameProfile.netWorth);
    if (attackerGameProfile.money < cost) {
      return NextResponse.json({
        error: `Insufficient funds. Cost: $${(cost / 1_000_000).toFixed(1)}M. Available: $${(attackerGameProfile.money / 1_000_000).toFixed(1)}M.`,
      }, { status: 400 });
    }

    // ── Fetch or create target espionage profile ──
    let targetEspProfile = await prisma.espionageProfile.findUnique({
      where: { profileId: targetId },
    });

    if (!targetEspProfile) {
      targetEspProfile = await prisma.espionageProfile.create({
        data: {
          profileId: targetId,
          securityLevel: 0,
          actionsToday: 0,
          lastActionReset: new Date(),
        },
      });
    }

    // ── Execute the espionage action ──
    const attackerData: AttackerProfile = {
      netWorth: attackerGameProfile.netWorth,
      completedResearch: attackerGameProfile.completedResearchList,
    };

    const targetEspData: TargetEspionageProfile = {
      netWorth: targetGameProfile.netWorth,
      securityLevel: targetEspProfile.securityLevel,
      heightenedAlert: targetEspProfile.heightenedAlert,
      alertExpiresAt: targetEspProfile.alertExpiresAt,
      blacklist: targetEspProfile.blacklist,
    };

    const targetData: TargetGameProfile = {
      id: targetGameProfile.id,
      companyName: targetGameProfile.companyName,
      netWorth: targetGameProfile.netWorth,
      money: targetGameProfile.money,
      totalEarned: targetGameProfile.totalEarned,
      buildingCount: targetGameProfile.buildingCount,
      researchCount: targetGameProfile.researchCount,
      serviceCount: targetGameProfile.serviceCount,
      locationsUnlocked: targetGameProfile.locationsUnlocked,
      resources: (targetGameProfile.resources as Record<string, number>) || {},
      completedResearchList: targetGameProfile.completedResearchList,
      buildingsData: (targetGameProfile.buildingsData as unknown[]) || [],
      activeServicesData: (targetGameProfile.activeServicesData as unknown[]) || [],
      workforceData: (targetGameProfile.workforceData as { engineers: number; scientists: number; miners: number; operators: number }) || null,
      shipsData: (targetGameProfile.shipsData as unknown[]) || [],
    };

    const result = executeEspionageAction(
      validActionType,
      attackerData,
      targetEspData,
      targetData,
      attackerGameProfile.id,
    );

    // ── Persist results in a transaction ──
    // CRITICAL: Only the attacker's money is deducted. The target is NEVER modified economically.
    const missionRecord = await prisma.$transaction(async (tx) => {
      // Deduct cost from attacker
      await tx.gameProfile.update({
        where: { id: attackerGameProfile.id },
        data: {
          money: { decrement: cost },
          totalSpent: { increment: cost },
        },
      });

      // Increment daily action count
      await tx.espionageProfile.update({
        where: { id: attackerEspProfile!.id },
        data: { actionsToday: { increment: 1 } },
      });

      // Create mission record
      const mission = await tx.espionageMission.create({
        data: {
          attackerId: attackerGameProfile.id,
          targetId: targetId,
          actionType: validActionType,
          cost: cost,
          successRate: result.successRate,
          succeeded: result.succeeded,
          detected: result.detected,
          tracedBack: result.tracedBack,
          intelGathered: result.intelGathered ? JSON.parse(JSON.stringify(result.intelGathered)) : undefined,
          intelExpiresAt: result.intelExpiresAt,
          reward: result.reward ? JSON.parse(JSON.stringify(result.reward)) : undefined,
        },
      });

      // If counter_intelligence succeeded, activate heightened alert for attacker (self)
      if (validActionType === 'counter_intelligence' && result.succeeded) {
        await tx.espionageProfile.update({
          where: { id: attackerEspProfile!.id },
          data: {
            heightenedAlert: true,
            alertExpiresAt: new Date(Date.now() + ESPIONAGE_CONSTANTS.HEIGHTENED_ALERT_DURATION_HOURS * 60 * 60 * 1000),
          },
        });
      }

      // If detected, activate heightened alert for target (defensive buff)
      if (result.detected) {
        await tx.espionageProfile.update({
          where: { id: targetEspProfile!.id },
          data: {
            heightenedAlert: true,
            alertExpiresAt: new Date(Date.now() + ESPIONAGE_CONSTANTS.HEIGHTENED_ALERT_DURATION_HOURS * 60 * 60 * 1000),
          },
        });
      }

      return mission;
    });

    // ── Build response ──
    const actionsRemaining = ESPIONAGE_CONSTANTS.MAX_ACTIONS_PER_DAY - (attackerEspProfile.actionsToday + 1);

    if (result.succeeded) {
      return NextResponse.json({
        missionId: missionRecord.id,
        status: 'success',
        costPaid: cost,
        successRate: Math.round(result.successRate * 100),
        detected: result.detected,
        intelReport: {
          actionType: validActionType,
          targetCompanyName: targetGameProfile.companyName,
          data: result.intelGathered,
          expiresAt: result.intelExpiresAt,
        },
        reward: result.reward,
        remainingActionsToday: Math.max(0, actionsRemaining),
      });
    } else {
      return NextResponse.json({
        missionId: missionRecord.id,
        status: 'failure',
        costPaid: cost,
        successRate: Math.round(result.successRate * 100),
        detected: result.detected,
        message: `Your agent was unable to gather intelligence. The $${(cost / 1_000_000).toFixed(1)}M operational cost has been deducted.`,
        remainingActionsToday: Math.max(0, actionsRemaining),
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to execute espionage action.' },
      { status: 500 },
    );
  }
}
