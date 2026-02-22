/**
 * @jest-environment node
 */

/**
 * API route handler tests for company profiles endpoints:
 *   - GET  /api/company-profiles               (directory listing, paginated, filtered)
 *   - GET  /api/company-profiles/[slug]         (detail by slug)
 *   - POST /api/company-profiles/[slug]/claim   (claim a profile)
 *   - POST /api/companies/request               (submit new company request)
 *   - GET  /api/companies/request               (admin list of requests)
 *
 * Validates pagination, filtering, sorting, authorization, validation, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    companyProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    companyAddRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: 'email-1' }) },
  })),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';

import { GET as listGET } from '@/app/api/company-profiles/route';
import { GET as detailGET } from '@/app/api/company-profiles/[slug]/route';
import { POST as claimPOST } from '@/app/api/company-profiles/[slug]/claim/route';
import { POST as requestPOST, GET as requestGET } from '@/app/api/companies/request/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function makeCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: 'company-1',
    slug: 'spacex',
    name: 'SpaceX',
    ticker: null,
    exchange: null,
    headquarters: 'Hawthorne, CA',
    country: 'US',
    foundedYear: 2002,
    employeeRange: '10000+',
    website: 'https://www.spacex.com',
    description: 'Space Exploration Technologies Corp.',
    logoUrl: null,
    isPublic: false,
    marketCap: null,
    status: 'active',
    sector: 'Launch Services',
    subsector: 'Heavy Launch',
    tags: ['launch', 'rockets', 'reusable'],
    tier: 1,
    totalFunding: 10000000000,
    lastFundingRound: 'Series N',
    valuation: 150000000000,
    revenueEstimate: 5000000000,
    ownershipType: 'private',
    dataCompleteness: 85,
    claimedByUserId: null,
    claimedAt: null,
    verificationLevel: null,
    _count: {
      fundingRounds: 12,
      products: 5,
      keyPersonnel: 8,
      contracts: 20,
      events: 30,
      satelliteAssets: 5000,
      facilities: 3,
    },
    ...overrides,
  };
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    companyName: 'Acme Space Corp',
    description: 'A new space company specializing in orbital logistics',
    website: 'https://acmespace.com',
    submitterEmail: 'user@example.com',
    status: 'pending',
    createdAt: new Date('2026-01-10'),
    ...overrides,
  };
}

function makeStats() {
  return {
    _count: 50,
    _sum: { totalFunding: 100000000000, marketCap: 500000000000 },
    _avg: { dataCompleteness: 72.5 },
  };
}

function makeSectors() {
  return [
    { sector: 'Launch Services', _count: 15 },
    { sector: 'Satellite Manufacturing', _count: 12 },
    { sector: 'Earth Observation', _count: 8 },
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/company-profiles (Directory Listing)
// =============================================================================

describe('GET /api/company-profiles', () => {
  function setupListMocks(companies: unknown[] = [], total = 0) {
    (mockPrisma.companyProfile.findMany as jest.Mock).mockResolvedValue(companies);
    (mockPrisma.companyProfile.count as jest.Mock).mockResolvedValue(total);
    (mockPrisma.companyProfile.aggregate as jest.Mock).mockResolvedValue(makeStats());
    (mockPrisma.companyProfile.groupBy as jest.Mock).mockResolvedValue(makeSectors());
  }

  it('returns paginated companies with defaults', async () => {
    const companies = [makeCompany(), makeCompany({ id: 'company-2', slug: 'blue-origin', name: 'Blue Origin' })];
    setupListMocks(companies, 2);

    const req = new NextRequest('http://localhost/api/company-profiles');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
  });

  it('returns aggregate stats with response', async () => {
    setupListMocks([makeCompany()], 1);

    const req = new NextRequest('http://localhost/api/company-profiles');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stats).toBeDefined();
    expect(body.stats.totalCompanies).toBe(50);
    expect(body.stats.totalFundingTracked).toBe(100000000000);
    expect(body.stats.totalMarketCap).toBe(500000000000);
    expect(body.stats.avgCompleteness).toBe(73); // Math.round(72.5)
    expect(body.stats.sectors).toHaveLength(3);
  });

  it('filters by tier', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?tier=1');
    await listGET(req);

    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.tier).toBe(1);
  });

  it('filters by sector', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?sector=Launch%20Services');
    await listGET(req);

    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.sector).toBe('Launch Services');
  });

  it('filters by tag', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?tag=launch');
    await listGET(req);

    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.tags).toEqual({ has: 'launch' });
  });

  it('filters by country', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?country=US');
    await listGET(req);

    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.country).toBe('US');
  });

  it('filters by isPublic flag', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?isPublic=true');
    await listGET(req);

    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.isPublic).toBe(true);
  });

  it('supports search query across multiple fields', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?search=spacex');
    await listGET(req);

    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.OR).toBeDefined();
    expect(findManyCall.where.OR).toHaveLength(4);
    expect(findManyCall.where.OR[0]).toEqual({ name: { contains: 'spacex', mode: 'insensitive' } });
    expect(findManyCall.where.OR[1]).toEqual({ description: { contains: 'spacex', mode: 'insensitive' } });
    expect(findManyCall.where.OR[2]).toEqual({ ticker: { contains: 'spacex', mode: 'insensitive' } });
    expect(findManyCall.where.OR[3]).toEqual({ headquarters: { contains: 'spacex', mode: 'insensitive' } });
  });

  it('supports sorting by valid fields', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?sortBy=totalFunding&sortOrder=desc');
    await listGET(req);

    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ totalFunding: 'desc' });
  });

  it('defaults to name asc for invalid sort field', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?sortBy=invalidField');
    await listGET(req);

    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ name: 'asc' });
  });

  it('respects custom limit and offset', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?limit=10&offset=20');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.limit).toBe(10);
    expect(body.offset).toBe(20);
    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.skip).toBe(20);
    expect(findManyCall.take).toBe(10);
  });

  it('caps limit at 100', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?limit=500');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.limit).toBe(100);
    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBeLessThanOrEqual(100);
  });

  it('clamps offset to minimum 0', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?offset=-10');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.offset).toBe(0);
    const findManyCall = (mockPrisma.companyProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.skip).toBe(0);
  });

  it('returns empty results gracefully', async () => {
    setupListMocks([], 0);

    const req = new NextRequest('http://localhost/api/company-profiles?sector=NonExistentSector');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.companyProfile.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    (mockPrisma.companyProfile.count as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = new NextRequest('http://localhost/api/company-profiles');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to fetch company profiles');
  });
});

// =============================================================================
// GET /api/company-profiles/[slug] (Detail)
// =============================================================================

describe('GET /api/company-profiles/[slug]', () => {
  function makeDetailCompany(overrides: Record<string, unknown> = {}) {
    return {
      ...makeCompany(),
      fundingRounds: [{ id: 'fr-1', amount: 1000000000, date: new Date('2024-01-15') }],
      revenueEstimates: [],
      products: [{ id: 'p-1', name: 'Falcon 9' }, { id: 'p-2', name: 'Starship' }],
      keyPersonnel: [{ id: 'kp-1', name: 'Elon Musk', isCurrent: true }],
      acquisitions: [],
      acquisitionsOf: [],
      partnerships: [],
      secFilings: [],
      competitorOf: [
        { competitor: { id: 'c-1', slug: 'blue-origin', name: 'Blue Origin', logoUrl: null, sector: 'Launch Services' } },
      ],
      contracts: [
        { id: 'con-1', value: 3000000000, awardDate: new Date('2024-06-01') },
        { id: 'con-2', value: 1500000000, awardDate: new Date('2023-12-01') },
      ],
      events: [{ id: 'ev-1', date: new Date('2024-01-01') }],
      satelliteAssets: [
        { id: 'sat-1', status: 'active', launchDate: new Date('2023-01-01') },
        { id: 'sat-2', status: 'active', launchDate: new Date('2023-06-01') },
        { id: 'sat-3', status: 'decommissioned', launchDate: new Date('2020-01-01') },
      ],
      facilities: [{ id: 'fac-1', type: 'launch-site' }],
      scores: [],
      ...overrides,
    };
  }

  it('returns company by slug with all related data', async () => {
    const company = makeDetailCompany();
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue(company);

    const req = new NextRequest('http://localhost/api/company-profiles/spacex');
    const res = await detailGET(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.slug).toBe('spacex');
    expect(body.name).toBe('SpaceX');
    expect(body.fundingRounds).toHaveLength(1);
    expect(body.products).toHaveLength(2);
  });

  it('includes computed summary stats', async () => {
    const company = makeDetailCompany();
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue(company);

    const req = new NextRequest('http://localhost/api/company-profiles/spacex');
    const res = await detailGET(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(body.summary).toBeDefined();
    expect(body.summary.totalContractValue).toBe(4500000000); // 3B + 1.5B
    expect(body.summary.activeSatellites).toBe(2);
    expect(body.summary.totalSatellites).toBe(3);
    expect(body.summary.totalFundingRounds).toBe(1);
    expect(body.summary.totalProducts).toBe(2);
    expect(body.summary.totalPersonnel).toBe(1);
    expect(body.summary.totalFacilities).toBe(1);
    expect(body.summary.totalEvents).toBe(1);
    expect(body.summary.competitors).toHaveLength(1);
  });

  it('returns 404 for nonexistent slug', async () => {
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/company-profiles/nonexistent-corp');
    const res = await detailGET(req, { params: { slug: 'nonexistent-corp' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Company profile not found');
  });

  it('handles company with empty related arrays', async () => {
    const company = makeDetailCompany({
      contracts: [],
      satelliteAssets: [],
      fundingRounds: [],
      products: [],
      keyPersonnel: [],
      facilities: [],
      events: [],
      competitorOf: [],
    });
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue(company);

    const req = new NextRequest('http://localhost/api/company-profiles/new-startup');
    const res = await detailGET(req, { params: { slug: 'new-startup' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.totalContractValue).toBe(0);
    expect(body.summary.activeSatellites).toBe(0);
    expect(body.summary.totalFundingRounds).toBe(0);
    expect(body.summary.competitors).toEqual([]);
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/company-profiles/spacex');
    const res = await detailGET(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toContain('Failed to fetch company profile');
  });
});

// =============================================================================
// POST /api/company-profiles/[slug]/claim
// =============================================================================

describe('POST /api/company-profiles/[slug]/claim', () => {
  function makeClaimRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/company-profiles/spacex/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('successfully claims profile with domain-matching email', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      name: 'SpaceX',
      slug: 'spacex',
      claimedByUserId: null,
      website: 'https://www.spacex.com',
      tier: 1,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: null });
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([
      {
        id: 'company-1',
        slug: 'spacex',
        name: 'SpaceX',
        verificationLevel: 'identity',
      },
      {},
    ]);

    const req = makeClaimRequest({ contactEmail: 'user@spacex.com' });
    const res = await claimPOST(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.company.slug).toBe('spacex');
    expect(body.company.verificationLevel).toBe('identity');
    expect(body.message).toContain('identity');
  });

  it('claims non-tier-1 profile with non-matching email (pending verification)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-2',
      name: 'Small Space Co',
      slug: 'small-space-co',
      claimedByUserId: null,
      website: 'https://smallspaco.com',
      tier: 3,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: null });
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([
      {
        id: 'company-2',
        slug: 'small-space-co',
        name: 'Small Space Co',
        verificationLevel: 'pending',
      },
      {},
    ]);

    const req = makeClaimRequest({ contactEmail: 'someone@gmail.com' });
    const res = await claimPOST(req, { params: { slug: 'small-space-co' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('pending');
  });

  it('rejects unauthenticated request with 401', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeClaimRequest({ contactEmail: 'user@spacex.com' });
    const res = await claimPOST(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('rejects when profile already claimed by another user', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-2' } } as any);
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      name: 'SpaceX',
      slug: 'spacex',
      claimedByUserId: 'user-1',
      website: 'https://www.spacex.com',
      tier: 1,
    });

    const req = makeClaimRequest({ contactEmail: 'user@spacex.com' });
    const res = await claimPOST(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('This profile has already been claimed');
  });

  it('rejects when user already claimed the same profile', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      name: 'SpaceX',
      slug: 'spacex',
      claimedByUserId: 'user-1',
      website: 'https://www.spacex.com',
      tier: 1,
    });

    const req = makeClaimRequest({ contactEmail: 'user@spacex.com' });
    const res = await claimPOST(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('You have already claimed this profile');
  });

  it('rejects when user has already claimed a different company', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-2',
      name: 'Blue Origin',
      slug: 'blue-origin',
      claimedByUserId: null,
      website: 'https://www.blueorigin.com',
      tier: 1,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: 'company-1' });

    const req = makeClaimRequest({ contactEmail: 'user@blueorigin.com' });
    const res = await claimPOST(req, { params: { slug: 'blue-origin' } });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain('already claimed a company');
  });

  it('rejects if company not found with 404', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeClaimRequest({ contactEmail: 'user@example.com' });
    const res = await claimPOST(req, { params: { slug: 'nonexistent' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Company not found');
  });

  it('rejects tier 1 company claim when email domain does not match', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-1',
      name: 'SpaceX',
      slug: 'spacex',
      claimedByUserId: null,
      website: 'https://www.spacex.com',
      tier: 1,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: null });

    const req = makeClaimRequest({ contactEmail: 'user@gmail.com' });
    const res = await claimPOST(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('Tier 1');
    expect(body.error).toContain('matching company email domain');
  });

  it('rejects invalid body (missing contactEmail)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const req = makeClaimRequest({});
    const res = await claimPOST(req, { params: { slug: 'spacex' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 500 when prisma transaction throws', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'company-2',
      name: 'Small Co',
      slug: 'small-co',
      claimedByUserId: null,
      website: 'https://smallco.com',
      tier: 3,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: null });
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

    const req = makeClaimRequest({ contactEmail: 'user@smallco.com' });
    const res = await claimPOST(req, { params: { slug: 'small-co' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to claim company profile');
  });
});

// =============================================================================
// POST /api/companies/request (Submit New Company Request)
// =============================================================================

describe('POST /api/companies/request', () => {
  function makeSubmitRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/companies/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('successfully creates a company request with all fields', async () => {
    (mockPrisma.companyAddRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.companyAddRequest.create as jest.Mock).mockResolvedValue(makeRequest());

    const req = makeSubmitRequest({
      companyName: 'Acme Space Corp',
      description: 'A new space company specializing in orbital logistics',
      website: 'https://acmespace.com',
      submitterEmail: 'user@example.com',
    });
    const res = await requestPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Company request submitted successfully');
    expect(body.id).toBe('req-1');
  });

  it('successfully creates a request with only required fields', async () => {
    (mockPrisma.companyAddRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.companyAddRequest.create as jest.Mock).mockResolvedValue(makeRequest({ website: null, submitterEmail: null }));

    const req = makeSubmitRequest({
      companyName: 'Minimal Space Corp',
      description: 'This is a minimal company request description',
    });
    const res = await requestPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('rejects missing required fields (companyName)', async () => {
    const req = makeSubmitRequest({
      description: 'Some description for the company',
    });
    const res = await requestPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects missing required fields (description)', async () => {
    const req = makeSubmitRequest({
      companyName: 'Acme Space',
    });
    const res = await requestPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects description that is too short', async () => {
    const req = makeSubmitRequest({
      companyName: 'Acme Space',
      description: 'Too short',
    });
    const res = await requestPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects invalid URL format for website', async () => {
    const req = makeSubmitRequest({
      companyName: 'Acme Space Corp',
      description: 'A new space company specializing in orbital logistics',
      website: 'not-a-valid-url',
    });
    const res = await requestPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects duplicate pending request for same company name', async () => {
    (mockPrisma.companyAddRequest.findFirst as jest.Mock).mockResolvedValue(makeRequest());

    const req = makeSubmitRequest({
      companyName: 'Acme Space Corp',
      description: 'A new space company specializing in orbital logistics',
    });
    const res = await requestPOST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('already pending');
  });

  it('returns 500 when prisma create throws', async () => {
    (mockPrisma.companyAddRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.companyAddRequest.create as jest.Mock).mockRejectedValue(new Error('DB write error'));

    const req = makeSubmitRequest({
      companyName: 'Acme Space Corp',
      description: 'A new space company specializing in orbital logistics',
    });
    const res = await requestPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// GET /api/companies/request (Admin List of Requests)
// =============================================================================

describe('GET /api/companies/request', () => {
  it('returns requests list for admin users', async () => {
    const requests = [
      makeRequest(),
      makeRequest({ id: 'req-2', companyName: 'Orbital Dynamics Inc' }),
    ];
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.companyAddRequest.findMany as jest.Mock).mockResolvedValue(requests);

    const res = await requestGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.requests).toHaveLength(2);
    expect(body.requests[0].companyName).toBe('Acme Space Corp');
  });

  it('orders requests by createdAt descending', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.companyAddRequest.findMany as jest.Mock).mockResolvedValue([]);

    await requestGET();

    expect(mockPrisma.companyAddRequest.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('rejects non-admin users with 403', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: false } } as any);

    const res = await requestGET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('rejects unauthenticated users with 403', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await requestGET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns empty array when no requests exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.companyAddRequest.findMany as jest.Mock).mockResolvedValue([]);

    const res = await requestGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.requests).toEqual([]);
  });

  it('returns 500 when prisma throws', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.companyAddRequest.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await requestGET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch company requests');
  });
});
