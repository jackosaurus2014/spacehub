/**
 * @jest-environment node
 */

/**
 * API route handler tests for search endpoints:
 *   - GET  /api/search              (global multi-module search)
 *   - POST /api/search/ai-intent    (AI-powered intent classification)
 *   - GET  /api/search/company-intel (company intelligence search)
 *
 * Validates input validation, query params, auth, pagination, sorting,
 * sanitization, error handling, and Anthropic integration.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    newsArticle: { findMany: jest.fn() },
    companyProfile: { findMany: jest.fn() },
    spaceEvent: { findMany: jest.fn() },
    businessOpportunity: { findMany: jest.fn() },
    blogPost: { findMany: jest.fn() },
    governmentContractAward: { aggregate: jest.fn() },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';

import { GET as searchGET } from '@/app/api/search/route';
import { POST as aiIntentPOST } from '@/app/api/search/ai-intent/route';
import { GET as companyIntelGET } from '@/app/api/search/company-intel/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

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

function makeNewsArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'news-1',
    title: 'SpaceX launches Falcon 9',
    summary: 'SpaceX successfully launched a Falcon 9 rocket',
    url: 'https://example.com/spacex',
    source: 'SpaceNews',
    publishedAt: new Date('2026-02-01'),
    ...overrides,
  };
}

function makeCompanyProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'company-1',
    slug: 'spacex',
    name: 'SpaceX',
    ticker: null,
    sector: 'Launch',
    subsector: 'Reusable Rockets',
    headquarters: 'Hawthorne, CA',
    country: 'USA',
    isPublic: false,
    tier: 1,
    totalFunding: 7000000000,
    revenueEstimate: null,
    employeeCount: 12000,
    employeeRange: '10000+',
    dataCompleteness: 85,
    logoUrl: null,
    website: 'https://spacex.com',
    description: 'Space transportation company',
    scores: [],
    _count: {
      newsArticles: 5,
      contracts: 3,
      serviceListings: 2,
      satelliteAssets: 10,
      fundingRounds: 4,
      products: 6,
      events: 2,
      partnerships: 1,
      keyPersonnel: 3,
    },
    ...overrides,
  };
}

function makeSpaceEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    name: 'Falcon 9 Launch',
    description: 'Falcon 9 launch mission',
    type: 'Launch',
    status: 'Scheduled',
    launchDate: new Date('2026-03-01'),
    agency: 'SpaceX',
    ...overrides,
  };
}

function makeBusinessOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    slug: 'satellite-services-rfp',
    title: 'Satellite services RFP',
    description: 'Looking for satellite service providers',
    type: 'RFP',
    category: 'Satellite',
    sector: 'Communications',
    publishedAt: new Date('2026-01-15'),
    ...overrides,
  };
}

function makeBlogPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'blog-1',
    title: 'The Future of Space',
    excerpt: 'An analysis of space industry trends',
    url: 'https://example.com/future-of-space',
    authorName: 'Jane Doe',
    publishedAt: new Date('2026-01-20'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/search — Global multi-module search
// =============================================================================

describe('GET /api/search', () => {
  it('returns results from all content types with a valid query', async () => {
    const newsArticle = makeNewsArticle();
    const event = makeSpaceEvent();
    const opportunity = makeBusinessOpportunity();
    const blog = makeBlogPost();

    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([newsArticle]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([event]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([opportunity]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([blog]);

    const req = makeGetRequest('http://localhost/api/search?q=space');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.news).toHaveLength(1);
    expect(body.news[0].title).toBe('SpaceX launches Falcon 9');
    expect(body.events).toHaveLength(1);
    expect(body.opportunities).toHaveLength(1);
    expect(body.blogs).toHaveLength(1);
    expect(body.companies).toBeDefined();
  });

  it('requires query parameter (rejects missing q)', async () => {
    const req = makeGetRequest('http://localhost/api/search');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects query shorter than 2 characters', async () => {
    const req = makeGetRequest('http://localhost/api/search?q=a');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects query longer than 200 characters', async () => {
    const longQuery = 'a'.repeat(201);
    const req = makeGetRequest(`http://localhost/api/search?q=${longQuery}`);
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('handles empty results gracefully', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=zzzznonexistent');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.news).toEqual([]);
    expect(body.companies).toEqual([]);
    expect(body.events).toEqual([]);
    expect(body.opportunities).toEqual([]);
    expect(body.blogs).toEqual([]);
  });

  it('filters by specific modules when provided', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([makeNewsArticle()]);

    const req = makeGetRequest('http://localhost/api/search?q=rocket&modules=news');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.news).toHaveLength(1);
    // Other modules should be empty arrays (not searched)
    expect(body.companies).toEqual([]);
    expect(body.events).toEqual([]);
    expect(body.opportunities).toEqual([]);
    expect(body.blogs).toEqual([]);
    // Only news module should have been queried
    expect(mockPrisma.newsArticle.findMany).toHaveBeenCalled();
    expect(mockPrisma.spaceEvent.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.businessOpportunity.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.blogPost.findMany).not.toHaveBeenCalled();
  });

  it('supports multiple modules comma-separated', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([makeNewsArticle()]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([makeBlogPost()]);

    const req = makeGetRequest('http://localhost/api/search?q=launch&modules=news,blogs');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.news).toHaveLength(1);
    expect(body.blogs).toHaveLength(1);
    expect(mockPrisma.newsArticle.findMany).toHaveBeenCalled();
    expect(mockPrisma.blogPost.findMany).toHaveBeenCalled();
    expect(mockPrisma.spaceEvent.findMany).not.toHaveBeenCalled();
  });

  it('ignores invalid module names in the filter', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=test&modules=news,fakestuff,invalid');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Only news should have been searched
    expect(mockPrisma.newsArticle.findMany).toHaveBeenCalled();
    expect(body.news).toEqual([]);
  });

  it('respects the limit parameter', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=satellite&limit=10');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    // Verify that the limit was passed to Prisma queries
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    expect(newsCall.take).toBe(10);
  });

  it('caps limit at maximum of 20', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=satellite&limit=100');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    expect(newsCall.take).toBe(20);
  });

  it('defaults limit to 5 when not provided', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=satellite');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    expect(newsCall.take).toBe(5);
  });

  it('supports sortBy=date with sortOrder=asc', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=launch&sortBy=date&sortOrder=asc');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    expect(newsCall.orderBy).toEqual({ publishedAt: 'asc' });
  });

  it('supports sortBy=title', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=launch&sortBy=title&sortOrder=asc');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    expect(newsCall.orderBy).toEqual({ title: 'asc' });
  });

  it('defaults sortBy to relevance (date desc)', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=launch');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    expect(newsCall.orderBy).toEqual({ publishedAt: 'desc' });
  });

  it('supports dateFrom filter', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=launch&dateFrom=2026-01-01');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    // Check that the AND clause includes a date filter
    const dateCondition = newsCall.where.AND[1];
    expect(dateCondition).toHaveProperty('publishedAt');
    expect(dateCondition.publishedAt).toHaveProperty('gte');
  });

  it('supports dateFrom and dateTo together', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=launch&dateFrom=2026-01-01&dateTo=2026-02-01');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    const dateCondition = newsCall.where.AND[1];
    expect(dateCondition.publishedAt).toHaveProperty('gte');
    expect(dateCondition.publishedAt).toHaveProperty('lte');
  });

  it('sanitizes search input (trims whitespace)', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=%20%20rocket%20%20');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    // The contains filter should use the trimmed query
    expect(newsCall.where.AND[0].OR[0].title.contains).toBe('rocket');
  });

  it('uses case-insensitive search', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=SpaceX');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    expect(newsCall.where.AND[0].OR[0].title.mode).toBe('insensitive');
  });

  it('returns 500 when database throws', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=test');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Search failed');
  });

  it('searches news by title and summary', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=falcon&modules=news');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const newsCall = (mockPrisma.newsArticle.findMany as jest.Mock).mock.calls[0][0];
    const orFields = newsCall.where.AND[0].OR.map((cond: any) => Object.keys(cond)[0]);
    expect(orFields).toContain('title');
    expect(orFields).toContain('summary');
  });

  it('searches events by name, description, and mission', async () => {
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=falcon&modules=events');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const eventsCall = (mockPrisma.spaceEvent.findMany as jest.Mock).mock.calls[0][0];
    const orFields = eventsCall.where.AND[0].OR.map((cond: any) => Object.keys(cond)[0]);
    expect(orFields).toContain('name');
    expect(orFields).toContain('description');
    expect(orFields).toContain('mission');
  });

  it('searches companies by name, description, and ticker', async () => {
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search?q=ASTS&modules=companies');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    const companyCall = (mockPrisma.companyProfile as any).findMany.mock.calls[0][0];
    const orFields = companyCall.where.OR.map((cond: any) => Object.keys(cond)[0]);
    expect(orFields).toContain('name');
    expect(orFields).toContain('description');
    expect(orFields).toContain('ticker');
  });
});

// =============================================================================
// POST /api/search/ai-intent — AI-powered intent classification
// =============================================================================

describe('POST /api/search/ai-intent', () => {
  const validBody = { query: 'What companies make satellite constellations?' };

  it('requires authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/search/ai-intent', validBody);
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects missing query', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const req = makePostRequest('http://localhost/api/search/ai-intent', {});
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('rejects query shorter than 3 characters', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const req = makePostRequest('http://localhost/api/search/ai-intent', { query: 'ab' });
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('at least 3 characters');
  });

  it('rejects empty string query', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const req = makePostRequest('http://localhost/api/search/ai-intent', { query: '' });
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('rejects whitespace-only query (trims to empty)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const req = makePostRequest('http://localhost/api/search/ai-intent', { query: '   ' });
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns intent classification for valid query', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    const originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const mockResponse = {
      intent: 'capability_search',
      explanation: 'User is looking for satellite constellation companies',
      reformulatedQueries: ['satellite constellation manufacturers', 'LEO constellation providers'],
      suggestedCompanies: ['SpaceX', 'OneWeb', 'Amazon Kuiper'],
      suggestedModules: ['company-profiles', 'satellites'],
      suggestedFilters: { sector: 'satellite' },
    };

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
    });

    const req = makePostRequest('http://localhost/api/search/ai-intent', validBody);
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.intent).toBe('capability_search');
    expect(body.suggestedCompanies).toContain('SpaceX');
    expect(body.suggestedModules).toContain('company-profiles');
    expect(body.reformulatedQueries).toHaveLength(2);

    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('returns 503 when ANTHROPIC_API_KEY is not set', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    const originalEnv = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const req = makePostRequest('http://localhost/api/search/ai-intent', validBody);
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain('not configured');

    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('falls back to general intent when AI returns invalid JSON', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    const originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not valid JSON at all' }],
    });

    const req = makePostRequest('http://localhost/api/search/ai-intent', validBody);
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.intent).toBe('general');
    expect(body.reformulatedQueries).toEqual([validBody.query]);
    expect(body.suggestedCompanies).toEqual([]);
    expect(body.suggestedModules).toContain('company-profiles');
    expect(body.suggestedModules).toContain('news');

    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('returns 500 when AI content has no text block', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    const originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';

    mockCreate.mockResolvedValue({
      content: [],
    });

    const req = makePostRequest('http://localhost/api/search/ai-intent', validBody);
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('No response from AI');

    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('returns 500 when Anthropic API throws', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    const originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';

    mockCreate.mockRejectedValue(new Error('Rate limited'));

    const req = makePostRequest('http://localhost/api/search/ai-intent', validBody);
    const res = await aiIntentPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('AI search failed');

    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('trims the query before length validation', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    const originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ intent: 'general', explanation: 'test', reformulatedQueries: [], suggestedCompanies: [], suggestedModules: [], suggestedFilters: {} }) }],
    });

    // Query with leading/trailing spaces but enough chars after trim
    const req = makePostRequest('http://localhost/api/search/ai-intent', { query: '  rockets  ' });
    const res = await aiIntentPOST(req);

    expect(res.status).toBe(200);

    process.env.ANTHROPIC_API_KEY = originalEnv;
  });
});

// =============================================================================
// GET /api/search/company-intel — Company intelligence search
// =============================================================================

describe('GET /api/search/company-intel', () => {
  it('returns empty results when query is missing', async () => {
    const req = makeGetRequest('http://localhost/api/search/company-intel');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies).toEqual([]);
    expect(body.otherResults.news).toEqual([]);
    expect(body.otherResults.events).toEqual([]);
    expect(body.otherResults.opportunities).toEqual([]);
    expect(body.otherResults.blogs).toEqual([]);
  });

  it('returns empty results when query is shorter than 2 characters', async () => {
    const req = makeGetRequest('http://localhost/api/search/company-intel?q=a');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies).toEqual([]);
    expect(body.otherResults).toBeDefined();
  });

  it('returns company results for a valid query', async () => {
    const company = makeCompanyProfile();
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([company]);
    (mockPrisma.governmentContractAward as any).aggregate.mockResolvedValue({ _sum: { value: 5000000 } });
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=SpaceX');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies).toHaveLength(1);
    expect(body.companies[0].company.name).toBe('SpaceX');
    expect(body.companies[0].company.slug).toBe('spacex');
    expect(body.companies[0].company.tier).toBe(1);
  });

  it('includes module counts for matched companies', async () => {
    const company = makeCompanyProfile();
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([company]);
    (mockPrisma.governmentContractAward as any).aggregate.mockResolvedValue({ _sum: { value: 5000000 } });
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=SpaceX');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const moduleCounts = body.companies[0].moduleCounts;
    expect(moduleCounts.newsArticles).toBe(5);
    expect(moduleCounts.contracts).toBe(3);
    expect(moduleCounts.contractsValue).toBe(5000000);
    expect(moduleCounts.serviceListings).toBe(2);
    expect(moduleCounts.satelliteAssets).toBe(10);
    expect(moduleCounts.fundingRounds).toBe(4);
    expect(moduleCounts.products).toBe(6);
  });

  it('includes module links for matched companies', async () => {
    const company = makeCompanyProfile();
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([company]);
    (mockPrisma.governmentContractAward as any).aggregate.mockResolvedValue({ _sum: { value: 1000 } });
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=SpaceX');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const links = body.companies[0].moduleLinks;
    expect(links.profile).toBe('/company-profiles/spacex');
    expect(links.news).toBe('/news?company=spacex');
    expect(links.contracts).toBe('/company-profiles/spacex#contracts');
    expect(links.marketplace).toBe('/marketplace/search?company=SpaceX');
    expect(links.satellites).toBe('/company-profiles/spacex#satellites');
    expect(links.funding).toBe('/company-profiles/spacex#funding');
  });

  it('sets module links to null when count is zero', async () => {
    const company = makeCompanyProfile({
      _count: {
        newsArticles: 0,
        contracts: 0,
        serviceListings: 0,
        satelliteAssets: 0,
        fundingRounds: 0,
        products: 0,
        events: 0,
        partnerships: 0,
        keyPersonnel: 0,
      },
    });
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([company]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=NoData');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const links = body.companies[0].moduleLinks;
    expect(links.profile).toBe('/company-profiles/spacex');
    expect(links.news).toBeNull();
    expect(links.contracts).toBeNull();
    expect(links.marketplace).toBeNull();
    expect(links.satellites).toBeNull();
    expect(links.funding).toBeNull();
  });

  it('also returns non-company results (news, events, opportunities, blogs)', async () => {
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([makeNewsArticle()]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([makeSpaceEvent()]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([makeBusinessOpportunity()]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([makeBlogPost()]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=space');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies).toEqual([]);
    expect(body.otherResults.news).toHaveLength(1);
    expect(body.otherResults.events).toHaveLength(1);
    expect(body.otherResults.opportunities).toHaveLength(1);
    expect(body.otherResults.blogs).toHaveLength(1);
  });

  it('respects limit parameter', async () => {
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=test&limit=10');
    const res = await companyIntelGET(req);

    expect(res.status).toBe(200);
    // Verify limit was passed to company query
    const companyCall = (mockPrisma.companyProfile as any).findMany.mock.calls[0][0];
    expect(companyCall.take).toBe(10);
  });

  it('caps limit at maximum of 20', async () => {
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=test&limit=50');
    const res = await companyIntelGET(req);

    expect(res.status).toBe(200);
    const companyCall = (mockPrisma.companyProfile as any).findMany.mock.calls[0][0];
    expect(companyCall.take).toBe(20);
  });

  it('defaults limit to 5', async () => {
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=test');
    const res = await companyIntelGET(req);

    expect(res.status).toBe(200);
    const companyCall = (mockPrisma.companyProfile as any).findMany.mock.calls[0][0];
    expect(companyCall.take).toBe(5);
  });

  it('searches companies by name, ticker, description, and sector', async () => {
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=ASTS');
    const res = await companyIntelGET(req);

    expect(res.status).toBe(200);
    const companyCall = (mockPrisma.companyProfile as any).findMany.mock.calls[0][0];
    const orFields = companyCall.where.OR.map((cond: any) => Object.keys(cond)[0]);
    expect(orFields).toContain('name');
    expect(orFields).toContain('ticker');
    expect(orFields).toContain('description');
    expect(orFields).toContain('sector');
  });

  it('orders companies by tier then name', async () => {
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=test');
    const res = await companyIntelGET(req);

    expect(res.status).toBe(200);
    const companyCall = (mockPrisma.companyProfile as any).findMany.mock.calls[0][0];
    expect(companyCall.orderBy).toEqual([{ tier: 'asc' }, { name: 'asc' }]);
  });

  it('skips contract value aggregation when company has no contracts', async () => {
    const company = makeCompanyProfile({
      _count: {
        ...makeCompanyProfile()._count,
        contracts: 0,
      },
    });
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([company]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=test');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies[0].moduleCounts.contractsValue).toBe(0);
    // Should NOT have called aggregate since contracts count is 0
    expect((mockPrisma.governmentContractAward as any).aggregate).not.toHaveBeenCalled();
  });

  it('handles null contract aggregate value', async () => {
    const company = makeCompanyProfile();
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([company]);
    (mockPrisma.governmentContractAward as any).aggregate.mockResolvedValue({ _sum: { value: null } });
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=test');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies[0].moduleCounts.contractsValue).toBe(0);
  });

  it('returns 500 when database throws', async () => {
    (mockPrisma.companyProfile as any).findMany.mockRejectedValue(new Error('DB down'));

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=test');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Company intelligence search failed');
  });

  it('uses case-insensitive search for all fields', async () => {
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue([]);
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=spacex');
    const res = await companyIntelGET(req);

    expect(res.status).toBe(200);
    const companyCall = (mockPrisma.companyProfile as any).findMany.mock.calls[0][0];
    for (const condition of companyCall.where.OR) {
      const field = Object.keys(condition)[0];
      expect(condition[field].mode).toBe('insensitive');
    }
  });

  it('returns multiple companies when multiple match', async () => {
    const companies = [
      makeCompanyProfile({ id: 'c1', slug: 'spacex', name: 'SpaceX' }),
      makeCompanyProfile({ id: 'c2', slug: 'space-one', name: 'Space One', _count: { ...makeCompanyProfile()._count, contracts: 0 } }),
    ];
    (mockPrisma.companyProfile as any).findMany.mockResolvedValue(companies);
    (mockPrisma.governmentContractAward as any).aggregate.mockResolvedValue({ _sum: { value: 100000 } });
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.businessOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/search/company-intel?q=space');
    const res = await companyIntelGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.companies).toHaveLength(2);
    expect(body.companies[0].company.name).toBe('SpaceX');
    expect(body.companies[1].company.name).toBe('Space One');
  });
});
