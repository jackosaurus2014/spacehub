/**
 * @jest-environment node
 */

/**
 * Security regression tests for POST /api/events/rsvp.
 *
 * Background (SECURITY_AUDIT_2026-08 finding M2): the RSVP route used to accept
 * a `paidTier: { tier, amount, currency }` object straight off the request body
 * and pass `amount` to Stripe as `unit_amount` — the buyer named their own
 * price. `paidTier` also bypassed the zod schema entirely (it was pulled out of
 * the raw body with hand-rolled typeof checks), so `validateBody` never saw it.
 *
 * SpaceEvent has no ticket-pricing fields, so there is no server-side price to
 * validate against; the route now refuses any `paidTier` request outright.
 *
 * These tests fail if the refusal is removed.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCheckoutSessionsCreate = jest.fn();

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
  }),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    eventRSVP: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
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

import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { POST as rsvpPOST } from '@/app/api/events/rsvp/route';

const mockGetServerSession = getServerSession as jest.Mock;
const mockPrisma = prisma as unknown as {
  eventRSVP: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
};

function postRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/events/rsvp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/events/rsvp — client-priced ticket checkout is refused', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'buyer@example.com' },
    });
    mockPrisma.eventRSVP.findUnique.mockResolvedValue(null);
    mockPrisma.eventRSVP.upsert.mockResolvedValue({
      id: 'rsvp-1',
      eventId: 'evt-1',
      userId: 'user-1',
      status: 'going',
    });
  });

  it('SECURITY: rejects a body carrying a client-chosen ticket price', async () => {
    const res = await rsvpPOST(
      postRequest({
        eventId: 'evt-1',
        status: 'going',
        ticketTier: 'vip',
        // A $500 VIP ticket, self-priced at 50 cents.
        paidTier: { tier: 'vip', amount: 50, currency: 'USD' },
      })
    );

    expect(res.status).toBe(400);
    // The critical assertion: no Stripe session is ever minted from body input.
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('SECURITY: does not mint a Stripe session for a large self-chosen amount either', async () => {
    const res = await rsvpPOST(
      postRequest({
        eventId: 'evt-1',
        status: 'going',
        paidTier: { tier: 'vip', amount: 100000, currency: 'USD' },
      })
    );

    expect(res.status).toBe(400);
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('treats an explicitly null paidTier as "no paid tier" (free RSVP, no checkout)', async () => {
    const res = await rsvpPOST(
      postRequest({ eventId: 'evt-1', status: 'going', paidTier: null })
    );

    expect(res.status).toBe(200);
    // The security property that matters holds either way: a body can never
    // cause a Stripe session to be created at a price the client chose.
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('still records an ordinary free RSVP', async () => {
    const res = await rsvpPOST(postRequest({ eventId: 'evt-1', status: 'going' }));

    expect(res.status).toBe(200);
    expect(mockPrisma.eventRSVP.upsert).toHaveBeenCalled();
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await rsvpPOST(postRequest({ eventId: 'evt-1', status: 'going' }));

    expect(res.status).toBe(401);
    expect(mockPrisma.eventRSVP.upsert).not.toHaveBeenCalled();
  });
});
