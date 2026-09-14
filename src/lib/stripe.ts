import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Lazily initialize the Stripe client.
 * Throws at runtime (not build time) if STRIPE_SECRET_KEY is missing.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(key, {
      typescript: true,
    });
  }
  return _stripe;
}

// Backward compat — use getStripe() in route handlers
export const stripe = null as unknown as Stripe; // DO NOT use directly; call getStripe()

// Price IDs mapped from env vars (resolved lazily)
export function getPriceIds() {
  return {
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
    sponsor_verified_monthly: process.env.STRIPE_PRICE_SPONSOR_VERIFIED_MONTHLY || '',
    sponsor_verified_yearly: process.env.STRIPE_PRICE_SPONSOR_VERIFIED_YEARLY || '',
    sponsor_premium_monthly: process.env.STRIPE_PRICE_SPONSOR_PREMIUM_MONTHLY || '',
    sponsor_premium_yearly: process.env.STRIPE_PRICE_SPONSOR_PREMIUM_YEARLY || '',
    // SpaceNexus Research — annual only, its own price. Deliberately NOT one of
    // the enterprise_* entries above: those point at the withdrawn $49.99/mo
    // plan and selling an annual firm seat against them would charge every
    // buyer the wrong amount.
    research_yearly: process.env.STRIPE_PRICE_RESEARCH_YEARLY || '',
  };
}

/**
 * Map a Stripe price ID back to our internal tier name.
 * Returns null if the price ID doesn't match any known tier.
 *
 * Legacy Enterprise price IDs still map to 'pro' and must keep doing so. They
 * belong to the withdrawn $49.99/mo plan collapsed into Pro on 2026-08-11;
 * re-pointing them at 'research' would hand the new tier to anyone still on an
 * old subscription without their paying for it, and re-pointing them at null
 * would strip access from a paying customer. Research is sold from its own
 * price ID only (STRIPE_PRICE_RESEARCH_YEARLY).
 */
export function priceIdToTier(priceId: string): 'pro' | 'research' | null {
  const prices = getPriceIds();
  if (priceId === prices.pro_monthly || priceId === prices.pro_yearly) {
    return 'pro';
  }
  if (priceId === prices.enterprise_monthly || priceId === prices.enterprise_yearly) {
    return 'pro';
  }
  // Guard against an unset env var matching an unset price ID: '' === '' would
  // otherwise resolve every unknown price to 'research'.
  if (prices.research_yearly && priceId === prices.research_yearly) {
    return 'research';
  }
  return null;
}

export function priceIdToSponsorTier(priceId: string): 'verified' | 'premium' | null {
  const prices = getPriceIds();
  if (priceId === prices.sponsor_verified_monthly || priceId === prices.sponsor_verified_yearly) {
    return 'verified';
  }
  if (priceId === prices.sponsor_premium_monthly || priceId === prices.sponsor_premium_yearly) {
    return 'premium';
  }
  return null;
}

/**
 * Map Stripe subscription status to our internal subscription status.
 * Stripe has many statuses; we collapse them into active/canceled/past_due.
 */
export function mapSubscriptionStatus(
  status: Stripe.Subscription.Status
): 'active' | 'canceled' | 'past_due' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'canceled';
  }
}
