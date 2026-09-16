/**
 * @jest-environment node
 */
import { allowPromotionCodesForTier, PROMOTION_CODE_EXCLUDED_TIERS } from '@/lib/promotion-policy';
import fs from 'fs';
import path from 'path';
/**
 * Pricing integrity — the site must never advertise a discount Stripe cannot
 * deliver. These tests encode the production incident of 2026-08-24: the site
 * promised "$4.99/month locked for life" against a Stripe coupon of 50% off
 * for 12 months, and nothing compared the two.
 */
import {
  ADVERTISED_DISCOUNTS,
  FOUNDING_MEMBER_OFFER_ENABLED,
  checkAdvertisedDiscountsMatchStripe,
} from '../pricing-integrity';

const listMock = jest.fn();
/** prices.retrieve — added 2026-09-14 for the SpaceNexus Research price check. */
const priceRetrieveMock = jest.fn();
jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    promotionCodes: { list: listMock },
    prices: { retrieve: priceRetrieveMock },
  }),
}));

// pricing-integrity now imports lib/research, which imports Prisma. Nothing in
// these tests touches the database; the stub just keeps a real client from
// being constructed.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    researchAccount: { findUnique: jest.fn() },
    researchSeat: { findMany: jest.fn() },
  },
}));

const promo = (over: Record<string, unknown> = {}) => ({
  data: [
    {
      active: true,
      max_redemptions: 50,
      times_redeemed: 0,
      coupon: { percent_off: 50, duration: 'repeating', duration_in_months: 12 },
      ...over,
    },
  ],
});

describe('advertised discount registry', () => {
  it('the founding-member offer is live again as 50% off 12 months for first-time subscribers (Jay, 2026-09-10)', () => {
    // Stripe: coupon e3YIBO8l (50% repeating 12) + promotion code FOUNDER50
    // (active, max 50, first_time_transaction). The code is typed at checkout
    // (allow_promotion_codes); the site never promises anything "for life".
    expect(FOUNDING_MEMBER_OFFER_ENABLED).toBe(true);
    const offer = ADVERTISED_DISCOUNTS.find((d) => d.id === 'founding-member')!;
    expect(offer.promotionCode).toBe('FOUNDER50');
    expect(offer.percentOff).toBe(50);
    expect(offer.duration).toBe(12);
    for (const rel of offer.surfaces) {
      const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');
      expect(src).not.toMatch(/for life|locked forever|access forever|\$4\.99/i);
    }
    // FOUNDER50 must remain claimable at checkout — but NOT on Research.
    // Neither FOUNDER50 nor FOUNDER499-CONNER is product-restricted in Stripe
    // (`applies_to: null`), so an unconditional `allow_promotion_codes: true`
    // let a first-time buyer pay $199.50 for a $399 annual Research seat, or
    // take $15 off it forever. Those coupons were written for a $19.99/month
    // consumer plan. The flag is therefore conditional, and this assertion
    // pins the condition rather than the old blanket true — reverting it
    // silently reopens the discount.
    const checkoutSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/api/stripe/checkout/route.ts'), 'utf-8');
    expect(checkoutSrc).toMatch(/allow_promotion_codes:\s*allowPromotionCodesForTier\(tier\)/);
    expect(checkoutSrc).not.toMatch(/allow_promotion_codes:\s*true/);
  });

  it('every advertised discount names where it is claimed', () => {
    for (const d of ADVERTISED_DISCOUNTS) {
      expect(d.surfaces.length).toBeGreaterThan(0);
      expect(d.promotionCode).toBeTruthy();
    }
  });
});

