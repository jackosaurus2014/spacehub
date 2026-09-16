/**
 * Which tiers may have a promotion code typed into their checkout.
 *
 * ONE function, imported by both the checkout route that enforces it and the
 * daily control that verifies it. An earlier version had the control read the
 * checkout file as text to see whether the guard was present; that dragged
 * `fs` into a module which reaches a client bundle and broke the build. It was
 * also the wrong shape — a control should exercise the real policy, not grep
 * for the source of one.
 *
 * WHY RESEARCH IS EXCLUDED. Neither FOUNDER50 nor FOUNDER499-CONNER is
 * product-restricted in Stripe (`applies_to: null`), so an unconditional
 * allow_promotion_codes let a first-time buyer pay $199.50 for a $399 annual
 * Research seat, or take $15 off it forever. Both coupons were written for a
 * $19.99/month consumer plan.
 *
 * That is the same class of failure as the founding-member price the site
 * advertised and checkout never applied, which overcharged two customers in
 * August: an advertised price and a charged price that disagree. Undercharging
 * is the friendlier direction and just as wrong.
 *
 * If the coupons are later restricted to the Pro product in Stripe, this can
 * be revisited — `checkPromotionCodesCannotDiscountResearch()` reports which
 * mitigation is actually holding.
 */
export const PROMOTION_CODE_EXCLUDED_TIERS = ['research'] as const;

export function allowPromotionCodesForTier(tier: string): boolean {
  return !(PROMOTION_CODE_EXCLUDED_TIERS as readonly string[]).includes(tier);
}
