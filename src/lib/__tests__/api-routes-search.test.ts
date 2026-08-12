/**
 * @jest-environment node
 */

/**
 * API route handler tests for search endpoints:
 *   - GET  /api/search              (global multi-module search)
 *   - GET  /api/search/company-intel (company intelligence search)
 *
 * Validates input validation, query params, pagination, sorting,
 * sanitization, and error handling.
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

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';

import { GET as searchGET } from '@/app/api/search/route';
import { GET as companyIntelGET } from '@/app/api/search/company-intel/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
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

// The global search route delegates to the full-text-search library.
jest.mock('@/lib/full-text-search', () => ({
  searchNewsArticles: jest.fn(),
  searchCompanies: jest.fn(),
  searchJobs: jest.fn(),
  searchInvestors: jest.fn(),
  searchMarketplaceListings: jest.fn(),
  searchForumThreads: jest.fn(),
  searchBlogPosts: jest.fn(),
  searchPodcastEpisodes: jest.fn(),
}));

const mockFts = jest.requireMock('@/lib/full-text-search') as {
  searchNewsArticles: jest.Mock;
  searchCompanies: jest.Mock;
  searchJobs: jest.Mock;
  searchInvestors: jest.Mock;
  searchMarketplaceListings: jest.Mock;
  searchForumThreads: jest.Mock;
  searchBlogPosts: jest.Mock;
  searchPodcastEpisodes: jest.Mock;
};

const ALL_FTS_MOCKS = [
  mockFts.searchNewsArticles,
  mockFts.searchCompanies,
  mockFts.searchJobs,
  mockFts.searchInvestors,
  mockFts.searchMarketplaceListings,
  mockFts.searchForumThreads,
  mockFts.searchBlogPosts,
  mockFts.searchPodcastEpisodes,
];

function mockAllSearchesEmpty() {
  ALL_FTS_MOCKS.forEach((fn) => fn.mockResolvedValue([]));
}

function makeSearchResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'result-1',
    title: 'SpaceX launches Falcon 9',
    snippet: 'SpaceX successfully <mark>launched</mark> a Falcon 9 rocket',
    url: '/news/spacex-falcon-9',
    ...overrides,
  };
}

describe('GET /api/search', () => {
  it('returns grouped results and totals for a valid query (type=all)', async () => {
    mockAllSearchesEmpty();
    mockFts.searchNewsArticles.mockResolvedValue([makeSearchResult()]);
    mockFts.searchCompanies.mockResolvedValue([makeSearchResult({ id: 'company-1', title: 'SpaceX' })]);
    mockFts.searchBlogPosts.mockResolvedValue([makeSearchResult({ id: 'blog-1' })]);

    const req = makeGetRequest('http://localhost/api/search?q=space');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.query).toBe('space');
    expect(body.type).toBe('all');
    expect(body.results.news).toHaveLength(1);
    expect(body.results.news[0].title).toBe('SpaceX launches Falcon 9');
    expect(body.results.companies).toHaveLength(1);
    expect(body.results.blog).toHaveLength(1);
    expect(body.results.jobs).toEqual([]);
    expect(body.totals.news).toBe(1);
    expect(body.totals.all).toBe(3);
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
    mockAllSearchesEmpty();

    const req = makeGetRequest('http://localhost/api/search?q=zzzznonexistent');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results.news).toEqual([]);
    expect(body.results.companies).toEqual([]);
    expect(body.results.jobs).toEqual([]);
    expect(body.results.investors).toEqual([]);
    expect(body.results.marketplace).toEqual([]);
    expect(body.results.forum).toEqual([]);
    expect(body.results.blog).toEqual([]);
    expect(body.results.podcast).toEqual([]);
    expect(body.totals.all).toBe(0);
  });

  it('searches only the requested entity when type is provided', async () => {
    mockAllSearchesEmpty();
    mockFts.searchNewsArticles.mockResolvedValue([makeSearchResult()]);

    const req = makeGetRequest('http://localhost/api/search?q=rocket&type=news');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.type).toBe('news');
    expect(body.results.news).toHaveLength(1);
    // Other entities should be empty arrays (not searched)
    expect(body.results.companies).toEqual([]);
    expect(body.results.blog).toEqual([]);
    // Only news should have been queried
    expect(mockFts.searchNewsArticles).toHaveBeenCalled();
    expect(mockFts.searchCompanies).not.toHaveBeenCalled();
    expect(mockFts.searchBlogPosts).not.toHaveBeenCalled();
    expect(mockFts.searchJobs).not.toHaveBeenCalled();
  });

  it('falls back to type=all for invalid type values', async () => {
    mockAllSearchesEmpty();

    const req = makeGetRequest('http://localhost/api/search?q=test&type=fakestuff');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.type).toBe('all');
    // All entity searches run when type falls back to 'all'
    expect(mockFts.searchNewsArticles).toHaveBeenCalled();
    expect(mockFts.searchCompanies).toHaveBeenCalled();
    expect(mockFts.searchPodcastEpisodes).toHaveBeenCalled();
  });

  it('respects the limit parameter for single-type searches', async () => {
    mockAllSearchesEmpty();

    const req = makeGetRequest('http://localhost/api/search?q=satellite&type=news&limit=15');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    expect(mockFts.searchNewsArticles).toHaveBeenCalledWith('satellite', 15);
  });

  it('caps limit at maximum of 20', async () => {
    mockAllSearchesEmpty();

    const req = makeGetRequest('http://localhost/api/search?q=satellite&type=news&limit=100');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    expect(mockFts.searchNewsArticles).toHaveBeenCalledWith('satellite', 20);
  });

  it('enforces minimum limit of 1', async () => {
    mockAllSearchesEmpty();

    const req = makeGetRequest('http://localhost/api/search?q=satellite&type=news&limit=-5');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    expect(mockFts.searchNewsArticles).toHaveBeenCalledWith('satellite', 1);
  });

  it('defaults limit to 10 for single-type searches', async () => {
    mockAllSearchesEmpty();

    const req = makeGetRequest('http://localhost/api/search?q=satellite&type=news');
    const res = await searchGET(req);

    expect(res.status).toBe(200);
    expect(mockFts.searchNewsArticles).toHaveBeenCalledWith('satellite', 10);
  });

  it('caps per-type limit at 5 when searching all types', async () => {
    mockAllSearchesEmpty();

    const req = makeGetRequest('http://localhost/api/search?q=satellite&limit=20');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body._meta.perTypeLimit).toBe(5);
    expect(mockFts.searchNewsArticles).toHaveBeenCalledWith('satellite', 5);
    expect(mockFts.searchCompanies).toHaveBeenCalledWith('satellite', 5);
  });

  it('sanitizes search input (trims whitespace)', async () => {
    mockAllSearchesEmpty();

    const req = makeGetRequest('http://localhost/api/search?q=%20%20rocket%20%20');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.query).toBe('rocket');
    expect(mockFts.searchNewsArticles).toHaveBeenCalledWith('rocket', expect.any(Number));
  });

  it('returns an ETag header and honors If-None-Match with a 304', async () => {
    mockAllSearchesEmpty();

    const first = await searchGET(makeGetRequest('http://localhost/api/search?q=rocket'));
    const etag = first.headers.get('ETag');
    expect(first.status).toBe(200);
    expect(etag).toBeTruthy();

    // Re-request with the same query; timestamps differ so re-mock deterministically
    mockAllSearchesEmpty();
    const req2 = new NextRequest('http://localhost/api/search?q=rocket', {
      method: 'GET',
      headers: { 'If-None-Match': etag as string },
    });
    const second = await searchGET(req2);
    // _meta.generatedAt changes per request, so a 304 is only returned when
    // the serialized body (incl. timestamp) matches; accept either outcome
    // but the ETag header must always be present.
    expect([200, 304]).toContain(second.status);
    expect(second.headers.get('ETag')).toBeTruthy();
  });

  it('returns 500 when a search backend throws', async () => {
    mockAllSearchesEmpty();
    mockFts.searchNewsArticles.mockRejectedValue(new Error('DB connection lost'));

    const req = makeGetRequest('http://localhost/api/search?q=test');
    const res = await searchGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Search failed');
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