describe('checkAdvertisedDiscountsMatchStripe', () => {
  const OLD_KEY = process.env.STRIPE_SECRET_KEY;
  beforeEach(() => {
    listMock.mockReset();
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  });
  afterAll(() => {
    if (OLD_KEY === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = OLD_KEY;
  });

  it('checks the live FOUNDER50 offer against Stripe and passes when the promo matches', async () => {
    listMock.mockResolvedValue(promo());
    const r = await checkAdvertisedDiscountsMatchStripe();
    expect(r.ok).toBe(true);
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ code: 'FOUNDER50' }));
  });

  /**
   * The rest drive the checker through a temporarily-added second offer; the
   * real FOUNDER50 entry also runs and passes against the same mock.
   */
  function withEnabledOffer(over: Partial<(typeof ADVERTISED_DISCOUNTS)[number]> = {}) {
    ADVERTISED_DISCOUNTS.push({
      id: 'test-offer',
      promotionCode: 'TESTCODE',
      enabled: true,
      percentOff: 50,
      duration: 12,
      surfaces: ['src/app/pricing/page.tsx'],
      ...over,
    });
    return () => { ADVERTISED_DISCOUNTS.pop(); };
  }

  it('accepts an offer whose Stripe config matches', async () => {
    const undo = withEnabledOffer();
    listMock.mockResolvedValue(promo());
    const r = await checkAdvertisedDiscountsMatchStripe();
    undo();
    expect(r.ok).toBe(true);
  });

  /** The exact production bug: "for life" copy over a 12-month coupon. */
  it('catches a "for life" claim backed by a repeating coupon', async () => {
    const undo = withEnabledOffer({ duration: 'forever' });
    listMock.mockResolvedValue(promo());
    const r = await checkAdvertisedDiscountsMatchStripe();
    undo();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('forever');
    expect(r.detail).toContain('12 months');
  });

  /** The other half: advertising a bigger discount than Stripe grants. */
  it('catches an advertised percentage Stripe does not give', async () => {
    const undo = withEnabledOffer({ percentOff: 75 });
    listMock.mockResolvedValue(promo());
    const r = await checkAdvertisedDiscountsMatchStripe();
    undo();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('mischarged');
  });

  it('catches a promotion code that does not exist', async () => {
    const undo = withEnabledOffer();
    listMock.mockResolvedValue({ data: [] });
    const r = await checkAdvertisedDiscountsMatchStripe();
    undo();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('does not exist');
  });

  it('catches an inactive promotion code still being advertised', async () => {
    const undo = withEnabledOffer();
    listMock.mockResolvedValue(promo({ active: false }));
    const r = await checkAdvertisedDiscountsMatchStripe();
    undo();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('INACTIVE');
  });

  it('catches an exhausted offer still being advertised', async () => {
    const undo = withEnabledOffer();
    listMock.mockResolvedValue(promo({ times_redeemed: 50 }));
    const r = await checkAdvertisedDiscountsMatchStripe();
    undo();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('redemptions');
  });

  it('fails loudly rather than silently when Stripe is unreachable', async () => {
    const undo = withEnabledOffer();
    listMock.mockRejectedValue(new Error('network down'));
    const r = await checkAdvertisedDiscountsMatchStripe();
    undo();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('network down');
  });

  it('fails when a discount is advertised with no Stripe key configured', async () => {
    const undo = withEnabledOffer();
    delete process.env.STRIPE_SECRET_KEY;
    const r = await checkAdvertisedDiscountsMatchStripe();
    undo();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('cannot verify');
  });
});

// ===========================================================================
// SpaceNexus Research (2026-09-14)
// ===========================================================================
//
// The 2026-08-24 incident was an advertised DISCOUNT Stripe did not deliver.
// A whole new tier can fail the same way in two more places — a price that
// does not match, and a feature bullet with no gate behind it — so both are
// pinned here alongside the discount checks above.

import {
  checkPromotionCodesCannotDiscountResearch,
  checkResearchCapabilitiesAreGated,
  checkResearchTierMatchesStripe,
  isResearchAdvertised,
} from '../pricing-integrity';
import {
  RESEARCH_CAPABILITIES,
  RESEARCH_PLAN,
  RESEARCH_PRICE_ENV_VAR,
  RESEARCH_TIER_FLAG_ENV_VAR,
} from '../research';

describe('SpaceNexus Research capability gates', () => {
  it('every advertised capability is backed by a real tier flag', () => {
    const outcome = checkResearchCapabilitiesAreGated();
    expect(outcome.ok).toBe(true);
    expect(outcome.detail).toContain(String(RESEARCH_CAPABILITIES.length));
  });

  it('every capability names a file that enforces it', () => {
    for (const cap of RESEARCH_CAPABILITIES) {
      expect(cap.enforcedBy.startsWith('src/')).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), cap.enforcedBy))).toBe(true);
    }
  });

  it('the /research page has no hand-written feature list to drift out of sync', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/app/research/page.tsx'), 'utf-8');
    // Bullets are rendered from the registry, not typed into JSX. The page
    // composes RESEARCH_CAPABILITIES with researchCallCapability(), which
    // returns a row only while a briefing call is actually scheduled — so the
    // list is still derived, and the one data-dependent claim appears exactly
    // when the product does. See src/lib/research-call.ts.
    expect(src).toContain('RESEARCH_CAPABILITIES');
    expect(src).toContain('researchCallCapability');
    expect(src).toMatch(/\{capabilities\.map\(/);
    // And the price shown is the one the integrity check verifies against Stripe.
    expect(src).toContain('availability.plan.priceYearly');
  });

  it('the /pricing band renders nothing unless the server says the tier is available', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/components/pricing/ResearchTierBand.tsx'),
      'utf-8'
    );
    expect(src).toContain('/api/research/availability');
    expect(src).toContain('if (!availability) return null;');
    // No NEXT_PUBLIC_ copy of the flag: the server stays the single authority.
    expect(src).not.toContain('NEXT_PUBLIC_RESEARCH');
  });

  it('checkout refuses Research while the flag is off, and never falls back to another price', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/stripe/checkout/route.ts'),
      'utf-8'
    );
    expect(src).toContain('isResearchTierEnabled()');
    expect(src).toContain('getResearchPriceId()');
    // Annual only — the advertised terms say so.
    expect(src).toContain("interval !== 'year'");
  });
});

