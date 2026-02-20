/**
 * @jest-environment node
 */

/**
 * API route handler tests for webhook endpoints and the webhook dispatcher:
 *   - POST   /api/webhooks/subscribe  (create subscription, admin-only)
 *   - GET    /api/webhooks/subscribe  (list active subscriptions, admin-only)
 *   - DELETE /api/webhooks/subscribe  (soft-delete subscription, admin-only)
 *   - dispatchWebhook()              (deliver events to subscribers)
 *
 * Validates authentication, input validation, CRUD behaviour, delivery
 * logic, failure counting, and auto-deactivation.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    webhookSubscription: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';

import { POST, GET, DELETE } from '@/app/api/webhooks/subscribe/route';
import { dispatchWebhook } from '@/lib/webhook-dispatcher';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function adminSession() {
  return { user: { email: 'admin@spacenexus.com', isAdmin: true } } as any;
}

function nonAdminSession() {
  return { user: { email: 'user@example.com', isAdmin: false } } as any;
}

function makeWebhookSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'clsubscription123456789012',
    url: 'https://example.com/webhook',
    events: ['launch.upcoming', 'news.published'],
    secret: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    isActive: true,
    failureCount: 0,
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date('2026-02-01T00:00:00Z'),
    lastDeliveryAt: null,
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/webhooks/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function deleteRequest(body: unknown) {
  return new NextRequest('http://localhost/api/webhooks/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// POST /api/webhooks/subscribe
// =============================================================================

describe('POST /api/webhooks/subscribe', () => {
  it('creates a subscription with valid URL and events', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const sub = makeWebhookSubscription();
    (mockPrisma.webhookSubscription.create as jest.Mock).mockResolvedValue(sub);

    const req = postRequest({
      url: 'https://example.com/webhook',
      events: ['launch.upcoming', 'news.published'],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(sub.id);
    expect(body.data.url).toBe('https://example.com/webhook');
    expect(body.data.events).toEqual(['launch.upcoming', 'news.published']);
    expect(body.data.secret).toBeDefined();
    expect(body.data.isActive).toBe(true);
    expect(body.data.message).toContain('Save the secret');
  });

  it('passes correct data to prisma create', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.webhookSubscription.create as jest.Mock).mockResolvedValue(makeWebhookSubscription());

    const req = postRequest({
      url: 'https://hooks.example.com/spacenexus',
      events: ['alert.solar_flare'],
    });
    await POST(req);

    expect(mockPrisma.webhookSubscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        url: 'https://hooks.example.com/spacenexus',
        events: ['alert.solar_flare'],
        isActive: true,
        failureCount: 0,
        secret: expect.any(String),
      }),
    });
  });

  it('rejects unauthenticated request', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = postRequest({
      url: 'https://example.com/webhook',
      events: ['launch.upcoming'],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects non-admin user', async () => {
    mockGetServerSession.mockResolvedValue(nonAdminSession());

    const req = postRequest({
      url: 'https://example.com/webhook',
      events: ['launch.upcoming'],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('rejects missing URL', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = postRequest({ events: ['launch.upcoming'] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid URL format', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = postRequest({
      url: 'not-a-valid-url',
      events: ['launch.upcoming'],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing event types', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = postRequest({ url: 'https://example.com/webhook' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects empty events array', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = postRequest({
      url: 'https://example.com/webhook',
      events: [],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid event types', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = postRequest({
      url: 'https://example.com/webhook',
      events: ['invalid.event.type'],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 when prisma throws', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.webhookSubscription.create as jest.Mock).mockRejectedValue(
      new Error('Unique constraint violation')
    );

    const req = postRequest({
      url: 'https://example.com/webhook',
      events: ['launch.upcoming'],
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Failed to create webhook subscription');
  });
});

// =============================================================================
// GET /api/webhooks/subscribe (List)
// =============================================================================

describe('GET /api/webhooks/subscribe', () => {
  it('returns active subscriptions for admin', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const subs = [
      makeWebhookSubscription(),
      makeWebhookSubscription({
        id: 'clsubscription987654321098',
        url: 'https://other.example.com/hook',
        events: ['company.updated'],
      }),
    ];
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue(subs);

    const req = new NextRequest('http://localhost/api/webhooks/subscribe');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.subscriptions).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });

  it('queries only active subscriptions, excluding secret', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([]);

    await GET();

    expect(mockPrisma.webhookSubscription.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastDeliveryAt: true,
        failureCount: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns empty results gracefully', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.subscriptions).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it('rejects unauthenticated request', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects non-admin user', async () => {
    mockGetServerSession.mockResolvedValue(nonAdminSession());

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 500 when prisma throws', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockRejectedValue(
      new Error('DB connection lost')
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to list webhook subscriptions.');
  });
});

// =============================================================================
// DELETE /api/webhooks/subscribe
// =============================================================================

describe('DELETE /api/webhooks/subscribe', () => {
  it('deactivates an active subscription', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const sub = makeWebhookSubscription();
    (mockPrisma.webhookSubscription.findUnique as jest.Mock).mockResolvedValue(sub);
    (mockPrisma.webhookSubscription.update as jest.Mock).mockResolvedValue({
      ...sub,
      isActive: false,
    });

    const req = deleteRequest({ id: sub.id });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('deactivated');
    expect(body.data.id).toBe(sub.id);
  });

  it('calls prisma update with isActive: false', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const sub = makeWebhookSubscription();
    (mockPrisma.webhookSubscription.findUnique as jest.Mock).mockResolvedValue(sub);
    (mockPrisma.webhookSubscription.update as jest.Mock).mockResolvedValue({
      ...sub,
      isActive: false,
    });

    const req = deleteRequest({ id: sub.id });
    await DELETE(req);

    expect(mockPrisma.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: sub.id },
      data: { isActive: false },
    });
  });

  it('returns success message when subscription is already inactive', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const sub = makeWebhookSubscription({ isActive: false });
    (mockPrisma.webhookSubscription.findUnique as jest.Mock).mockResolvedValue(sub);

    const req = deleteRequest({ id: sub.id });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('already inactive');
    // update should NOT be called for an already-inactive sub
    expect(mockPrisma.webhookSubscription.update).not.toHaveBeenCalled();
  });

  it('returns 404 when subscription does not exist', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.webhookSubscription.findUnique as jest.Mock).mockResolvedValue(null);

    const req = deleteRequest({ id: 'clnonexistent12345678901234' });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('rejects unauthenticated request', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = deleteRequest({ id: 'clsubscription123456789012' });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('rejects non-admin user', async () => {
    mockGetServerSession.mockResolvedValue(nonAdminSession());

    const req = deleteRequest({ id: 'clsubscription123456789012' });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('rejects invalid subscription ID format', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = deleteRequest({ id: 'not-a-cuid' });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing ID', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = deleteRequest({});
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 500 when prisma throws', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.webhookSubscription.findUnique as jest.Mock).mockRejectedValue(
      new Error('DB timeout')
    );

    const req = deleteRequest({ id: 'clsubscription123456789012' });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Failed to delete webhook subscription');
  });
});

// =============================================================================
// dispatchWebhook() — unit tests for the webhook dispatcher
// =============================================================================

describe('dispatchWebhook()', () => {
  // We need to mock global fetch for delivery tests
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('queries active subscriptions matching the event type', async () => {
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([]);

    dispatchWebhook('launch.upcoming', { launchId: '123' });
    // Allow the fire-and-forget async to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(mockPrisma.webhookSubscription.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        events: { has: 'launch.upcoming' },
      },
      select: {
        id: true,
        url: true,
        secret: true,
      },
    });
  });

  it('does nothing when no subscriptions match', async () => {
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([]);

    dispatchWebhook('news.published', { articleId: '456' });
    await new Promise((r) => setTimeout(r, 50));

    // fetch should never be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('delivers payload to matching subscribers via POST', async () => {
    const sub = {
      id: 'sub-1',
      url: 'https://hooks.example.com/receiver',
      secret: 'shared-secret-abc',
    };
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([sub]);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    (mockPrisma.webhookSubscription.update as jest.Mock).mockResolvedValue({});

    dispatchWebhook('launch.upcoming', { launchId: 'L-42' });
    await new Promise((r) => setTimeout(r, 100));

    expect(global.fetch).toHaveBeenCalledWith(
      'https://hooks.example.com/receiver',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Webhook-Event': 'launch.upcoming',
          'X-Webhook-Signature': expect.any(String),
          'X-Webhook-Timestamp': expect.any(String),
        }),
        body: expect.any(String),
      })
    );
  });

  it('includes event type and data in the delivery body', async () => {
    const sub = { id: 'sub-1', url: 'https://hooks.example.com/recv', secret: 'sec' };
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([sub]);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    (mockPrisma.webhookSubscription.update as jest.Mock).mockResolvedValue({});

    dispatchWebhook('company.updated', { slug: 'spacex' });
    await new Promise((r) => setTimeout(r, 100));

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const deliveredBody = JSON.parse(fetchCall[1].body);
    expect(deliveredBody.event).toBe('company.updated');
    expect(deliveredBody.data).toEqual({ slug: 'spacex' });
    expect(deliveredBody.timestamp).toBeDefined();
  });

  it('resets failure count on successful delivery', async () => {
    const sub = { id: 'sub-ok', url: 'https://hooks.example.com/ok', secret: 'key' };
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([sub]);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    (mockPrisma.webhookSubscription.update as jest.Mock).mockResolvedValue({});

    dispatchWebhook('news.published', { title: 'News' });
    await new Promise((r) => setTimeout(r, 100));

    expect(mockPrisma.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-ok' },
      data: {
        failureCount: 0,
        lastDeliveryAt: expect.any(Date),
      },
    });
  });

  it('increments failure count on non-2xx response', async () => {
    const sub = { id: 'sub-fail', url: 'https://hooks.example.com/fail', secret: 'key' };
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([sub]);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    (mockPrisma.webhookSubscription.update as jest.Mock).mockResolvedValue({ failureCount: 1 });

    dispatchWebhook('launch.completed', { result: 'failure' });
    await new Promise((r) => setTimeout(r, 100));

    expect(mockPrisma.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-fail' },
      data: { failureCount: { increment: 1 } },
    });
  });

  it('increments failure count when fetch throws', async () => {
    const sub = { id: 'sub-err', url: 'https://hooks.example.com/err', secret: 'key' };
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([sub]);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
    (mockPrisma.webhookSubscription.update as jest.Mock).mockResolvedValue({ failureCount: 3 });

    dispatchWebhook('alert.solar_flare', { severity: 'X5' });
    await new Promise((r) => setTimeout(r, 100));

    expect(mockPrisma.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-err' },
      data: { failureCount: { increment: 1 } },
    });
  });

  it('auto-deactivates subscription after exceeding max failures', async () => {
    const sub = { id: 'sub-dead', url: 'https://hooks.example.com/dead', secret: 'key' };
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue([sub]);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });

    // First update (increment) returns failureCount > 10, triggering deactivation
    (mockPrisma.webhookSubscription.update as jest.Mock)
      .mockResolvedValueOnce({ failureCount: 11 })  // increment call
      .mockResolvedValueOnce({});                    // deactivation call

    dispatchWebhook('launch.upcoming', { id: 'x' });
    await new Promise((r) => setTimeout(r, 100));

    // First call: increment failure count
    expect(mockPrisma.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-dead' },
      data: { failureCount: { increment: 1 } },
    });
    // Second call: deactivate subscription
    expect(mockPrisma.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-dead' },
      data: { isActive: false },
    });
  });

  it('delivers to multiple subscribers concurrently', async () => {
    const subs = [
      { id: 'sub-a', url: 'https://a.example.com/hook', secret: 'key-a' },
      { id: 'sub-b', url: 'https://b.example.com/hook', secret: 'key-b' },
      { id: 'sub-c', url: 'https://c.example.com/hook', secret: 'key-c' },
    ];
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockResolvedValue(subs);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    (mockPrisma.webhookSubscription.update as jest.Mock).mockResolvedValue({});

    dispatchWebhook('news.published', { articleId: '789' });
    await new Promise((r) => setTimeout(r, 150));

    // Each subscriber should receive a fetch call
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenCalledWith('https://a.example.com/hook', expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith('https://b.example.com/hook', expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith('https://c.example.com/hook', expect.any(Object));
  });

  it('does not throw when findMany rejects (fire-and-forget)', async () => {
    (mockPrisma.webhookSubscription.findMany as jest.Mock).mockRejectedValue(
      new Error('DB down')
    );

    // dispatchWebhook is fire-and-forget; it must not throw
    expect(() => {
      dispatchWebhook('launch.upcoming', { id: 'test' });
    }).not.toThrow();

    await new Promise((r) => setTimeout(r, 50));
    // No fetch call should have been made
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
