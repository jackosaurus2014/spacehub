import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Restrict to admin users only - this exposes subscriber counts and digest details
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Get subscriber counts
    const [totalSubscribers, verifiedSubscribers, unsubscribedCount] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({
        where: {
          verified: true,
          unsubscribedAt: null,
        },
      }),
      prisma.newsletterSubscriber.count({
        where: {
          unsubscribedAt: { not: null },
        },
      }),
    ]);

    // Get latest digest info
    const latestDigest = await prisma.dailyDigest.findFirst({
      orderBy: { digestDate: 'desc' },
      select: {
        id: true,
        digestDate: true,
        subject: true,
        status: true,
        recipientCount: true,
        failureCount: true,
        newsArticleCount: true,
        sendStartedAt: true,
        sendCompletedAt: true,
        createdAt: true,
      },
    });

    // Get digest stats
    const [totalDigests, sentDigests] = await Promise.all([
      prisma.dailyDigest.count(),
      prisma.dailyDigest.count({
        where: { status: 'sent' },
      }),
    ]);

    // Get recent subscriber activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentSignups, recentUnsubscribes] = await Promise.all([
      prisma.newsletterSubscriber.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.newsletterSubscriber.count({
        where: {
          unsubscribedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return NextResponse.json({
      subscribers: {
        total: totalSubscribers,
        verified: verifiedSubscribers,
        unsubscribed: unsubscribedCount,
        pendingVerification: totalSubscribers - verifiedSubscribers - unsubscribedCount,
      },
      digests: {
        total: totalDigests,
        sent: sentDigests,
        latest: latestDigest,
      },
      recentActivity: {
        signups: recentSignups,
        unsubscribes: recentUnsubscribes,
        period: '7 days',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Newsletter status error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
