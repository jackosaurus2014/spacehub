import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStripe, getPriceIds } from '@/lib/stripe';
import { stripeCheckoutSchema, validateBody } from '@/lib/validations';
import { unauthorizedError, validationError, internalError, createSuccessResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

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

    // Determine if the user should get a trial period
    // Only grant trial if user hasn't had a trial before
    const hasHadTrial = user.trialTier !== null || user.trialEndDate !== null;
    const trialPeriodDays = hasHadTrial ? undefined : 14;

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

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
      success_url: `${APP_URL}/pricing?success=true`,
      cancel_url: `${APP_URL}/pricing?canceled=true`,
      subscription_data: {
        ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
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
      hasTrialDays: !!trialPeriodDays,
    });

    return createSuccessResponse({ url: checkoutSession.url });
  } catch (error) {
    logger.error('Failed to create checkout session', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create checkout session. Please try again.');
  }
}
