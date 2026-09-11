import fs from 'fs';
import path from 'path';
/**
 * @jest-environment node
 */
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
jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({ promotionCodes: { list: listMock } }),
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
      expect(src).not.toMatch(/for life|locked forever|$4.99/i);
    }
    expect(fs.readFileSync(path.join(process.cwd(), 'src/app/api/stripe/checkout/route.ts'), 'utf-8')).toMatch(/allow_promotion_codes: true/);
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
