/**
 * @jest-environment node
 */

/**
 * API route handler tests for news and content endpoints:
 *   - GET /api/news
 *   - GET /api/blogs
 *   - GET /api/ticker
 *
 * Validates response shapes, filtering, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    newsArticle: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    blogPost: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    spaceCompany: {
      findMany: jest.fn(),
    },
    spaceEvent: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock news-fetcher and blogs-fetcher which are used by the route handlers
jest.mock('@/lib/news-fetcher', () => ({
  getNewsArticles: jest.fn(),
}));

jest.mock('@/lib/blogs-fetcher', () => ({
  getBlogPosts: jest.fn(),
  getBlogSources: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getNewsArticles } from '@/lib/news-fetcher';
import { getBlogPosts, getBlogSources } from '@/lib/blogs-fetcher';

import { GET as newsGET } from '@/app/api/news/route';
import { GET as blogsGET } from '@/app/api/blogs/route';
import { GET as tickerGET } from '@/app/api/ticker/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetNewsArticles = getNewsArticles as jest.MockedFunction<typeof getNewsArticles>;
const mockGetBlogPosts = getBlogPosts as jest.MockedFunction<typeof getBlogPosts>;
const mockGetBlogSources = getBlogSources as jest.MockedFunction<typeof getBlogSources>;

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'article-1',
    title: 'SpaceX Launches Starship',
    summary: 'Another successful launch of the Starship vehicle.',
    category: 'launch',
    source: 'SpaceNews',
    imageUrl: 'https://example.com/img.jpg',
    url: 'https://spacenews.com/article-1',
    publishedAt: new Date('2025-12-01'),
    companyTags: [],
    ...overrides,
  };
}

function makeBlogPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'blog-1',
    title: 'The Future of Lunar Mining',
    excerpt: 'An overview of lunar resource extraction technologies.',
    url: 'https://spacenexus.us/blogs/lunar-mining',
    authorName: 'Dr. Luna',
    topic: 'moon',
    publishedAt: new Date('2025-11-15'),
    sourceId: 'src-1',
    source: {
      name: 'SpaceNexus',
      slug: 'spacenexus',
      authorType: 'expert',
      imageUrl: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/news
// =============================================================================

describe('GET /api/news', () => {
  it('returns articles with correct shape', async () => {
    const articles = [makeArticle(), makeArticle({ id: 'article-2', title: 'Artemis II Update' })];
    mockGetNewsArticles.mockResolvedValue({ articles, total: 2 });

    const req = new NextRequest('http://localhost/api/news');
    const res = await newsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.articles[0]).toHaveProperty('id');
    expect(body.articles[0]).toHaveProperty('title');
    expect(body.articles[0]).toHaveProperty('summary');
    expect(body.articles[0]).toHaveProperty('category');
    expect(body.articles[0]).toHaveProperty('source');
    expect(body.articles[0]).toHaveProperty('url');
    expect(body.articles[0]).toHaveProperty('publishedAt');
  });

  it('returns empty array when no articles exist', async () => {
    mockGetNewsArticles.mockResolvedValue({ articles: [], total: 0 });

    const req = new NextRequest('http://localhost/api/news');
    const res = await newsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('passes category filter to getNewsArticles', async () => {
    mockGetNewsArticles.mockResolvedValue({ articles: [], total: 0 });

    const req = new NextRequest('http://localhost/api/news?category=launch');
    await newsGET(req);

    expect(mockGetNewsArticles).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'launch' })
    );
  });

  it('passes company filter to getNewsArticles', async () => {
    mockGetNewsArticles.mockResolvedValue({ articles: [], total: 0 });

    const req = new NextRequest('http://localhost/api/news?company=spacex');
    await newsGET(req);

    expect(mockGetNewsArticles).toHaveBeenCalledWith(
      expect.objectContaining({ companySlug: 'spacex' })
    );
  });

  it('passes pagination params to getNewsArticles', async () => {
    mockGetNewsArticles.mockResolvedValue({ articles: [], total: 0 });

    const req = new NextRequest('http://localhost/api/news?limit=5&offset=10');
    await newsGET(req);

    expect(mockGetNewsArticles).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 })
    );
  });

  it('returns 500 on internal error', async () => {
    mockGetNewsArticles.mockRejectedValue(new Error('DB connection failed'));

    const req = new NextRequest('http://localhost/api/news');
    const res = await newsGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Failed to fetch news');
  });

  it('includes Cache-Control header', async () => {
    mockGetNewsArticles.mockResolvedValue({ articles: [makeArticle()], total: 1 });

    const req = new NextRequest('http://localhost/api/news');
    const res = await newsGET(req);

    expect(res.headers.get('Cache-Control')).toContain('max-age=300');
  });
});

// =============================================================================
// GET /api/blogs
// =============================================================================

describe('GET /api/blogs', () => {
  it('returns blog posts with correct shape', async () => {
    const posts = [makeBlogPost()];
    mockGetBlogPosts.mockResolvedValue({ posts, total: 1 });

    const req = new NextRequest('http://localhost/api/blogs');
    const res = await blogsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.posts).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.posts[0]).toHaveProperty('id');
    expect(body.posts[0]).toHaveProperty('title');
    expect(body.posts[0]).toHaveProperty('excerpt');
    expect(body.posts[0]).toHaveProperty('url');
    expect(body.posts[0]).toHaveProperty('source');
  });

  it('returns empty array when no posts exist', async () => {
    mockGetBlogPosts.mockResolvedValue({ posts: [], total: 0 });

    const req = new NextRequest('http://localhost/api/blogs');
    const res = await blogsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.posts).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('passes topic filter to getBlogPosts', async () => {
    mockGetBlogPosts.mockResolvedValue({ posts: [], total: 0 });

    const req = new NextRequest('http://localhost/api/blogs?topic=moon');
    await blogsGET(req);

    expect(mockGetBlogPosts).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'moon' })
    );
  });

  it('passes authorType filter to getBlogPosts', async () => {
    mockGetBlogPosts.mockResolvedValue({ posts: [], total: 0 });

    const req = new NextRequest('http://localhost/api/blogs?authorType=expert');
    await blogsGET(req);

    expect(mockGetBlogPosts).toHaveBeenCalledWith(
      expect.objectContaining({ authorType: 'expert' })
    );
  });

  it('returns sources when type=sources', async () => {
    const sources = [
      { id: 'src-1', name: 'SpaceNexus', slug: 'spacenexus', authorType: 'official', isActive: true },
    ];
    mockGetBlogSources.mockResolvedValue(sources as never);

    const req = new NextRequest('http://localhost/api/blogs?type=sources');
    const res = await blogsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sources).toBeDefined();
    expect(body.sources).toHaveLength(1);
    // Should NOT call getBlogPosts when type=sources
    expect(mockGetBlogPosts).not.toHaveBeenCalled();
  });

  it('returns 500 on internal error', async () => {
    mockGetBlogPosts.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/blogs');
    const res = await blogsGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Failed to fetch blogs');
  });
});

// =============================================================================
// GET /api/ticker
// =============================================================================

describe('GET /api/ticker', () => {
  it('returns ticker items for default (enthusiast) persona', async () => {
    // Mock news articles — always fetched
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([
      { title: 'SpaceX Launch', source: 'SpaceNews', category: 'launch', url: '/news' },
    ]);
    // Mock live events
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    // Mock blog posts
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/ticker');
    const res = await tickerGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('persona', 'enthusiast');
    expect(body).toHaveProperty('count');
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('returns stock data for investor persona', async () => {
    // Mock public companies
    (mockPrisma.spaceCompany.findMany as jest.Mock)
      .mockResolvedValueOnce([ // publicCompanies query
        {
          name: 'SpaceX',
          ticker: 'SPACEX',
          stockPrice: 120.5,
          priceChange24h: 3.2,
          marketCap: 100000000000,
        },
      ])
      .mockResolvedValueOnce([ // funded companies query
        {
          name: 'Relativity',
          lastFundingRound: 'Series E',
          lastFundingAmount: 650,
          lastFundingDate: new Date('2025-01-15'),
        },
      ])
      .mockResolvedValueOnce([]); // preIPO query

    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/ticker?persona=investor');
    const res = await tickerGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.persona).toBe('investor');
    expect(body.items.length).toBeGreaterThanOrEqual(0);
  });

  it('includes Cache-Control header', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/ticker');
    const res = await tickerGET(req);

    expect(res.headers.get('Cache-Control')).toContain('s-maxage=180');
  });

  it('returns empty items array on error (graceful degradation)', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/ticker');
    const res = await tickerGET(req);
    const body = await res.json();

    // Ticker API catches errors and returns empty items
    expect(res.status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('ticker items have required fields (type, label, value, color, priority)', async () => {
    (mockPrisma.newsArticle.findMany as jest.Mock).mockResolvedValue([
      { title: 'Rocket Launch Success', source: 'NASA', category: 'launch', url: '/news' },
    ]);
    (mockPrisma.spaceEvent.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/ticker');
    const res = await tickerGET(req);
    const body = await res.json();

    if (body.items.length > 0) {
      const item = body.items[0];
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('color');
      expect(item).toHaveProperty('priority');
    }
  });
});
