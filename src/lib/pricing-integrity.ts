/**
 * Pricing integrity — every discount the site advertises, and a check that
 * Stripe actually implements it.
 *
 * Standing rule (founder, 2026-08-24): if we advertise a discount, the Stripe
 * billing configuration must match it, so customers are never mischarged.
 *
 * This module exists because that rule was broken in production. The site
 * promised "$4.99/month locked for life" while Stripe held FOUNDER50 = 50% off
 * for 12 months (i.e. $9.99), and checkout only set `allow_promotion_codes`,
 * which renders an empty promo-code box rather than applying anything. Stripe
 * reported times_redeemed: 0 — the discount had never once been granted. Two
 * customers were quoted $4.99, charged $19.99, and wrote in about it.
 *
 * The failure was that the advertised terms lived in JSX and the real terms
 * lived in Stripe, with nothing comparing them. So: declare the advertised
 * terms HERE, in one place, and let the content-accuracy sentinel diff them
 * against live Stripe every day.
 */

import { getStripe } from '@/lib/stripe';

/**
 * Founding Member offer — WITHDRAWN 2026-08-24 by founder decision.
 *
 * Flipping this back on does NOT make the offer correct on its own. Before
 * re-enabling, all three of these must be true:
 *   1. A Stripe price or coupon exists that yields the advertised amount.
 *   2. Its `duration` matches the advertised duration (a "for life" claim
 *      needs `duration: 'forever'`, not `repeating`).
 *   3. Checkout APPLIES the promotion code (`discounts: [...]`) rather than
 *      merely offering the input box via `allow_promotion_codes`.
 * The check below enforces 1 and 2; 3 lives in the checkout route.
 */
export const FOUNDING_MEMBER_OFFER_ENABLED = false;

/** A discount the site advertises to visitors, in the site's own words. */
export interface AdvertisedDiscount {
  id: string;
  /** Stripe promotion code that is supposed to deliver it. */
  promotionCode: string;
  /** Whether the site currently shows this to anyone. */
  enabled: boolean;
  /** Percentage off the list price, as advertised. */
  percentOff: number;
  /**
   * How long the discount lasts, as advertised. 'forever' for "for life" /
   * "locked forever" copy; a month count otherwise.
   */
  duration: 'forever' | number;
  /** Where the claim is made, so a failure names the file to fix. */
  surfaces: string[];
}

export const ADVERTISED_DISCOUNTS: AdvertisedDiscount[] = [
  {
    id: 'founding-member',
    promotionCode: 'FOUNDER50',
    enabled: FOUNDING_MEMBER_OFFER_ENABLED,
    percentOff: 50,
    duration: 12,
    surfaces: ['src/app/pricing/page.tsx', 'src/app/register/page.tsx'],
  },
];

export interface DiscountCheckOutcome {
  ok: boolean;
  detail: string;
}

/**
 * Compare every ENABLED advertised discount against its live Stripe promotion
 * code. A disabled offer is not checked — nothing is being promised, so there
 * is nothing to honour.
 *
 * Fails loudly on: a missing or inactive promotion code, a percentage that
 * does not match the advertised one, a duration that does not match, or an
 * offer that has run out of redemptions while still being advertised.
 */
export async function checkAdvertisedDiscountsMatchStripe(): Promise<DiscountCheckOutcome> {
  const live = ADVERTISED_DISCOUNTS.filter((d) => d.enabled);
  if (live.length === 0) {
    return { ok: true, detail: 'No discounts are currently advertised.' };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, detail: `${live.length} discount(s) advertised but STRIPE_SECRET_KEY is not configured — cannot verify billing matches.` };
  }

  const problems: string[] = [];

  for (const d of live) {
    try {
      const list = await getStripe().promotionCodes.list({ code: d.promotionCode, limit: 1 });
      const pc = list.data[0];

      if (!pc) {
        problems.push(`${d.id}: advertises ${d.percentOff}% off but promotion code ${d.promotionCode} does not exist in Stripe (${d.surfaces.join(', ')})`);
        continue;
      }
      if (!pc.active) {
        problems.push(`${d.id}: promotion code ${d.promotionCode} is INACTIVE in Stripe but the offer is still advertised (${d.surfaces.join(', ')})`);
        continue;
      }

      const coupon = pc.coupon;
      if (coupon.percent_off !== d.percentOff) {
        problems.push(`${d.id}: site advertises ${d.percentOff}% off, Stripe gives ${coupon.percent_off ?? 'a fixed amount'} — customers would be mischarged`);
      }

      const stripeDuration = coupon.duration === 'forever' ? 'forever' : coupon.duration_in_months;
      if (stripeDuration !== d.duration) {
        problems.push(`${d.id}: site advertises a duration of ${d.duration === 'forever' ? 'forever' : `${d.duration} months`}, Stripe is configured for ${coupon.duration === 'forever' ? 'forever' : `${coupon.duration_in_months} months (${coupon.duration})`}`);
      }

      if (pc.max_redemptions != null && pc.times_redeemed >= pc.max_redemptions) {
        problems.push(`${d.id}: all ${pc.max_redemptions} redemptions are used but the offer is still advertised`);
      }
    } catch (err) {
      problems.push(`${d.id}: could not read Stripe (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  if (problems.length > 0) {
    return { ok: false, detail: problems.join(' | ') };
  }
  return { ok: true, detail: `${live.length} advertised discount(s) match their Stripe configuration.` };
}
