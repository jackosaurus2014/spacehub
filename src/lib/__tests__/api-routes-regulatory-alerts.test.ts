/**
 * @jest-environment node
 */

/**
 * API route handler tests for Regulatory Wave C (per-user regulatory alerts):
 *
 *   - GET  /api/regulatory-alerts/preferences  (auth required; isPro flag;
 *          defaults when no row; fail-soft when table absent)
 *   - PUT  /api/regulatory-alerts/preferences  (SERVER-SIDE Pro gate: free
 *          users rejected 403; trial-Pro accepted; validation; 503 when the
 *          table hasn't been pushed yet)
 *   - GET/POST /api/regulatory-alerts/unsubscribe (token flow + RFC 8058
 *          one-click)
 *   - POST /api/cron/regulatory-alerts (CRON_SECRET required)
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({ getServerSession: (...args: unknown[]) => mockGetServerSession(...args) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockProcessRegulatoryAlerts = jest.fn();
jest.mock('@/lib/alerts/regulatory-alert-processor', () => ({
  processRegulatoryAlerts: (...args: unknown[]) => mockProcessRegulatoryAlerts(...args),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    regulatoryAlertPreference: {
      count: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { __resetRegulatoryAlertPrefsAvailability } from '@/lib/regulatory-alerts';
import {
  GET as prefsGET,
  PUT as prefsPUT,
} from '@/app/api/regulatory-alerts/preferences/route';
import {
  GET as unsubGET,
  POST as unsubPOST,
} from '@/app/api/regulatory-alerts/unsubscribe/route';
import { POST as cronPOST } from '@/app/api/cron/regulatory-alerts/route';

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  regulatoryAlertPreference: {
    count: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function authedSession() {
  return { user: { id: 'user-1', email: 'test@example.com', isAdmin: false } };
}

function makePutRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/regulatory-alerts/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const proUser = { subscriptionTier: 'pro', trialTier: null, trialEndDate: null };
const freeUser = { subscriptionTier: 'free', trialTier: null, trialEndDate: null };
const trialUser = {
  subscriptionTier: 'free',
  trialTier: 'pro',
  trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
};

const validBody = {
  enabled: true,
  frequency: 'daily',
  watchedCategories: ['export-controls', 'enforcement'],
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetRegulatoryAlertPrefsAvailability();
  mockPrisma.regulatoryAlertPreference.count.mockResolvedValue(0); // table available by default
});

// ── GET /api/regulatory-alerts/preferences ───────────────────────────────────

describe('GET /api/regulatory-alerts/preferences', () => {
  it('returns 401 when not signed in', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await prefsGET();
    expect(res.status).toBe(401);
  });

  it('returns defaults + isPro=false for a free user with no prefs row', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(freeUser);
    mockPrisma.regulatoryAlertPreference.findUnique.mockResolvedValue(null);

    const res = await prefsGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isPro).toBe(false);
    expect(body.data.available).toBe(true);
    expect(body.data.preferences).toEqual({
      enabled: false,
      watchedCategories: [],
      frequency: 'daily',
    });
  });

  it('returns stored prefs (parsed categories) for a Pro user', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(proUser);
    mockPrisma.regulatoryAlertPreference.findUnique.mockResolvedValue({
      enabled: true,
      watchedCategories: JSON.stringify(['spectrum', 'bogus-category']),
      frequency: 'immediate',
    });

    const res = await prefsGET();
    const body = await res.json();
    expect(body.data.isPro).toBe(true);
    expect(body.data.preferences).toEqual({
      enabled: true,
      watchedCategories: ['spectrum'], // unknown slugs dropped
      frequency: 'immediate',
    });
  });

  it('fails soft (defaults, available=false) when the table has not been pushed', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(proUser);
    mockPrisma.regulatoryAlertPreference.count.mockRejectedValue(new Error('relation does not exist'));

    const res = await prefsGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.available).toBe(false);
    expect(body.data.preferences.enabled).toBe(false);
    expect(mockPrisma.regulatoryAlertPreference.findUnique).not.toHaveBeenCalled();
  });
});

// ── PUT /api/regulatory-alerts/preferences ───────────────────────────────────

describe('PUT /api/regulatory-alerts/preferences', () => {
  it('returns 401 when not signed in', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await prefsPUT(makePutRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('REJECTS free users server-side with 403 (never client-only gating)', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(freeUser);

    const res = await prefsPUT(makePutRequest(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toContain('Pro');
    expect(mockPrisma.regulatoryAlertPreference.upsert).not.toHaveBeenCalled();
  });

  it('accepts a Pro user and upserts serialized categories', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(proUser);
    mockPrisma.regulatoryAlertPreference.upsert.mockResolvedValue({
      enabled: true,
      watchedCategories: JSON.stringify(validBody.watchedCategories),
      frequency: 'daily',
    });

    const res = await prefsPUT(makePutRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockPrisma.regulatoryAlertPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          userId: 'user-1',
          enabled: true,
          frequency: 'daily',
          watchedCategories: JSON.stringify(['export-controls', 'enforcement']),
        }),
      })
    );
    const body = await res.json();
    expect(body.data.preferences.watchedCategories).toEqual(['export-controls', 'enforcement']);
  });

  it('accepts an active Pro trial', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(trialUser);
    mockPrisma.regulatoryAlertPreference.upsert.mockResolvedValue({
      enabled: false,
      watchedCategories: '[]',
      frequency: 'daily',
    });

    const res = await prefsPUT(
      makePutRequest({ enabled: false, frequency: 'daily', watchedCategories: [] })
    );
    expect(res.status).toBe(200);
  });

  it('rejects unknown categories and bad frequencies with 400', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(proUser);

    const badCategory = await prefsPUT(
      makePutRequest({ enabled: true, frequency: 'daily', watchedCategories: ['not-real'] })
    );
    expect(badCategory.status).toBe(400);

    const badFrequency = await prefsPUT(
      makePutRequest({ enabled: true, frequency: 'weekly', watchedCategories: [] })
    );
    expect(badFrequency.status).toBe(400);
    expect(mockPrisma.regulatoryAlertPreference.upsert).not.toHaveBeenCalled();
  });

  it('returns 503 when the prefs table has not been pushed yet', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(proUser);
    mockPrisma.regulatoryAlertPreference.count.mockRejectedValue(new Error('relation does not exist'));

    const res = await prefsPUT(makePutRequest(validBody));
    expect(res.status).toBe(503);
  });
});

// ── Unsubscribe flow ─────────────────────────────────────────────────────────

describe('GET/POST /api/regulatory-alerts/unsubscribe', () => {
  it('GET with a valid token disables alerts and redirects', async () => {
    mockPrisma.regulatoryAlertPreference.findUnique.mockResolvedValue({ id: 'pref-1', enabled: true });
    const res = await unsubGET(
      new Request('http://localhost/api/regulatory-alerts/unsubscribe?token=tok-abc')
    );
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('location')).toContain('alerts=unsubscribed');
    expect(mockPrisma.regulatoryAlertPreference.update).toHaveBeenCalledWith({
      where: { id: 'pref-1' },
      data: { enabled: false },
    });
    expect(mockPrisma.regulatoryAlertPreference.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { unsubscribeToken: 'tok-abc' } })
    );
  });

  it('GET with an invalid token redirects to the error state without writing', async () => {
    mockPrisma.regulatoryAlertPreference.findUnique.mockResolvedValue(null);
    const res = await unsubGET(
      new Request('http://localhost/api/regulatory-alerts/unsubscribe?token=nope')
    );
    expect(res.headers.get('location')).toContain('alerts=error');
    expect(mockPrisma.regulatoryAlertPreference.update).not.toHaveBeenCalled();
  });

  it('POST (RFC 8058 one-click) unsubscribes via query token', async () => {
    mockPrisma.regulatoryAlertPreference.findUnique.mockResolvedValue({ id: 'pref-1', enabled: true });
    const res = await unsubPOST(
      new Request('http://localhost/api/regulatory-alerts/unsubscribe?token=tok-abc', { method: 'POST' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockPrisma.regulatoryAlertPreference.update).toHaveBeenCalled();
  });

  it('POST reads a form-encoded body token and is idempotent when already unsubscribed', async () => {
    mockPrisma.regulatoryAlertPreference.findUnique.mockResolvedValue({ id: 'pref-1', enabled: false });
    const res = await unsubPOST(
      new Request('http://localhost/api/regulatory-alerts/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'token=tok-abc',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('Already unsubscribed');
    expect(mockPrisma.regulatoryAlertPreference.update).not.toHaveBeenCalled();
  });

  it('POST without a token returns 400', async () => {
    const res = await unsubPOST(
      new Request('http://localhost/api/regulatory-alerts/unsubscribe', { method: 'POST' })
    );
    expect(res.status).toBe(400);
  });
});

// ── Cron route ───────────────────────────────────────────────────────────────

describe('POST /api/cron/regulatory-alerts', () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it('rejects requests without the CRON_SECRET bearer token', async () => {
    process.env.CRON_SECRET = 'shhh';
    const res = await cronPOST(
      new NextRequest('http://localhost/api/cron/regulatory-alerts', { method: 'POST' })
    );
    expect(res.status).toBe(401);
    expect(mockProcessRegulatoryAlerts).not.toHaveBeenCalled();
  });

  it('processes the immediate frequency with a valid bearer token', async () => {
    process.env.CRON_SECRET = 'shhh';
    mockProcessRegulatoryAlerts.mockResolvedValue({
      usersProcessed: 2, emailsSent: 1, itemsSent: 3, skipped: 0, errors: 0,
    });
    const res = await cronPOST(
      new NextRequest('http://localhost/api/cron/regulatory-alerts', {
        method: 'POST',
        headers: { authorization: 'Bearer shhh' },
      })
    );
    expect(res.status).toBe(200);
    expect(mockProcessRegulatoryAlerts).toHaveBeenCalledWith('immediate');
    const body = await res.json();
    expect(body).toMatchObject({ success: true, emailsSent: 1 });
  });
});
