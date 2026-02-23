/**
 * @jest-environment node
 */

/**
 * API route handler tests for the SpaceNexus v1 commercial API:
 *   - GET /api/v1/news        (space news articles)
 *   - GET /api/v1/companies   (space company profiles)
 *   - GET /api/v1/launches    (upcoming launches)
 *   - GET /api/v1/satellites   (satellite data)
 *
 * All v1 routes require a valid API key via the authenticateApiKey middleware.
 * Tests verify auth enforcement (401 for missing/invalid keys) and success paths.
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock the API auth middleware
const mockAuthenticateApiKey = jest.fn();
const mockAddRateLimitHeaders = jest.fn().mockImplementation((response) => response);

jest.mock('@/lib/api-auth-middleware', () => ({
  authenticateApiKey: (...args: unknown[]) => mockAuthenticateApiKey(...args),
  addRateLimitHeaders: (...args: unknown[]) => mockAddRateLimitHeaders(...args),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    spaceCompany: { findMany: jest.fn(), count: jest.fn() },
    spaceEvent: { findMany: jest.fn(), count: jest.fn() },
    apiUsageLog: { create: jest.fn().mockResolvedValue({}) },
    apiKey: { update: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/lib/news-fetcher', () => ({
  getNewsArticles: jest.fn(),
}));

jest.mock('@/lib/dynamic-content', () => ({
  getModuleContent: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/errors', () => ({
  constrainPagination: jest.fn((val, max) => Math.min(Math.max(val || 20, 1), max || 100)),
  constrainOffset: jest.fn((val) => Math.max(val || 0, 0)),
  safeJsonParse: jest.fn((str, fallback) => {
    try { return JSON.parse(str); } catch { return fallback; }
  }),
  internalError: jest.fn((msg) =>
    NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: msg || 'Internal server error' } },
      { status: 500 }
    )
  ),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getNewsArticles } from '@/lib/news-fetcher';
import { getModuleContent } from '@/lib/dynamic-content';

import { GET as newsGET } from '@/app/api/v1/news/route';
import { GET as companiesGET } from '@/app/api/v1/companies/route';
import { GET as launchesGET } from '@/app/api/v1/launches/route';
import { GET as satellitesGET } from '@/app/api/v1/satellites/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  spaceCompany: { findMany: jest.Mock; count: jest.Mock };
  spaceEvent: { findMany: jest.Mock; count: jest.Mock };
};

const mockGetNewsArticles = getNewsArticles as jest.Mock;
const mockGetModuleContent = getModuleContent as jest.Mock;

function makeAuthSuccess(tier = 'developer') {
  return {
    success: true as const,
    apiKey: { id: 'key-1', userId: 'user-1', tier, name: 'Test Key' },
    requestId: 'req-123',
  };
}

function makeAuthFailure(status = 401, message = 'Missing or invalid API key.') {
  return {
    success: false as const,
    response: NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message } },
      { status }
    ),
  };
}

function makeGetRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// API Key Authentication (shared behavior)
// =============================================================================

describe('v1 API Key Authentication', () => {
  it('GET /api/v1/news returns 401 without API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthFailure());

    const req = makeGetRequest('http://localhost/api/v1/news');
    const res = await newsGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/news returns 401 with invalid API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(
      makeAuthFailure(401, 'Invalid API key.')
    );

    const req = makeGetRequest('http://localhost/api/v1/news', {
      'x-api-key': 'snx_invalid_key_here',
    });
    const res = await newsGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('GET /api/v1/companies returns 401 without API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthFailure());

    const req = makeGetRequest('http://localhost/api/v1/companies');
    const res = await companiesGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('GET /api/v1/launches returns 401 without API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthFailure());

    const req = makeGetRequest('http://localhost/api/v1/launches');
    const res = await launchesGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('GET /api/v1/satellites returns 401 without API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthFailure());

    const req = makeGetRequest('http://localhost/api/v1/satellites');
    const res = await satellitesGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('rate limiting returns 429 for exhausted monthly quota', async () => {
    mockAuthenticateApiKey.mockResolvedValue({
      success: false as const,
      response: NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Monthly API limit exceeded' } },
        { status: 429 }
      ),
    });

    const req = makeGetRequest('http://localhost/api/v1/news');
    const res = await newsGET(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
  });
});

// =============================================================================
// GET /api/v1/news
// =============================================================================

describe('GET /api/v1/news', () => {
  it('returns news articles with valid API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockGetNewsArticles.mockResolvedValue({
      articles: [
        { id: 'article-1', title: 'SpaceX Launch', category: 'launch' },
        { id: 'article-2', title: 'Mars Mission', category: 'exploration' },
      ],
      total: 2,
    });

    const req = makeGetRequest('http://localhost/api/v1/news');
    const res = await newsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toBeDefined();
  });

  it('passes category filter to getNewsArticles', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockGetNewsArticles.mockResolvedValue({ articles: [], total: 0 });

    const req = makeGetRequest('http://localhost/api/v1/news?category=launch');
    await newsGET(req);

    expect(mockGetNewsArticles).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'launch' })
    );
  });

  it('adds rate limit headers to response', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockGetNewsArticles.mockResolvedValue({ articles: [], total: 0 });

    const req = makeGetRequest('http://localhost/api/v1/news');
    await newsGET(req);

    expect(mockAddRateLimitHeaders).toHaveBeenCalledWith(
      expect.any(NextResponse),
      'req-123',
      'developer'
    );
  });

  it('returns 500 when data fetcher throws', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockGetNewsArticles.mockRejectedValue(new Error('Fetch failed'));

    const req = makeGetRequest('http://localhost/api/v1/news');
    const res = await newsGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// GET /api/v1/companies
// =============================================================================

describe('GET /api/v1/companies', () => {
  it('returns company data with valid API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockPrisma.spaceCompany.findMany.mockResolvedValue([
      {
        id: 'company-1',
        slug: 'spacex',
        name: 'SpaceX',
        description: 'Space Exploration Technologies',
        country: 'US',
        isPublic: false,
        focusAreas: '["launch","satellite"]',
        subSectors: null,
      },
    ]);
    mockPrisma.spaceCompany.count.mockResolvedValue(1);

    const req = makeGetRequest('http://localhost/api/v1/companies');
    const res = await companiesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('SpaceX');
    expect(body.pagination.total).toBe(1);
  });

  it('applies search filter', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockPrisma.spaceCompany.findMany.mockResolvedValue([]);
    mockPrisma.spaceCompany.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/v1/companies?search=SpaceX');
    await companiesGET(req);

    const findManyCall = mockPrisma.spaceCompany.findMany.mock.calls[0][0];
    expect(findManyCall.where.name).toEqual({
      contains: 'SpaceX',
      mode: 'insensitive',
    });
  });

  it('applies sector filter', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockPrisma.spaceCompany.findMany.mockResolvedValue([]);
    mockPrisma.spaceCompany.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/v1/companies?sector=launch');
    await companiesGET(req);

    const findManyCall = mockPrisma.spaceCompany.findMany.mock.calls[0][0];
    expect(findManyCall.where.focusAreas).toEqual({ contains: 'launch' });
  });

  it('returns 500 when database throws', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockPrisma.spaceCompany.findMany.mockRejectedValue(new Error('DB error'));
    mockPrisma.spaceCompany.count.mockRejectedValue(new Error('DB error'));

    const req = makeGetRequest('http://localhost/api/v1/companies');
    const res = await companiesGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// GET /api/v1/launches
// =============================================================================

describe('GET /api/v1/launches', () => {
  it('returns upcoming launches with valid API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    mockPrisma.spaceEvent.findMany.mockResolvedValue([
      {
        id: 'launch-1',
        name: 'Falcon 9 Mission',
        type: 'launch',
        status: 'upcoming',
        launchDate: futureDate,
        agency: 'SpaceX',
        location: 'Cape Canaveral',
      },
    ]);
    mockPrisma.spaceEvent.count.mockResolvedValue(1);

    const req = makeGetRequest('http://localhost/api/v1/launches');
    const res = await launchesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Falcon 9 Mission');
  });

  it('filters by provider', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockPrisma.spaceEvent.findMany.mockResolvedValue([]);
    mockPrisma.spaceEvent.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/v1/launches?provider=SpaceX');
    await launchesGET(req);

    const findManyCall = mockPrisma.spaceEvent.findMany.mock.calls[0][0];
    expect(findManyCall.where.agency).toEqual({
      contains: 'SpaceX',
      mode: 'insensitive',
    });
  });

  it('only returns future launches with valid statuses', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockPrisma.spaceEvent.findMany.mockResolvedValue([]);
    mockPrisma.spaceEvent.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/v1/launches');
    await launchesGET(req);

    const findManyCall = mockPrisma.spaceEvent.findMany.mock.calls[0][0];
    expect(findManyCall.where.launchDate.gte).toBeInstanceOf(Date);
    expect(findManyCall.where.status.in).toEqual(['upcoming', 'go', 'tbc', 'tbd']);
  });

  it('orders launches by launchDate ascending', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockPrisma.spaceEvent.findMany.mockResolvedValue([]);
    mockPrisma.spaceEvent.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/v1/launches');
    await launchesGET(req);

    const findManyCall = mockPrisma.spaceEvent.findMany.mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ launchDate: 'asc' });
  });

  it('returns 500 when database throws', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockPrisma.spaceEvent.findMany.mockRejectedValue(new Error('DB error'));
    mockPrisma.spaceEvent.count.mockRejectedValue(new Error('DB error'));

    const req = makeGetRequest('http://localhost/api/v1/launches');
    const res = await launchesGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// GET /api/v1/satellites
// =============================================================================

describe('GET /api/v1/satellites', () => {
  it('returns satellite data with valid API key', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockGetModuleContent.mockResolvedValue([
      {
        data: {
          id: 'sat-1',
          name: 'Starlink-123',
          noradId: '12345',
          orbitType: 'LEO',
          altitude: 550,
          velocity: 7.6,
          operator: 'SpaceX',
          country: 'US',
          status: 'active',
          purpose: 'Communications',
        },
      },
    ]);

    const req = makeGetRequest('http://localhost/api/v1/satellites');
    const res = await satellitesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Starlink-123');
  });

  it('filters by orbitType', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockGetModuleContent.mockResolvedValue([
      { data: { id: 'sat-1', orbitType: 'LEO', operator: 'SpaceX', status: 'active' } },
      { data: { id: 'sat-2', orbitType: 'GEO', operator: 'SES', status: 'active' } },
    ]);

    const req = makeGetRequest('http://localhost/api/v1/satellites?orbitType=LEO');
    const res = await satellitesGET(req);
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].orbitType).toBe('LEO');
    expect(body.pagination.total).toBe(1);
  });

  it('filters by operator (case insensitive)', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockGetModuleContent.mockResolvedValue([
      { data: { id: 'sat-1', orbitType: 'LEO', operator: 'SpaceX', status: 'active' } },
      { data: { id: 'sat-2', orbitType: 'LEO', operator: 'Boeing', status: 'active' } },
    ]);

    const req = makeGetRequest('http://localhost/api/v1/satellites?operator=spacex');
    const res = await satellitesGET(req);
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].operator).toBe('SpaceX');
  });

  it('returns empty data when dynamic content is unavailable', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    mockGetModuleContent.mockRejectedValue(new Error('Content unavailable'));

    const req = makeGetRequest('http://localhost/api/v1/satellites');
    const res = await satellitesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it('respects pagination (limit and offset)', async () => {
    mockAuthenticateApiKey.mockResolvedValue(makeAuthSuccess());
    const satellites = Array.from({ length: 10 }, (_, i) => ({
      data: { id: `sat-${i}`, orbitType: 'LEO', operator: 'SpaceX', status: 'active' },
    }));
    mockGetModuleContent.mockResolvedValue(satellites);

    const req = makeGetRequest('http://localhost/api/v1/satellites?limit=3&offset=2');
    const res = await satellitesGET(req);
    const body = await res.json();

    expect(body.data).toHaveLength(3);
    expect(body.pagination.total).toBe(10);
    expect(body.pagination.offset).toBe(2);
  });
});
