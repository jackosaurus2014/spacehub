/**
 * @jest-environment node
 */

/**
 * API route handler tests for AI insights endpoints:
 *   - GET  /api/ai-insights               (list, paginated, category filter)
 *   - GET  /api/ai-insights/[slug]         (detail by slug, published only)
 *   - GET  /api/ai-insights/[slug]/approve (token auth or admin session)
 *   - GET  /api/ai-insights/[slug]/reject  (token auth or admin session)
 *
 * Validates pagination, filtering, authorization, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    aIInsight: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
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

import { GET as listGET } from '@/app/api/ai-insights/route';
import { GET as detailGET } from '@/app/api/ai-insights/[slug]/route';
import { GET as approveGET } from '@/app/api/ai-insights/[slug]/approve/route';
import { GET as rejectGET } from '@/app/api/ai-insights/[slug]/reject/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function makeInsight(overrides: Record<string, unknown> = {}) {
  return {
    id: 'insight-1',
    title: 'Space Economy Growth Forecast 2026',
    slug: 'space-economy-growth-forecast-2026',
    summary: 'AI analysis of space economy growth trends for the coming year.',
    category: 'market-analysis',
    generatedAt: new Date('2026-01-15'),
    status: 'published',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/ai-insights (List)
// =============================================================================

describe('GET /api/ai-insights', () => {
  it('returns paginated insights with defaults', async () => {
    const insights = [
      makeInsight(),
      makeInsight({ id: 'insight-2', slug: 'another-insight', title: 'Another Insight' }),
    ];
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue(insights);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/ai-insights');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.insights).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(1);
  });

  it('respects custom page and limit params', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(50);

    const req = new NextRequest('http://localhost/api/ai-insights?page=3&limit=5');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // page 3 with limit 5 => skip = (3-1)*5 = 10
    expect(mockPrisma.aIInsight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
    expect(body.page).toBe(3);
    expect(body.totalPages).toBe(10); // 50/5 = 10
  });

  it('filters by category when provided', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/ai-insights?category=market-analysis');
    await listGET(req);

    const findManyCall = (mockPrisma.aIInsight.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.category).toBe('market-analysis');
  });

  it('always filters for status=published', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/ai-insights');
    await listGET(req);

    const findManyCall = (mockPrisma.aIInsight.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.status).toBe('published');
  });

  it('orders by generatedAt descending', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/ai-insights');
    await listGET(req);

    const findManyCall = (mockPrisma.aIInsight.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ generatedAt: 'desc' });
  });

  it('selects only required fields for list view', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/ai-insights');
    await listGET(req);

    const findManyCall = (mockPrisma.aIInsight.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.select).toEqual({
      id: true,
      title: true,
      slug: true,
      summary: true,
      category: true,
      generatedAt: true,
    });
  });

  it('returns empty results gracefully', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/ai-insights?category=nonexistent');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.insights).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.totalPages).toBe(0);
  });

  it('caps limit at 100', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/ai-insights?limit=500');
    await listGET(req);

    const findManyCall = (mockPrisma.aIInsight.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBeLessThanOrEqual(100);
  });

  it('clamps page to minimum 1', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIInsight.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/ai-insights?page=-5');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.page).toBe(1);
    // skip should be 0 for page 1
    expect(mockPrisma.aIInsight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    );
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.aIInsight.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    (mockPrisma.aIInsight.count as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = new NextRequest('http://localhost/api/ai-insights');
    const res = await listGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch AI insights');
  });
});

// =============================================================================
// GET /api/ai-insights/[slug] (Detail)
// =============================================================================

describe('GET /api/ai-insights/[slug]', () => {
  it('returns insight by slug when published', async () => {
    const insight = makeInsight();
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue(insight);

    const req = new NextRequest('http://localhost/api/ai-insights/space-economy-growth-forecast-2026');
    const res = await detailGET(req, { params: { slug: 'space-economy-growth-forecast-2026' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.insight).toBeDefined();
    expect(body.insight.slug).toBe('space-economy-growth-forecast-2026');
    expect(body.insight.title).toBe('Space Economy Growth Forecast 2026');
  });

  it('queries with slug and status=published', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue(makeInsight());

    const req = new NextRequest('http://localhost/api/ai-insights/test-slug');
    await detailGET(req, { params: { slug: 'test-slug' } });

    expect(mockPrisma.aIInsight.findFirst).toHaveBeenCalledWith({
      where: { slug: 'test-slug', status: 'published' },
    });
  });

  it('returns 404 when insight not found', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/ai-insights/nonexistent-slug');
    const res = await detailGET(req, { params: { slug: 'nonexistent-slug' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Insight not found');
  });

  it('returns 404 for draft/rejected insight (not published)', async () => {
    // Even though an insight exists with this slug, if status != published it won't match
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/ai-insights/draft-insight');
    const res = await detailGET(req, { params: { slug: 'draft-insight' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Insight not found');
  });

  it('returns 500 when prisma throws', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/ai-insights/some-slug');
    const res = await detailGET(req, { params: { slug: 'some-slug' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch AI insight');
  });
});

// =============================================================================
// GET /api/ai-insights/[slug]/approve
// =============================================================================

describe('GET /api/ai-insights/[slug]/approve', () => {
  it('approves insight with valid review token and redirects', async () => {
    // Token lookup finds the insight
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'insight-1' });
    // Update succeeds
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Approved Insight',
      slug: 'test-approve',
      status: 'published',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-approve/approve?token=valid-token-123'
    );
    const res = await approveGET(req, { params: { slug: 'test-approve' } });

    // Token-based approve redirects to the article page
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/ai-insights/test-approve?approved=true');
  });

  it('verifies token against slug and reviewToken in DB', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'insight-1' });
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Test',
      slug: 'my-slug',
      status: 'published',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/my-slug/approve?token=secret-review-token'
    );
    await approveGET(req, { params: { slug: 'my-slug' } });

    expect(mockPrisma.aIInsight.findFirst).toHaveBeenCalledWith({
      where: { slug: 'my-slug', reviewToken: 'secret-review-token' },
      select: { id: true },
    });
  });

  it('sets status to published and clears reviewToken', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'insight-1' });
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Test',
      slug: 'test-slug',
      status: 'published',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/approve?token=valid-token'
    );
    await approveGET(req, { params: { slug: 'test-slug' } });

    expect(mockPrisma.aIInsight.update).toHaveBeenCalledWith({
      where: { slug: 'test-slug' },
      data: { status: 'published', reviewToken: null },
      select: { id: true, title: true, slug: true, status: true },
    });
  });

  it('approves via admin session when no token provided', async () => {
    // No token lookup happens (token is null)
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Admin Approved',
      slug: 'admin-approve-slug',
      status: 'published',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/admin-approve-slug/approve'
    );
    const res = await approveGET(req, { params: { slug: 'admin-approve-slug' } });
    const body = await res.json();

    // Admin session (no token) returns JSON, not redirect
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.insight.status).toBe('published');
  });

  it('returns 401 when token is invalid and user is not admin', async () => {
    // Token lookup fails
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue(null);
    // No admin session
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/approve?token=bad-token'
    );
    const res = await approveGET(req, { params: { slug: 'test-slug' } });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when no token and user is not admin', async () => {
    // Non-admin session
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: false } } as any);

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/approve'
    );
    const res = await approveGET(req, { params: { slug: 'test-slug' } });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when no token and no session at all', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/approve'
    );
    const res = await approveGET(req, { params: { slug: 'test-slug' } });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 500 when prisma update throws', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'insight-1' });
    (mockPrisma.aIInsight.update as jest.Mock).mockRejectedValue(new Error('DB write error'));

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/approve?token=valid-token'
    );
    const res = await approveGET(req, { params: { slug: 'test-slug' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to approve insight');
  });

  it('skips token lookup when no token param provided', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Test',
      slug: 'test-slug',
      status: 'published',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/approve'
    );
    await approveGET(req, { params: { slug: 'test-slug' } });

    // findFirst should NOT be called since token is null
    expect(mockPrisma.aIInsight.findFirst).not.toHaveBeenCalled();
  });
});

// =============================================================================
// GET /api/ai-insights/[slug]/reject
// =============================================================================

describe('GET /api/ai-insights/[slug]/reject', () => {
  it('rejects insight with valid review token and redirects', async () => {
    // Token lookup finds the insight
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'insight-1' });
    // Update succeeds
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Rejected Insight',
      slug: 'test-reject',
      status: 'rejected',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-reject/reject?token=valid-token-456'
    );
    const res = await rejectGET(req, { params: { slug: 'test-reject' } });

    // Token-based reject redirects to the insights list
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/ai-insights?rejected=true');
  });

  it('verifies token against slug and reviewToken in DB', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'insight-1' });
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Test',
      slug: 'my-slug',
      status: 'rejected',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/my-slug/reject?token=review-token-xyz'
    );
    await rejectGET(req, { params: { slug: 'my-slug' } });

    expect(mockPrisma.aIInsight.findFirst).toHaveBeenCalledWith({
      where: { slug: 'my-slug', reviewToken: 'review-token-xyz' },
      select: { id: true },
    });
  });

  it('sets status to rejected and clears reviewToken', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'insight-1' });
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Test',
      slug: 'test-slug',
      status: 'rejected',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/reject?token=valid-token'
    );
    await rejectGET(req, { params: { slug: 'test-slug' } });

    expect(mockPrisma.aIInsight.update).toHaveBeenCalledWith({
      where: { slug: 'test-slug' },
      data: { status: 'rejected', reviewToken: null },
      select: { id: true, title: true, slug: true, status: true },
    });
  });

  it('rejects via admin session when no token provided', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Admin Rejected',
      slug: 'admin-reject-slug',
      status: 'rejected',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/admin-reject-slug/reject'
    );
    const res = await rejectGET(req, { params: { slug: 'admin-reject-slug' } });
    const body = await res.json();

    // Admin session (no token) returns JSON, not redirect
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.insight.status).toBe('rejected');
  });

  it('returns 401 when token is invalid and user is not admin', async () => {
    // Token lookup fails
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue(null);
    // No admin session
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/reject?token=bad-token'
    );
    const res = await rejectGET(req, { params: { slug: 'test-slug' } });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when no token and user is not admin', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: false } } as any);

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/reject'
    );
    const res = await rejectGET(req, { params: { slug: 'test-slug' } });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when no token and no session at all', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/reject'
    );
    const res = await rejectGET(req, { params: { slug: 'test-slug' } });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 500 when prisma update throws', async () => {
    (mockPrisma.aIInsight.findFirst as jest.Mock).mockResolvedValue({ id: 'insight-1' });
    (mockPrisma.aIInsight.update as jest.Mock).mockRejectedValue(new Error('DB write error'));

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/reject?token=valid-token'
    );
    const res = await rejectGET(req, { params: { slug: 'test-slug' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to reject insight');
  });

  it('skips token lookup when no token param provided', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.aIInsight.update as jest.Mock).mockResolvedValue({
      id: 'insight-1',
      title: 'Test',
      slug: 'test-slug',
      status: 'rejected',
    });

    const req = new NextRequest(
      'http://localhost/api/ai-insights/test-slug/reject'
    );
    await rejectGET(req, { params: { slug: 'test-slug' } });

    // findFirst should NOT be called since token is null
    expect(mockPrisma.aIInsight.findFirst).not.toHaveBeenCalled();
  });
});
