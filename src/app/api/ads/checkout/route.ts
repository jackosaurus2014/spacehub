import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  internalError,
  serviceUnavailableError,
  createSuccessResponse,
} from '@/lib/errors';
import { adCheckoutSchema, validateBody } from '@/lib/validations';
import {
  isSelfServeAdsEnabled,
  checkSelfServeBudget,
  buildCampaignCheckoutParams,
  buildSponsorshipCheckoutParams,
  SPONSORSHIP_PRODUCTS,
  SPONSORSHIP_CAMPAIGN_TYPE,
  type SponsorshipOption,
} from '@/lib/ads/ad-billing';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ads/checkout
 *
 * Create a Stripe Checkout session for self-serve ad billing:
 *   { campaignId }               — pay a draft campaign's declared budget
 *                                  (one-time payment, $100–$5,000 self-serve)
 *   { sponsorship: 'single' }    — weekly-brief sponsorship, 1 issue ($150)
 *   { sponsorship: 'block4' }    — weekly-brief sponsorship, 4 issues ($500)
 *
 * Payment does NOT activate anything by itself: the webhook moves the
 * campaign to pending_review, and every campaign still goes through admin
 * approval before rendering. Declined campaigns are fully refunded.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSelfServeAdsEnabled()) {
      return serviceUnavailableError(
        'Self-serve ad billing is not enabled. Contact us at /contact to set up a campaign.'
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return forbiddenError('You must register as an advertiser first');
    }

    if (advertiser.status !== 'approved') {
      return forbiddenError('Your advertiser account is not yet approved');
    }

    const body = await req.json();
    const validation = validateBody(adCheckoutSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
      return unauthorizedError('User not found');
    }

    if (validation.data.campaignId) {
      return createCampaignCheckout(validation.data.campaignId, advertiser.id, user);
    }

    return createSponsorshipCheckout(
      validation.data.sponsorship as SponsorshipOption,
      advertiser.id,
      user
    );
  } catch (error) {
    logger.error('Error creating ad checkout session', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to start checkout. Please try again.');
  }
}

async function createCampaignCheckout(
  campaignId: string,
  advertiserId: string,
  user: { id: string; email: string; stripeCustomerId: string | null }
) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, status: true, budget: true, advertiserId: true },
  });

  if (!campaign || campaign.advertiserId !== advertiserId) {
    return notFoundError('Campaign');
  }

  if (campaign.status !== 'draft') {
    return validationError(
      campaign.status === 'pending_review'
        ? 'This campaign is already paid and awaiting review.'
        : `Only draft campaigns can be paid and submitted (current status: ${campaign.status}).`
    );
  }

  const budgetCheck = checkSelfServeBudget(campaign.budget);
  if (!budgetCheck.ok) {
    return validationError(budgetCheck.message);
  }

  const checkoutSession = await getStripe().checkout.sessions.create(
    buildCampaignCheckoutParams({
      campaignId: campaign.id,
      userId: user.id,
      campaignName: campaign.name,
      amountCents: budgetCheck.amountCents,
      appUrl: APP_URL,
      customerId: user.stripeCustomerId,
      customerEmail: user.email,
    })
  );

  logger.info('Created ad campaign checkout session', {
    campaignId: campaign.id,
    userId: user.id,
    amountCents: budgetCheck.amountCents,
    sessionId: checkoutSession.id,
  });

  return createSuccessResponse({ url: checkoutSession.url });
}

async function createSponsorshipCheckout(
  option: SponsorshipOption,
  advertiserId: string,
  user: { id: string; email: string; stripeCustomerId: string | null }
) {
  const product = SPONSORSHIP_PRODUCTS[option];

  // No schema changes allowed in this workstream, so a sponsorship order is
  // stored as an AdCampaign row with a dedicated type. It has no placements,
  // so the display ad server can never select it; it exists for billing,
  // review, and record-keeping. Run window: today through the covered issues.
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + product.issues * 7 * 24 * 60 * 60 * 1000);

  const campaign = await prisma.adCampaign.create({
    data: {
      advertiserId,
      name: product.productName,
      type: SPONSORSHIP_CAMPAIGN_TYPE,
      status: 'draft',
      budget: product.amountCents / 100,
      startDate,
      endDate,
      targetModules: ['weekly-brief'],
      targetTiers: ['free', 'pro'],
    },
  });

  // Resolve the fixed Price by lookup key (created by
  // scripts/setup-ad-billing-stripe.ts); fall back to inline price_data if
  // the setup script hasn't been run yet.
  let priceId: string | null = null;
  try {
    const prices = await getStripe().prices.list({
      lookup_keys: [product.lookupKey],
      active: true,
      limit: 1,
    });
    priceId = prices.data[0]?.id || null;
  } catch (err) {
    logger.warn('Could not resolve sponsorship price by lookup key; using inline price', {
      lookupKey: product.lookupKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const checkoutSession = await getStripe().checkout.sessions.create(
    buildSponsorshipCheckoutParams({
      option,
      campaignId: campaign.id,
      userId: user.id,
      appUrl: APP_URL,
      priceId,
      customerId: user.stripeCustomerId,
      customerEmail: user.email,
    })
  );

  logger.info('Created sponsorship checkout session', {
    campaignId: campaign.id,
    userId: user.id,
    option,
    sessionId: checkoutSession.id,
  });

  return createSuccessResponse({ url: checkoutSession.url });
}
