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
  };
}

/**
 * Map a Stripe price ID back to our internal tier name.
 * Returns null if the price ID doesn't match any known tier.
 */
export function priceIdToTier(priceId: string): 'pro' | 'enterprise' | null {
  const prices = getPriceIds();
  if (priceId === prices.pro_monthly || priceId === prices.pro_yearly) {
    return 'pro';
  }
  if (priceId === prices.enterprise_monthly || priceId === prices.enterprise_yearly) {
    return 'enterprise';
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
