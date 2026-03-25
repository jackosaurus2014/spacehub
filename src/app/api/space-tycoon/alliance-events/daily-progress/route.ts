import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/space-tycoon/alliance-events/daily-progress
 * Check client-side daily metrics against daily tasks and mark completed ones.
 * Called during game sync (every 60s). Fire-and-forget from the client.
 *
 * Body: { metrics: { date, units_mined, research_completed, revenue_earned, ... } }
 */
export async function POST(request: NextRequest) {
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
      select: { allianceId: true },
    });
    if (!membership) {
      return NextResponse.json({ ok: true, completed: 0 }); // Not in corporation, skip silently
    }

    const body = await request.json();
    const metrics = body.metrics;
    if (!metrics || !metrics.date) {
      return NextResponse.json({ error: 'Invalid metrics' }, { status: 400 });
    }

    // Find today's daily tasks for this alliance
    const todayDate = new Date(metrics.date + 'T00:00:00.000Z');
    const dailyTaskRecord = await prisma.allianceDailyTask.findUnique({
      where: { allianceId_date: { allianceId: membership.allianceId, date: todayDate } },
      include: {
        completions: { where: { profileId: profile.id } },
      },
    });

    if (!dailyTaskRecord) {
      return NextResponse.json({ ok: true, completed: 0 }); // No tasks for today yet
    }

    const taskDefs = dailyTaskRecord.tasks as Array<{
      id: string;
      description: string;
      metric: string;
      target: number;
      xpReward: number;
    }>;

    const alreadyCompleted = new Set(dailyTaskRecord.completions.map(c => c.taskIndex));
    let newCompletions = 0;
    let xpEarned = 0;

    for (let idx = 0; idx < taskDefs.length; idx++) {
      if (alreadyCompleted.has(idx)) continue;

      const task = taskDefs[idx];
      const metricValue = metrics[task.metric] || 0;

      if (metricValue >= task.target) {
        // Mark task as completed
        await prisma.allianceDailyTaskCompletion.create({
          data: {
            dailyTaskId: dailyTaskRecord.id,
            profileId: profile.id,
            taskIndex: idx,
          },
        });
        newCompletions++;
        xpEarned += task.xpReward;
        alreadyCompleted.add(idx);
      }
    }

    // Check if all 3 tasks are now complete for bonus XP
    const allComplete = alreadyCompleted.size >= 3;
    if (allComplete && newCompletions > 0) {
      xpEarned += 15; // Bonus XP for completing all daily tasks
    }

    // Award XP to the alliance
    if (xpEarned > 0) {
      await prisma.alliance.update({
        where: { id: membership.allianceId },
        data: { xp: { increment: xpEarned } },
      });
    }

    return NextResponse.json({
      ok: true,
      completed: newCompletions,
      xpEarned,
      allTasksComplete: allComplete,
    });
  } catch (error) {
    logger.error('Daily task progress error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to check daily progress' }, { status: 500 });
  }
}
