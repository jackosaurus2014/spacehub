/**
 * @jest-environment node
 */

/**
 * API route handler tests for marketplace endpoints:
 *   - GET/POST /api/marketplace/listings
 *   - GET/POST /api/marketplace/rfq
 *   - GET      /api/marketplace/stats
 *
 * Validates pagination, filtering, validation, auth, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    serviceListing: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    rFQ: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    proposal: { count: jest.fn() },
    providerReview: { count: jest.fn() },
    companyProfile: { count: jest.fn() },
    user: { findUnique: jest.fn() },
    rFQProviderMatch: { createMany: jest.fn() },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';

import { GET as listingsGET, POST as listingsPOST } from '@/app/api/marketplace/listings/route';
import { GET as rfqGET, POST as rfqPOST } from '@/app/api/marketplace/rfq/route';
import { GET as statsGET } from '@/app/api/marketplace/stats/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    slug: 'test-listing-launch',
    name: 'Test Launch Service',
    description: 'A comprehensive launch service for small satellites',
    category: 'launch',
    subcategory: 'small_launch',
    pricingType: 'fixed',
    priceMin: 100000,
    priceMax: 500000,
    priceUnit: 'USD',
    status: 'active',
    createdAt: new Date('2025-01-01'),
    company: {
      id: 'company-1',
      slug: 'acme-space',
      name: 'Acme Space Inc',
      logoUrl: null,
      country: 'US',
      verificationLevel: 'capability',
      tier: 'tier2',
    },
    ...overrides,
  };
}

function makeRFQ(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rfq-1',
    slug: 'rfq-test-request-abc123',
    title: 'Looking for satellite launch provider',
    description: 'We need a reliable launch provider for our small sat constellation',
    category: 'launch',
    subcategory: null,
    budgetMin: 50000,
    budgetMax: 200000,
    budgetCurrency: 'USD',
    deadline: null,
    complianceReqs: [],
    status: 'open',
    createdAt: new Date('2025-01-10'),
    _count: { proposals: 3 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/marketplace/listings
// =============================================================================

describe('GET /api/marketplace/listings', () => {
  it('returns listings with default pagination', async () => {
    const listings = [makeListing(), makeListing({ id: 'listing-2', name: 'Listing Two' })];
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue(listings);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/marketplace/listings');
    const res = await listingsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.listings).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.limit).toBe(20); // default limit
    expect(body.offset).toBe(0); // default offset
  });

  it('passes custom pagination params to prisma', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings?limit=5&offset=10');
    await listingsGET(req);

    expect(mockPrisma.serviceListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 })
    );
  });

  it('filters by category', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings?category=satellite');
    await listingsGET(req);

    const findManyCall = (mockPrisma.serviceListing.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.category).toBe('satellite');
  });

  it('applies text search across name, description, and company name', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings?q=rocket');
    await listingsGET(req);

    const findManyCall = (mockPrisma.serviceListing.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { name: { contains: 'rocket', mode: 'insensitive' } },
      { description: { contains: 'rocket', mode: 'insensitive' } },
      { company: { name: { contains: 'rocket', mode: 'insensitive' } } },
    ]);
  });

  it('sorts by price ascending when sort=price_asc', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings?sort=price_asc');
    await listingsGET(req);

    const findManyCall = (mockPrisma.serviceListing.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ priceMin: 'asc' });
  });

  it('sorts by price descending when sort=price_desc', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings?sort=price_desc');
    await listingsGET(req);

    const findManyCall = (mockPrisma.serviceListing.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ priceMax: 'desc' });
  });

  it('returns empty results gracefully', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings?q=nonexistent');
    const res = await listingsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.listings).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('always filters for active status', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings');
    await listingsGET(req);

    const findManyCall = (mockPrisma.serviceListing.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.status).toBe('active');
  });

  it('includes company data in the response', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings');
    await listingsGET(req);

    const findManyCall = (mockPrisma.serviceListing.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.include.company.select).toEqual(
      expect.objectContaining({
        id: true,
        slug: true,
        name: true,
        verificationLevel: true,
      })
    );
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    (mockPrisma.serviceListing.count as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = new NextRequest('http://localhost/api/marketplace/listings');
    const res = await listingsGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to search listings');
  });

  it('caps limit at 100', async () => {
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.serviceListing.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/listings?limit=500');
    await listingsGET(req);

    const findManyCall = (mockPrisma.serviceListing.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBeLessThanOrEqual(100);
  });
});

// =============================================================================
// POST /api/marketplace/listings
// =============================================================================

describe('POST /api/marketplace/listings', () => {
  const validListingBody = {
    name: 'Orbital Launch Service',
    description: 'A comprehensive orbital launch service for medium-sized payloads to LEO and beyond.',
    category: 'launch',
    pricingType: 'fixed',
    priceMin: 50000,
    priceMax: 250000,
    certifications: ['ISO-9001'],
  };

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(validListingBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await listingsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('returns 403 when user has no claimed company', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: null });

    const req = new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(validListingBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await listingsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('claim a company profile');
  });

  it('returns 400 for missing required fields', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: 'company-1' });

    const req = new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify({ name: 'AB' }), // too short, missing required fields
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await listingsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid category', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: 'company-1' });

    const req = new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify({
        ...validListingBody,
        category: 'invalid_category',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await listingsPOST(req);

    expect(res.status).toBe(400);
  });

  it('creates listing successfully with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: 'company-1' });

    const createdListing = {
      id: 'listing-new',
      slug: 'orbital-launch-service-launch-abc',
      name: 'Orbital Launch Service',
      company: { id: 'company-1', slug: 'acme-space', name: 'Acme Space Inc' },
    };
    (mockPrisma.serviceListing.create as jest.Mock).mockResolvedValue(createdListing);

    const req = new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(validListingBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await listingsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.listing).toBeDefined();
    expect(body.listing.id).toBe('listing-new');
  });

  it('passes companyId from user claimedCompanyId to create', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: 'my-company-42' });

    const createdListing = {
      id: 'listing-x',
      slug: 'test-slug',
      name: validListingBody.name,
      company: { id: 'my-company-42', slug: 'my-co', name: 'My Company' },
    };
    (mockPrisma.serviceListing.create as jest.Mock).mockResolvedValue(createdListing);

    const req = new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(validListingBody),
      headers: { 'Content-Type': 'application/json' },
    });
    await listingsPOST(req);

    const createCall = (mockPrisma.serviceListing.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.companyId).toBe('my-company-42');
    expect(createCall.data.status).toBe('active');
  });

  it('returns 500 when prisma create throws', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ claimedCompanyId: 'company-1' });
    (mockPrisma.serviceListing.create as jest.Mock).mockRejectedValue(new Error('DB write failed'));

    const req = new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(validListingBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await listingsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// GET /api/marketplace/rfq
// =============================================================================

describe('GET /api/marketplace/rfq', () => {
  it('returns RFQs with default pagination and open status', async () => {
    const rfqs = [makeRFQ(), makeRFQ({ id: 'rfq-2', title: 'Another RFQ' })];
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue(rfqs);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/marketplace/rfq');
    const res = await rfqGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rfqs).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.limit).toBe(20); // default
    expect(body.offset).toBe(0);
  });

  it('defaults status to open', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/rfq');
    await rfqGET(req);

    const findManyCall = (mockPrisma.rFQ.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.status).toBe('open');
  });

  it('filters by custom status', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/rfq?status=evaluating');
    await rfqGET(req);

    const findManyCall = (mockPrisma.rFQ.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.status).toBe('evaluating');
  });

  it('filters by category', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/rfq?category=satellite');
    await rfqGET(req);

    const findManyCall = (mockPrisma.rFQ.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.category).toBe('satellite');
  });

  it('respects custom limit and offset', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/rfq?limit=5&offset=15');
    await rfqGET(req);

    const findManyCall = (mockPrisma.rFQ.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBe(5);
    expect(findManyCall.skip).toBe(15);
  });

  it('caps limit at 100', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/rfq?limit=999');
    await rfqGET(req);

    const findManyCall = (mockPrisma.rFQ.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBeLessThanOrEqual(100);
  });

  it('always filters for isPublic: true', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/rfq');
    await rfqGET(req);

    const findManyCall = (mockPrisma.rFQ.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.isPublic).toBe(true);
  });

  it('includes proposal count in select', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/rfq');
    await rfqGET(req);

    const findManyCall = (mockPrisma.rFQ.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.select._count).toEqual({ select: { proposals: true } });
  });

  it('returns empty results gracefully', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.rFQ.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/rfq?category=nonexistent');
    const res = await rfqGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rfqs).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.rFQ.findMany as jest.Mock).mockRejectedValue(new Error('DB timeout'));
    (mockPrisma.rFQ.count as jest.Mock).mockRejectedValue(new Error('DB timeout'));

    const req = new NextRequest('http://localhost/api/marketplace/rfq');
    const res = await rfqGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch RFQs');
  });
});

// =============================================================================
// POST /api/marketplace/rfq
// =============================================================================

describe('POST /api/marketplace/rfq', () => {
  const validRfqBody = {
    title: 'Need satellite launch provider',
    description: 'We are looking for a reliable launch provider for a 300kg LEO satellite.',
    category: 'launch',
    budgetMin: 100000,
    budgetMax: 500000,
    budgetCurrency: 'USD',
    complianceReqs: ['ITAR'],
    isPublic: true,
  };

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify(validRfqBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await rfqPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('returns 400 for missing required fields', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify({ title: 'Hi' }), // title too short, missing description+category
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await rfqPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid category', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify({
        ...validRfqBody,
        category: 'totally_bogus',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await rfqPOST(req);

    expect(res.status).toBe(400);
  });

  it('creates RFQ successfully with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const createdRFQ = {
      id: 'rfq-new',
      slug: 'rfq-need-satellite-launch-provider-abc',
      title: validRfqBody.title,
      status: 'open',
    };
    (mockPrisma.rFQ.create as jest.Mock).mockResolvedValue(createdRFQ);
    // Mock the matching query (runs after creation)
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify(validRfqBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await rfqPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.rfq).toBeDefined();
    expect(body.rfq.id).toBe('rfq-new');
  });

  it('sets buyerUserId from session and status to open', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'buyer-42' } } as any);

    const createdRFQ = { id: 'rfq-new', slug: 'rfq-test', status: 'open' };
    (mockPrisma.rFQ.create as jest.Mock).mockResolvedValue(createdRFQ);
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify(validRfqBody),
      headers: { 'Content-Type': 'application/json' },
    });
    await rfqPOST(req);

    const createCall = (mockPrisma.rFQ.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.buyerUserId).toBe('buyer-42');
    expect(createCall.data.status).toBe('open');
  });

  it('runs matching algorithm after creation', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const createdRFQ = { id: 'rfq-match', slug: 'rfq-test', status: 'open' };
    (mockPrisma.rFQ.create as jest.Mock).mockResolvedValue(createdRFQ);

    const matchingListing = {
      id: 'listing-match',
      category: 'launch',
      subcategory: null,
      priceMin: 200000,
      certifications: ['ITAR'],
      companyId: 'company-match',
      company: {
        id: 'company-match',
        name: 'Match Corp',
        verificationLevel: 'performance',
        contactEmail: 'contact@match.com',
      },
    };
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([matchingListing]);
    (mockPrisma.rFQProviderMatch.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify(validRfqBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await rfqPOST(req);

    expect(res.status).toBe(201);

    // Verify matching listings were queried by category
    expect(mockPrisma.serviceListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: 'launch', status: 'active' },
      })
    );

    // Verify matches were saved
    expect(mockPrisma.rFQProviderMatch.createMany).toHaveBeenCalled();
    const matchData = (mockPrisma.rFQProviderMatch.createMany as jest.Mock).mock.calls[0][0].data;
    expect(matchData[0].rfqId).toBe('rfq-match');
    expect(matchData[0].listingId).toBe('listing-match');
    expect(matchData[0].matchScore).toBeGreaterThan(20);
  });

  it('still returns 201 if matching algorithm fails', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const createdRFQ = { id: 'rfq-ok', slug: 'rfq-test', status: 'open' };
    (mockPrisma.rFQ.create as jest.Mock).mockResolvedValue(createdRFQ);
    // Matching throws, but creation should still succeed
    (mockPrisma.serviceListing.findMany as jest.Mock).mockRejectedValue(new Error('Matching DB error'));

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify(validRfqBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await rfqPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.rfq.id).toBe('rfq-ok');
  });

  it('returns 500 when RFQ create throws', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (mockPrisma.rFQ.create as jest.Mock).mockRejectedValue(new Error('DB write fail'));

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify(validRfqBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await rfqPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it('uses default values for optional fields', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const createdRFQ = { id: 'rfq-defaults', slug: 'rfq-test', status: 'open' };
    (mockPrisma.rFQ.create as jest.Mock).mockResolvedValue(createdRFQ);
    (mockPrisma.serviceListing.findMany as jest.Mock).mockResolvedValue([]);

    // Send only required fields (title, description, category)
    const minimalBody = {
      title: 'Minimal RFQ for testing defaults',
      description: 'A minimal request for quotation with only required fields present.',
      category: 'satellite',
    };

    const req = new NextRequest('http://localhost/api/marketplace/rfq', {
      method: 'POST',
      body: JSON.stringify(minimalBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await rfqPOST(req);

    expect(res.status).toBe(201);

    const createCall = (mockPrisma.rFQ.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.budgetCurrency).toBe('USD'); // default
    expect(createCall.data.complianceReqs).toEqual([]); // default
    expect(createCall.data.isPublic).toBe(true); // default
  });
});

// =============================================================================
// GET /api/marketplace/stats
// =============================================================================

describe('GET /api/marketplace/stats', () => {
  it('returns all expected stat fields', async () => {
    (mockPrisma.serviceListing.count as jest.Mock)
      .mockResolvedValueOnce(50)   // totalListings
      .mockResolvedValueOnce(42);  // activeListings (where: { status: 'active' })
    (mockPrisma.rFQ.count as jest.Mock)
      .mockResolvedValueOnce(30)   // totalRFQs
      .mockResolvedValueOnce(15);  // openRFQs (where: { status: 'open' })
    (mockPrisma.proposal.count as jest.Mock).mockResolvedValue(100);
    (mockPrisma.companyProfile.count as jest.Mock).mockResolvedValue(25);
    (mockPrisma.providerReview.count as jest.Mock).mockResolvedValue(60);
    (mockPrisma.serviceListing.groupBy as jest.Mock).mockResolvedValue([
      { category: 'launch', _count: { id: 20 } },
      { category: 'satellite', _count: { id: 15 } },
    ]);

    const res = await statsGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalListings).toBe(50);
    expect(body.activeListings).toBe(42);
    expect(body.totalRFQs).toBe(30);
    expect(body.openRFQs).toBe(15);
    expect(body.totalProposals).toBe(100);
    expect(body.activeProviders).toBe(25);
    expect(body.totalReviews).toBe(60);
    expect(body.categories).toEqual([
      { category: 'launch', count: 20 },
      { category: 'satellite', count: 15 },
    ]);
  });

  it('returns empty categories array when no active listings', async () => {
    (mockPrisma.serviceListing.count as jest.Mock)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    (mockPrisma.rFQ.count as jest.Mock)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    (mockPrisma.proposal.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.companyProfile.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.providerReview.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.serviceListing.groupBy as jest.Mock).mockResolvedValue([]);

    const res = await statsGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.categories).toEqual([]);
    expect(body.totalListings).toBe(0);
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.serviceListing.count as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await statsGET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch marketplace stats');
  });

  it('queries claimed profiles for activeProviders', async () => {
    (mockPrisma.serviceListing.count as jest.Mock)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8);
    (mockPrisma.rFQ.count as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);
    (mockPrisma.proposal.count as jest.Mock).mockResolvedValue(20);
    (mockPrisma.companyProfile.count as jest.Mock).mockResolvedValue(7);
    (mockPrisma.providerReview.count as jest.Mock).mockResolvedValue(12);
    (mockPrisma.serviceListing.groupBy as jest.Mock).mockResolvedValue([]);

    await statsGET();

    expect(mockPrisma.companyProfile.count).toHaveBeenCalledWith({
      where: { claimedByUserId: { not: null } },
    });
  });

  it('queries published reviews for totalReviews', async () => {
    (mockPrisma.serviceListing.count as jest.Mock)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8);
    (mockPrisma.rFQ.count as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);
    (mockPrisma.proposal.count as jest.Mock).mockResolvedValue(20);
    (mockPrisma.companyProfile.count as jest.Mock).mockResolvedValue(7);
    (mockPrisma.providerReview.count as jest.Mock).mockResolvedValue(12);
    (mockPrisma.serviceListing.groupBy as jest.Mock).mockResolvedValue([]);

    await statsGET();

    expect(mockPrisma.providerReview.count).toHaveBeenCalledWith({
      where: { status: 'published' },
    });
  });
});
