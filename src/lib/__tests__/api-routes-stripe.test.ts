/**
 * @jest-environment node
 */

/**
 * API route handler tests for Stripe payment endpoints:
 *   - POST /api/stripe/checkout    (create Stripe Checkout session)
 *   - POST /api/stripe/portal      (create Stripe billing portal session)
 *   - POST /api/stripe/webhooks    (handle Stripe webhook events)
 *
 * Validates authentication, input validation, Stripe API interactions,
 * webhook signature verification, and event handling for each endpoint.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock Stripe SDK methods
const mockCustomersCreate = jest.fn();
const mockCheckoutSessionsCreate = jest.fn();
const mockBillingPortalSessionsCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    customers: { create: mockCustomersCreate },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    billingPortal: { sessions: { create: mockBillingPortalSessionsCreate } },
    webhooks: { constructEvent: mockWebhooksConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }),
  getPriceIds: () => ({
    pro_monthly: 'price_pro_monthly_test',
    pro_yearly: 'price_pro_yearly_test',
    enterprise_monthly: 'price_enterprise_monthly_test',
    enterprise_yearly: 'price_enterprise_yearly_test',
    sponsor_verified_monthly: 'price_sponsor_verified_monthly_test',
    sponsor_verified_yearly: 'price_sponsor_verified_yearly_test',
    sponsor_premium_monthly: 'price_sponsor_premium_monthly_test',
    sponsor_premium_yearly: 'price_sponsor_premium_yearly_test',
  }),
  priceIdToTier: (priceId: string) => {
    if (priceId === 'price_pro_monthly_test' || priceId === 'price_pro_yearly_test') return 'pro';
    if (priceId === 'price_enterprise_monthly_test' || priceId === 'price_enterprise_yearly_test') return 'enterprise';
    return null;
  },
  priceIdToSponsorTier: (priceId: string) => {
    if (priceId === 'price_sponsor_verified_monthly_test' || priceId === 'price_sponsor_verified_yearly_test') return 'verified';
    if (priceId === 'price_sponsor_premium_monthly_test' || priceId === 'price_sponsor_premium_yearly_test') return 'premium';
    return null;
  },
  mapSubscriptionStatus: (status: string) => {
    if (status === 'active' || status === 'trialing') return 'active';
    if (status === 'past_due' || status === 'unpaid') return 'past_due';
    return 'canceled';
  },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    companyProfile: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock Resend (used by webhook handler for confirmation/payment-failed emails)
const mockResendSend = jest.fn().mockResolvedValue({ id: 'email-1' });
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

// Mock stripe-helpers for email templates used in webhooks
jest.mock('@/lib/stripe-helpers', () => ({
  generateSubscriptionConfirmEmail: jest.fn().mockReturnValue({
    subject: 'Welcome to SpaceNexus Pro!',
    html: '<p>Subscription confirmed</p>',
    text: 'Subscription confirmed',
  }),
  generatePaymentFailedEmail: jest.fn().mockReturnValue({
    subject: 'Payment Failed',
    html: '<p>Your payment failed</p>',
    text: 'Your payment failed',
  }),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { POST as checkoutPOST } from '@/app/api/stripe/checkout/route';
import { POST as portalPOST } from '@/app/api/stripe/portal/route';
import { POST as webhookPOST } from '@/app/api/stripe/webhooks/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.Mock;

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@spacenexus.us',
    name: 'Test User',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionTier: 'free',
    subscriptionStatus: null,
    trialTier: null,
    trialStartDate: null,
    trialEndDate: null,
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      email: 'test@spacenexus.us',
      name: 'Test User',
      ...overrides,
    },
  };
}

function makePostRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeWebhookRequest(rawBody: string, signature: string | null = 'whsec_test_sig') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (signature) {
    headers['stripe-signature'] = signature;
  }
  return new Request('http://localhost/api/stripe/webhooks', {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

function makeStripeEvent(type: string, data: Record<string, unknown>) {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: {
      object: data,
    },
  };
}

function makeStripeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test123',
    status: 'active',
    customer: 'cus_test123',
    start_date: Math.floor(Date.now() / 1000),
    cancel_at: null,
    items: {
      data: [
        {
          price: {
            id: 'price_pro_monthly_test',
          },
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          current_period_start: Math.floor(Date.now() / 1000),
        },
      ],
    },
    metadata: {
      userId: 'user-1',
    },
    ...overrides,
  };
}

// ── Setup ────────────────────────────────────────────────────────────────────

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  // Set required env vars for webhook handler
  process.env = {
    ...originalEnv,
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    NEXT_PUBLIC_APP_URL: 'https://spacenexus.us',
    RESEND_API_KEY: 'test_resend_key',
    STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly_test',
    STRIPE_PRICE_PRO_YEARLY: 'price_pro_yearly_test',
    STRIPE_PRICE_ENTERPRISE_MONTHLY: 'price_enterprise_monthly_test',
    STRIPE_PRICE_ENTERPRISE_YEARLY: 'price_enterprise_yearly_test',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// =============================================================================
// POST /api/stripe/checkout
// =============================================================================

describe('POST /api/stripe/checkout', () => {
  const validBody = { tier: 'pro', interval: 'month' };

  it('requires authentication — returns 401 when not logged in', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    const res = await checkoutPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('logged in');
  });

  it('requires authentication — returns 401 when session has no email', async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: 'Test' } });

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    const res = await checkoutPOST(req);

    expect(res.status).toBe(401);
  });

  it('validates tier parameter — rejects invalid tier', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());

    const req = makePostRequest('http://localhost/api/stripe/checkout', {
      tier: 'platinum',
      interval: 'month',
    });
    const res = await checkoutPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('validates interval parameter — rejects invalid interval', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());

    const req = makePostRequest('http://localhost/api/stripe/checkout', {
      tier: 'pro',
      interval: 'weekly',
    });
    const res = await checkoutPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('validates both tier and interval — rejects missing fields', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());

    const req = makePostRequest('http://localhost/api/stripe/checkout', {});
    const res = await checkoutPOST(req);

    expect(res.status).toBe(400);
  });

  it('returns 401 when the user is not found in database', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    const res = await checkoutPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.message).toContain('not found');
  });

  it('creates a new Stripe customer when user has no stripeCustomerId', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser({ stripeCustomerId: 'cus_new123' }));

    mockCustomersCreate.mockResolvedValue({ id: 'cus_new123' });
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_test123',
      url: 'https://checkout.stripe.com/session/cs_test123',
    });

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    const res = await checkoutPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: 'test@spacenexus.us',
      name: 'Test User',
      metadata: { userId: 'user-1' },
    });
    // Saves the new stripe customer ID to the database
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { stripeCustomerId: 'cus_new123' },
      })
    );
  });

  it('reuses existing stripeCustomerId without creating a new customer', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ stripeCustomerId: 'cus_existing456' })
    );

    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_test456',
      url: 'https://checkout.stripe.com/session/cs_test456',
    });

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    const res = await checkoutPOST(req);

    expect(res.status).toBe(200);
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it('creates checkout session with correct parameters for pro/monthly', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ stripeCustomerId: 'cus_existing789' })
    );

    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_test789',
      url: 'https://checkout.stripe.com/session/cs_test789',
    });

    const req = makePostRequest('http://localhost/api/stripe/checkout', {
      tier: 'pro',
      interval: 'month',
    });
    const res = await checkoutPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.url).toBe('https://checkout.stripe.com/session/cs_test789');

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_existing789',
        line_items: [{ price: 'price_pro_monthly_test', quantity: 1 }],
        success_url: 'https://spacenexus.us/pricing?success=true',
        cancel_url: 'https://spacenexus.us/pricing?canceled=true',
        allow_promotion_codes: true,
        metadata: expect.objectContaining({
          userId: 'user-1',
          tier: 'pro',
        }),
      })
    );
  });

  it('creates checkout session with correct price ID for enterprise/yearly', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ stripeCustomerId: 'cus_ent' })
    );

    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_ent',
      url: 'https://checkout.stripe.com/session/cs_ent',
    });

    const req = makePostRequest('http://localhost/api/stripe/checkout', {
      tier: 'enterprise',
      interval: 'year',
    });
    await checkoutPOST(req);

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_enterprise_yearly_test', quantity: 1 }],
      })
    );
  });

  it('grants 14-day trial for users who have not had a trial before', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ trialTier: null, trialEndDate: null, stripeCustomerId: 'cus_trial' })
    );

    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_trial',
      url: 'https://checkout.stripe.com/session/cs_trial',
    });

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    await checkoutPOST(req);

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({
          trial_period_days: 14,
        }),
      })
    );
  });

  it('does not grant trial for users who have had a trial before', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({
        trialTier: 'pro',
        trialEndDate: new Date('2026-01-15'),
        stripeCustomerId: 'cus_notrial',
      })
    );

    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_notrial',
      url: 'https://checkout.stripe.com/session/cs_notrial',
    });

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    await checkoutPOST(req);

    // subscription_data should NOT contain trial_period_days
    const callArgs = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(callArgs.subscription_data.trial_period_days).toBeUndefined();
  });

  it('handles Stripe API error gracefully', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ stripeCustomerId: 'cus_err' })
    );

    mockCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe API is down'));

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    const res = await checkoutPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('checkout session');
  });

  it('handles Stripe customer creation failure gracefully', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    mockCustomersCreate.mockRejectedValue(new Error('Customer creation failed'));

    const req = makePostRequest('http://localhost/api/stripe/checkout', validBody);
    const res = await checkoutPOST(req);

    expect(res.status).toBe(500);
  });
});

// =============================================================================
// POST /api/stripe/portal
// =============================================================================

describe('POST /api/stripe/portal', () => {
  it('requires authentication — returns 401 when not logged in', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/stripe/portal', {});
    const res = await portalPOST();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('logged in');
  });

  it('requires authentication — returns 401 when session has no email', async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: 'Test' } });

    const res = await portalPOST();

    expect(res.status).toBe(401);
  });

  it('returns 401 when user has no stripeCustomerId', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ stripeCustomerId: null })
    );

    const res = await portalPOST();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.message).toContain('subscription');
  });

  it('returns 401 when user not found in database', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await portalPOST();

    expect(res.status).toBe(401);
  });

  it('creates a billing portal session and returns the URL', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ stripeCustomerId: 'cus_portal123' })
    );

    mockBillingPortalSessionsCreate.mockResolvedValue({
      id: 'bps_test123',
      url: 'https://billing.stripe.com/session/bps_test123',
    });

    const res = await portalPOST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.url).toBe('https://billing.stripe.com/session/bps_test123');
  });

  it('creates portal session with correct customer and return_url', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ stripeCustomerId: 'cus_portal456' })
    );

    mockBillingPortalSessionsCreate.mockResolvedValue({
      id: 'bps_test456',
      url: 'https://billing.stripe.com/session/bps_test456',
    });

    await portalPOST();

    expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: 'cus_portal456',
      return_url: 'https://spacenexus.us/pricing',
    });
  });

  it('handles Stripe portal creation failure gracefully', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ stripeCustomerId: 'cus_portal_err' })
    );

    mockBillingPortalSessionsCreate.mockRejectedValue(new Error('Stripe portal API error'));

    const res = await portalPOST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('billing portal');
  });
});

// =============================================================================
// POST /api/stripe/webhooks
// =============================================================================

describe('POST /api/stripe/webhooks', () => {
  // ── Signature Verification ───────────────────────────────────────────────

  describe('signature verification', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      const req = makeWebhookRequest('{}', null);
      const res = await webhookPOST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('Missing signature');
    });

    it('returns 400 when signature verification fails', async () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Webhook signature verification failed');
      });

      const req = makeWebhookRequest('{}', 'invalid_sig');
      const res = await webhookPOST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('Invalid signature');
    });

    it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const req = makeWebhookRequest('{}', 'whsec_test_sig');
      const res = await webhookPOST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toContain('not configured');
    });
  });

  // ── checkout.session.completed ───────────────────────────────────────────

  describe('checkout.session.completed', () => {
    it('activates user subscription on successful checkout', async () => {
      const checkoutSession = {
        id: 'cs_test_completed',
        customer: 'cus_test123',
        subscription: 'sub_test123',
        amount_total: 1999,
        metadata: {
          userId: 'user-1',
          tier: 'pro',
        },
      };

      const event = makeStripeEvent('checkout.session.completed', checkoutSession);
      mockWebhooksConstructEvent.mockReturnValue(event);

      const subscription = makeStripeSubscription();
      mockSubscriptionsRetrieve.mockResolvedValue(subscription);

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(
        makeUser({ subscriptionTier: 'pro', subscriptionStatus: 'active' })
      );
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ email: 'test@spacenexus.us', name: 'Test User' })
      );

      const req = makeWebhookRequest(JSON.stringify(checkoutSession), 'valid_sig');
      const res = await webhookPOST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.received).toBe(true);

      // Verify subscription was retrieved
      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_test123');

      // Verify user was updated with subscription data
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            stripeCustomerId: 'cus_test123',
            stripeSubscriptionId: 'sub_test123',
            subscriptionTier: 'pro',
            subscriptionStatus: 'active',
            trialTier: null,
            trialStartDate: null,
            trialEndDate: null,
          }),
        })
      );
    });

    it('skips processing when userId is missing from metadata', async () => {
      const checkoutSession = {
        id: 'cs_no_user',
        customer: 'cus_unknown',
        subscription: 'sub_unknown',
        metadata: {},
      };

      const event = makeStripeEvent('checkout.session.completed', checkoutSession);
      mockWebhooksConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(checkoutSession), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      // User update should not have been called
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('skips processing when subscription ID is missing', async () => {
      const checkoutSession = {
        id: 'cs_no_sub',
        customer: 'cus_test123',
        subscription: null,
        metadata: { userId: 'user-1', tier: 'pro' },
      };

      const event = makeStripeEvent('checkout.session.completed', checkoutSession);
      mockWebhooksConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(checkoutSession), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    });

    it('handles company sponsorship checkout (companySlug in metadata)', async () => {
      const checkoutSession = {
        id: 'cs_sponsor',
        customer: 'cus_company',
        subscription: 'sub_sponsor123',
        metadata: { companySlug: 'spacex' },
      };

      const event = makeStripeEvent('checkout.session.completed', checkoutSession);
      mockWebhooksConstructEvent.mockReturnValue(event);

      const sponsorSub = makeStripeSubscription({
        id: 'sub_sponsor123',
        items: {
          data: [{ price: { id: 'price_sponsor_verified_monthly_test' } }],
        },
      });
      mockSubscriptionsRetrieve.mockResolvedValue(sponsorSub);
      (mockPrisma.companyProfile as any).update = jest.fn().mockResolvedValue({});

      const req = makeWebhookRequest(JSON.stringify(checkoutSession), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect((prisma.companyProfile as any).update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'spacex' },
          data: expect.objectContaining({
            sponsorTier: 'verified',
            sponsorStatus: 'active',
            sponsorStripeSubId: 'sub_sponsor123',
          }),
        })
      );
    });

    it('sends confirmation email after successful checkout', async () => {
      const checkoutSession = {
        id: 'cs_email_confirm',
        customer: 'cus_email',
        subscription: 'sub_email123',
        amount_total: 2999,
        metadata: { userId: 'user-1', tier: 'pro' },
      };

      const event = makeStripeEvent('checkout.session.completed', checkoutSession);
      mockWebhooksConstructEvent.mockReturnValue(event);

      const subscription = makeStripeSubscription();
      mockSubscriptionsRetrieve.mockResolvedValue(subscription);

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(
        makeUser({ subscriptionTier: 'pro' })
      );
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ email: 'test@spacenexus.us', name: 'Test User' })
      );

      const req = makeWebhookRequest(JSON.stringify(checkoutSession), 'valid_sig');
      await webhookPOST(req);

      // Verify confirmation email was sent
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@spacenexus.us',
          subject: 'Welcome to SpaceNexus Pro!',
        })
      );
    });
  });

  // ── customer.subscription.updated ────────────────────────────────────────

  describe('customer.subscription.updated', () => {
    it('updates user subscription tier and status when subscription changes', async () => {
      const subscription = makeStripeSubscription({
        items: {
          data: [{ price: { id: 'price_enterprise_monthly_test' } }],
        },
        metadata: { userId: 'user-1' },
      });

      const event = makeStripeEvent('customer.subscription.updated', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ subscriptionTier: 'pro' })
      );
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(
        makeUser({ subscriptionTier: 'enterprise', subscriptionStatus: 'active' })
      );

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            subscriptionTier: 'enterprise',
            subscriptionStatus: 'active',
            stripeSubscriptionId: 'sub_test123',
          }),
        })
      );
    });

    it('falls back to stripeCustomerId lookup when metadata.userId is missing', async () => {
      const subscription = makeStripeSubscription({
        customer: 'cus_fallback',
        metadata: {},
      });

      const event = makeStripeEvent('customer.subscription.updated', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      // First findUnique with userId returns null (no userId in metadata)
      // Second findUnique with stripeCustomerId returns the user
      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // by userId (undefined)
        .mockResolvedValueOnce(makeUser({ id: 'user-2', subscriptionTier: 'pro' })); // by customerId

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser());

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: 'cus_fallback' },
        })
      );
    });

    it('sets subscriptionEndDate when cancel_at is present', async () => {
      const cancelAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days from now
      const subscription = makeStripeSubscription({
        cancel_at: cancelAt,
        metadata: { userId: 'user-1' },
      });

      const event = makeStripeEvent('customer.subscription.updated', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ subscriptionTier: 'pro' })
      );
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser());

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      await webhookPOST(req);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionEndDate: new Date(cancelAt * 1000),
          }),
        })
      );
    });

    it('logs warning when user is not found by userId or customerId', async () => {
      const subscription = makeStripeSubscription({
        customer: 'cus_unknown',
        metadata: { userId: 'user-nonexistent' },
      });

      const event = makeStripeEvent('customer.subscription.updated', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      // Also mock companyProfile.findFirst for the sponsorship fallback
      (mockPrisma.companyProfile as any).findFirst = jest.fn().mockResolvedValue(null);

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('handles company sponsorship subscription updates', async () => {
      const subscription = makeStripeSubscription({
        customer: 'cus_company',
        metadata: {},
        items: {
          data: [{ price: { id: 'price_sponsor_premium_monthly_test' } }],
        },
      });

      const event = makeStripeEvent('customer.subscription.updated', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      // User lookups both return null
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      // Company sponsorship found
      (mockPrisma.companyProfile as any).findFirst = jest.fn().mockResolvedValue({
        id: 'company-1',
        slug: 'spacex',
        sponsorTier: 'verified',
      });
      (mockPrisma.companyProfile as any).update = jest.fn().mockResolvedValue({});

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect((prisma.companyProfile as any).update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'company-1' },
          data: expect.objectContaining({
            sponsorTier: 'premium',
            sponsorStatus: 'active',
          }),
        })
      );
    });
  });

  // ── customer.subscription.deleted ────────────────────────────────────────

  describe('customer.subscription.deleted', () => {
    it('downgrades user to free tier when subscription is deleted', async () => {
      const subscription = makeStripeSubscription({
        status: 'canceled',
        metadata: { userId: 'user-1' },
      });

      const event = makeStripeEvent('customer.subscription.deleted', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ id: 'user-1', email: 'test@spacenexus.us', subscriptionTier: 'pro' })
      );
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(
        makeUser({ subscriptionTier: 'free', subscriptionStatus: 'canceled' })
      );

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
          }),
        })
      );
    });

    it('falls back to stripeCustomerId lookup when metadata userId is missing', async () => {
      const subscription = makeStripeSubscription({
        customer: 'cus_fallback_del',
        status: 'canceled',
        metadata: {},
      });

      const event = makeStripeEvent('customer.subscription.deleted', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      // When metadata has no userId, handleSubscriptionDeleted skips the first
      // findUnique(by id) and goes straight to findUnique(by stripeCustomerId).
      // So only ONE findUnique call happens.
      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(makeUser({ id: 'user-fb', email: 'fallback@spacenexus.us' }));

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser());

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      // Should have looked up by stripeCustomerId
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: 'cus_fallback_del' },
        })
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-fb' },
          data: expect.objectContaining({
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
          }),
        })
      );
    });

    it('logs warning and returns 200 when user not found', async () => {
      const subscription = makeStripeSubscription({
        customer: 'cus_ghost',
        metadata: { userId: 'user-ghost' },
      });

      const event = makeStripeEvent('customer.subscription.deleted', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.companyProfile as any).findFirst = jest.fn().mockResolvedValue(null);

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('expires company sponsorship when sponsorship subscription is deleted', async () => {
      const subscription = makeStripeSubscription({
        customer: 'cus_company_del',
        status: 'canceled',
        metadata: {},
      });

      const event = makeStripeEvent('customer.subscription.deleted', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.companyProfile as any).findFirst = jest.fn().mockResolvedValue({
        id: 'company-2',
        slug: 'blue-origin',
      });
      (mockPrisma.companyProfile as any).update = jest.fn().mockResolvedValue({});

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect((prisma.companyProfile as any).update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'company-2' },
          data: expect.objectContaining({
            sponsorTier: null,
            sponsorStatus: 'expired',
            sponsorStripeSubId: null,
          }),
        })
      );
    });
  });

  // ── invoice.payment_failed ───────────────────────────────────────────────

  describe('invoice.payment_failed', () => {
    it('sets user status to past_due and sends recovery email', async () => {
      const invoice = {
        id: 'in_failed123',
        customer: 'cus_pastdue',
        amount_due: 1999,
        amount_paid: 0,
        currency: 'usd',
        attempt_count: 1,
        subscription: 'sub_pastdue',
      };

      const event = makeStripeEvent('invoice.payment_failed', invoice);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ id: 'user-pastdue', email: 'pastdue@spacenexus.us', name: 'Past Due User' })
      );
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(
        makeUser({ subscriptionStatus: 'past_due' })
      );

      const req = makeWebhookRequest(JSON.stringify(invoice), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-pastdue' },
          data: { subscriptionStatus: 'past_due' },
        })
      );

      // Recovery email should be sent
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'pastdue@spacenexus.us',
          subject: 'Payment Failed',
        })
      );
    });

    it('skips email and update when user not found for failed invoice', async () => {
      const invoice = {
        id: 'in_orphan',
        customer: 'cus_orphan',
        amount_due: 999,
        amount_paid: 0,
        currency: 'usd',
        attempt_count: 2,
        subscription: 'sub_orphan',
      };

      const event = makeStripeEvent('invoice.payment_failed', invoice);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req = makeWebhookRequest(JSON.stringify(invoice), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockResendSend).not.toHaveBeenCalled();
    });
  });

  // ── invoice.payment_succeeded ────────────────────────────────────────────

  describe('invoice.payment_succeeded', () => {
    it('returns 200 and logs successful payment (monitoring only)', async () => {
      const invoice = {
        id: 'in_success123',
        customer: 'cus_happy',
        amount_paid: 2999,
        currency: 'usd',
        subscription: 'sub_happy',
      };

      const event = makeStripeEvent('invoice.payment_succeeded', invoice);
      mockWebhooksConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(invoice), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
      // This event is logged for monitoring but makes no DB changes
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ── Unknown event types ──────────────────────────────────────────────────

  describe('unknown event types', () => {
    it('returns 200 for unhandled event types (logs and ignores)', async () => {
      const event = makeStripeEvent('payment_intent.created', {
        id: 'pi_test123',
        amount: 1999,
      });

      mockWebhooksConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify({}), 'valid_sig');
      const res = await webhookPOST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.received).toBe(true);
    });

    it('returns 200 for charge.succeeded (not explicitly handled)', async () => {
      const event = makeStripeEvent('charge.succeeded', {
        id: 'ch_test123',
        amount: 2999,
      });

      mockWebhooksConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify({}), 'valid_sig');
      const res = await webhookPOST(req);

      expect(res.status).toBe(200);
    });
  });

  // ── Error handling ───────────────────────────────────────────────────────

  describe('error handling during event processing', () => {
    it('returns 500 when a database error occurs during event processing', async () => {
      const subscription = makeStripeSubscription({
        metadata: { userId: 'user-1' },
      });

      const event = makeStripeEvent('customer.subscription.deleted', subscription);
      mockWebhooksConstructEvent.mockReturnValue(event);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ id: 'user-1', email: 'test@spacenexus.us' })
      );
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

      const req = makeWebhookRequest(JSON.stringify(subscription), 'valid_sig');
      const res = await webhookPOST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toContain('Webhook processing failed');
      expect(body.eventId).toBeDefined();
    });

    it('returns 500 with event ID when checkout completion fails', async () => {
      const checkoutSession = {
        id: 'cs_fail',
        customer: 'cus_fail',
        subscription: 'sub_fail',
        metadata: { userId: 'user-1', tier: 'pro' },
      };

      const event = makeStripeEvent('checkout.session.completed', checkoutSession);
      mockWebhooksConstructEvent.mockReturnValue(event);

      mockSubscriptionsRetrieve.mockRejectedValue(new Error('Stripe subscription retrieval failed'));

      const req = makeWebhookRequest(JSON.stringify(checkoutSession), 'valid_sig');
      const res = await webhookPOST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.eventId).toBe(event.id);
    });
  });
});
