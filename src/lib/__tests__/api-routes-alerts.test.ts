/**
 * @jest-environment node
 */

/**
 * API route handler tests for alerts & watchlist endpoints:
 *
 *   ALERT RULES CRUD
 *   - GET  /api/alerts           (list user's alert rules + stats)
 *   - POST /api/alerts           (create alert rule, tier-gated)
 *   - GET  /api/alerts/[id]      (get rule detail with deliveries)
 *   - PUT  /api/alerts/[id]      (update rule, ownership check)
 *   - DELETE /api/alerts/[id]    (delete rule, ownership check)
 *
 *   ALERT DELIVERIES
 *   - GET  /api/alerts/deliveries   (list paginated deliveries)
 *   - PUT  /api/alerts/deliveries   (mark deliveries as read)
 *
 *   ALERT WATCHLIST (in-app alerts)
 *   - GET  /api/alerts/watchlist    (fetch watchlist alerts)
 *   - PUT  /api/alerts/watchlist    (mark all watchlist alerts as read)
 *
 *   ALERT PROCESSING (cron)
 *   - POST /api/alerts/process      (requires CRON_SECRET)
 *
 *   COMPANY WATCHLIST
 *   - GET  /api/watchlist/companies        (list watched companies)
 *   - POST /api/watchlist/companies        (add company to watchlist)
 *   - GET  /api/watchlist/companies/check  (check if watching)
 *   - PUT  /api/watchlist/companies/[id]   (update watchlist item)
 *   - DELETE /api/watchlist/companies/[id] (remove from watchlist)
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({ getServerSession: (...args: unknown[]) => mockGetServerSession(...args) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock alert-delivery functions used by process route
const mockDeliverAlerts = jest.fn();
const mockSendDailyDigest = jest.fn();
const mockSendWeeklyDigest = jest.fn();
jest.mock('@/lib/alerts/alert-delivery', () => ({
  deliverAlerts: (...args: unknown[]) => mockDeliverAlerts(...args),
  sendDailyDigest: (...args: unknown[]) => mockSendDailyDigest(...args),
  sendWeeklyDigest: (...args: unknown[]) => mockSendWeeklyDigest(...args),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    alertRule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    alertDelivery: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    companyWatchlistItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    companyProfile: {
      findUnique: jest.fn(),
    },
  },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';

// Alert rules
import { GET as alertsGET, POST as alertsPOST } from '@/app/api/alerts/route';
import {
  GET as alertIdGET,
  PUT as alertIdPUT,
  DELETE as alertIdDELETE,
} from '@/app/api/alerts/[id]/route';

// Alert deliveries
import {
  GET as deliveriesGET,
  PUT as deliveriesPUT,
} from '@/app/api/alerts/deliveries/route';

// Alert watchlist (in-app)
import {
  GET as alertWatchlistGET,
  PUT as alertWatchlistPUT,
} from '@/app/api/alerts/watchlist/route';

// Alert processing (cron)
import { POST as alertProcessPOST } from '@/app/api/alerts/process/route';

// Company watchlist
import {
  GET as companyWatchlistGET,
  POST as companyWatchlistPOST,
} from '@/app/api/watchlist/companies/route';
import { GET as watchlistCheckGET } from '@/app/api/watchlist/companies/check/route';
import {
  PUT as watchlistItemPUT,
  DELETE as watchlistItemDELETE,
} from '@/app/api/watchlist/companies/[id]/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  alertRule: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  alertDelivery: {
    findMany: jest.Mock;
    count: jest.Mock;
    updateMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  companyWatchlistItem: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  companyProfile: {
    findUnique: jest.Mock;
  };
};

function authedSession(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1', email: 'test@example.com', isAdmin: false, ...overrides },
  };
}

function adminSession() {
  return {
    user: { id: 'admin-1', email: 'admin@example.com', isAdmin: true },
  };
}

function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

function makePostRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePutRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(url: string) {
  return new NextRequest(url, { method: 'DELETE' });
}

function makeProUser() {
  return {
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    trialTier: null,
    trialEndDate: null,
  };
}

function makeFreeUser() {
  return {
    subscriptionTier: 'free',
    subscriptionStatus: null,
    trialTier: null,
    trialEndDate: null,
  };
}

function makeEnterpriseUser() {
  return {
    subscriptionTier: 'enterprise',
    subscriptionStatus: 'active',
    trialTier: null,
    trialEndDate: null,
  };
}

function makeTrialUser(tier: string) {
  return {
    subscriptionTier: 'free',
    subscriptionStatus: null,
    trialTier: tier,
    trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };
}

const validAlertRuleBody = {
  name: 'SpaceX Launch Alert',
  description: 'Notify on SpaceX launches',
  triggerType: 'keyword',
  triggerConfig: {
    keywords: ['SpaceX', 'Falcon 9'],
    matchType: 'any',
  },
  channels: ['in_app', 'email'],
  emailFrequency: 'immediate',
  priority: 'normal',
  cooldownMinutes: 60,
};

function makeAlertRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    userId: 'user-1',
    name: 'SpaceX Launch Alert',
    description: 'Notify on SpaceX launches',
    triggerType: 'keyword',
    triggerConfig: { keywords: ['SpaceX'], matchType: 'any' },
    channels: ['in_app', 'email'],
    emailFrequency: 'immediate',
    priority: 'normal',
    cooldownMinutes: 60,
    isActive: true,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    _count: { deliveries: 5 },
    ...overrides,
  };
}

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: 'delivery-1',
    userId: 'user-1',
    alertRuleId: 'rule-1',
    channel: 'in_app',
    title: 'SpaceX Launch',
    message: 'New SpaceX launch detected',
    data: {},
    status: 'delivered',
    readAt: null,
    source: 'watchlist',
    createdAt: new Date('2026-01-20'),
    alertRule: {
      name: 'SpaceX Launch Alert',
      triggerType: 'keyword',
      priority: 'normal',
    },
    ...overrides,
  };
}

function makeWatchlistItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wl-1',
    userId: 'user-1',
    companyProfileId: 'company-1',
    priority: 'medium',
    notifyNews: true,
    notifyContracts: true,
    notifyListings: false,
    notes: null,
    createdAt: new Date('2026-01-10'),
    companyProfile: {
      id: 'company-1',
      slug: 'spacex',
      name: 'SpaceX',
      logoUrl: null,
      sector: 'Launch',
      tier: 'tier1',
      status: 'active',
      tags: ['launch'],
      totalFunding: null,
      marketCap: null,
      isPublic: false,
    },
    ...overrides,
  };
}

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

// =============================================================================
// GET /api/alerts — list user's alert rules
// =============================================================================

describe('GET /api/alerts', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/alerts');
    const res = await alertsGET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns rules and stats for authenticated user', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const rules = [
      makeAlertRule({ isActive: true }),
      makeAlertRule({ id: 'rule-2', isActive: false }),
    ];
    mockPrisma.alertRule.findMany.mockResolvedValue(rules);
    mockPrisma.alertDelivery.count
      .mockResolvedValueOnce(42)  // totalDeliveries
      .mockResolvedValueOnce(3);  // deliveriesToday

    const req = makeGetRequest('http://localhost/api/alerts');
    const res = await alertsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.rules).toHaveLength(2);
    expect(body.data.stats.totalRules).toBe(2);
    expect(body.data.stats.activeRules).toBe(1);
    expect(body.data.stats.totalDeliveries).toBe(42);
    expect(body.data.stats.deliveriesToday).toBe(3);
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findMany.mockRejectedValue(new Error('DB connection lost'));

    const req = makeGetRequest('http://localhost/api/alerts');
    const res = await alertsGET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// POST /api/alerts — create alert rule
// =============================================================================

describe('POST /api/alerts', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/alerts', validAlertRuleBody);
    const res = await alertsPOST(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 for free-tier users', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeFreeUser());

    const req = makePostRequest('http://localhost/api/alerts', validAlertRuleBody);
    const res = await alertsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('Pro or Enterprise subscription');
  });

  it('returns 403 when rule limit exceeded', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.alertRule.count.mockResolvedValue(10); // pro limit is 10

    const req = makePostRequest('http://localhost/api/alerts', validAlertRuleBody);
    const res = await alertsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('maximum of 10');
  });

  it('allows creation for pro user under limit', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.alertRule.count.mockResolvedValue(3);
    mockPrisma.alertRule.create.mockResolvedValue(makeAlertRule());

    const req = makePostRequest('http://localhost/api/alerts', validAlertRuleBody);
    const res = await alertsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('SpaceX Launch Alert');
    expect(mockPrisma.alertRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'SpaceX Launch Alert',
          triggerType: 'keyword',
        }),
      })
    );
  });

  it('respects trial tier when user has active trial', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeTrialUser('pro'));
    mockPrisma.alertRule.count.mockResolvedValue(0);
    mockPrisma.alertRule.create.mockResolvedValue(makeAlertRule());

    const req = makePostRequest('http://localhost/api/alerts', validAlertRuleBody);
    const res = await alertsPOST(req);

    expect(res.status).toBe(201);
  });

  it('returns 403 when non-enterprise user requests webhook channel', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.alertRule.count.mockResolvedValue(0);

    const bodyWithWebhook = {
      ...validAlertRuleBody,
      channels: ['in_app', 'webhook'],
    };
    const req = makePostRequest('http://localhost/api/alerts', bodyWithWebhook);
    const res = await alertsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('Webhook channel');
    expect(body.error.message).toContain('Enterprise');
  });

  it('allows webhook channel for enterprise users', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeEnterpriseUser());
    mockPrisma.alertRule.count.mockResolvedValue(0);
    mockPrisma.alertRule.create.mockResolvedValue(
      makeAlertRule({ channels: ['in_app', 'webhook'] })
    );

    const bodyWithWebhook = {
      ...validAlertRuleBody,
      channels: ['in_app', 'webhook'],
    };
    const req = makePostRequest('http://localhost/api/alerts', bodyWithWebhook);
    const res = await alertsPOST(req);

    expect(res.status).toBe(201);
  });

  it('returns 400 on invalid body (missing name)', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.alertRule.count.mockResolvedValue(0);

    const invalidBody = { ...validAlertRuleBody, name: '' };
    const req = makePostRequest('http://localhost/api/alerts', invalidBody);
    const res = await alertsPOST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid triggerType', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.alertRule.count.mockResolvedValue(0);

    const invalidBody = { ...validAlertRuleBody, triggerType: 'nonexistent' };
    const req = makePostRequest('http://localhost/api/alerts', invalidBody);
    const res = await alertsPOST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when no channels provided', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.alertRule.count.mockResolvedValue(0);

    const invalidBody = { ...validAlertRuleBody, channels: [] };
    const req = makePostRequest('http://localhost/api/alerts', invalidBody);
    const res = await alertsPOST(req);

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// GET /api/alerts/[id] — get rule detail
// =============================================================================

describe('GET /api/alerts/[id]', () => {
  const params = { id: 'rule-1' };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdGET(req, { params });

    expect(res.status).toBe(401);
  });

  it('returns 404 when rule does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/alerts/rule-999');
    const res = await alertIdGET(req, { params: { id: 'rule-999' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('returns 403 when user does not own the rule', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue(
      makeAlertRule({ userId: 'other-user' })
    );

    const req = makeGetRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdGET(req, { params });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('do not have access');
  });

  it('allows admin to view any rule', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue(
      makeAlertRule({ userId: 'other-user', deliveries: [] })
    );

    const req = makeGetRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdGET(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns rule with deliveries for owner', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue(
      makeAlertRule({ deliveries: [makeDelivery()], _count: { deliveries: 1 } })
    );

    const req = makeGetRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdGET(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.deliveries).toHaveLength(1);
  });
});

// =============================================================================
// PUT /api/alerts/[id] — update rule
// =============================================================================

describe('PUT /api/alerts/[id]', () => {
  const params = { id: 'rule-1' };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePutRequest('http://localhost/api/alerts/rule-1', { name: 'Updated' });
    const res = await alertIdPUT(req, { params });

    expect(res.status).toBe(401);
  });

  it('returns 404 when rule does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue(null);

    const req = makePutRequest('http://localhost/api/alerts/rule-1', { name: 'Updated' });
    const res = await alertIdPUT(req, { params });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own the rule', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({ userId: 'other-user' });

    const req = makePutRequest('http://localhost/api/alerts/rule-1', { name: 'Updated' });
    const res = await alertIdPUT(req, { params });

    expect(res.status).toBe(403);
  });

  it('updates name successfully', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.alertRule.update.mockResolvedValue(
      makeAlertRule({ name: 'Updated Name' })
    );

    const req = makePutRequest('http://localhost/api/alerts/rule-1', {
      name: 'Updated Name',
    });
    const res = await alertIdPUT(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated Name');
  });

  it('toggles isActive to false (deactivate rule)', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.alertRule.update.mockResolvedValue(
      makeAlertRule({ isActive: false })
    );

    const req = makePutRequest('http://localhost/api/alerts/rule-1', {
      isActive: false,
    });
    const res = await alertIdPUT(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isActive).toBe(false);
    expect(mockPrisma.alertRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      })
    );
  });

  it('toggles isActive to true (activate rule)', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.alertRule.update.mockResolvedValue(
      makeAlertRule({ isActive: true })
    );

    const req = makePutRequest('http://localhost/api/alerts/rule-1', {
      isActive: true,
    });
    const res = await alertIdPUT(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isActive).toBe(true);
  });

  it('returns 403 when non-enterprise user tries to add webhook channel', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());

    const req = makePutRequest('http://localhost/api/alerts/rule-1', {
      channels: ['in_app', 'webhook'],
    });
    const res = await alertIdPUT(req, { params });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('Webhook channel');
  });

  it('allows admin to update any rule', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({ userId: 'other-user' });
    mockPrisma.alertRule.update.mockResolvedValue(
      makeAlertRule({ userId: 'other-user', name: 'Admin Updated' })
    );

    const req = makePutRequest('http://localhost/api/alerts/rule-1', {
      name: 'Admin Updated',
    });
    const res = await alertIdPUT(req, { params });

    expect(res.status).toBe(200);
  });

  it('returns 400 on invalid update data', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({ userId: 'user-1' });

    const req = makePutRequest('http://localhost/api/alerts/rule-1', {
      cooldownMinutes: -5,
    });
    const res = await alertIdPUT(req, { params });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// DELETE /api/alerts/[id] — delete rule
// =============================================================================

describe('DELETE /api/alerts/[id]', () => {
  const params = { id: 'rule-1' };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeDeleteRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdDELETE(req, { params });

    expect(res.status).toBe(401);
  });

  it('returns 404 when rule does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue(null);

    const req = makeDeleteRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdDELETE(req, { params });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own the rule', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({
      userId: 'other-user',
      name: 'Their Rule',
    });

    const req = makeDeleteRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdDELETE(req, { params });

    expect(res.status).toBe(403);
  });

  it('deletes rule successfully for owner', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({
      userId: 'user-1',
      name: 'My Rule',
    });
    mockPrisma.alertRule.delete.mockResolvedValue({});

    const req = makeDeleteRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdDELETE(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('deleted successfully');
    expect(mockPrisma.alertRule.delete).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
    });
  });

  it('allows admin to delete any rule', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    mockPrisma.alertRule.findUnique.mockResolvedValue({
      userId: 'other-user',
      name: 'Their Rule',
    });
    mockPrisma.alertRule.delete.mockResolvedValue({});

    const req = makeDeleteRequest('http://localhost/api/alerts/rule-1');
    const res = await alertIdDELETE(req, { params });

    expect(res.status).toBe(200);
  });
});

// =============================================================================
// GET /api/alerts/deliveries — list deliveries
// =============================================================================

describe('GET /api/alerts/deliveries', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/alerts/deliveries');
    const res = await deliveriesGET(req);

    expect(res.status).toBe(401);
  });

  it('returns paginated deliveries with unread count', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const deliveries = [makeDelivery(), makeDelivery({ id: 'delivery-2' })];
    mockPrisma.alertDelivery.findMany.mockResolvedValue(deliveries);
    mockPrisma.alertDelivery.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(3); // unreadCount

    const req = makeGetRequest('http://localhost/api/alerts/deliveries?limit=20&offset=0');
    const res = await deliveriesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.deliveries).toHaveLength(2);
    expect(body.data.total).toBe(10);
    expect(body.data.unreadCount).toBe(3);
    expect(body.data.hasMore).toBe(true);
  });

  it('filters by channel when provided', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertDelivery.findMany.mockResolvedValue([]);
    mockPrisma.alertDelivery.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const req = makeGetRequest('http://localhost/api/alerts/deliveries?channel=email');
    const res = await deliveriesGET(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.alertDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          channel: 'email',
        }),
      })
    );
  });

  it('filters by status when provided', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertDelivery.findMany.mockResolvedValue([]);
    mockPrisma.alertDelivery.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const req = makeGetRequest('http://localhost/api/alerts/deliveries?status=read');
    const res = await deliveriesGET(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.alertDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'read',
        }),
      })
    );
  });
});

// =============================================================================
// PUT /api/alerts/deliveries — mark as read
// =============================================================================

describe('PUT /api/alerts/deliveries', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePutRequest('http://localhost/api/alerts/deliveries', {
      ids: ['delivery-1'],
    });
    const res = await deliveriesPUT(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 when ids is missing', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = makePutRequest('http://localhost/api/alerts/deliveries', {});
    const res = await deliveriesPUT(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when ids is empty array', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = makePutRequest('http://localhost/api/alerts/deliveries', { ids: [] });
    const res = await deliveriesPUT(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when ids exceeds 100', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const ids = Array.from({ length: 101 }, (_, i) => `delivery-${i}`);
    const req = makePutRequest('http://localhost/api/alerts/deliveries', { ids });
    const res = await deliveriesPUT(req);

    expect(res.status).toBe(400);
  });

  it('marks deliveries as read successfully', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertDelivery.updateMany.mockResolvedValue({ count: 2 });

    const req = makePutRequest('http://localhost/api/alerts/deliveries', {
      ids: ['delivery-1', 'delivery-2'],
    });
    const res = await deliveriesPUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.markedAsRead).toBe(2);
    expect(mockPrisma.alertDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['delivery-1', 'delivery-2'] },
          userId: 'user-1',
          readAt: null,
        }),
      })
    );
  });
});

// =============================================================================
// GET /api/alerts/watchlist — fetch watchlist alerts
// =============================================================================

describe('GET /api/alerts/watchlist', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/alerts/watchlist');
    const res = await alertWatchlistGET(req);

    expect(res.status).toBe(401);
  });

  it('returns watchlist alerts with pagination', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const alerts = [
      makeDelivery({ source: 'watchlist', channel: 'in_app' }),
    ];
    mockPrisma.alertDelivery.findMany.mockResolvedValue(alerts);
    mockPrisma.alertDelivery.count
      .mockResolvedValueOnce(5)  // total
      .mockResolvedValueOnce(2); // unreadCount

    const req = makeGetRequest('http://localhost/api/alerts/watchlist?limit=20&offset=0');
    const res = await alertWatchlistGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alerts).toHaveLength(1);
    expect(body.total).toBe(5);
    expect(body.unreadCount).toBe(2);
  });

  it('filters to unread only when unread=true', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertDelivery.findMany.mockResolvedValue([]);
    mockPrisma.alertDelivery.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const req = makeGetRequest('http://localhost/api/alerts/watchlist?unread=true');
    const res = await alertWatchlistGET(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.alertDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          readAt: null,
          status: { in: ['pending', 'delivered'] },
        }),
      })
    );
  });
});

// =============================================================================
// PUT /api/alerts/watchlist — mark all watchlist alerts as read
// =============================================================================

describe('PUT /api/alerts/watchlist', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePutRequest('http://localhost/api/alerts/watchlist', {});
    const res = await alertWatchlistPUT(req);

    expect(res.status).toBe(401);
  });

  it('marks all watchlist alerts as read', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.alertDelivery.updateMany.mockResolvedValue({ count: 4 });

    const req = makePutRequest('http://localhost/api/alerts/watchlist', {});
    const res = await alertWatchlistPUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.marked).toBe(4);
    expect(mockPrisma.alertDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          source: 'watchlist',
          channel: 'in_app',
          readAt: null,
        }),
      })
    );
  });
});

// =============================================================================
// POST /api/alerts/process — cron-protected alert processing
// =============================================================================

describe('POST /api/alerts/process', () => {
  it('returns 401 without CRON_SECRET on external request', async () => {
    process.env.CRON_SECRET = 'my-secret';

    const req = makePostRequest('http://example.com/api/alerts/process', {});
    const res = await alertProcessPOST(req);

    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET does not match', async () => {
    process.env.CRON_SECRET = 'my-secret';

    const req = new NextRequest('http://example.com/api/alerts/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-secret',
      },
      body: '{}',
    });
    const res = await alertProcessPOST(req);

    expect(res.status).toBe(401);
  });

  it('processes all alert types when no type specified', async () => {
    process.env.CRON_SECRET = 'my-secret';
    mockDeliverAlerts.mockResolvedValue({ sent: 5, failed: 0 });
    mockSendDailyDigest.mockResolvedValue({ sent: 3 });

    const req = new NextRequest('http://example.com/api/alerts/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-secret',
      },
      body: '{}',
    });
    const res = await alertProcessPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.type).toBe('all');
    expect(body.data.results.deliveries).toEqual({ sent: 5, failed: 0 });
    expect(body.data.results.dailyDigest).toEqual({ sent: 3 });
    expect(mockDeliverAlerts).toHaveBeenCalled();
    expect(mockSendDailyDigest).toHaveBeenCalled();
    expect(mockSendWeeklyDigest).not.toHaveBeenCalled();
  });

  it('processes only deliveries when type=deliver', async () => {
    process.env.CRON_SECRET = 'my-secret';
    mockDeliverAlerts.mockResolvedValue({ sent: 2, failed: 0 });

    const req = new NextRequest('http://example.com/api/alerts/process?type=deliver', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-secret',
      },
      body: '{}',
    });
    const res = await alertProcessPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.type).toBe('deliver');
    expect(mockDeliverAlerts).toHaveBeenCalled();
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
    expect(mockSendWeeklyDigest).not.toHaveBeenCalled();
  });

  it('processes weekly digest when type=weekly_digest', async () => {
    process.env.CRON_SECRET = 'my-secret';
    mockSendWeeklyDigest.mockResolvedValue({ sent: 10 });

    const req = new NextRequest('http://example.com/api/alerts/process?type=weekly_digest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-secret',
      },
      body: '{}',
    });
    const res = await alertProcessPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.type).toBe('weekly_digest');
    expect(body.data.results.weeklyDigest).toEqual({ sent: 10 });
    expect(mockSendWeeklyDigest).toHaveBeenCalled();
    // weekly_digest type should NOT process regular deliveries or daily
    expect(mockDeliverAlerts).not.toHaveBeenCalled();
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
  });

  it('allows localhost requests when no CRON_SECRET configured', async () => {
    delete process.env.CRON_SECRET;
    mockDeliverAlerts.mockResolvedValue({ sent: 0, failed: 0 });
    mockSendDailyDigest.mockResolvedValue({ sent: 0 });

    const req = new NextRequest('http://localhost/api/alerts/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: 'localhost:3000',
      },
      body: '{}',
    });
    const res = await alertProcessPOST(req);

    expect(res.status).toBe(200);
  });

  it('returns 500 when processing throws error', async () => {
    process.env.CRON_SECRET = 'my-secret';
    mockDeliverAlerts.mockRejectedValue(new Error('Delivery service down'));

    const req = new NextRequest('http://example.com/api/alerts/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-secret',
      },
      body: '{}',
    });
    const res = await alertProcessPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// GET /api/watchlist/companies — list watched companies
// =============================================================================

describe('GET /api/watchlist/companies', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies');
    const res = await companyWatchlistGET(req);

    expect(res.status).toBe(401);
  });

  it('returns watchlist items with tier info', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());

    const items = [makeWatchlistItem(), makeWatchlistItem({ id: 'wl-2', companyProfileId: 'company-2' })];
    mockPrisma.companyWatchlistItem.findMany.mockResolvedValue(items);

    const req = new Request('http://localhost/api/watchlist/companies');
    const res = await companyWatchlistGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.count).toBe(2);
    expect(body.data.tier).toBe('pro');
    expect(body.data.limit).toBe(50);
  });

  it('returns null limit for enterprise tier', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeEnterpriseUser());
    mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/watchlist/companies');
    const res = await companyWatchlistGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.limit).toBeNull();
    expect(body.data.tier).toBe('enterprise');
  });
});

// =============================================================================
// POST /api/watchlist/companies — add company to watchlist
// =============================================================================

describe('POST /api/watchlist/companies', () => {
  const validWatchlistBody = {
    companyProfileId: 'company-1',
    priority: 'medium',
    notifyNews: true,
    notifyContracts: true,
    notifyListings: false,
  };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validWatchlistBody),
    });
    const res = await companyWatchlistPOST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 when watchlist limit reached', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeFreeUser());
    mockPrisma.companyWatchlistItem.count.mockResolvedValue(10); // free limit = 10

    const req = new Request('http://localhost/api/watchlist/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validWatchlistBody),
    });
    const res = await companyWatchlistPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('maximum of 10');
  });

  it('returns 400 when company does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.companyWatchlistItem.count.mockResolvedValue(0);
    mockPrisma.companyProfile.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validWatchlistBody),
    });
    const res = await companyWatchlistPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('Company not found');
  });

  it('returns existing item when already watching', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.companyWatchlistItem.count.mockResolvedValue(2);
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ id: 'company-1', name: 'SpaceX' });
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(makeWatchlistItem());

    const req = new Request('http://localhost/api/watchlist/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validWatchlistBody),
    });
    const res = await companyWatchlistPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.alreadyWatching).toBe(true);
  });

  it('creates a new watchlist item successfully', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.companyWatchlistItem.count.mockResolvedValue(2);
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ id: 'company-1', name: 'SpaceX' });
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(null); // not already watching
    mockPrisma.companyWatchlistItem.create.mockResolvedValue(
      makeWatchlistItem()
    );

    const req = new Request('http://localhost/api/watchlist/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validWatchlistBody),
    });
    const res = await companyWatchlistPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.item).toBeDefined();
    expect(mockPrisma.companyWatchlistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          companyProfileId: 'company-1',
          priority: 'medium',
        }),
      })
    );
  });

  it('returns 400 when companyProfileId is missing', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeProUser());
    mockPrisma.companyWatchlistItem.count.mockResolvedValue(0);

    const req = new Request('http://localhost/api/watchlist/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    });
    const res = await companyWatchlistPOST(req);

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// GET /api/watchlist/companies/check — check if watching
// =============================================================================

describe('GET /api/watchlist/companies/check', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies/check?companyProfileId=company-1');
    const res = await watchlistCheckGET(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 when companyProfileId is missing', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = new Request('http://localhost/api/watchlist/companies/check');
    const res = await watchlistCheckGET(req);

    expect(res.status).toBe(400);
  });

  it('returns watching: true when company is on watchlist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(makeWatchlistItem());

    const req = new Request('http://localhost/api/watchlist/companies/check?companyProfileId=company-1');
    const res = await watchlistCheckGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.watching).toBe(true);
    expect(body.data.item).not.toBeNull();
  });

  it('returns watching: false when company is not on watchlist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies/check?companyProfileId=company-1');
    const res = await watchlistCheckGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.watching).toBe(false);
    expect(body.data.item).toBeNull();
  });
});

// =============================================================================
// PUT /api/watchlist/companies/[id] — update watchlist item
// =============================================================================

describe('PUT /api/watchlist/companies/[id]', () => {
  const params = { id: 'wl-1' };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies/wl-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    });
    const res = await watchlistItemPUT(req, { params });

    expect(res.status).toBe(401);
  });

  it('returns 404 when item does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies/wl-999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    });
    const res = await watchlistItemPUT(req, { params: { id: 'wl-999' } });

    expect(res.status).toBe(404);
  });

  it('returns 401 when user does not own the item', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(
      makeWatchlistItem({ userId: 'other-user' })
    );

    const req = new Request('http://localhost/api/watchlist/companies/wl-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    });
    const res = await watchlistItemPUT(req, { params });

    expect(res.status).toBe(401);
  });

  it('updates priority successfully', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(makeWatchlistItem());
    mockPrisma.companyWatchlistItem.update.mockResolvedValue(
      makeWatchlistItem({ priority: 'high' })
    );

    const req = new Request('http://localhost/api/watchlist/companies/wl-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    });
    const res = await watchlistItemPUT(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.companyWatchlistItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priority: 'high' }),
      })
    );
  });

  it('updates notification settings', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(makeWatchlistItem());
    mockPrisma.companyWatchlistItem.update.mockResolvedValue(
      makeWatchlistItem({ notifyNews: false, notifyContracts: false })
    );

    const req = new Request('http://localhost/api/watchlist/companies/wl-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifyNews: false, notifyContracts: false }),
    });
    const res = await watchlistItemPUT(req, { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.companyWatchlistItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notifyNews: false,
          notifyContracts: false,
        }),
      })
    );
  });

  it('ignores invalid priority values', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(makeWatchlistItem());
    mockPrisma.companyWatchlistItem.update.mockResolvedValue(makeWatchlistItem());

    const req = new Request('http://localhost/api/watchlist/companies/wl-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'invalid_priority' }),
    });
    const res = await watchlistItemPUT(req, { params });

    expect(res.status).toBe(200);
    // Should not include invalid priority in update data
    expect(mockPrisma.companyWatchlistItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ priority: 'invalid_priority' }),
      })
    );
  });
});

// =============================================================================
// DELETE /api/watchlist/companies/[id] — remove from watchlist
// =============================================================================

describe('DELETE /api/watchlist/companies/[id]', () => {
  const params = { id: 'wl-1' };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies/wl-1', {
      method: 'DELETE',
    });
    const res = await watchlistItemDELETE(req, { params });

    expect(res.status).toBe(401);
  });

  it('returns 404 when item does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/watchlist/companies/wl-999', {
      method: 'DELETE',
    });
    const res = await watchlistItemDELETE(req, { params: { id: 'wl-999' } });

    expect(res.status).toBe(404);
  });

  it('returns 401 when user does not own the item', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(
      makeWatchlistItem({ userId: 'other-user' })
    );

    const req = new Request('http://localhost/api/watchlist/companies/wl-1', {
      method: 'DELETE',
    });
    const res = await watchlistItemDELETE(req, { params });

    expect(res.status).toBe(401);
  });

  it('deletes watchlist item successfully', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.companyWatchlistItem.findUnique.mockResolvedValue(
      makeWatchlistItem()
    );
    mockPrisma.companyWatchlistItem.delete.mockResolvedValue({});

    const req = new Request('http://localhost/api/watchlist/companies/wl-1', {
      method: 'DELETE',
    });
    const res = await watchlistItemDELETE(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
    expect(mockPrisma.companyWatchlistItem.delete).toHaveBeenCalledWith({
      where: { id: 'wl-1' },
    });
  });
});
