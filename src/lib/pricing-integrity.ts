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

import { allowPromotionCodesForTier } from '@/lib/promotion-policy';
import { getStripe } from '@/lib/stripe';
import {
  RESEARCH_CAPABILITIES,
  RESEARCH_PLAN,
  RESEARCH_PRICE_ENV_VAR,
  getResearchPriceId,
  isResearchTierEnabled,
} from '@/lib/research';
import { TIER_ACCESS } from '@/lib/subscription';

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
export const FOUNDING_MEMBER_OFFER_ENABLED = true; // re-enabled 2026-09-10 (Jay): 50% off 12 months, first-time subscribers, code entered at checkout

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

// ===========================================================================
// SpaceNexus Research — the pricing-truth rule applied to a whole tier
// ===========================================================================
//
// The 2026-08-24 incident was a DISCOUNT the site advertised and Stripe did not
// deliver. A new paid tier can fail the same way in two more places, so both
// are checked here:
//
//   1. The PRICE. /research and /pricing render RESEARCH_PLAN.priceYearly on a
//      yearly interval. If the Stripe price behind STRIPE_PRICE_RESEARCH_YEARLY
//      charges a different amount, a different currency or a different interval,
//      the first buyer is mischarged.
//   2. The CAPABILITIES. Every bullet the tier claims must be backed by a
//      TIER_ACCESS flag that is genuinely true for 'research' and false for
//      'pro' (otherwise it is not a Research capability at all) and by a file
//      that performs the gate. A bullet with no gate is the same lie in a
//      different font.
//
// Both run only when the tier is actually being advertised. A tier behind a
// disabled flag promises nothing, so there is nothing to honour — exactly the
// same rule ADVERTISED_DISCOUNTS uses for a withdrawn offer.

/** True when the site is currently showing Research to buyers. */
export function isResearchAdvertised(): boolean {
  return isResearchTierEnabled() && getResearchPriceId() !== null;
}

/**
 * Check every advertised Research capability against the tier model. Pure and
 * synchronous — no Stripe, no database — so the guard test can run it directly.
 */
export function checkResearchCapabilitiesAreGated(): DiscountCheckOutcome {
  const problems: string[] = [];

  for (const cap of RESEARCH_CAPABILITIES) {
    const onResearch = TIER_ACCESS.research[cap.accessFlag];
    const onPro = TIER_ACCESS.pro[cap.accessFlag];
    const onFree = TIER_ACCESS.free[cap.accessFlag];

    if (onResearch !== true) {
      problems.push(
        `${cap.id}: advertised on Research but TIER_ACCESS.research.${cap.accessFlag} is not true — the tier would be sold a capability it does not have`
      );
    }
    if (onPro === true || onFree === true) {
      problems.push(
        `${cap.id}: TIER_ACCESS.${cap.accessFlag} is already true for ${
          onPro ? 'pro' : 'free'
        } — advertising it as a Research exclusive misrepresents what the upgrade buys`
      );
    }
    if (!cap.enforcedBy || !cap.enforcedBy.startsWith('src/')) {
      problems.push(`${cap.id}: does not name the file that enforces it`);
    }
  }

  return problems.length > 0
    ? { ok: false, detail: problems.join(' | ') }
    : {
        ok: true,
        detail: `${RESEARCH_CAPABILITIES.length} Research capabilities are each backed by a tier flag that is true for research and false for pro.`,
      };
}

/**
 * Compare the advertised Research price against the live Stripe price.
 *
 * Fails loudly on: a missing or inactive price, a different amount, a different
 * currency, a non-recurring price, or an interval that is not a single year.
 * Returns ok with a note when the tier is not being advertised.
 */
export async function checkResearchTierMatchesStripe(): Promise<DiscountCheckOutcome> {
  if (!isResearchTierEnabled()) {
    return {
      ok: true,
      detail: 'SpaceNexus Research is behind its feature flag and is not advertised.',
    };
  }

  const priceId = getResearchPriceId();
  if (!priceId) {
    return {
      ok: false,
      detail: `SpaceNexus Research is ENABLED but ${RESEARCH_PRICE_ENV_VAR} is not set — /pricing would show a plan checkout is guaranteed to refuse.`,
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      ok: false,
      detail:
        'SpaceNexus Research is advertised but STRIPE_SECRET_KEY is not configured — cannot verify billing matches.',
    };
  }

  const problems: string[] = [];

  const capabilities = checkResearchCapabilitiesAreGated();
  if (!capabilities.ok) problems.push(capabilities.detail);

  try {
    const price = await getStripe().prices.retrieve(priceId);

    if (!price.active) {
      problems.push(`Stripe price ${priceId} is INACTIVE but Research is advertised`);
    }
    const expectedCents = Math.round(RESEARCH_PLAN.priceYearly * 100);
    if (price.unit_amount !== expectedCents) {
      problems.push(
        `site advertises $${RESEARCH_PLAN.priceYearly}/year, Stripe charges ${
          price.unit_amount == null ? 'a metered or tiered amount' : `$${price.unit_amount / 100}`
        } — buyers would be mischarged`
      );
    }
    if (price.currency !== RESEARCH_PLAN.currency) {
      problems.push(
        `site advertises ${RESEARCH_PLAN.currency.toUpperCase()}, Stripe bills in ${price.currency.toUpperCase()}`
      );
    }
    if (price.type !== 'recurring' || !price.recurring) {
      problems.push(`Stripe price ${priceId} is not recurring, but Research is sold as a subscription`);
    } else if (price.recurring.interval !== 'year' || (price.recurring.interval_count ?? 1) !== 1) {
      problems.push(
        `site advertises annual billing, Stripe bills every ${price.recurring.interval_count ?? 1} ${price.recurring.interval}`
      );
    }
  } catch (err) {
    problems.push(
      `could not read the Research price from Stripe (${err instanceof Error ? err.message : String(err)})`
    );
  }

  return problems.length > 0
    ? { ok: false, detail: `SpaceNexus Research: ${problems.join(' | ')}` }
    : {
        ok: true,
        detail: `SpaceNexus Research is advertised at $${RESEARCH_PLAN.priceYearly}/year and Stripe agrees.`,
      };
}

