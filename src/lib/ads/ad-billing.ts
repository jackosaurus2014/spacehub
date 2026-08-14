import type Stripe from 'stripe';

/**
 * Self-serve ad billing: shared constants and pure helpers.
 *
 * Billing model:
 *   - Campaign creation is free (status "draft").
 *   - Activation requires paying the declared budget up front via Stripe
 *     Checkout (one-time payment). The checkout.session.completed webhook
 *     moves the campaign draft -> pending_review; the existing admin
 *     approval path (pending_review -> active) is unchanged.
 *   - Declined (rejected) campaigns are automatically refunded in full.
 *
 * Sponsorships (weekly-brief) are fixed-price products created by
 * scripts/setup-ad-billing-stripe.ts and resolved at checkout time via
 * their Stripe price lookup keys.
 */

// ── Self-serve budget bounds (USD) ──────────────────────────────────────────

export const SELF_SERVE_MIN_BUDGET_USD = 100;
export const SELF_SERVE_MAX_BUDGET_USD = 5000;

// ── Sponsorship products (fixed prices, approved 2026-08) ───────────────────

export const SPONSORSHIP_CAMPAIGN_TYPE = 'weekly_brief_sponsorship';

export interface SponsorshipProduct {
  /** Stable Stripe price lookup key — used for idempotent setup + resolution */
  lookupKey: string;
  productName: string;
  description: string;
  amountCents: number;
  issues: number;
}

export const SPONSORSHIP_PRODUCTS: Record<'single' | 'block4', SponsorshipProduct> = {
  single: {
    lookupKey: 'weekly_brief_sponsorship_single',
    productName: 'Weekly Brief Sponsorship — 1 issue',
    description:
      'Sponsor slot in one issue of the SpaceNexus weekly brief (logo, one-line message, link).',
    amountCents: 15000, // $150
    issues: 1,
  },
  block4: {
    lookupKey: 'weekly_brief_sponsorship_block4',
    productName: 'Weekly Brief Sponsorship — 4-issue block',
    description:
      'Sponsor slot in four consecutive issues of the SpaceNexus weekly brief (logo, one-line message, link).',
    amountCents: 50000, // $500
    issues: 4,
  },
};

export type SponsorshipOption = keyof typeof SPONSORSHIP_PRODUCTS;

// ── Feature gate ────────────────────────────────────────────────────────────

/**
 * Self-serve ads default ON when Stripe is configured (STRIPE_SECRET_KEY
 * present), because billing now exists. The SELF_SERVE_ADS_ENABLED env var
 * remains as an explicit override in both directions:
 *   - "false" forces the gate off even with Stripe configured
 *   - "true" forces it on (e.g., local testing with a test-mode key)
 */
export function isSelfServeAdsEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  const override = env.SELF_SERVE_ADS_ENABLED;
  if (override === 'false') return false;
  if (override === 'true') return true;
  return Boolean(env.STRIPE_SECRET_KEY);
}

// ── Budget validation ───────────────────────────────────────────────────────

export type BudgetCheck =
  | { ok: true; amountCents: number }
  | { ok: false; reason: 'invalid' | 'below_min' | 'above_max'; message: string };

/**
 * Validate a declared campaign budget for self-serve payment.
 * Budgets above the self-serve maximum are a "contact us" path, not an error
 * in the campaign itself.
 */
export function checkSelfServeBudget(budgetUsd: number): BudgetCheck {
  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) {
    return { ok: false, reason: 'invalid', message: 'Budget must be a positive amount' };
  }
  if (budgetUsd < SELF_SERVE_MIN_BUDGET_USD) {
    return {
      ok: false,
      reason: 'below_min',
      message: `Minimum self-serve campaign budget is $${SELF_SERVE_MIN_BUDGET_USD}`,
    };
  }
  if (budgetUsd > SELF_SERVE_MAX_BUDGET_USD) {
    return {
      ok: false,
      reason: 'above_max',
      message: `Self-serve campaigns are capped at $${SELF_SERVE_MAX_BUDGET_USD.toLocaleString()}. For larger campaigns, contact us at /contact and we will set it up directly.`,
    };
  }
  return { ok: true, amountCents: Math.round(budgetUsd * 100) };
}

// ── Checkout session builders (pure — unit tested) ──────────────────────────

export const AD_CAMPAIGN_PAYMENT_KIND = 'ad_campaign_payment';
export const AD_SPONSORSHIP_PAYMENT_KIND = 'ad_sponsorship_payment';

