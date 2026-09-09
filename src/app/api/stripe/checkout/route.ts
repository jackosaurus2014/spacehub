import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStripe, getPriceIds } from '@/lib/stripe';
import { TRIAL_DAYS } from '@/lib/subscription';
import { stripeCheckoutSchema, validateBody } from '@/lib/validations';
import { unauthorizedError, validationError, internalError, createSuccessResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorizedError('You must be logged in to subscribe');
    }

    const body = await req.json();

    // Validate input
    const validation = validateBody(stripeCheckoutSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { tier, interval } = validation.data;

    // Look up the correct price ID
    const priceIds = getPriceIds();
    const priceKey = `${tier}_${interval === 'month' ? 'monthly' : 'yearly'}` as keyof ReturnType<typeof getPriceIds>;
    const priceId = priceIds[priceKey];

    if (!priceId) {
      logger.error('Missing Stripe price ID', { tier, interval, priceKey });
      return internalError('Subscription plan not configured. Please contact support.');
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        trialTier: true,
        trialEndDate: true,
        trialStartDate: true,
      },
    });

    if (!user) {
      return unauthorizedError('User not found');
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Save the Stripe customer ID to the database
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });

      logger.info('Created Stripe customer', {
        userId: user.id,
        stripeCustomerId,
      });
    }

    // Carry the site trial into Stripe. Registration auto-starts a TRIAL_DAYS
    // Pro trial with no card on file; a member who subscribes while it is
    // running must not be charged before it ends, and an account that never
    // had one gets the advertised trial at checkout. Stripe wants trial_end at
    // least 48h out, so a trial in its last two days rounds up to whole days.
    // (2026-09-08: this used to grant Stripe's trial only to accounts with no
    // trial fields at all, which after auto-trials at signup was nobody.)
    const nowMs = Date.now();
    const trialEndMs = user.trialEndDate ? new Date(user.trialEndDate).getTime() : 0;
    const hasHadTrial =
      user.trialStartDate !== null || user.trialTier !== null || user.trialEndDate !== null;
    let trialData: { trial_end: number } | { trial_period_days: number } | Record<string, never> = {};
    if (trialEndMs > nowMs) {
      const remainingMs = trialEndMs - nowMs;
      trialData =
        remainingMs >= 48 * 60 * 60 * 1000
          ? { trial_end: Math.floor(trialEndMs / 1000) }
          : { trial_period_days: Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))) };
    } else if (!hasHadTrial) {
      trialData = { trial_period_days: TRIAL_DAYS };
    }
    const hasTrialDays = Object.keys(trialData).length > 0;

    // Create Stripe Checkout Session
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing?canceled=true`,
      subscription_data: {
        ...trialData,
        metadata: {
          userId: user.id,
          tier,
        },
      },
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        tier,
      },
    });

    logger.info('Created Stripe checkout session', {
      userId: user.id,
      tier,
      interval,
      sessionId: checkoutSession.id,
      hasTrialDays,
      trialData,
    });

    return createSuccessResponse({ url: checkoutSession.url });
  } catch (error) {
    logger.error('Failed to create checkout session', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create checkout session. Please try again.');
  }
}
