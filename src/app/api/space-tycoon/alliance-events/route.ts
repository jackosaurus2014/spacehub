import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  ALLIANCE_EVENT_MAP,
  calculateAllianceEventScore,
  meetsMinimumThreshold,
  getEventRewardXP,
  getEventRewardBonus,
  selectDailyTasks,
  type AllianceEventCategory,
  type AllianceEventType,
} from '@/lib/game/alliance-events';

/**
 * GET /api/space-tycoon/alliance-events
 * Returns:
 * - Current active alliance event (if any) with the player's alliance score
 * - Member contributions leaderboard within the alliance
 * - Bracket standings (other alliances in same bracket)
 * - Daily tasks for today
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

    // Find user's alliance
    const membership = await prisma.allianceMember.findUnique({
      where: { profileId: profile.id },
      select: { allianceId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    const alliance = await prisma.alliance.findUnique({
      where: { id: membership.allianceId },
      select: {
        id: true,
        name: true,
        tag: true,
        memberCount: true,
        level: true,
        tier: true,
        announcements: true,
      },
    });
    if (!alliance) {
      return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
    }

    // Find current active event(s)
    const now = new Date();
    const activeEvents = await prisma.allianceEvent.findMany({
      where: { status: 'active', startsAt: { lte: now }, endsAt: { gte: now } },
      include: {
        scores: {
          where: { allianceId: alliance.id },
        },
      },
      orderBy: { startsAt: 'desc' },
      take: 2, // Sprint + Challenge can overlap
    });

    const eventResults = [];

    for (const event of activeEvents) {
      const eventDef = ALLIANCE_EVENT_MAP.get(event.eventType as AllianceEventType);
      if (!eventDef) continue;

      // Get this alliance's score
      const allianceScore = event.scores[0] ?? null;

      // Get member contributions for this event, within this alliance
      const contributions = await prisma.allianceEventContribution.findMany({
        where: { eventId: event.id, allianceId: alliance.id },
        include: {
          profile: { select: { companyName: true } },
        },
        orderBy: { score: 'desc' },
      });

      // Get bracket standings (all alliances in same bracket)
      const bracketScores = await prisma.allianceEventScore.findMany({
        where: { eventId: event.id },
        include: {
          alliance: { select: { id: true, name: true, tag: true, memberCount: true } },
        },
        orderBy: { perCapitaScore: 'desc' },
      });

      // Compute current rank in bracket
      const myRank = bracketScores.findIndex(s => s.allianceId === alliance.id) + 1;

      const timeRemainingMs = event.endsAt.getTime() - now.getTime();

      eventResults.push({
        id: event.id,
        type: event.eventType,
        category: event.eventCategory,
        name: eventDef.name,
        icon: eventDef.icon,
        description: eventDef.description,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        timeRemainingMs: Math.max(0, timeRemainingMs),
        allianceScore: allianceScore
          ? {
              totalScore: allianceScore.totalScore,
              perCapitaScore: allianceScore.perCapitaScore,
              activeMemberCount: allianceScore.activeMemberCount,
              bracketRank: myRank || null,
              meetsThreshold: meetsMinimumThreshold(
                eventDef.category as AllianceEventCategory,
                allianceScore.totalScore,
              ),
            }
          : { totalScore: 0, perCapitaScore: 0, activeMemberCount: 0, bracketRank: null, meetsThreshold: false },
        contributions: contributions.map(c => ({
          profileId: c.profileId,
          companyName: c.profile.companyName,
          score: c.score,
          details: c.details,
          isYou: c.profileId === profile.id,
        })),
        bracketStandings: bracketScores.map((s, idx) => ({
          rank: idx + 1,
          allianceId: s.allianceId,
          allianceName: s.alliance.name,
          allianceTag: s.alliance.tag,
          totalScore: s.totalScore,
          perCapitaScore: s.perCapitaScore,
          activeMemberCount: s.activeMemberCount,
          memberCount: s.alliance.memberCount,
          isYou: s.allianceId === alliance.id,
        })),
      });
    }

    // Get recently completed events (last 4 for history)
    const recentCompleted = await prisma.allianceEvent.findMany({
      where: { status: 'completed' },
      include: {
        scores: {
          where: { allianceId: alliance.id },
        },
      },
      orderBy: { endsAt: 'desc' },
      take: 4,
    });

    const eventHistory = recentCompleted.map(event => {
      const eventDef = ALLIANCE_EVENT_MAP.get(event.eventType as AllianceEventType);
      const score = event.scores[0];
      return {
        id: event.id,
        type: event.eventType,
        name: eventDef?.name ?? event.eventType,
        icon: eventDef?.icon ?? '?',
        endsAt: event.endsAt.toISOString(),
        totalScore: score?.totalScore ?? 0,
        perCapitaScore: score?.perCapitaScore ?? 0,
        bracketRank: score?.bracketRank ?? null,
        rewardXP: score?.bracketRank ? getEventRewardXP(score.bracketRank, 16) : 0,
        rewardBonus: score?.bracketRank ? getEventRewardBonus(score.bracketRank) : null,
      };
    });

    // Daily tasks
    const todayStr = now.toISOString().slice(0, 10);
    const todayDate = new Date(todayStr + 'T00:00:00.000Z');

    let dailyTaskRecord = await prisma.allianceDailyTask.findUnique({
      where: { allianceId_date: { allianceId: alliance.id, date: todayDate } },
      include: {
        completions: {
          where: { profileId: profile.id },
        },
      },
    });

    // Generate today's tasks if they don't exist yet
    if (!dailyTaskRecord) {
      const tasks = selectDailyTasks(alliance.id, todayStr);
      dailyTaskRecord = await prisma.allianceDailyTask.create({
        data: {
          allianceId: alliance.id,
          date: todayDate,
          tasks: tasks.map(t => ({
            id: t.id,
            description: t.description,
            metric: t.metric,
            target: t.target,
            xpReward: t.xpReward,
          })),
        },
        include: {
          completions: {
            where: { profileId: profile.id },
          },
        },
      });
    }

    const taskDefinitions = dailyTaskRecord.tasks as Array<{
      id: string;
      description: string;
      metric: string;
      target: number;
      xpReward: number;
    }>;
    const completedIndices = new Set(dailyTaskRecord.completions.map(c => c.taskIndex));

    const dailyTasks = taskDefinitions.map((task, idx) => ({
      index: idx,
      id: task.id,
      description: task.description,
      target: task.target,
      xpReward: task.xpReward,
      completed: completedIndices.has(idx),
    }));

    // Event directive (from announcements)
    const announcements = (alliance.announcements as Array<{ text: string; authorId: string; createdAt: string }>) ?? [];

    return NextResponse.json({
      alliance: {
        id: alliance.id,
        name: alliance.name,
        tag: alliance.tag,
        level: alliance.level,
        tier: alliance.tier,
        memberCount: alliance.memberCount,
      },
      activeEvents: eventResults,
      eventHistory,
      dailyTasks,
      dailyTaskId: dailyTaskRecord.id,
      allTasksCompleted: completedIndices.size >= 3,
      announcements,
      myRole: membership.role,
    });
  } catch (error) {
    logger.error('Alliance events fetch error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to load alliance events' }, { status: 500 });
  }
}
