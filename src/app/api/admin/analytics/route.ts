export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, forbiddenError, internalError } from '@/lib/errors';

/**
 * GET /api/admin/analytics
 * Returns user analytics: total users, tier breakdown, recent signups
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
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Signups in last 30 days
      prisma.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const tierMap: Record<string, number> = {};
    for (const row of tierBreakdown) {
      tierMap[row.subscriptionTier] = row._count.id;
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
      },
    });
  } catch (err) {
    return internalError(err instanceof Error ? err.message : 'Failed to load analytics');
  }
}
