export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, forbiddenError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * GET /api/admin/analytics
 * Returns user analytics: total users, tier breakdown, recent signups,
 * top modules, conversion funnel, and active users (DAU/WAU/MAU).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const now = Date.now();
    const since24h = new Date(now - MS_PER_DAY);
    const since7d = new Date(now - 7 * MS_PER_DAY);
    const since30d = new Date(now - 30 * MS_PER_DAY);

    // Run all queries in parallel
    const [
      totalUsers,
      tierBreakdown,
      recentSignups,
      trialUsers,
      signupsLast7Days,
      signupsLast30Days,
    ] = await Promise.all([
      // Total registered users
      prisma.user.count(),

      // Subscription tier breakdown
      prisma.user.groupBy({
        by: ['subscriptionTier'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Last 20 signups
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          trialTier: true,
          trialEndDate: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Active trial users
      prisma.user.count({
        where: {
          trialEndDate: { gt: new Date() },
          trialTier: { not: null },
        },
      }),

      // Signups in last 7 days
      prisma.user.count({
        where: { createdAt: { gte: since7d } },
      }),

      // Signups in last 30 days
      prisma.user.count({
        where: { createdAt: { gte: since30d } },
      }),
    ]);

    const tierMap: Record<string, number> = {};
    for (const row of tierBreakdown) {
      tierMap[row.subscriptionTier] = row._count.id;
    }

    // ── Usage analytics (ActivityLog) ─────────────────────────────────────
    // These queries can fail if the ActivityLog table is missing (e.g., DB
    // migration not applied). We fall back to empty defaults so the core
    // analytics page still renders.
    let topModules: Array<{ module: string; count: number }> = [];
    let funnel = {
      signUp: 0,
      trialStarted: 0,
      upgradeClicked: 0,
      paidConversions: 0,
    };
    let activeUsers = { dau: 0, wau: 0, mau: 0 };

    try {
      const [
        topModulesRaw,
        signUpEvents,
        trialStartedEvents,
        upgradeClickedEvents,
        paidConversions,
        dauRows,
        wauRows,
        mauRows,
      ] = await Promise.all([
        prisma.activityLog.groupBy({
          by: ['module'],
          where: {
            event: 'module_viewed',
            createdAt: { gte: since7d },
            module: { not: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
        prisma.activityLog.count({
          where: { event: 'sign_up', createdAt: { gte: since30d } },
        }),
        prisma.activityLog.count({
          where: { event: 'trial_started', createdAt: { gte: since30d } },
        }),
        prisma.activityLog.count({
          where: { event: 'upgrade_clicked', createdAt: { gte: since30d } },
        }),
        prisma.user.count({
          where: {
            subscriptionTier: { in: ['pro', 'enterprise'] },
            subscriptionStartDate: { gte: since30d },
          },
        }),
        prisma.activityLog.findMany({
          where: { createdAt: { gte: since24h }, userId: { not: null } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        prisma.activityLog.findMany({
          where: { createdAt: { gte: since7d }, userId: { not: null } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        prisma.activityLog.findMany({
          where: { createdAt: { gte: since30d }, userId: { not: null } },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

      topModules = topModulesRaw
        .filter((row) => row.module)
        .map((row) => ({ module: row.module as string, count: row._count.id }));

      funnel = {
        signUp: signUpEvents,
        trialStarted: trialStartedEvents,
        upgradeClicked: upgradeClickedEvents,
        paidConversions,
      };

      activeUsers = {
        dau: dauRows.length,
        wau: wauRows.length,
        mau: mauRows.length,
      };
    } catch (err) {
      logger.warn('Activity analytics unavailable, returning empty defaults', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        signupsLast7Days,
        signupsLast30Days,
        activeTrials: trialUsers,
        tierBreakdown: tierMap,
        recentSignups: recentSignups.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt.toISOString(),
          tier: u.subscriptionTier,
          status: u.subscriptionStatus,
          trialTier: u.trialTier,
          trialActive: u.trialEndDate ? u.trialEndDate > new Date() : false,
        })),
        topModules,
        funnel,
        activeUsers,
      },
    });
  } catch (err) {
    logger.error('Admin analytics GET failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError(err instanceof Error ? err.message : 'Failed to load analytics');
  }
}
