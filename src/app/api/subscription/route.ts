import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { isTrialActive } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        dailyArticleViews: 0,
        isTrialing: false,
        trialEndsAt: null,
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
        trialTier: true,
        trialStartDate: true,
        trialEndDate: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        dailyArticleViews: 0,
        isTrialing: false,
        trialEndsAt: null,
      });
    }

    // Reset daily article views if it's a new day
    const now = new Date();
    const lastReset = user.lastArticleViewReset ? new Date(user.lastArticleViewReset) : now;
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

    // Check trial status
    if (user.trialTier && user.trialEndDate) {
      if (isTrialActive(user.trialEndDate)) {
        // Trial is active — return the trial tier as the effective tier
        return NextResponse.json({
          tier: user.trialTier,
          status: user.subscriptionStatus,
          startDate: user.subscriptionStartDate,
          endDate: user.subscriptionEndDate,
          dailyArticleViews: isNewDay ? 0 : user.dailyArticleViews,
          isTrialing: true,
          trialEndsAt: user.trialEndDate,
          hasPaymentMethod: !!user.stripeCustomerId,
        });
      } else {
        // Trial has expired — clear trial fields (auto-downgrade)
        await prisma.user.update({
          where: { email: session.user.email },
          data: {
            trialTier: null,
            trialStartDate: null,
            trialEndDate: null,
          },
        });
      }
    }

    return NextResponse.json({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      dailyArticleViews: isNewDay ? 0 : user.dailyArticleViews,
      isTrialing: false,
      trialEndsAt: null,
      hasPaymentMethod: !!user.stripeCustomerId,
    });
  } catch (error) {
    logger.error('Failed to fetch subscription', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: true, remaining: 25 });
    }

    const body = await request.json();

    // Handle Stripe checkout redirect
    if (body.action === 'create-checkout') {
      const checkoutRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us'}/api/stripe/checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: request.headers.get('cookie') || '',
          },
          body: JSON.stringify({ tier: body.tier, interval: body.interval }),
        }
      );
      const checkoutData = await checkoutRes.json();
      return NextResponse.json(checkoutData, { status: checkoutRes.status });
    }

    // Handle Stripe portal redirect
    if (body.action === 'create-portal') {
      const portalRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us'}/api/stripe/portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: request.headers.get('cookie') || '',
          },
        }
      );
      const portalData = await portalRes.json();
      return NextResponse.json(portalData, { status: portalRes.status });
    }

    // Handle trial activation
    if (body.action === 'start-trial') {
      const tier = body.tier;
      if (tier !== 'pro' && tier !== 'enterprise') {
        return NextResponse.json(
          { error: 'Invalid trial tier. Must be "pro" or "enterprise".' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          subscriptionTier: true,
          trialTier: true,
          trialEndDate: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Don't allow trial if user already has a paid subscription
      if (user.subscriptionTier !== 'free') {
        return NextResponse.json(
          { error: 'You already have an active paid subscription.' },
          { status: 400 }
        );
      }

      // Don't allow trial if user has an active trial
      if (user.trialTier && user.trialEndDate && isTrialActive(user.trialEndDate)) {
        return NextResponse.json(
          { error: 'You already have an active trial.' },
          { status: 400 }
        );
      }

      // Start the 14-day trial
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { email: session.user.email },
        data: {
          trialTier: tier,
          trialStartDate: now,
          trialEndDate: trialEnd,
        },
      });

      logger.info('Trial started', { email: session.user.email, tier, trialEnd: trialEnd.toISOString() });

      return NextResponse.json({
        success: true,
        trialTier: tier,
        trialStartDate: now,
        trialEndDate: trialEnd,
      });
    }

    // Existing article tracking logic
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        subscriptionTier: true,
        dailyArticleViews: true,
        lastArticleViewReset: true,
        trialTier: true,
        trialEndDate: true,
      },
    });

    // Trial users get unlimited articles
    const hasActiveTrial = user?.trialTier && user?.trialEndDate && isTrialActive(user.trialEndDate);

    if (!user || user.subscriptionTier !== 'free' || hasActiveTrial) {
      return NextResponse.json({ success: true, remaining: null }); // Unlimited
    }

    // Reset if new day
    const now = new Date();
    const lastReset = user.lastArticleViewReset ? new Date(user.lastArticleViewReset) : null;
    const isNewDay = !lastReset || lastReset.toDateString() !== now.toDateString();
    const currentViews = isNewDay ? 0 : user.dailyArticleViews;

    if (currentViews >= 25) {
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
      remaining: 25 - currentViews - 1,
    });
  } catch (error) {
    logger.error('Failed to process subscription request', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: true }); // Don't block on error
  }
}
