/**
 * @jest-environment node
 */

/**
 * API route handler tests for developer/API key endpoints:
 *   - GET  /api/developer/keys            (list user's API keys, masked)
 *   - POST /api/developer/keys            (create new API key)
 *   - PUT  /api/developer/keys/[id]       (update key name/status)
 *   - DELETE /api/developer/keys/[id]     (revoke API key)
 *   - POST /api/developer/keys/[id]/rotate (rotate key, invalidate old)
 *   - GET  /api/developer/usage           (usage analytics)
 *
 * Also tests the authenticateApiKey middleware directly:
 *   - Valid key authentication
 *   - Invalid / expired / revoked key rejection
 *   - Monthly and per-minute rate limiting
 *   - Usage logging
 *
 * Tests the utility functions in api-keys.ts:
 *   - generateApiKey() format and uniqueness
 *   - hashApiKey() consistency
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    apiKey: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    apiUsageLog: {
      count: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { GET as keysGET, POST as keysPOST } from '@/app/api/developer/keys/route';
import { PUT as keyPUT, DELETE as keyDELETE } from '@/app/api/developer/keys/[id]/route';
import { POST as rotateKeyPOST } from '@/app/api/developer/keys/[id]/rotate/route';
import { GET as usageGET } from '@/app/api/developer/usage/route';
import { authenticateApiKey } from '@/lib/api-auth-middleware';
import { generateApiKey, hashApiKey, API_RATE_LIMITS, MAX_KEYS_PER_TIER } from '@/lib/api-keys';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeSession(userId: string = 'user-1') {
  return { user: { id: userId, email: 'dev@example.com', name: 'Dev User' } };
}

function makeApiKeyRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    userId: 'user-1',
    name: 'Test Key',
    keyHash: 'abc123hash',
    keyPrefix: 'snx_abcdefgh',
    tier: 'developer',
    rateLimitPerMonth: 5000,
    rateLimitPerMinute: 60,
    isActive: true,
    lastUsedAt: null,
    expiresAt: null,
    createdAt: new Date('2026-01-15'),
    revokedAt: null,
    _count: { usageLogs: 42 },
    ...overrides,
  };
}

function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

function makePostRequest(url: string, body: Record<string, unknown> = {}) {
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

function makeApiRequest(url: string, apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['authorization'] = `Bearer ${apiKey}`;
  }
  return new NextRequest(url, { method: 'GET', headers });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Set safe defaults for fire-and-forget calls (e.g., lastUsedAt update, usage logging)
  (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({});
  (mockPrisma.apiUsageLog.create as jest.Mock).mockResolvedValue({});
});

// =============================================================================
// Unit tests for api-keys.ts utilities
// =============================================================================

describe('api-keys utilities', () => {
  describe('generateApiKey()', () => {
    it('returns a key starting with snx_ prefix', () => {
      const { key } = generateApiKey();
      expect(key).toMatch(/^snx_/);
    });

    it('returns a prefix that is the first 12 characters of the key', () => {
      const { key, prefix } = generateApiKey();
      expect(prefix).toBe(key.substring(0, 12));
    });

    it('returns a SHA-256 hash of the key', () => {
      const { key, hash } = generateApiKey();
      expect(hash).toBe(hashApiKey(key));
    });

    it('returns a 64-character hex hash', () => {
      const { hash } = generateApiKey();
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates unique keys each call', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1.key).not.toBe(key2.key);
      expect(key1.hash).not.toBe(key2.hash);
    });
  });

  describe('hashApiKey()', () => {
    it('produces a consistent hash for the same key', () => {
      const key = 'snx_test_key_value';
      expect(hashApiKey(key)).toBe(hashApiKey(key));
    });

    it('produces different hashes for different keys', () => {
      expect(hashApiKey('snx_key_a')).not.toBe(hashApiKey('snx_key_b'));
    });

    it('returns a 64-character hex string', () => {
      expect(hashApiKey('snx_anything')).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('API_RATE_LIMITS', () => {
    it('defines developer tier with 5000 monthly and 60 per-minute', () => {
      expect(API_RATE_LIMITS.developer).toEqual({ monthly: 5000, perMinute: 60 });
    });

    it('defines business tier with 50000 monthly and 300 per-minute', () => {
      expect(API_RATE_LIMITS.business).toEqual({ monthly: 50000, perMinute: 300 });
    });

    it('defines enterprise tier with unlimited monthly and 1000 per-minute', () => {
      expect(API_RATE_LIMITS.enterprise).toEqual({ monthly: -1, perMinute: 1000 });
    });
  });

  describe('MAX_KEYS_PER_TIER', () => {
    it('allows 3 keys for developer tier', () => {
      expect(MAX_KEYS_PER_TIER['developer']).toBe(3);
    });

    it('allows 10 keys for business tier', () => {
      expect(MAX_KEYS_PER_TIER['business']).toBe(10);
    });

    it('allows effectively unlimited keys for enterprise tier', () => {
      expect(MAX_KEYS_PER_TIER['enterprise']).toBe(999);
    });
  });
});

// =============================================================================
// GET /api/developer/keys
// =============================================================================

describe('GET /api/developer/keys', () => {
  it('requires authentication (returns 401 without session)', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await keysGET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the user\'s API keys', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([
      makeApiKeyRecord(),
      makeApiKeyRecord({ id: 'key-2', name: 'Second Key', _count: { usageLogs: 10 } }),
    ]);

    const res = await keysGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].name).toBe('Test Key');
    expect(body.data[1].name).toBe('Second Key');
  });

  it('returns totalCalls from _count and omits raw _count', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([
      makeApiKeyRecord({ _count: { usageLogs: 100 } }),
    ]);

    const res = await keysGET();
    const body = await res.json();

    expect(body.data[0].totalCalls).toBe(100);
    expect(body.data[0]._count).toBeUndefined();
  });

  it('never selects the full key hash from the database', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([makeApiKeyRecord()]);

    await keysGET();

    // Verify the Prisma query's select clause includes keyPrefix but NOT keyHash
    const findManyCall = (mockPrisma.apiKey.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.select.keyPrefix).toBe(true);
    expect(findManyCall.select.keyHash).toBeUndefined();
    // Also verify the full key string is never selected
    expect(findManyCall.select.key).toBeUndefined();
  });

  it('only queries keys for the authenticated user', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user-42'));
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([]);

    await keysGET();

    expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-42' },
      })
    );
  });

  it('returns empty array when user has no keys', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([]);

    const res = await keysGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB down'));

    const res = await keysGET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// =============================================================================
// POST /api/developer/keys
// =============================================================================

describe('POST /api/developer/keys', () => {
  const validBody = { name: 'My Production Key' };

  function setupProUser() {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'pro',
      trialTier: null,
      trialEndDate: null,
    });
    (mockPrisma.apiKey.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiKey.create as jest.Mock).mockImplementation(({ data }) => {
      return Promise.resolve({
        id: 'new-key-1',
        name: data.name,
        keyPrefix: data.keyPrefix,
        tier: data.tier,
        rateLimitPerMonth: data.rateLimitPerMonth,
        rateLimitPerMinute: data.rateLimitPerMinute,
        isActive: true,
        createdAt: new Date(),
      });
    });
  }

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 401 when user record is not found', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);

    expect(res.status).toBe(401);
  });

  it('rejects free-tier users with 403', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'free',
      trialTier: null,
      trialEndDate: null,
    });

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('Pro or Enterprise');
  });

  it('creates key for pro subscription user', async () => {
    setupProUser();

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('My Production Key');
    expect(body.data.tier).toBe('developer');
    expect(body.message).toContain('not be shown again');
  });

  it('returns the full key value ONLY on creation', async () => {
    setupProUser();

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);
    const body = await res.json();

    expect(body.data.key).toBeDefined();
    expect(body.data.key).toMatch(/^snx_/);
  });

  it('validates key name is required', async () => {
    setupProUser();

    const req = makePostRequest('http://localhost/api/developer/keys', { name: '' });
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates key name max length (100 chars)', async () => {
    setupProUser();

    const req = makePostRequest('http://localhost/api/developer/keys', {
      name: 'x'.repeat(101),
    });
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('trims whitespace from key name', async () => {
    setupProUser();

    const req = makePostRequest('http://localhost/api/developer/keys', {
      name: '  My Key  ',
    });
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    // Verify the create call received the trimmed name
    expect(mockPrisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'My Key' }),
      })
    );
  });

  it('enforces per-user key limit (409 when at max)', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'pro',
      trialTier: null,
      trialEndDate: null,
    });
    // Developer tier allows 3 keys -- simulate already having 3
    (mockPrisma.apiKey.count as jest.Mock).mockResolvedValue(3);

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('Maximum');
    expect(body.error.message).toContain('3');
  });

  it('allows trial users to create API keys', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'free',
      trialTier: 'pro',
      trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });
    (mockPrisma.apiKey.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiKey.create as jest.Mock).mockResolvedValue({
      id: 'trial-key-1',
      name: 'Trial Key',
      keyPrefix: 'snx_trialkey',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      createdAt: new Date(),
    });

    const req = makePostRequest('http://localhost/api/developer/keys', { name: 'Trial Key' });
    const res = await keysPOST(req);

    expect(res.status).toBe(201);
  });

  it('rejects expired trial users as free tier', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'free',
      trialTier: 'pro',
      trialEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
    });

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);

    expect(res.status).toBe(403);
  });

  it('assigns enterprise API tier for enterprise subscription', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'enterprise',
      trialTier: null,
      trialEndDate: null,
    });
    (mockPrisma.apiKey.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiKey.create as jest.Mock).mockImplementation(({ data }) => {
      return Promise.resolve({
        id: 'ent-key-1',
        name: data.name,
        keyPrefix: data.keyPrefix,
        tier: data.tier,
        rateLimitPerMonth: data.rateLimitPerMonth,
        rateLimitPerMinute: data.rateLimitPerMinute,
        isActive: true,
        createdAt: new Date(),
      });
    });

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.tier).toBe('enterprise');
    expect(body.data.rateLimitPerMinute).toBe(API_RATE_LIMITS.enterprise.perMinute);
  });

  it('returns 500 when database throws during creation', async () => {
    setupProUser();
    (mockPrisma.apiKey.create as jest.Mock).mockRejectedValueOnce(new Error('Create failed'));

    const req = makePostRequest('http://localhost/api/developer/keys', validBody);
    const res = await keysPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// =============================================================================
// PUT /api/developer/keys/[id]
// =============================================================================

describe('PUT /api/developer/keys/[id]', () => {
  const routeParams = { params: { id: 'key-1' } };

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePutRequest('http://localhost/api/developer/keys/key-1', { name: 'New Name' });
    const res = await keyPUT(req, routeParams);

    expect(res.status).toBe(401);
  });

  it('returns 404 when key does not belong to the user', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makePutRequest('http://localhost/api/developer/keys/key-999', { name: 'Stolen Key' });
    const res = await keyPUT(req, { params: { id: 'key-999' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('rejects updating a revoked key', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
      id: 'key-1',
      revokedAt: new Date('2026-01-10'),
    });

    const req = makePutRequest('http://localhost/api/developer/keys/key-1', { name: 'Revived' });
    const res = await keyPUT(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('revoked');
  });

  it('updates key name successfully', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({ id: 'key-1', revokedAt: null });
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({
      id: 'key-1',
      name: 'Renamed Key',
      keyPrefix: 'snx_abcdefgh',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      lastUsedAt: null,
      expiresAt: null,
      createdAt: new Date(),
      revokedAt: null,
    });

    const req = makePutRequest('http://localhost/api/developer/keys/key-1', { name: 'Renamed Key' });
    const res = await keyPUT(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Renamed Key');
  });

  it('can toggle isActive field', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({ id: 'key-1', revokedAt: null });
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({
      id: 'key-1',
      name: 'Test Key',
      isActive: false,
    });

    const req = makePutRequest('http://localhost/api/developer/keys/key-1', { isActive: false });
    const res = await keyPUT(req, routeParams);

    expect(res.status).toBe(200);
    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      })
    );
  });

  it('validates update body schema', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({ id: 'key-1', revokedAt: null });

    // Empty name should fail validation
    const req = makePutRequest('http://localhost/api/developer/keys/key-1', { name: '' });
    const res = await keyPUT(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

// =============================================================================
// DELETE /api/developer/keys/[id]
// =============================================================================

describe('DELETE /api/developer/keys/[id]', () => {
  const routeParams = { params: { id: 'key-1' } };

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeDeleteRequest('http://localhost/api/developer/keys/key-1');
    const res = await keyDELETE(req, routeParams);

    expect(res.status).toBe(401);
  });

  it('revokes an API key owned by the user', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({ id: 'key-1' });
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({});

    const req = makeDeleteRequest('http://localhost/api/developer/keys/key-1');
    const res = await keyDELETE(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('revoked');
  });

  it('soft-deletes by setting isActive=false and revokedAt', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({ id: 'key-1' });
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({});

    const req = makeDeleteRequest('http://localhost/api/developer/keys/key-1');
    await keyDELETE(req, routeParams);

    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key-1' },
        data: expect.objectContaining({
          isActive: false,
          revokedAt: expect.any(Date),
        }),
      })
    );
  });

  it('returns 404 when deleting another user\'s key (ownership check)', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user-2'));
    // findFirst with userId: 'user-2' won't find key-1 belonging to user-1
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeDeleteRequest('http://localhost/api/developer/keys/key-1');
    const res = await keyDELETE(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent key ID', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeDeleteRequest('http://localhost/api/developer/keys/does-not-exist');
    const res = await keyDELETE(req, { params: { id: 'does-not-exist' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 500 when database throws during delete', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({ id: 'key-1' });
    // Use mockRejectedValueOnce so that only the handler's call rejects;
    // subsequent fire-and-forget calls (from middleware, etc.) fall back to the
    // safe default set in beforeEach.
    (mockPrisma.apiKey.update as jest.Mock).mockRejectedValueOnce(new Error('DB failure'));

    const req = makeDeleteRequest('http://localhost/api/developer/keys/key-1');
    const res = await keyDELETE(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// =============================================================================
// POST /api/developer/keys/[id]/rotate
// =============================================================================

describe('POST /api/developer/keys/[id]/rotate', () => {
  const routeParams = { params: { id: 'key-1' } };

  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/developer/keys/key-1/rotate');
    const res = await rotateKeyPOST(req, routeParams);

    expect(res.status).toBe(401);
  });

  it('returns 404 when key does not belong to the user', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/developer/keys/key-999/rotate');
    const res = await rotateKeyPOST(req, { params: { id: 'key-999' } });

    expect(res.status).toBe(404);
  });

  it('rejects rotating a revoked key', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
      id: 'key-1',
      name: 'Old Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      revokedAt: new Date('2026-01-10'),
    });

    const req = makePostRequest('http://localhost/api/developer/keys/key-1/rotate');
    const res = await rotateKeyPOST(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('revoked');
  });

  it('generates a new key and revokes the old one', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
      id: 'key-1',
      name: 'My Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      revokedAt: null,
    });

    const newKeyRecord = {
      id: 'key-2',
      name: 'My Key',
      keyPrefix: 'snx_newprefix',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      createdAt: new Date(),
    };

    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([
      { id: 'key-1', isActive: false, revokedAt: new Date() }, // old key revoked
      newKeyRecord,                                             // new key created
    ]);

    const req = makePostRequest('http://localhost/api/developer/keys/key-1/rotate');
    const res = await rotateKeyPOST(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.key).toMatch(/^snx_/); // New full key returned
    expect(body.data.previousKeyId).toBe('key-1');
    expect(body.message).toContain('rotated successfully');
    expect(body.message).toContain('not be shown again');
  });

  it('preserves the original key settings (name, tier, limits)', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
      id: 'key-1',
      name: 'Production API',
      tier: 'business',
      rateLimitPerMonth: 50000,
      rateLimitPerMinute: 300,
      revokedAt: null,
    });

    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([
      {},
      {
        id: 'key-rotated',
        name: 'Production API',
        keyPrefix: 'snx_rotated1',
        tier: 'business',
        rateLimitPerMonth: 50000,
        rateLimitPerMinute: 300,
        isActive: true,
        createdAt: new Date(),
      },
    ]);

    const req = makePostRequest('http://localhost/api/developer/keys/key-1/rotate');
    const res = await rotateKeyPOST(req, routeParams);
    const body = await res.json();

    expect(body.data.name).toBe('Production API');
    expect(body.data.tier).toBe('business');
    expect(body.data.rateLimitPerMonth).toBe(50000);
    expect(body.data.rateLimitPerMinute).toBe(300);
  });

  it('uses a transaction for atomicity', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
      id: 'key-1',
      name: 'Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      revokedAt: null,
    });
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([
      {},
      {
        id: 'key-new',
        name: 'Key',
        keyPrefix: 'snx_newkey123',
        tier: 'developer',
        rateLimitPerMonth: 5000,
        rateLimitPerMinute: 60,
        isActive: true,
        createdAt: new Date(),
      },
    ]);

    const req = makePostRequest('http://localhost/api/developer/keys/key-1/rotate');
    await rotateKeyPOST(req, routeParams);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when transaction fails', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findFirst as jest.Mock).mockResolvedValue({
      id: 'key-1',
      name: 'Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      revokedAt: null,
    });
    (mockPrisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('Transaction failed'));

    const req = makePostRequest('http://localhost/api/developer/keys/key-1/rotate');
    const res = await rotateKeyPOST(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// =============================================================================
// GET /api/developer/usage
// =============================================================================

describe('GET /api/developer/usage', () => {
  it('requires authentication', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/developer/usage');
    const res = await usageGET(req);

    expect(res.status).toBe(401);
  });

  it('returns usage analytics for the default month period', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([{ id: 'key-1' }]);
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValue(150);
    (mockPrisma.apiUsageLog.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        { endpoint: '/api/v1/news', _count: { id: 100 } },
        { endpoint: '/api/v1/launches', _count: { id: 50 } },
      ])
      .mockResolvedValueOnce([
        { statusCode: 200, _count: { id: 140 } },
        { statusCode: 429, _count: { id: 10 } },
      ]);
    (mockPrisma.apiUsageLog.aggregate as jest.Mock).mockResolvedValue({
      _avg: { responseTimeMs: 145.3 },
    });
    (mockPrisma.apiUsageLog.findMany as jest.Mock).mockResolvedValue([
      { createdAt: new Date('2026-02-01T10:00:00Z'), statusCode: 200 },
      { createdAt: new Date('2026-02-01T11:00:00Z'), statusCode: 200 },
      { createdAt: new Date('2026-02-02T10:00:00Z'), statusCode: 500 },
    ]);

    const req = makeGetRequest('http://localhost/api/developer/usage');
    const res = await usageGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.totalCalls).toBe(150);
    expect(body.data.byEndpoint).toHaveLength(2);
    expect(body.data.byEndpoint[0].endpoint).toBe('/api/v1/news');
    expect(body.data.byStatusCode).toHaveLength(2);
    expect(body.data.avgResponseTimeMs).toBe(145);
    expect(body.data.dailyBreakdown).toHaveLength(2); // 2 unique days
    expect(body.data.period).toBe('month');
  });

  it('returns empty data when user has no keys', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/developer/usage');
    const res = await usageGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.totalCalls).toBe(0);
    expect(body.data.byEndpoint).toEqual([]);
    expect(body.data.dailyBreakdown).toEqual([]);
  });

  it('validates period parameter', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());

    const req = makeGetRequest('http://localhost/api/developer/usage?period=year');
    const res = await usageGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('day');
  });

  it('accepts custom date range via startDate and endDate', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([{ id: 'key-1' }]);
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiUsageLog.groupBy as jest.Mock).mockResolvedValue([]);
    (mockPrisma.apiUsageLog.aggregate as jest.Mock).mockResolvedValue({
      _avg: { responseTimeMs: null },
    });
    (mockPrisma.apiUsageLog.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest(
      'http://localhost/api/developer/usage?startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z'
    );
    const res = await usageGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.startDate).toContain('2026-01-01');
    expect(body.data.endDate).toContain('2026-01-31');
  });

  it('rejects invalid date format', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([{ id: 'key-1' }]);

    const req = makeGetRequest(
      'http://localhost/api/developer/usage?startDate=not-a-date&endDate=also-not'
    );
    const res = await usageGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('Invalid date');
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB crash'));

    const req = makeGetRequest('http://localhost/api/developer/usage');
    const res = await usageGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('accepts day and week periods', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    (mockPrisma.apiKey.findMany as jest.Mock).mockResolvedValue([{ id: 'key-1' }]);
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiUsageLog.groupBy as jest.Mock).mockResolvedValue([]);
    (mockPrisma.apiUsageLog.aggregate as jest.Mock).mockResolvedValue({
      _avg: { responseTimeMs: null },
    });
    (mockPrisma.apiUsageLog.findMany as jest.Mock).mockResolvedValue([]);

    for (const period of ['day', 'week']) {
      const req = makeGetRequest(`http://localhost/api/developer/usage?period=${period}`);
      const res = await usageGET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.period).toBe(period);
    }
  });
});

// =============================================================================
// authenticateApiKey middleware
// =============================================================================

describe('authenticateApiKey middleware', () => {
  it('authenticates a valid API key via Authorization header', async () => {
    const { key, hash } = generateApiKey();

    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
      name: 'Valid Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      expiresAt: null,
      revokedAt: null,
    });
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiUsageLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({});

    const req = makeApiRequest('http://localhost/api/v1/news', key);
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.apiKey.id).toBe('key-1');
      expect(result.apiKey.userId).toBe('user-1');
      expect(result.apiKey.tier).toBe('developer');
      expect(result.requestId).toBeDefined();
    }
  });

  it('authenticates a valid API key via X-API-Key header', async () => {
    const { key, hash } = generateApiKey();

    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
      name: 'Valid Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      expiresAt: null,
      revokedAt: null,
    });
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiUsageLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/v1/news', {
      method: 'GET',
      headers: { 'x-api-key': key },
    });
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(true);
  });

  it('rejects request with no API key', async () => {
    const req = new NextRequest('http://localhost/api/v1/news', { method: 'GET' });
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('Missing or invalid');
    }
  });

  it('rejects request with non-snx_ prefixed key', async () => {
    const req = new NextRequest('http://localhost/api/v1/news', {
      method: 'GET',
      headers: { authorization: 'Bearer sk_invalid_key_format' },
    });
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it('rejects an invalid (non-existent) API key', async () => {
    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeApiRequest('http://localhost/api/v1/news', 'snx_invalidkeythatdoesnotexist');
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error.message).toBe('Invalid API key.');
    }
  });

  it('rejects a revoked API key', async () => {
    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-revoked',
      userId: 'user-1',
      name: 'Revoked Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: false,
      expiresAt: null,
      revokedAt: new Date('2026-01-01'),
    });

    const req = makeApiRequest('http://localhost/api/v1/news', 'snx_revokedkey123456789012345678901234567890');
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error.message).toContain('revoked');
    }
  });

  it('rejects an inactive API key', async () => {
    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-inactive',
      userId: 'user-1',
      name: 'Inactive Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: false,
      expiresAt: null,
      revokedAt: null,
    });

    const req = makeApiRequest('http://localhost/api/v1/news', 'snx_inactivekey12345678901234567890123456789');
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error.message).toContain('revoked');
    }
  });

  it('rejects an expired API key', async () => {
    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-expired',
      userId: 'user-1',
      name: 'Expired Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      expiresAt: new Date('2025-01-01'), // expired long ago
      revokedAt: null,
    });

    const req = makeApiRequest('http://localhost/api/v1/news', 'snx_expiredkey1234567890123456789012345678901');
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error.message).toContain('expired');
    }
  });

  it('rate-limits when monthly limit is exceeded', async () => {
    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
      name: 'Overused Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      expiresAt: null,
      revokedAt: null,
    });
    // Monthly count at limit
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValueOnce(5000);

    const req = makeApiRequest('http://localhost/api/v1/news', 'snx_overlimitkey123456789012345678901234567890');
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(429);
      const body = await result.response.json();
      expect(body.error.code).toBe('RATE_LIMITED');
      expect(body.error.message).toContain('Monthly');
      // Should include rate limit headers
      expect(result.response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result.response.headers.get('Retry-After')).toBeDefined();
    }
  });

  it('rate-limits when per-minute limit is exceeded', async () => {
    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
      name: 'Spammy Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      expiresAt: null,
      revokedAt: null,
    });
    // Monthly count is fine
    (mockPrisma.apiUsageLog.count as jest.Mock)
      .mockResolvedValueOnce(100) // monthly: under limit
      .mockResolvedValueOnce(60); // per-minute: at limit

    const req = makeApiRequest('http://localhost/api/v1/news', 'snx_spammykey12345678901234567890123456789012');
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(429);
      const body = await result.response.json();
      expect(body.error.code).toBe('RATE_LIMITED');
      expect(body.error.message).toContain('Per-minute');
      expect(result.response.headers.get('Retry-After')).toBe('60');
    }
  });

  it('does not check monthly limit for enterprise tier (unlimited)', async () => {
    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-ent',
      userId: 'user-1',
      name: 'Enterprise Key',
      tier: 'enterprise',
      rateLimitPerMonth: -1,
      rateLimitPerMinute: 1000,
      isActive: true,
      expiresAt: null,
      revokedAt: null,
    });
    // Per-minute: under limit
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiUsageLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({});

    const req = makeApiRequest('http://localhost/api/v1/news', 'snx_enterprisekey1234567890123456789012345678');
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(true);
    // apiUsageLog.count should have been called only once (for per-minute), not for monthly
    // Since enterprise monthly is -1, the monthly check branch is skipped
    expect(mockPrisma.apiUsageLog.count).toHaveBeenCalledTimes(1);
  });

  it('logs API usage asynchronously on success', async () => {
    const { key } = generateApiKey();

    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
      name: 'Tracked Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      expiresAt: null,
      revokedAt: null,
    });
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiUsageLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({});

    const req = makeApiRequest('http://localhost/api/v1/news', key);
    await authenticateApiKey(req);

    // Non-blocking usage log creation (fire-and-forget)
    expect(mockPrisma.apiUsageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          apiKeyId: 'key-1',
          endpoint: '/api/v1/news',
          method: 'GET',
          statusCode: 200,
        }),
      })
    );
  });

  it('updates lastUsedAt on successful authentication', async () => {
    const { key } = generateApiKey();

    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
      name: 'Key',
      tier: 'developer',
      rateLimitPerMonth: 5000,
      rateLimitPerMinute: 60,
      isActive: true,
      expiresAt: null,
      revokedAt: null,
    });
    (mockPrisma.apiUsageLog.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiUsageLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.apiKey.update as jest.Mock).mockResolvedValue({});

    const req = makeApiRequest('http://localhost/api/v1/news', key);
    await authenticateApiKey(req);

    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key-1' },
        data: expect.objectContaining({
          lastUsedAt: expect.any(Date),
        }),
      })
    );
  });

  it('returns 500 when database lookup fails', async () => {
    (mockPrisma.apiKey.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

    const req = makeApiRequest('http://localhost/api/v1/news', 'snx_validformatkeybutdblookupfails12345678901');
    const result = await authenticateApiKey(req);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(500);
      const body = await result.response.json();
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toContain('Authentication service');
    }
  });

  it('includes X-Request-Id header in all error responses', async () => {
    // No key provided
    const req1 = new NextRequest('http://localhost/api/v1/news', { method: 'GET' });
    const result1 = await authenticateApiKey(req1);
    if (!result1.success) {
      expect(result1.response.headers.get('X-Request-Id')).toBeDefined();
    }

    // Invalid key
    (mockPrisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);
    const req2 = makeApiRequest('http://localhost/api/v1/news', 'snx_badkey1234567890123456789012345678901234');
    const result2 = await authenticateApiKey(req2);
    if (!result2.success) {
      expect(result2.response.headers.get('X-Request-Id')).toBeDefined();
    }
  });
});
