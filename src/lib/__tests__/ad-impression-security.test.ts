/**
 * @jest-environment node
 */

/**
 * Click-fraud regression guard for the ad server.
 *
 * `POST /api/ads/impression` used to accept any `{campaignId, placementId,
 * type}` body anonymously and `recordImpression` charged the campaign on
 * every call with no dedup. Campaign ids are public (they ride in the
 * served-ad JSON), so anyone could drain every advertiser's prepaid budget
 * with a loop of `type: 'click'` posts.
 *
 * Fix under test:
 *   1. `/api/ads/serve` mints an HMAC proof-of-serve token bound to the
 *      (campaign, placement) it served.
 *   2. `/api/ads/impression` requires that token (401 otherwise), checks
 *      expiry + binding, and refuses nonce replays.
 *   3. `recordImpression` records but does not charge repeat events from the
 *      same ip inside a window (click 24h, impression 10min).
 *   4. The route keys the ip on the rightmost x-forwarded-for entry, which a
 *      client cannot spoof.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    adPlacement: { findMany: jest.fn() },
    adImpression: { aggregate: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    adCampaign: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import prisma from '@/lib/db';
import {
  IMPRESSION_TOKEN_TTL_MS,
  _resetNonceStoreForTests,
  consumeNonce,
  mintImpressionToken,
  verifyImpressionToken,
} from '@/lib/ads/impression-token';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const ORIGINAL_ENV = process.env;
const SECRET = 'ad-token-test-secret-do-not-use-in-prod';
const CAMPAIGN = 'camp_abc123';
const PLACEMENT = 'plc_xyz789';

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, AD_TOKEN_SECRET: SECRET };
  _resetNonceStoreForTests();
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

function decodePayload(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
}

function encodePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Token primitives
// ─────────────────────────────────────────────────────────────────────────────

describe('impression token: mint/verify', () => {
  it('round-trips a freshly minted token', () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT, ip: '1.2.3.4' });

    expect(token.split('.')).toHaveLength(2);
    const result = verifyImpressionToken(token, { campaignId: CAMPAIGN, placementId: PLACEMENT });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.c).toBe(CAMPAIGN);
      expect(result.payload.p).toBe(PLACEMENT);
      expect(result.payload.n).toMatch(/^[0-9a-f]{32}$/);
      expect(result.payload.i).toBe('1.2.3.4');
      expect(result.payload.exp).toBeGreaterThan(Date.now());
      expect(result.payload.exp).toBeLessThanOrEqual(Date.now() + IMPRESSION_TOKEN_TTL_MS);
    }
  });

  it('mints a distinct nonce per token', () => {
    const a = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    const b = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    expect(decodePayload(a).n).not.toBe(decodePayload(b).n);
  });

  it('SECURITY: rejects a token whose payload was tampered with (campaign swap)', () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    const [, sig] = token.split('.');
    const tampered = `${encodePayload({ ...decodePayload(token), c: 'camp_victim' })}.${sig}`;

    const result = verifyImpressionToken(tampered, { campaignId: 'camp_victim', placementId: PLACEMENT });
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('SECURITY: rejects a token whose expiry was extended', () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    const [, sig] = token.split('.');
    const tampered = `${encodePayload({ ...decodePayload(token), exp: Date.now() + 1e12 })}.${sig}`;

    expect(verifyImpressionToken(tampered, { campaignId: CAMPAIGN, placementId: PLACEMENT })).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('SECURITY: rejects a token signed with a different secret', () => {
    process.env.AD_TOKEN_SECRET = 'attacker-guess';
    const forged = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    process.env.AD_TOKEN_SECRET = SECRET;

    expect(verifyImpressionToken(forged, { campaignId: CAMPAIGN, placementId: PLACEMENT })).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('SECURITY: rejects an expired token', () => {
    const mintedAt = Date.now() - IMPRESSION_TOKEN_TTL_MS - 1000;
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT }, mintedAt);

    expect(verifyImpressionToken(token, { campaignId: CAMPAIGN, placementId: PLACEMENT })).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('SECURITY: rejects a genuine token presented for a different campaign', () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });

    expect(verifyImpressionToken(token, { campaignId: 'camp_other', placementId: PLACEMENT })).toEqual({
      ok: false,
      reason: 'campaign_mismatch',
    });
  });

  it('SECURITY: rejects a genuine token presented for a different placement', () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });

    expect(verifyImpressionToken(token, { campaignId: CAMPAIGN, placementId: 'plc_other' })).toEqual({
      ok: false,
      reason: 'placement_mismatch',
    });
  });

  it('rejects malformed input without throwing', () => {
    for (const bad of ['', 'nodot', '.', 'a.', '.b', 'a.b.c', 'not-base64!.deadbeef', 42, null, undefined]) {
      const result = verifyImpressionToken(bad, { campaignId: CAMPAIGN, placementId: PLACEMENT });
      expect(result.ok).toBe(false);
    }
  });

  it('throws on mint when no signing secret is configured', () => {
    delete process.env.AD_TOKEN_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    expect(() => mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT })).toThrow(
      /AD_TOKEN_SECRET/
    );
  });

  it('falls back to CRON_SECRET, then NEXTAUTH_SECRET', () => {
    delete process.env.AD_TOKEN_SECRET;
    process.env.CRON_SECRET = 'cron-secret';
    const viaCron = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    expect(verifyImpressionToken(viaCron, { campaignId: CAMPAIGN, placementId: PLACEMENT }).ok).toBe(true);

    delete process.env.CRON_SECRET;
    process.env.NEXTAUTH_SECRET = 'nextauth-secret';
    expect(verifyImpressionToken(viaCron, { campaignId: CAMPAIGN, placementId: PLACEMENT }).ok).toBe(false);
    const viaNextAuth = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    expect(verifyImpressionToken(viaNextAuth, { campaignId: CAMPAIGN, placementId: PLACEMENT }).ok).toBe(true);
  });
});

describe('impression token: nonce store', () => {
  it('SECURITY: refuses to consume the same nonce twice', () => {
    const exp = Date.now() + 60_000;
    expect(consumeNonce('nonce-1', exp)).toBe(true);
    expect(consumeNonce('nonce-1', exp)).toBe(false);
    expect(consumeNonce('nonce-2', exp)).toBe(true);
  });

  it('forgets expired nonces on prune (bounded memory)', () => {
    const now = 1_000_000;
    expect(consumeNonce('old', now + 10, now)).toBe(true);
    // Well past expiry and past the prune interval.
    const later = now + 120_000;
    expect(consumeNonce('fresh', later + 60_000, later)).toBe(true);
    // 'old' expired and was pruned, so it is consumable again — this is the
    // documented per-instance/expiry limitation, not a replay hole: the token
    // itself is rejected as expired by verifyImpressionToken before we get here.
    expect(consumeNonce('old', later + 60_000, later)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Route-level behaviour
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVE_CAMPAIGN = {
  id: CAMPAIGN,
  cpmRate: 10,
  cpcRate: 2.5,
  budget: 1000,
  spent: 100,
  status: 'active',
};

function impressionRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/ads/impression', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ads/impression', () => {
  beforeEach(() => {
    (mockPrisma.adCampaign.findUnique as jest.Mock).mockResolvedValue(ACTIVE_CAMPAIGN);
    (mockPrisma.adImpression.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.adImpression.create as jest.Mock).mockResolvedValue({ id: 'imp_1' });
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([]);
  });

  async function post(body: Record<string, unknown>, headers?: Record<string, string>) {
    const { POST } = await import('@/app/api/ads/impression/route');
    // NextRequest and Request share the header/json surface the route uses.
    return POST(impressionRequest(body, headers) as never);
  }

  it('SECURITY: rejects a POST without a token (the original drain vector)', async () => {
    const res = await post({ campaignId: CAMPAIGN, placementId: PLACEMENT, type: 'click' });

    expect(res.status).toBe(400); // fails schema before it can reach the DB
    expect(mockPrisma.adCampaign.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('SECURITY: rejects a POST with a forged token (401) and charges nothing', async () => {
    const res = await post({
      campaignId: CAMPAIGN,
      placementId: PLACEMENT,
      type: 'click',
      token: `${encodePayload({ c: CAMPAIGN, p: PLACEMENT, exp: Date.now() + 1e6, n: 'a'.repeat(32) })}.${'0'.repeat(64)}`,
    });

    expect(res.status).toBe(401);
    expect(mockPrisma.adCampaign.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('SECURITY: rejects a genuine token replayed against a different campaign', async () => {
    const token = mintImpressionToken({ campaignId: 'camp_mine', placementId: PLACEMENT });
    const res = await post({ campaignId: CAMPAIGN, placementId: PLACEMENT, type: 'click', token });

    expect(res.status).toBe(401);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('records and charges exactly once for a valid token', async () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    const res = await post(
      { campaignId: CAMPAIGN, placementId: PLACEMENT, type: 'click', token },
      { 'x-forwarded-for': '9.9.9.9, 203.0.113.7', 'user-agent': 'jest' }
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ success: true, recorded: true, charged: true });

    expect(mockPrisma.adCampaign.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    // The charge path builds its rows via prisma.adImpression.create /
    // adCampaign.update inside the transaction array.
    const createArg = (mockPrisma.adImpression.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data).toMatchObject({
      campaignId: CAMPAIGN,
      placementId: PLACEMENT,
      type: 'click',
      revenue: 2.5,
      // Rightmost x-forwarded-for entry — the proxy-appended one, not the
      // client-controlled leftmost.
      ipAddress: '203.0.113.7',
    });
    const updateArg = (mockPrisma.adCampaign.update as jest.Mock).mock.calls[0][0];
    expect(updateArg).toMatchObject({ where: { id: CAMPAIGN }, data: { spent: { increment: 2.5 } } });
  });

  it('SECURITY: rejects the same token a second time (nonce replay)', async () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    const body = { campaignId: CAMPAIGN, placementId: PLACEMENT, type: 'click', token };

    const first = await post(body);
    expect(first.status).toBe(201);

    const second = await post(body);
    expect(second.status).toBe(401);
    await expect(second.json()).resolves.toMatchObject({ error: { reason: 'token_reused' } });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('SECURITY: records but does not charge a repeat click from the same ip inside 24h', async () => {
    (mockPrisma.adImpression.findFirst as jest.Mock).mockResolvedValue({ id: 'imp_prior' });

    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    const res = await post(
      { campaignId: CAMPAIGN, placementId: PLACEMENT, type: 'click', token },
      { 'x-forwarded-for': '203.0.113.7' }
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ success: true, recorded: true, charged: false });

    // Dedup window keyed on the right fields, sized for clicks (24h).
    const where = (mockPrisma.adImpression.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where).toMatchObject({
      campaignId: CAMPAIGN,
      placementId: PLACEMENT,
      type: 'click',
      ipAddress: '203.0.113.7',
    });
    const windowMs = Date.now() - (where.createdAt.gte as Date).getTime();
    expect(windowMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(windowMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);

    // Analytics row with revenue 0; no spend mutation.
    expect(mockPrisma.adImpression.create).toHaveBeenCalledTimes(1);
    expect((mockPrisma.adImpression.create as jest.Mock).mock.calls[0][0].data.revenue).toBe(0);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.adCampaign.update).not.toHaveBeenCalled();
  });

  it('uses a 10-minute dedup window for impressions', async () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    await post(
      { campaignId: CAMPAIGN, placementId: PLACEMENT, type: 'impression', token },
      { 'x-forwarded-for': '203.0.113.7' }
    );

    const where = (mockPrisma.adImpression.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.type).toBe('impression');
    const windowMs = Date.now() - (where.createdAt.gte as Date).getTime();
    expect(windowMs).toBeGreaterThan(9 * 60 * 1000);
    expect(windowMs).toBeLessThanOrEqual(10 * 60 * 1000 + 5000);
  });

  it('returns 503 and charges nothing when no signing secret is configured', async () => {
    const token = mintImpressionToken({ campaignId: CAMPAIGN, placementId: PLACEMENT });
    delete process.env.AD_TOKEN_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    const res = await post({ campaignId: CAMPAIGN, placementId: PLACEMENT, type: 'click', token });

    expect(res.status).toBe(503);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('GET /api/ads/serve', () => {
  it('attaches a verifiable token bound to the served campaign/placement', async () => {
    (mockPrisma.adPlacement.findMany as jest.Mock).mockResolvedValue([
      {
        id: PLACEMENT,
        campaignId: CAMPAIGN,
        position: 'sidebar',
        format: 'banner_300x250',
        title: 'T',
        description: null,
        imageUrl: null,
        linkUrl: 'https://example.com',
        ctaText: null,
        campaign: {
          id: CAMPAIGN,
          priority: 1,
          budget: 1000,
          spent: 0,
          dailyBudget: null,
          advertiser: { companyName: 'Acme', logoUrl: null },
        },
      },
    ]);

    const { GET } = await import('@/app/api/ads/serve/route');
    const res = await GET(
      new Request('http://localhost:3000/api/ads/serve?position=sidebar', {
        headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.7' },
      }) as never
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.campaignId).toBe(CAMPAIGN);
    expect(typeof json.data.token).toBe('string');

    const verified = verifyImpressionToken(json.data.token, { campaignId: CAMPAIGN, placementId: PLACEMENT });
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.payload.i).toBe('203.0.113.7');
  });
});
