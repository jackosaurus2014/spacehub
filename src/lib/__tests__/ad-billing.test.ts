/**
 * Unit tests for src/lib/ads/ad-billing.ts:
 * feature gate semantics, self-serve budget clamps, checkout session
 * builders (dynamic campaign budgets + fixed sponsorships), and the
 * automatic refund helper for declined campaigns.
 */
import type Stripe from 'stripe';
import {
  isSelfServeAdsEnabled,
  checkSelfServeBudget,
  buildCampaignCheckoutParams,
  buildSponsorshipCheckoutParams,
  refundCampaignPayments,
  SELF_SERVE_MIN_BUDGET_USD,
  SELF_SERVE_MAX_BUDGET_USD,
  SPONSORSHIP_PRODUCTS,
  AD_CAMPAIGN_PAYMENT_KIND,
  AD_SPONSORSHIP_PAYMENT_KIND,
} from '../ads/ad-billing';

describe('isSelfServeAdsEnabled', () => {
  it('defaults ON when STRIPE_SECRET_KEY is present', () => {
    expect(isSelfServeAdsEnabled({ STRIPE_SECRET_KEY: 'sk_test_x' })).toBe(true);
  });

  it('defaults OFF when Stripe is not configured', () => {
    expect(isSelfServeAdsEnabled({})).toBe(false);
  });

  it('SELF_SERVE_ADS_ENABLED=false forces off even with Stripe configured', () => {
    expect(
      isSelfServeAdsEnabled({ STRIPE_SECRET_KEY: 'sk_test_x', SELF_SERVE_ADS_ENABLED: 'false' })
    ).toBe(false);
  });

  it('SELF_SERVE_ADS_ENABLED=true forces on without a Stripe key', () => {
    expect(isSelfServeAdsEnabled({ SELF_SERVE_ADS_ENABLED: 'true' })).toBe(true);
  });

  it('ignores unrecognized override values and falls back to key presence', () => {
    expect(
      isSelfServeAdsEnabled({ SELF_SERVE_ADS_ENABLED: 'banana', STRIPE_SECRET_KEY: 'sk_x' })
    ).toBe(true);
    expect(isSelfServeAdsEnabled({ SELF_SERVE_ADS_ENABLED: 'banana' })).toBe(false);
  });
});

describe('checkSelfServeBudget', () => {
  it('accepts budgets at the boundaries', () => {
    expect(checkSelfServeBudget(SELF_SERVE_MIN_BUDGET_USD)).toEqual({
      ok: true,
      amountCents: 10000,
    });
    expect(checkSelfServeBudget(SELF_SERVE_MAX_BUDGET_USD)).toEqual({
      ok: true,
      amountCents: 500000,
    });
  });

  it('converts dollars to integer cents (rounds)', () => {
    const result = checkSelfServeBudget(1234.567);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.amountCents).toBe(123457);
  });

  it('rejects budgets below the minimum', () => {
    const result = checkSelfServeBudget(SELF_SERVE_MIN_BUDGET_USD - 0.01);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('below_min');
  });

  it('rejects budgets above the self-serve cap with a contact-us message', () => {
    const result = checkSelfServeBudget(SELF_SERVE_MAX_BUDGET_USD + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('above_max');
      expect(result.message).toContain('contact');
    }
  });

  it('rejects zero, negative, NaN, and Infinity', () => {
    for (const bad of [0, -50, NaN, Infinity]) {
      const result = checkSelfServeBudget(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('invalid');
    }
  });
});

describe('buildCampaignCheckoutParams', () => {
  const base = {
    campaignId: 'camp-1',
    userId: 'user-1',
    campaignName: 'Launch Week Push',
    amountCents: 25000,
    appUrl: 'https://spacenexus.us',
  };

  it('builds a one-time payment with inline price_data for the declared budget', () => {
    const params = buildCampaignCheckoutParams(base);
    expect(params.mode).toBe('payment');
    const item = params.line_items![0];
    expect(item.price_data?.unit_amount).toBe(25000);
    expect(item.price_data?.currency).toBe('usd');
    expect(item.price_data?.product_data?.name).toContain('Launch Week Push');
  });

  it('stamps campaignId/userId metadata on both session and payment intent', () => {
    const params = buildCampaignCheckoutParams(base);
    const expected = {
      kind: AD_CAMPAIGN_PAYMENT_KIND,
      campaignId: 'camp-1',
      userId: 'user-1',
    };
    expect(params.metadata).toEqual(expected);
    expect(params.payment_intent_data?.metadata).toEqual(expected);
  });

  it('returns to the advertiser dashboard on success and cancel', () => {
    const params = buildCampaignCheckoutParams(base);
    expect(params.success_url).toBe('https://spacenexus.us/advertise/dashboard?checkout=success');
    expect(params.cancel_url).toBe('https://spacenexus.us/advertise/dashboard?checkout=cancelled');
  });

  it('prefers an existing Stripe customer, falls back to email', () => {
    expect(buildCampaignCheckoutParams({ ...base, customerId: 'cus_1' }).customer).toBe('cus_1');
    const withEmail = buildCampaignCheckoutParams({ ...base, customerEmail: 'a@b.com' });
    expect(withEmail.customer).toBeUndefined();
    expect(withEmail.customer_email).toBe('a@b.com');
    const both = buildCampaignCheckoutParams({
      ...base,
      customerId: 'cus_1',
      customerEmail: 'a@b.com',
    });
    expect(both.customer).toBe('cus_1');
    expect(both.customer_email).toBeUndefined();
  });
});