describe('checkResearchTierMatchesStripe', () => {
  const saved = {
    flag: process.env[RESEARCH_TIER_FLAG_ENV_VAR],
    price: process.env[RESEARCH_PRICE_ENV_VAR],
    key: process.env.STRIPE_SECRET_KEY,
  };

  afterEach(() => {
    const restore = (k: string, v: string | undefined) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    };
    restore(RESEARCH_TIER_FLAG_ENV_VAR, saved.flag);
    restore(RESEARCH_PRICE_ENV_VAR, saved.price);
    restore('STRIPE_SECRET_KEY', saved.key);
    priceRetrieveMock.mockReset();
  });

  it('passes trivially while the tier is behind its flag — nothing is promised', async () => {
    delete process.env[RESEARCH_TIER_FLAG_ENV_VAR];
    expect(isResearchAdvertised()).toBe(false);
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(true);
    expect(r.detail).toContain('feature flag');
  });

  it('fails loudly when the tier is enabled but its price is not configured', async () => {
    process.env[RESEARCH_TIER_FLAG_ENV_VAR] = 'true';
    delete process.env[RESEARCH_PRICE_ENV_VAR];
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain(RESEARCH_PRICE_ENV_VAR);
  });

  it('fails when advertised but Stripe cannot be reached at all', async () => {
    process.env[RESEARCH_TIER_FLAG_ENV_VAR] = 'true';
    process.env[RESEARCH_PRICE_ENV_VAR] = 'price_research';
    delete process.env.STRIPE_SECRET_KEY;
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('cannot verify');
  });

  const enableAdvertised = () => {
    process.env[RESEARCH_TIER_FLAG_ENV_VAR] = 'true';
    process.env[RESEARCH_PRICE_ENV_VAR] = 'price_research';
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  };

  const stripePrice = (over: Record<string, unknown> = {}) => ({
    active: true,
    unit_amount: RESEARCH_PLAN.priceYearly * 100,
    currency: 'usd',
    type: 'recurring',
    recurring: { interval: 'year', interval_count: 1 },
    ...over,
  });

  it('passes when Stripe charges exactly what the site advertises', async () => {
    enableAdvertised();
    priceRetrieveMock.mockResolvedValue(stripePrice());
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(true);
    expect(r.detail).toContain(String(RESEARCH_PLAN.priceYearly));
  });

  /** The 2026-08-24 shape of failure, applied to a tier instead of a coupon. */
  it('catches a price that does not match the advertised amount', async () => {
    enableAdvertised();
    priceRetrieveMock.mockResolvedValue(stripePrice({ unit_amount: 4999 }));
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('mischarged');
  });

  it('catches a monthly price sold as an annual seat', async () => {
    enableAdvertised();
    priceRetrieveMock.mockResolvedValue(
      stripePrice({ recurring: { interval: 'month', interval_count: 1 } })
    );
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('annual billing');
  });

  it('catches a one-off price sold as a subscription', async () => {
    enableAdvertised();
    priceRetrieveMock.mockResolvedValue(stripePrice({ type: 'one_time', recurring: null }));
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('not recurring');
  });

  it('catches the wrong currency', async () => {
    enableAdvertised();
    priceRetrieveMock.mockResolvedValue(stripePrice({ currency: 'eur' }));
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('EUR');
  });

  it('catches an archived price still being advertised', async () => {
    enableAdvertised();
    priceRetrieveMock.mockResolvedValue(stripePrice({ active: false }));
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('INACTIVE');
  });

  it('fails loudly rather than silently when Stripe errors', async () => {
    enableAdvertised();
    priceRetrieveMock.mockRejectedValue(new Error('network down'));
    const r = await checkResearchTierMatchesStripe();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('network down');
  });
});

// ── The control has to actually RUN ─────────────────────────────────────────
//
// checkResearchTierMatchesStripe() existed, was unit-tested, and was called
// from nowhere in src/ for two days. A price check nothing invokes is a
// comment. These tests pin the wiring, not just the function.

describe('the Stripe price checks are wired into the daily sentinel', () => {
  const sentinel = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/content-accuracy.ts'),
    'utf-8'
  );

  it('content-accuracy imports both Research pricing checks', () => {
    expect(sentinel).toContain('checkResearchTierMatchesStripe');
    expect(sentinel).toContain('checkPromotionCodesCannotDiscountResearch');
  });

  it('registers them as checks the daily runner executes', () => {
    // CONTENT_ACCURACY_CHECKS is what /api/cron/content-accuracy iterates.
    const registry = sentinel.slice(
      sentinel.indexOf('export const CONTENT_ACCURACY_CHECKS')
    );
    expect(registry).toContain("id: 'research-price-matches-stripe'");
    expect(registry).toContain("id: 'research-not-discountable-by-promo'");
  });
});

