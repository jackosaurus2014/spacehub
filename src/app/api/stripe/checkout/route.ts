import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStripe, getPriceIds } from '@/lib/stripe';
import { TRIAL_DAYS } from '@/lib/subscription';
import {
  RESEARCH_PLAN,
  RESEARCH_PRICE_ENV_VAR,
  RESEARCH_TIER_FLAG_ENV_VAR,
  getResearchPriceId,
  isResearchTierEnabled,
} from '@/lib/research';
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

    // --- SpaceNexus Research: three refusals, all of them explicit ---------
    //
    // Building the tier is not launching it. Research can only be SOLD when the
    // founder flips RESEARCH_TIER_ENABLED, and even then only against its own
    // annual price. Each refusal below is a clean, logged error — never a
    // silent fallback to a different price, which is how two customers got
    // charged the wrong amount in August.
    if (tier === 'research') {
      if (!isResearchTierEnabled()) {
        logger.warn('Research checkout attempted while the tier is disabled', {
          flag: RESEARCH_TIER_FLAG_ENV_VAR,
        });
        return validationError('SpaceNexus Research is not available for purchase yet.');
      }
      if (interval !== 'year') {
        return validationError(
          'SpaceNexus Research is billed annually. Choose the yearly option.'
        );
      }
      if (!getResearchPriceId()) {
        logger.error('Research tier is enabled but its Stripe price is not configured', {
          envVar: RESEARCH_PRICE_ENV_VAR,
        });
        return internalError(
          'SpaceNexus Research is not configured for checkout yet. Please contact us and we will invoice you directly.'
        );
      }
    }

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
    // The 14-day trial is a PRO trial. SpaceNexus Research is an annual firm
    // seat bought on an invoice, and RESEARCH_PLAN.trialDays is 0 — letting it
    // inherit a Pro trial window would mean /pricing's "14-day trial" copy
    // silently applying to a plan we never advertise a trial for.
    if (tier === 'research' && RESEARCH_PLAN.trialDays === 0) {
      trialData = {};
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
      // Research is bought by firms, so the buyer needs a VAT/registration
      // number and a billing address on the invoice their finance team files.
      ...(tier === 'research'
        ? {
            billing_address_collection: 'required' as const,
            tax_id_collection: { enabled: true },
            custom_text: {
              submit: {
                message: `${RESEARCH_PLAN.totalSeats} named seats, billed annually. You can invite colleagues from the Research workspace once you are set up.`,
              },
            },
          }
        : {}),
      subscription_data: {
        ...trialData,
        metadata: {
          userId: user.id,
          tier,
        },
      },
      // Promotion codes are accepted on Pro, NOT on Research.
      //
      // FOUNDER50 and FOUNDER499-CONNER are both live, both `applies_to: null`
      // — not restricted to any product — so with this flag on, a first-time
      // buyer could type FOUNDER50 into the Research checkout and pay $199.50
      // for a $399 annual firm seat, or FOUNDER499-CONNER for $15 off it
      // forever. Those coupons were written for a $19.99/month consumer plan.
      //
      // This is the same class of failure as the founding-member price the
      // site advertised and checkout never applied, which overcharged two
      // customers in August — an advertised price and a charged price that
      // disagree. Undercharging is the friendlier direction and just as wrong.
      //
      // Closing it here rather than in Stripe keeps every existing Pro
      // discount working untouched. If the coupons are later restricted to the
      // Pro product in Stripe, this can be revisited — `pricing-integrity.ts`
      // checkPromotionCodesCannotDiscountResearch() watches for exactly that.
      allow_promotion_codes: tier !== 'research',
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
