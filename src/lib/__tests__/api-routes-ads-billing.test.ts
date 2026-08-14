/**
 * @jest-environment node
 */

/**
 * API route tests for self-serve ad billing:
 *   - POST /api/ads/checkout             (Checkout session for campaign budget / sponsorship)
 *   - POST /api/stripe/webhooks          (ad payment -> campaign pending_review, idempotent)
 *   - PUT  /api/ads/campaigns/[id]       (admin decline -> automatic refund; payment-gated
 *                                         review submission)
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCheckoutSessionsCreate = jest.fn();
const mockPricesList = jest.fn();
const mockWebhooksConstructEvent = jest.fn();
const mockPaymentIntentsSearch = jest.fn();
const mockRefundsList = jest.fn();
const mockRefundsCreate = jest.fn();

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    prices: { list: mockPricesList },
    webhooks: { constructEvent: mockWebhooksConstructEvent },
    subscriptions: { retrieve: jest.fn() },
    paymentIntents: { search: mockPaymentIntentsSearch },
    refunds: { list: mockRefundsList, create: mockRefundsCreate },
  }),
  getPriceIds: () => ({}),
  priceIdToTier: () => null,
  priceIdToSponsorTier: () => null,
  mapSubscriptionStatus: () => 'active',
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    advertiser: { findUnique: jest.fn() },
    adCampaign: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    companyProfile: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/notifications/create', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })),
}));
jest.mock('@/lib/stripe-helpers', () => ({
  generateSubscriptionConfirmEmail: jest.fn().mockReturnValue({ subject: '', html: '', text: '' }),
  generatePaymentFailedEmail: jest.fn().mockReturnValue({ subject: '', html: '', text: '' }),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { POST as adsCheckoutPOST } from '@/app/api/ads/checkout/route';
import { POST as webhookPOST } from '@/app/api/stripe/webhooks/route';
import { PUT as campaignPUT } from '@/app/api/ads/campaigns/[id]/route';
import { createNotification } from '@/lib/notifications/create';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────────

function checkoutRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/ads/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function webhookRequest() {
  return new NextRequest('http://localhost/api/stripe/webhooks', {
    method: 'POST',
    body: '{}',
    headers: { 'stripe-signature': 'sig_test' },
  });
}

function putRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/ads/campaigns/camp-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const draftCampaign = {
  id: 'camp-1',
  name: 'Launch Push',
  status: 'draft',
  budget: 500,
  advertiserId: 'adv-1',
};

const approvedAdvertiser = { id: 'adv-1', userId: 'user-1', status: 'approved' };
const dbUser = { id: 'user-1', email: 'ads@example.com', stripeCustomerId: null };

const OLD_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...OLD_ENV,
    SELF_SERVE_ADS_ENABLED: 'true',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
  };
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1', email: 'ads@example.com' } });
  (mockPrisma.advertiser.findUnique as jest.Mock).mockResolvedValue(approvedAdvertiser);
  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);
  (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
  mockCheckoutSessionsCreate.mockResolvedValue({
    id: 'cs_test_1',
    url: 'https://checkout.stripe.com/cs_test_1',
  });
  mockPricesList.mockResolvedValue({ data: [] });
});

afterAll(() => {
  process.env = OLD_ENV;
});

// ── POST /api/ads/checkout ───────────────────────────────────────────────────

describe('POST /api/ads/checkout — campaign budget payment', () => {
  it('returns 503 when the self-serve gate is off', async () => {
    process.env.SELF_SERVE_ADS_ENABLED = 'false';
    const res = await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }));
    expect(res.status).toBe(503);
  });

  it('gate defaults ON when only STRIPE_SECRET_KEY is set', async () => {
    delete process.env.SELF_SERVE_ADS_ENABLED;
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(draftCampaign);
    const res = await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }));
    expect(res.status).toBe(200);
  });

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }));
    expect(res.status).toBe(401);
  });

  it('requires an approved advertiser profile', async () => {
    (mockPrisma.advertiser.findUnique as jest.Mock).mockResolvedValue(null);
    expect((await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }))).status).toBe(403);

    (mockPrisma.advertiser.findUnique as jest.Mock).mockResolvedValue({
      ...approvedAdvertiser,
      status: 'pending',
    });
    expect((await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }))).status).toBe(403);
  });

  it('rejects a body with both campaignId and sponsorship (or neither)', async () => {
    expect(
      (await adsCheckoutPOST(checkoutRequest({ campaignId: 'c', sponsorship: 'single' }))).status
    ).toBe(400);
    expect((await adsCheckoutPOST(checkoutRequest({}))).status).toBe(400);
  });

  it("404s when the campaign is missing or another advertiser's", async () => {
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(null);
    expect((await adsCheckoutPOST(checkoutRequest({ campaignId: 'nope' }))).status).toBe(404);

    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      ...draftCampaign,
      advertiserId: 'other-adv',
    });
    expect((await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }))).status).toBe(404);
  });

  it('only draft campaigns can be paid', async () => {
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      ...draftCampaign,
      status: 'pending_review',
    });
    const res = await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('already paid');
  });

  it('clamps budgets: below $100 and above $5,000 are rejected', async () => {
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      ...draftCampaign,
      budget: 99,
    });
    expect((await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }))).status).toBe(400);

    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      ...draftCampaign,
      budget: 5001,
    });
    const res = await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('contact');
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('creates a one-time Checkout session for the declared budget with metadata', async () => {
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(draftCampaign);
    const res = await adsCheckoutPOST(checkoutRequest({ campaignId: 'camp-1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.url).toBe('https://checkout.stripe.com/cs_test_1');

    const params = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(params.mode).toBe('payment');
    expect(params.line_items[0].price_data.unit_amount).toBe(50000);
    expect(params.metadata).toEqual({
      kind: 'ad_campaign_payment',
      campaignId: 'camp-1',
      userId: 'user-1',
    });
    expect(params.payment_intent_data.metadata.campaignId).toBe('camp-1');
  });
});

describe('POST /api/ads/checkout — sponsorship purchase', () => {
  beforeEach(() => {
    (mockPrisma.adCampaign.create as jest.Mock).mockResolvedValue({
      id: 'camp-sp-1',
      name: 'Weekly Brief Sponsorship — 1 issue',
    });
  });

  it('creates a draft sponsorship order (AdCampaign row, no placements) and a session', async () => {
    const res = await adsCheckoutPOST(checkoutRequest({ sponsorship: 'single' }));
    expect(res.status).toBe(200);

    const created = (mockPrisma.adCampaign.create as jest.Mock).mock.calls[0][0].data;
    expect(created.type).toBe('weekly_brief_sponsorship');
    expect(created.status).toBe('draft');
    expect(created.budget).toBe(150);

    const params = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(params.metadata.kind).toBe('ad_sponsorship_payment');
    expect(params.metadata.campaignId).toBe('camp-sp-1');
    // No pre-created price found -> inline fallback at the approved amount
    expect(params.line_items[0].price_data.unit_amount).toBe(15000);
  });

  it('uses the fixed Price resolved by lookup key when it exists', async () => {
    mockPricesList.mockResolvedValue({ data: [{ id: 'price_block4_live' }] });
    const res = await adsCheckoutPOST(checkoutRequest({ sponsorship: 'block4' }));
    expect(res.status).toBe(200);
    expect(mockPricesList).toHaveBeenCalledWith(
      expect.objectContaining({ lookup_keys: ['weekly_brief_sponsorship_block4'] })
    );
    const params = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(params.line_items[0]).toEqual({ price: 'price_block4_live', quantity: 1 });
  });
});

// ── Webhook: ad payment completion ───────────────────────────────────────────

describe('POST /api/stripe/webhooks — ad payment completed', () => {
  function adPaymentEvent(metadata: Record<string, string>) {
    return {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          metadata,
          amount_total: 50000,
          currency: 'usd',
          payment_intent: 'pi_1',
        },
      },
    };
  }

  it('moves a paid draft campaign to pending_review and notifies', async () => {
    mockWebhooksConstructEvent.mockReturnValue(
      adPaymentEvent({ kind: 'ad_campaign_payment', campaignId: 'camp-1', userId: 'user-1' })
    );
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      id: 'camp-1',
      name: 'Launch Push',
      status: 'draft',
      budget: 500,
      advertiser: { userId: 'user-1', companyName: 'Acme Aero' },
    });
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'admin-1' }]);

    const res = await webhookPOST(webhookRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.adCampaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-1' },
      data: { status: 'pending_review' },
    });
    // Owner + admin notifications
    expect(createNotification).toHaveBeenCalledTimes(2);
  });

  it('is idempotent: an already-processed campaign is not updated again', async () => {
    mockWebhooksConstructEvent.mockReturnValue(
      adPaymentEvent({ kind: 'ad_campaign_payment', campaignId: 'camp-1', userId: 'user-1' })
    );
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      id: 'camp-1',
      name: 'Launch Push',
      status: 'pending_review',
      budget: 500,
      advertiser: { userId: 'user-1', companyName: 'Acme Aero' },
    });

    const res = await webhookPOST(webhookRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.adCampaign.update).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('handles sponsorship payments through the same path', async () => {
    mockWebhooksConstructEvent.mockReturnValue(
      adPaymentEvent({
        kind: 'ad_sponsorship_payment',
        campaignId: 'camp-sp-1',
        userId: 'user-1',
        sponsorshipOption: 'single',
      })
    );
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      id: 'camp-sp-1',
      name: 'Weekly Brief Sponsorship — 1 issue',
      status: 'draft',
      budget: 150,
      advertiser: { userId: 'user-1', companyName: 'Acme Aero' },
    });

    const res = await webhookPOST(webhookRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.adCampaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-sp-1' },
      data: { status: 'pending_review' },
    });
  });

  it('tolerates a missing campaign without failing the webhook', async () => {
    mockWebhooksConstructEvent.mockReturnValue(
      adPaymentEvent({ kind: 'ad_campaign_payment', campaignId: 'ghost', userId: 'user-1' })
    );
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await webhookPOST(webhookRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.adCampaign.update).not.toHaveBeenCalled();
  });
});

// ── PUT /api/ads/campaigns/[id]: payment-gated review + decline refund ───────

describe('PUT /api/ads/campaigns/[id] — billing rules', () => {
  const pendingCampaign = {
    id: 'camp-1',
    name: 'Launch Push',
    status: 'pending_review',
    budget: 500,
    spent: 0,
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-09-01'),
    advertiser: { userId: 'owner-1' },
    placements: [],
    _count: { impressions: 0 },
  };

  function setupUsers({ isAdmin }: { isAdmin: boolean }) {
    mockGetServerSession.mockResolvedValue({ user: { id: isAdmin ? 'admin-1' : 'owner-1' } });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ isAdmin });
  }

  it('blocks owners from self-submitting draft -> pending_review (payment required)', async () => {
    setupUsers({ isAdmin: false });
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      ...pendingCampaign,
      status: 'draft',
    });

    const res = await campaignPUT(putRequest({ status: 'pending_review' }), {
      params: { id: 'camp-1' },
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('Pay & submit');
  });

  it('blocks owners from self-approving pending_review -> active', async () => {
    setupUsers({ isAdmin: false });
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(pendingCampaign);

    const res = await campaignPUT(putRequest({ status: 'active' }), { params: { id: 'camp-1' } });
    expect(res.status).toBe(403);
  });

  it('still allows owners to resume a paused campaign', async () => {
    setupUsers({ isAdmin: false });
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue({
      ...pendingCampaign,
      status: 'paused',
      advertiser: { userId: 'owner-1' },
    });
    (mockPrisma.adCampaign.update as jest.Mock).mockResolvedValue({ id: 'camp-1' });

    const res = await campaignPUT(putRequest({ status: 'active' }), { params: { id: 'camp-1' } });
    expect(res.status).toBe(200);
  });

  it('admin decline triggers an automatic full refund', async () => {
    setupUsers({ isAdmin: true });
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(pendingCampaign);
    (mockPrisma.adCampaign.update as jest.Mock).mockResolvedValue({
      id: 'camp-1',
      status: 'rejected',
    });
    mockPaymentIntentsSearch.mockResolvedValue({
      data: [{ id: 'pi_1', status: 'succeeded', amount: 50000 }],
    });
    mockRefundsList.mockResolvedValue({ data: [] });
    mockRefundsCreate.mockResolvedValue({ id: 're_1' });

    const res = await campaignPUT(putRequest({ status: 'rejected' }), {
      params: { id: 'camp-1' },
    });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(mockPaymentIntentsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: "metadata['campaignId']:'camp-1'" })
    );
    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_1' })
    );
    expect(json.refund).toEqual({ status: 'refunded', amountCents: 50000 });
  });

  it('decline still succeeds when the refund errors (flagged for manual follow-up)', async () => {
    setupUsers({ isAdmin: true });
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(pendingCampaign);
    (mockPrisma.adCampaign.update as jest.Mock).mockResolvedValue({
      id: 'camp-1',
      status: 'rejected',
    });
    mockPaymentIntentsSearch.mockRejectedValue(new Error('stripe down'));

    const res = await campaignPUT(putRequest({ status: 'rejected' }), {
      params: { id: 'camp-1' },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.refund).toEqual({ status: 'failed' });
  });

  it('non-admins cannot decline campaigns', async () => {
    setupUsers({ isAdmin: false });
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(pendingCampaign);

    const res = await campaignPUT(putRequest({ status: 'rejected' }), {
      params: { id: 'camp-1' },
    });
    expect(res.status).toBe(403);
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });
});
