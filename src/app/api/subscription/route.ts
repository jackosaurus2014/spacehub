import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        dailyArticleViews: 0,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        dailyArticleViews: true,
        lastArticleViewReset: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        dailyArticleViews: 0,
      });
    }

    // Reset daily article views if it's a new day
    const now = new Date();
    const lastReset = user.lastArticleViewReset;
    const isNewDay = lastReset.toDateString() !== now.toDateString();

    if (isNewDay) {
      await prisma.user.update({
        where: { email: session.user.email },
        data: {
          dailyArticleViews: 0,
          lastArticleViewReset: now,
        },
      });
    }

    return NextResponse.json({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      dailyArticleViews: isNewDay ? 0 : user.dailyArticleViews,
    });
  } catch (error) {
    console.error('Failed to fetch subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// Track article view (for free tier limits)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: true, remaining: 10 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        subscriptionTier: true,
        dailyArticleViews: true,
        lastArticleViewReset: true,
      },
    });

    if (!user || user.subscriptionTier !== 'free') {
      return NextResponse.json({ success: true, remaining: null }); // Unlimited
    }

    // Reset if new day
    const now = new Date();
    const isNewDay = user.lastArticleViewReset.toDateString() !== now.toDateString();
    const currentViews = isNewDay ? 0 : user.dailyArticleViews;

    if (currentViews >= 10) {
      return NextResponse.json({
        success: false,
        remaining: 0,
        limitReached: true,
      });
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        dailyArticleViews: currentViews + 1,
        lastArticleViewReset: isNewDay ? now : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      remaining: 10 - currentViews - 1,
    });
  } catch (error) {
    console.error('Failed to track article view:', error);
    return NextResponse.json({ success: true }); // Don't block on error
  }
}
