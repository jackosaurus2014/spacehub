import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculateAlliancePowerScore, getAllianceTier } from '@/lib/game/alliance-events';
import { getResearchDurationMs } from '@/lib/game/alliance-research';
import { awardAllianceXP } from '@/lib/game/alliance-xp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/alliance-cron
 * Background processing for the deep alliance system.
 * Runs every 2 hours via cron.
 *
 * Tasks:
 * 1. Activity tracking (idle, inactive, dormant + auto-remove)
 * 2. Streak updates for all members
 * 3. Power score recalculation
 * 4. Tier updates from power score
 * 5. Project completion checks
 * 6. Research completion checks
 * 7. Expired perk cleanup
 * 8. Expired diplomacy cleanup
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: cron secret or dev mode
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Authorized
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = {
      membersProcessed: 0,
      membersMarkedIdle: 0,
      membersMarkedInactive: 0,
      membersRemoved: 0,
      alliancesProcessed: 0,
      tierUpdates: 0,
      projectsCompleted: 0,
      researchCompleted: 0,
      perksExpired: 0,
      diplomacyExpired: 0,
    };

    const now = new Date();
    const nowMs = now.getTime();
    const HOUR_MS = 60 * 60 * 1000;
    const DAY_MS = 24 * HOUR_MS;

    // ── 1. Activity Tracking ──────────────────────────────────────────────
    // Mark idle (48h), inactive (7d), dormant+remove (30d)
    const allMembers = await prisma.allianceMember.findMany({
      select: {
        id: true,
        allianceId: true,
        profileId: true,
        lastActiveAt: true,
        status: true,
        role: true,
        profile: { select: { companyName: true } },
      },
    });

    for (const member of allMembers) {
      stats.membersProcessed++;
      const inactiveMs = nowMs - member.lastActiveAt.getTime();
      const inactiveDays = inactiveMs / DAY_MS;

      if (inactiveDays >= 30 && member.role !== 'leader') {
        // Dormant — auto-remove (except leaders)
        await prisma.allianceMember.delete({ where: { id: member.id } });
        await prisma.alliance.update({
          where: { id: member.allianceId },
          data: { memberCount: { decrement: 1 } },
        });
        await prisma.allianceLog.create({
          data: {
            allianceId: member.allianceId,
            type: 'member_left',
            actorId: null,
            actorName: member.profile.companyName,
            title: `${member.profile.companyName} was removed due to 30-day inactivity`,
            metadata: { reason: 'dormant_auto_remove', daysInactive: Math.floor(inactiveDays) },
          },
        });
        stats.membersRemoved++;
      } else if (inactiveDays >= 7 && member.status !== 'inactive' && member.status !== 'dormant') {
        await prisma.allianceMember.update({
          where: { id: member.id },
          data: { status: 'inactive' },
        });
        stats.membersMarkedInactive++;
      } else if (inactiveDays >= 2 && member.status === 'active') {
        await prisma.allianceMember.update({
          where: { id: member.id },
          data: { status: 'idle' },
        });
        stats.membersMarkedIdle++;
      }
    }

    // ── 2-4. Alliance Processing (Power Score, Tier, etc.) ────────────────
    const alliances = await prisma.alliance.findMany({
      select: {
        id: true,
        level: true,
        tier: true,
        totalEventsWon: true,
        totalProjectsCompleted: true,
        totalNetWorth: true,
        memberCount: true,
      },
    });

    for (const alliance of alliances) {
      stats.alliancesProcessed++;

      // Get activity rate
      const activeCount = await prisma.allianceMember.count({
        where: {
          allianceId: alliance.id,
          lastActiveAt: { gt: new Date(nowMs - 48 * HOUR_MS) },
        },
      });
      const activityRate = alliance.memberCount > 0
        ? activeCount / alliance.memberCount
        : 0;

      // Get event performance (simplified: use totalEventsWon as proxy)
      const eventScores = await prisma.allianceEventScore.findMany({
        where: { allianceId: alliance.id },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { bracketRank: true, event: { select: { scores: { select: { id: true } } } } },
      });

      let avgEventRank = 0;
      let avgBracketSize = 0;
      if (eventScores.length > 0) {
        const ranked = eventScores.filter(s => s.bracketRank != null);
        if (ranked.length > 0) {
          avgEventRank = ranked.reduce((sum, s) => sum + (s.bracketRank ?? 0), 0) / ranked.length;
          avgBracketSize = ranked.reduce((sum, s) => sum + s.event.scores.length, 0) / ranked.length;
        }
      }

      // Calculate power score
      const powerScore = calculateAlliancePowerScore({
        level: alliance.level,
        avgEventRank,
        avgBracketSize,
        totalProjectsCompleted: alliance.totalProjectsCompleted,
        activityRate,
        totalNetWorth: alliance.totalNetWorth,
      });

      // Get tier from power score
      const tierInfo = getAllianceTier(powerScore);
      const newTier = tierInfo.tier;

      // Update if changed
      if (powerScore !== 0 || newTier !== alliance.tier) {
        await prisma.alliance.update({
          where: { id: alliance.id },
          data: { powerScore, tier: newTier },
        });
        if (newTier !== alliance.tier) {
          stats.tierUpdates++;
        }
      }
    }

    // ── 5. Project Completion ─────────────────────────────────────────────
    const buildingProjects = await prisma.allianceProject.findMany({
      where: {
        status: 'building',
        buildEndAt: { lte: now },
      },
      select: { id: true, allianceId: true, name: true, projectType: true, bonuses: true },
    });

    for (const project of buildingProjects) {
      await prisma.allianceProject.update({
        where: { id: project.id },
        data: { status: 'completed', completedAt: now },
      });

      await prisma.alliance.update({
        where: { id: project.allianceId },
        data: { totalProjectsCompleted: { increment: 1 } },
      });

      // Award XP for project completion
      const { ALLIANCE_PROJECT_DEFINITIONS } = await import('@/lib/game/alliance-projects');
      const projDef = ALLIANCE_PROJECT_DEFINITIONS.find(p => p.type === project.projectType);
      const xpReward = projDef?.xpReward ?? 500;

      await awardAllianceXP(prisma, project.allianceId, xpReward, 'project', undefined, undefined);

      await prisma.allianceLog.create({
        data: {
          allianceId: project.allianceId,
          type: 'project_completed',
          actorId: null,
          actorName: null,
          title: `${project.name} construction completed!`,
          description: `Bonuses are now active. +${xpReward} XP earned.`,
          metadata: { projectId: project.id, projectType: project.projectType, bonuses: project.bonuses },
          xpEarned: xpReward,
        },
      });

      stats.projectsCompleted++;
    }

    // ── 6. Research Completion ────────────────────────────────────────────
    const researchingItems = await prisma.allianceResearch.findMany({
      where: { status: 'researching' },
      select: {
        id: true,
        allianceId: true,
        researchId: true,
        name: true,
        tier: true,
        startedAt: true,
        startedBy: true,
        xpCost: true,
        bonusType: true,
        bonusValue: true,
      },
    });

    for (const research of researchingItems) {
      if (!research.startedAt) continue;

      const durationMs = getResearchDurationMs(tierToDays(research.tier));
      const elapsed = nowMs - research.startedAt.getTime();
      const progressPct = Math.min(100, (elapsed / durationMs) * 100);

      if (elapsed >= durationMs) {
        // Research completed
        await prisma.allianceResearch.update({
          where: { id: research.id },
          data: {
            status: 'completed',
            completedAt: now,
            progressPct: 100,
          },
        });

        // Award XP
        const xpReward = Math.min(250, 50 * research.tier);
        await awardAllianceXP(prisma, research.allianceId, xpReward, 'research', research.startedBy ?? undefined, undefined);

        await prisma.allianceLog.create({
          data: {
            allianceId: research.allianceId,
            type: 'research_completed',
            actorId: null,
            actorName: null,
            title: `Research completed: ${research.name}`,
            description: `+${(research.bonusValue * 100).toFixed(0)}% ${research.bonusType.replace(/_/g, ' ')} bonus now active.`,
            metadata: { researchId: research.researchId, tier: research.tier, bonusType: research.bonusType, bonusValue: research.bonusValue },
            xpEarned: xpReward,
          },
        });

        stats.researchCompleted++;
      } else {
        // Update progress percentage
        await prisma.allianceResearch.update({
          where: { id: research.id },
          data: { progressPct },
        });
      }
    }

    // ── 7. Expired Perk Cleanup ───────────────────────────────────────────
    const expiredPerks = await prisma.alliancePerk.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    stats.perksExpired = expiredPerks.count;

    // ── 8. Expired Diplomacy Cleanup ──────────────────────────────────────
    const expiredDiplomacy = await prisma.allianceDiplomacy.findMany({
      where: {
        status: 'active',
        endsAt: { lte: now },
      },
      select: { id: true, senderId: true, receiverId: true, type: true, warScore: true, warObjective: true },
    });

    for (const d of expiredDiplomacy) {
      if (d.type === 'war') {
        // Resolve war
        const warScore = d.warScore as { senderScore: number; receiverScore: number } | null;
        const senderWins = (warScore?.senderScore ?? 0) > (warScore?.receiverScore ?? 0);
        const winnerId = senderWins ? d.senderId : d.receiverId;
        const loserId = senderWins ? d.receiverId : d.senderId;

        await prisma.allianceDiplomacy.update({
          where: { id: d.id },
          data: { status: 'expired', resolvedAt: now },
        });

        // Update war records
        await prisma.alliance.update({
          where: { id: winnerId },
          data: { warWins: { increment: 1 } },
        });
        await prisma.alliance.update({
          where: { id: loserId },
          data: { warLosses: { increment: 1 } },
        });

        // Award XP to winner
        await awardAllianceXP(prisma, winnerId, WAR_WINNER_XP, 'war_victory', undefined, undefined);

        await prisma.allianceLog.createMany({
          data: [
            {
              allianceId: winnerId,
              type: 'war_won',
              title: 'War victory!',
              description: `Won the war. +${WAR_WINNER_XP} XP.`,
              xpEarned: WAR_WINNER_XP,
              metadata: { warId: d.id, warScore },
            },
            {
              allianceId: loserId,
              type: 'war_lost',
              title: 'War lost.',
              description: 'The war has ended in defeat.',
              metadata: { warId: d.id, warScore },
            },
          ],
        });
      } else {
        // Treaty expired normally
        await prisma.allianceDiplomacy.update({
          where: { id: d.id },
          data: { status: 'expired', resolvedAt: now },
        });
      }

      stats.diplomacyExpired++;
    }

    logger.info('Alliance cron completed', stats);
    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    logger.error('Alliance cron error', { error: String(error) });
    return NextResponse.json({ error: 'Alliance cron failed' }, { status: 500 });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const WAR_WINNER_XP = 500;

function tierToDays(tier: number): number {
  switch (tier) {
    case 1: return 1;
    case 2: return 3;
    case 3: return 7;
    case 4: return 14;
    case 5: return 30;
    default: return 1;
  }
}
