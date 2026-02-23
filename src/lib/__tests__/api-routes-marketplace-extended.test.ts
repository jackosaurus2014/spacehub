/**
 * @jest-environment node
 */

/**
 * API route handler tests for extended marketplace endpoints:
 *   - GET/POST  /api/marketplace/proposals     (list/create proposals)
 *   - GET/POST  /api/marketplace/reviews        (list/create reviews)
 *   - POST      /api/marketplace/match          (run matching algorithm)
 *   - PUT       /api/marketplace/verify/admin   (admin verification override)
 *
 * Validates auth, validation, filtering, error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    rFQ: { findUnique: jest.fn(), findFirst: jest.fn() },
    proposal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    providerReview: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    companyProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    serviceListing: { findMany: jest.fn() },
    rFQProviderMatch: {
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
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

import { GET as proposalsGET, POST as proposalsPOST } from '@/app/api/marketplace/proposals/route';
import { GET as reviewsGET, POST as reviewsPOST } from '@/app/api/marketplace/reviews/route';
import { POST as matchPOST } from '@/app/api/marketplace/match/route';
import { PUT as verifyPUT } from '@/app/api/marketplace/verify/admin/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  rFQ: { findUnique: jest.Mock; findFirst: jest.Mock };
  proposal: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
  providerReview: { findMany: jest.Mock; findFirst: jest.Mock; count: jest.Mock; create: jest.Mock };
  companyProfile: { findUnique: jest.Mock; update: jest.Mock };
  serviceListing: { findMany: jest.Mock };
  rFQProviderMatch: { updateMany: jest.Mock; deleteMany: jest.Mock; createMany: jest.Mock };
};

const mockGetServerSession = getServerSession as jest.Mock;

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

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// POST /api/marketplace/proposals
// =============================================================================

describe('POST /api/marketplace/proposals', () => {
  const validProposalBody = {
    rfqId: 'rfq-1',
    approach: 'We will deliver a comprehensive launch service with full mission integration support.',
    price: 250000,
    pricingDetail: 'Fixed price per launch',
    timeline: '6 months',
  };

  it('creates proposal with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: 'company-1' });
    mockPrisma.rFQ.findUnique.mockResolvedValue({
      id: 'rfq-1',
      status: 'open',
      buyerUserId: 'buyer-user',
    });
    mockPrisma.proposal.findUnique.mockResolvedValue(null);
    mockPrisma.proposal.create.mockResolvedValue({
      id: 'proposal-1',
      rfqId: 'rfq-1',
      companyId: 'company-1',
      status: 'submitted',
    });
    mockPrisma.rFQProviderMatch.updateMany.mockResolvedValue({ count: 0 });

    const req = makePostRequest('http://localhost/api/marketplace/proposals', validProposalBody);
    const res = await proposalsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.proposal).toBeDefined();
    expect(body.proposal.id).toBe('proposal-1');
  });

  it('returns 401 without auth', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/marketplace/proposals', validProposalBody);
    const res = await proposalsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('returns 403 when user has no claimed company', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: null });

    const req = makePostRequest('http://localhost/api/marketplace/proposals', validProposalBody);
    const res = await proposalsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('claim a company profile');
  });

  it('validates required fields (rfqId, approach)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: 'company-1' });

    const req = makePostRequest('http://localhost/api/marketplace/proposals', {
      price: 1000,
    });
    const res = await proposalsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when RFQ does not exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: 'company-1' });
    mockPrisma.rFQ.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/marketplace/proposals', validProposalBody);
    const res = await proposalsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('RFQ not found');
  });

  it('returns 400 when RFQ is not open', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: 'company-1' });
    mockPrisma.rFQ.findUnique.mockResolvedValue({
      id: 'rfq-1',
      status: 'closed',
      buyerUserId: 'buyer-user',
    });

    const req = makePostRequest('http://localhost/api/marketplace/proposals', validProposalBody);
    const res = await proposalsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('no longer accepting proposals');
  });

  it('returns 409 when duplicate proposal exists', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: 'company-1' });
    mockPrisma.rFQ.findUnique.mockResolvedValue({
      id: 'rfq-1',
      status: 'open',
      buyerUserId: 'buyer-user',
    });
    mockPrisma.proposal.findUnique.mockResolvedValue({ id: 'existing-proposal' });

    const req = makePostRequest('http://localhost/api/marketplace/proposals', validProposalBody);
    const res = await proposalsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain('already submitted');
  });

  it('returns 400 when proposing on own RFQ', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: 'company-1' });
    mockPrisma.rFQ.findUnique.mockResolvedValue({
      id: 'rfq-1',
      status: 'open',
      buyerUserId: 'user-1', // same as session user
    });

    const req = makePostRequest('http://localhost/api/marketplace/proposals', validProposalBody);
    const res = await proposalsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('own RFQ');
  });
});

// =============================================================================
// GET /api/marketplace/proposals
// =============================================================================

describe('GET /api/marketplace/proposals', () => {
  it('returns proposals for authenticated user with company', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: 'company-1' });
    mockPrisma.proposal.findMany.mockResolvedValue([
      { id: 'proposal-1', rfqId: 'rfq-1', status: 'submitted' },
    ]);

    const req = new NextRequest('http://localhost/api/marketplace/proposals');
    const res = await proposalsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.proposals).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('returns 401 without auth', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/marketplace/proposals');
    const res = await proposalsGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('returns empty proposals when user has no company', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ claimedCompanyId: null });

    const req = new NextRequest('http://localhost/api/marketplace/proposals');
    const res = await proposalsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.proposals).toEqual([]);
    expect(body.total).toBe(0);
  });
});

// =============================================================================
// POST /api/marketplace/reviews
// =============================================================================

describe('POST /api/marketplace/reviews', () => {
  const validReviewBody = {
    companyId: 'company-1',
    overallRating: 4,
    qualityRating: 5,
    title: 'Great service!',
    content: 'They delivered exactly what was promised on time and under budget.',
  };

  it('creates review with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ id: 'company-1', name: 'TestCo' });
    mockPrisma.providerReview.findFirst.mockResolvedValue(null); // no existing review
    mockPrisma.providerReview.create.mockResolvedValue({
      id: 'review-1',
      companyId: 'company-1',
      overallRating: 4,
      isVerified: false,
      status: 'published',
    });

    const req = makePostRequest('http://localhost/api/marketplace/reviews', validReviewBody);
    const res = await reviewsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.review).toBeDefined();
    expect(body.review.id).toBe('review-1');
  });

  it('returns 401 without auth', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/marketplace/reviews', validReviewBody);
    const res = await reviewsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('validates rating range (overallRating must be 1-5)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });

    const req = makePostRequest('http://localhost/api/marketplace/reviews', {
      companyId: 'company-1',
      overallRating: 6, // out of range
    });
    const res = await reviewsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates rating range (overallRating must be >= 1)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });

    const req = makePostRequest('http://localhost/api/marketplace/reviews', {
      companyId: 'company-1',
      overallRating: 0,
    });
    const res = await reviewsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 404 when company does not exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.companyProfile.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/marketplace/reviews', validReviewBody);
    const res = await reviewsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Company not found');
  });

  it('returns 409 when user already reviewed this company', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ id: 'company-1' });
    mockPrisma.providerReview.findFirst.mockResolvedValue({ id: 'existing-review' });

    const req = makePostRequest('http://localhost/api/marketplace/reviews', validReviewBody);
    const res = await reviewsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain('already reviewed');
  });
});

// =============================================================================
// GET /api/marketplace/reviews
// =============================================================================

describe('GET /api/marketplace/reviews', () => {
  it('returns reviews for a company', async () => {
    mockPrisma.providerReview.findMany.mockResolvedValue([
      { id: 'review-1', companyId: 'company-1', overallRating: 5, qualityRating: null, timelineRating: null, commRating: null, valueRating: null },
      { id: 'review-2', companyId: 'company-1', overallRating: 4, qualityRating: null, timelineRating: null, commRating: null, valueRating: null },
    ]);
    mockPrisma.providerReview.count.mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/marketplace/reviews?companyId=company-1');
    const res = await reviewsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reviews).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.avgRatings).toBeDefined();
    expect(body.avgRatings.overall).toBe(4.5);
  });

  it('returns 400 when companyId is missing', async () => {
    const req = new NextRequest('http://localhost/api/marketplace/reviews');
    const res = await reviewsGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('companyId is required');
  });

  it('returns null avgRatings when no reviews exist', async () => {
    mockPrisma.providerReview.findMany.mockResolvedValue([]);
    mockPrisma.providerReview.count.mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/marketplace/reviews?companyId=company-1');
    const res = await reviewsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reviews).toEqual([]);
    expect(body.avgRatings).toBeNull();
  });
});

// =============================================================================
// POST /api/marketplace/match
// =============================================================================

describe('POST /api/marketplace/match', () => {
  it('returns matched providers for valid RFQ', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.rFQ.findUnique.mockResolvedValue({
      id: 'rfq-1',
      buyerUserId: 'user-1',
      category: 'launch',
      subcategory: null,
      budgetMax: 500000,
      complianceReqs: ['ITAR'],
    });
    mockPrisma.serviceListing.findMany.mockResolvedValue([
      {
        id: 'listing-1',
        category: 'launch',
        subcategory: null,
        priceMin: 200000,
        certifications: ['ITAR'],
        companyId: 'company-1',
        company: {
          id: 'company-1', slug: 'acme', name: 'Acme', logoUrl: null,
          verificationLevel: 'capability', tier: 'tier1',
          contactEmail: 'acme@test.com', cageCode: null, samUei: null,
        },
      },
    ]);
    mockPrisma.rFQProviderMatch.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.rFQProviderMatch.createMany.mockResolvedValue({ count: 1 });

    const req = makePostRequest('http://localhost/api/marketplace/match', { rfqId: 'rfq-1' });
    const res = await matchPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toBeDefined();
    expect(body.matches.length).toBeGreaterThan(0);
    expect(body.matches[0].score).toBeGreaterThan(20);
  });

  it('returns 401 without auth', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/marketplace/match', { rfqId: 'rfq-1' });
    const res = await matchPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('returns 400 without rfqId (Zod validated)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });

    const req = makePostRequest('http://localhost/api/marketplace/match', {});
    const res = await matchPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when RFQ does not exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.rFQ.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/marketplace/match', { rfqId: 'nonexistent' });
    const res = await matchPOST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('RFQ not found');
  });

  it('returns 403 when user is not the RFQ buyer', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockPrisma.rFQ.findUnique.mockResolvedValue({
      id: 'rfq-1',
      buyerUserId: 'other-user',
      category: 'launch',
    });

    const req = makePostRequest('http://localhost/api/marketplace/match', { rfqId: 'rfq-1' });
    const res = await matchPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Not authorized');
  });
});

// =============================================================================
// PUT /api/marketplace/verify/admin
// =============================================================================

describe('PUT /api/marketplace/verify/admin', () => {
  it('updates verification level for admin', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    mockPrisma.companyProfile.findUnique.mockResolvedValue({ id: 'company-1', name: 'TestCo' });
    mockPrisma.companyProfile.update.mockResolvedValue({
      id: 'company-1',
      name: 'TestCo',
      verificationLevel: 'performance',
      verifiedAt: new Date(),
    });

    const req = makePutRequest('http://localhost/api/marketplace/verify/admin', {
      companyId: 'company-1',
      level: 'performance',
    });
    const res = await verifyPUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.company.verificationLevel).toBe('performance');
  });

  it('returns 403 when user is not admin', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1', isAdmin: false } });

    const req = makePutRequest('http://localhost/api/marketplace/verify/admin', {
      companyId: 'company-1',
      level: 'identity',
    });
    const res = await verifyPUT(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('Admin access required');
  });

  it('returns 403 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePutRequest('http://localhost/api/marketplace/verify/admin', {
      companyId: 'company-1',
      level: 'identity',
    });
    const res = await verifyPUT(req);
    const body = await res.json();

    expect(res.status).toBe(403);
  });

  it('validates companyId and level are required', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });

    const req = makePutRequest('http://localhost/api/marketplace/verify/admin', {});
    const res = await verifyPUT(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates level enum', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });

    const req = makePutRequest('http://localhost/api/marketplace/verify/admin', {
      companyId: 'company-1',
      level: 'invalid_level',
    });
    const res = await verifyPUT(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 404 when company does not exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    mockPrisma.companyProfile.findUnique.mockResolvedValue(null);

    const req = makePutRequest('http://localhost/api/marketplace/verify/admin', {
      companyId: 'nonexistent',
      level: 'identity',
    });
    const res = await verifyPUT(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Company not found');
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    mockPrisma.companyProfile.findUnique.mockRejectedValue(new Error('DB error'));

    const req = makePutRequest('http://localhost/api/marketplace/verify/admin', {
      companyId: 'company-1',
      level: 'capability',
    });
    const res = await verifyPUT(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