interface CampaignCheckoutInput {
  campaignId: string;
  userId: string;
  campaignName: string;
  amountCents: number;
  appUrl: string;
  customerId?: string | null;
  customerEmail?: string | null;
}

/**
 * Build Stripe Checkout params for a one-time campaign budget payment.
 * Dynamic amount via inline price_data (no pre-created product needed).
 * campaignId/userId metadata is set on BOTH the session and the underlying
 * PaymentIntent — the PaymentIntent metadata is what the automatic refund
 * path searches on when a campaign is declined.
 */
export function buildCampaignCheckoutParams(
  input: CampaignCheckoutInput
): Stripe.Checkout.SessionCreateParams {
  const metadata = {
    kind: AD_CAMPAIGN_PAYMENT_KIND,
    campaignId: input.campaignId,
    userId: input.userId,
  };
  return {
    mode: 'payment',
    ...(input.customerId
      ? { customer: input.customerId }
      : input.customerEmail
        ? { customer_email: input.customerEmail }
        : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: input.amountCents,
          product_data: {
            name: `SpaceNexus ad campaign: ${input.campaignName}`,
            description:
              'Prepaid ad campaign budget. Reviewed within 2 business days; declined campaigns are fully refunded.',
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${input.appUrl}/advertise/dashboard?checkout=success`,
    cancel_url: `${input.appUrl}/advertise/dashboard?checkout=cancelled`,
  };
}

interface SponsorshipCheckoutInput {
  option: SponsorshipOption;
  campaignId: string;
  userId: string;
  appUrl: string;
  /** Resolved Stripe price ID (via lookup key). Falls back to inline price_data when absent. */
  priceId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
}

/**
 * Build Stripe Checkout params for a fixed-price weekly-brief sponsorship.
 * Uses the pre-created Price when available (resolved by lookup key);
 * falls back to inline price_data so checkout still works before the
 * setup script has been run.
 */
export function buildSponsorshipCheckoutParams(
  input: SponsorshipCheckoutInput
): Stripe.Checkout.SessionCreateParams {
  const product = SPONSORSHIP_PRODUCTS[input.option];
  const metadata = {
    kind: AD_SPONSORSHIP_PAYMENT_KIND,
    campaignId: input.campaignId,
    userId: input.userId,
    sponsorshipOption: input.option,
  };
  return {
    mode: 'payment',
    ...(input.customerId
      ? { customer: input.customerId }
      : input.customerEmail
        ? { customer_email: input.customerEmail }
        : {}),
    line_items: [
      input.priceId
        ? { price: input.priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: product.amountCents,
              product_data: {
                name: product.productName,
                description: product.description,
              },
            },
          },
    ],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${input.appUrl}/advertise/dashboard?checkout=success`,
    cancel_url: `${input.appUrl}/advertise/dashboard?checkout=cancelled`,
  };
}

// ── Automatic refunds (declined campaigns) ──────────────────────────────────

export interface RefundResult {
  refundedCount: number;
  refundedAmountCents: number;
  paymentIntentIds: string[];
}

/**
 * Refund every succeeded payment attached to a campaign.
 *
 * The AdCampaign model has no Stripe reference column (schema is owned by
 * another workstream), so instead of storing the PaymentIntent locally we
 * find it via the Stripe search API using the metadata written by
 * buildCampaignCheckoutParams / buildSponsorshipCheckoutParams.
 * Already-refunded intents are skipped, so this is safe to re-run.
 */
export async function refundCampaignPayments(
  stripe: Stripe,
  campaignId: string
): Promise<RefundResult> {
  const result: RefundResult = {
    refundedCount: 0,
    refundedAmountCents: 0,
    paymentIntentIds: [],
  };

  const search = await stripe.paymentIntents.search({
    query: `metadata['campaignId']:'${campaignId}'`,
    limit: 20,
  });

  for (const pi of search.data) {
    if (pi.status !== 'succeeded') continue;

    // Skip if already fully refunded (idempotent re-run safety)
    const existing = await stripe.refunds.list({ payment_intent: pi.id, limit: 10 });
    const alreadyRefunded = existing.data.reduce((sum, r) => sum + (r.amount || 0), 0);
    if (alreadyRefunded >= pi.amount) continue;

    await stripe.refunds.create({
      payment_intent: pi.id,
      reason: 'requested_by_customer',
      metadata: { campaignId, refundReason: 'campaign_declined' },
    });

    result.refundedCount += 1;
    result.refundedAmountCents += pi.amount - alreadyRefunded;
    result.paymentIntentIds.push(pi.id);
  }

  return result;
}