describe('checkPromotionCodesCannotDiscountResearch', () => {
  const saved = {
    flag: process.env[RESEARCH_TIER_FLAG_ENV_VAR],
    price: process.env[RESEARCH_PRICE_ENV_VAR],
    key: process.env.STRIPE_SECRET_KEY,
  };

  const enableAdvertised = () => {
    process.env[RESEARCH_TIER_FLAG_ENV_VAR] = 'true';
    process.env[RESEARCH_PRICE_ENV_VAR] = 'price_research';
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  };

  beforeEach(() => {
    listMock.mockReset();
    priceRetrieveMock.mockReset();
    priceRetrieveMock.mockResolvedValue({
      active: true,
      unit_amount: RESEARCH_PLAN.priceYearly * 100,
      currency: 'usd',
      type: 'recurring',
      recurring: { interval: 'year', interval_count: 1 },
      product: 'prod_research',
    });
  });

  afterEach(() => {
    const restore = (k: string, v: string | undefined) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    };
    restore(RESEARCH_TIER_FLAG_ENV_VAR, saved.flag);
    restore(RESEARCH_PRICE_ENV_VAR, saved.price);
    restore('STRIPE_SECRET_KEY', saved.key);
  });

  it('passes when nothing is advertised', async () => {
    delete process.env[RESEARCH_TIER_FLAG_ENV_VAR];
    const r = await checkPromotionCodesCannotDiscountResearch();
    expect(r.ok).toBe(true);
  });

  it('passes when every active coupon is restricted to another product', async () => {
    enableAdvertised();
    listMock.mockResolvedValue({
      data: [
        {
          code: 'FOUNDER50',
          coupon: {
            percent_off: 50,
            duration: 'repeating',
            duration_in_months: 12,
            valid: true,
            applies_to: { products: ['prod_pro'] },
          },
        },
      ],
    });
    const r = await checkPromotionCodesCannotDiscountResearch();
    expect(r.ok).toBe(true);
  });

  /**
   * The live shape on 2026-09-16: FOUNDER50's coupon has applies_to = null,
   * so Stripe honours it against any price — including the annual firm seat.
   */
  // CHANGED. TWO independent mitigations exist and either closes the hole:
  // the coupon restricted to another product in Stripe, or our checkout
  // refusing promotion codes for the tier. The second is in force, so an
  // unrestricted coupon is residual risk, not a failure. A control that stays
  // red on a mitigated risk is one people stop reading. Remove 'research'
  // from PROMOTION_CODE_EXCLUDED_TIERS and these go red again.
  it('PASSES an unrestricted percentage coupon while checkout refuses codes, and still names it', async () => {
    enableAdvertised();
    listMock.mockResolvedValue({
      data: [
        {
          code: 'FOUNDER50',
          coupon: {
            percent_off: 50,
            duration: 'repeating',
            duration_in_months: 12,
            valid: true,
            applies_to: null,
          },
        },
      ],
    });
    const r = await checkPromotionCodesCannotDiscountResearch();
    expect(r.ok).toBe(true);
    expect(r.detail).toContain('FOUNDER50');
    expect(r.detail).toMatch(/refuses promotion codes/i);
    expect(r.detail).toContain((RESEARCH_PLAN.priceYearly / 2).toFixed(2));
  });

  it('PASSES an unrestricted fixed-amount coupon the same way, naming it', async () => {
    enableAdvertised();
    listMock.mockResolvedValue({
      data: [
        {
          code: 'FOUNDER499-CONNER',
          coupon: { amount_off: 1500, duration: 'forever', valid: true, applies_to: null },
        },
      ],
    });
    const r = await checkPromotionCodesCannotDiscountResearch();
    expect(r.ok).toBe(true);
    expect(r.detail).toContain('FOUNDER499-CONNER');
  });

  it('only considers ACTIVE promotion codes', async () => {
    enableAdvertised();
    listMock.mockResolvedValue({ data: [] });
    await checkPromotionCodesCannotDiscountResearch();
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
  });

  it('fails loudly rather than silently when Stripe errors', async () => {
    enableAdvertised();
    listMock.mockRejectedValue(new Error('network down'));
    const r = await checkPromotionCodesCannotDiscountResearch();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('network down');
  });
});

describe('promotion-code policy', () => {
  it('excludes Research and nothing else', () => {
    expect([...PROMOTION_CODE_EXCLUDED_TIERS]).toEqual(['research']);
    expect(allowPromotionCodesForTier('research')).toBe(false);
    expect(allowPromotionCodesForTier('pro')).toBe(true);
  });
});