describe('buildSponsorshipCheckoutParams', () => {
  const base = {
    campaignId: 'camp-2',
    userId: 'user-1',
    appUrl: 'https://spacenexus.us',
  };

  it('uses the resolved fixed price when available', () => {
    const params = buildSponsorshipCheckoutParams({
      ...base,
      option: 'single',
      priceId: 'price_abc',
    });
    expect(params.mode).toBe('payment');
    expect(params.line_items![0]).toEqual({ price: 'price_abc', quantity: 1 });
  });

  it('falls back to inline price_data with the approved amounts', () => {
    const single = buildSponsorshipCheckoutParams({ ...base, option: 'single' });
    expect(single.line_items![0].price_data?.unit_amount).toBe(15000);
    const block = buildSponsorshipCheckoutParams({ ...base, option: 'block4' });
    expect(block.line_items![0].price_data?.unit_amount).toBe(50000);
  });

  it('stamps sponsorship metadata on session and payment intent', () => {
    const params = buildSponsorshipCheckoutParams({ ...base, option: 'block4' });
    expect(params.metadata).toEqual({
      kind: AD_SPONSORSHIP_PAYMENT_KIND,
      campaignId: 'camp-2',
      userId: 'user-1',
      sponsorshipOption: 'block4',
    });
    expect(params.payment_intent_data?.metadata).toEqual(params.metadata);
  });
});

describe('SPONSORSHIP_PRODUCTS', () => {
  it('matches the approved pricing ($150 single / $500 4-issue block)', () => {
    expect(SPONSORSHIP_PRODUCTS.single.amountCents).toBe(15000);
    expect(SPONSORSHIP_PRODUCTS.single.issues).toBe(1);
    expect(SPONSORSHIP_PRODUCTS.block4.amountCents).toBe(50000);
    expect(SPONSORSHIP_PRODUCTS.block4.issues).toBe(4);
  });

  it('has unique lookup keys', () => {
    expect(SPONSORSHIP_PRODUCTS.single.lookupKey).not.toBe(SPONSORSHIP_PRODUCTS.block4.lookupKey);
  });
});

describe('refundCampaignPayments', () => {
  function makeStripe(overrides: {
    searchData?: unknown[];
    refundsListData?: unknown[];
  }) {
    const refundsCreate = jest.fn().mockResolvedValue({ id: 're_1' });
    const stripe = {
      paymentIntents: {
        search: jest.fn().mockResolvedValue({ data: overrides.searchData ?? [] }),
      },
      refunds: {
        list: jest.fn().mockResolvedValue({ data: overrides.refundsListData ?? [] }),
        create: refundsCreate,
      },
    } as unknown as Stripe;
    return { stripe, refundsCreate };
  }

  it('refunds succeeded payments found by campaign metadata', async () => {
    const { stripe, refundsCreate } = makeStripe({
      searchData: [{ id: 'pi_1', status: 'succeeded', amount: 25000 }],
    });

    const result = await refundCampaignPayments(stripe, 'camp-1');

    expect((stripe.paymentIntents.search as jest.Mock).mock.calls[0][0].query).toContain(
      "metadata['campaignId']:'camp-1'"
    );
    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_1' })
    );
    expect(result).toEqual({
      refundedCount: 1,
      refundedAmountCents: 25000,
      paymentIntentIds: ['pi_1'],
    });
  });

  it('skips non-succeeded and already-refunded payments (idempotent re-run)', async () => {
    const { stripe, refundsCreate } = makeStripe({
      searchData: [
        { id: 'pi_pending', status: 'requires_payment_method', amount: 25000 },
        { id: 'pi_done', status: 'succeeded', amount: 25000 },
      ],
      refundsListData: [{ amount: 25000 }],
    });

    const result = await refundCampaignPayments(stripe, 'camp-1');

    expect(refundsCreate).not.toHaveBeenCalled();
    expect(result.refundedCount).toBe(0);
    expect(result.refundedAmountCents).toBe(0);
  });

  it('returns zeros when no payments exist for the campaign', async () => {
    const { stripe, refundsCreate } = makeStripe({});
    const result = await refundCampaignPayments(stripe, 'camp-none');
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(result.refundedCount).toBe(0);
  });
});