/**
 * Nothing may quietly discount the Research seat.
 *
 * Checkout sets `allow_promotion_codes: true` for EVERY tier, Research
 * included (src/app/api/stripe/checkout/route.ts). That renders a promo-code
 * box on the $399/year firm seat, and Stripe will honour any active promotion
 * code typed into it unless the underlying coupon is restricted to specific
 * products via `coupon.applies_to.products`.
 *
 * So an offer written for a $19.99/month Pro subscription — FOUNDER50, say —
 * silently becomes an offer on a $399/year annual seat. That is the same class
 * of failure as 2026-08-24 (advertised terms and billed terms diverging), just
 * pointed the other way: the buyer pays LESS than the page says, and we find
 * out from the revenue report.
 *
 * This check fails when any active promotion code could be applied to the
 * Research price. The fix is in Stripe (restrict the coupon to the Pro
 * product) or in checkout (drop `allow_promotion_codes` for tier=research) —
 * never by deleting this check.
 */
export async function checkPromotionCodesCannotDiscountResearch(): Promise<DiscountCheckOutcome> {
  if (!isResearchTierEnabled()) {
    return {
      ok: true,
      detail: 'SpaceNexus Research is behind its feature flag — there is no seat to discount.',
    };
  }

  const priceId = getResearchPriceId();
  if (!priceId) {
    // checkResearchTierMatchesStripe already fails loudly on this; do not
    // page twice for one misconfiguration.
    return {
      ok: true,
      detail: `${RESEARCH_PRICE_ENV_VAR} is not set — reported by the Research price check.`,
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      ok: false,
      detail:
        'SpaceNexus Research is advertised but STRIPE_SECRET_KEY is not configured — cannot verify that no promotion code discounts it.',
    };
  }

  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    const list = await stripe.promotionCodes.list({ active: true, limit: 100 });

    const listPrice = RESEARCH_PLAN.priceYearly;
    const offenders: string[] = [];

    for (const pc of list.data) {
      const coupon = pc.coupon;
      if (!coupon || coupon.valid === false) continue;

      const products = coupon.applies_to?.products;
      const restrictedAway =
        Array.isArray(products) && products.length > 0 && !!productId && !products.includes(productId);
      if (restrictedAway) continue;

      const charged =
        coupon.percent_off != null
          ? listPrice * (1 - coupon.percent_off / 100)
          : coupon.amount_off != null
            ? Math.max(0, listPrice - coupon.amount_off / 100)
            : null;

      offenders.push(
        `${pc.code} (${
          coupon.percent_off != null
            ? `${coupon.percent_off}% off`
            : coupon.amount_off != null
              ? `$${(coupon.amount_off / 100).toFixed(2)} off`
              : 'unknown discount'
        }, ${coupon.duration === 'repeating' ? `${coupon.duration_in_months} months` : coupon.duration})` +
          (charged == null ? '' : ` would bill $${charged.toFixed(2)} instead of $${listPrice}`)
      );
    }

    if (offenders.length > 0) {
      // TWO INDEPENDENT MITIGATIONS, and either one closes the hole.
      //
      //   (a) The coupon is restricted to another product in Stripe.
      //   (b) Our checkout refuses promotion codes for tier=research, so no
      //       session that could accept one is ever created.
      //
      // (b) is in force. Failing anyway would mean this alarm is red forever
      // on a risk we have already mitigated — and an alarm that cannot clear
      // is one people stop reading. That is the third time this pattern has
      // bitten us: a security test that failed one run in three, and a feed
      // check that called a resumable sweep dead.
      //
      // So the check reads the checkout source for the guard and passes while
      // it is present, naming the unrestricted coupons so the residual risk
      // stays visible. Remove the guard and this goes red immediately, which
      // is exactly when someone should hear about it.
      // The real policy, not a grep for it: delete 'research' from the
      // excluded list and this control goes red on the next daily run.
      const checkoutGuarded = !allowPromotionCodesForTier('research');
      if (checkoutGuarded) {
        return {
          ok: true,
          detail:
            `${offenders.length} active Stripe promotion code(s) are not product-restricted, but Research checkout ` +
            `refuses promotion codes (allow_promotion_codes: tier !== 'research'), so none can reach a $${listPrice}/year ` +
            `seat: ${offenders.join(' | ')}. Restricting the coupons in Stripe would close it at the source too.`,
        };
      }
      return {
        ok: false,
        detail:
          `${offenders.length} active Stripe promotion code(s) are not product-restricted AND Research checkout accepts ` +
          `promotion codes, so any of them can be typed into the $${listPrice}/year checkout: ${offenders.join(' | ')}. ` +
          'Restrict the coupon to the Pro product in Stripe (coupon.applies_to.products), or stop sending ' +
          'allow_promotion_codes for tier=research in src/app/api/stripe/checkout/route.ts.',
      };
    }

    return {
      ok: true,
      detail: `No active promotion code can be applied to the $${listPrice}/year Research seat.`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `Could not check Stripe promotion codes against the Research price (${
        err instanceof Error ? err.message : String(err)
      })`,
    };
  }
}
