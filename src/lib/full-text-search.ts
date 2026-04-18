import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Unified SearchResult shape for global search.
 * `snippet` may contain <mark>...</mark> HTML from tsvector ts_headline (news/companies),
 * or plain text for ILIKE-based search (jobs/investors/marketplace/forum/blog).
 */
export interface SearchResult {
  id: string;
  type: 'news' | 'company' | 'job' | 'investor' | 'marketplace' | 'forum' | 'blog' | 'podcast';
  title: string;
  snippet: string;
  url: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  score?: number;
}

/**
 * Legacy shape kept for backwards compatibility with the existing search API.
 */
export interface FTSResult {
  id: string;
  title: string;
  snippet: string;
  rank: number;
  source: 'news' | 'companies' | 'events' | 'opportunities' | 'blogs';
}

// ────────────────────────────────────────────────────────────
// Query helpers
// ────────────────────────────────────────────────────────────

/**
 * Convert user query to tsquery format.
 * Joins words with & (AND), appends :* for prefix matching.
 */
export function buildTsQuery(query: string): string {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);

  if (words.length === 0) return '';

  return words.map(word => word + ':*').join(' & ');
}

/**
 * Truncate long text to a safe snippet length (word-boundary aware).
 */
function truncate(text: string | null | undefined, max = 220): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 50 ? sliced.slice(0, lastSpace) : sliced) + '…';
}

// ────────────────────────────────────────────────────────────
// Legacy FTS helpers (used by /api/search route)
// ────────────────────────────────────────────────────────────

export async function searchNewsFTS(tsQuery: string, limit: number): Promise<FTSResult[]> {
  try {
    const results = await prisma.$queryRaw<FTSResult[]>`
      SELECT id, title,
        ts_headline('english', COALESCE(summary, ''), to_tsquery('english', ${tsQuery}),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') as snippet,
        ts_rank(to_tsvector('english', title || ' ' || COALESCE(summary, '')),
          to_tsquery('english', ${tsQuery})) as rank
      FROM "NewsArticle"
      WHERE to_tsvector('english', title || ' ' || COALESCE(summary, ''))
        @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
    return results.map(r => ({ ...r, rank: Number(r.rank), source: 'news' as const }));
  } catch (error) {
    logger.error('FTS search failed for news', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchCompaniesFTS(tsQuery: string, limit: number): Promise<FTSResult[]> {
  try {
    const results = await prisma.$queryRaw<FTSResult[]>`
      SELECT id, name as title,
        ts_headline('english', COALESCE(description, ''), to_tsquery('english', ${tsQuery}),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') as snippet,
        ts_rank(to_tsvector('english', name || ' ' || COALESCE(description, '')),
          to_tsquery('english', ${tsQuery})) as rank
      FROM "CompanyProfile"
      WHERE to_tsvector('english', name || ' ' || COALESCE(description, ''))
        @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
    return results.map(r => ({ ...r, rank: Number(r.rank), source: 'companies' as const }));
  } catch (error) {
    logger.error('FTS search failed for companies', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchEventsFTS(tsQuery: string, limit: number): Promise<FTSResult[]> {
  try {
    const results = await prisma.$queryRaw<FTSResult[]>`
      SELECT id, name as title,
        ts_headline('english', COALESCE(description, ''), to_tsquery('english', ${tsQuery}),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') as snippet,
        ts_rank(to_tsvector('english', name || ' ' || COALESCE(description, '')),
          to_tsquery('english', ${tsQuery})) as rank
      FROM "SpaceEvent"
      WHERE to_tsvector('english', name || ' ' || COALESCE(description, ''))
        @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
    return results.map(r => ({ ...r, rank: Number(r.rank), source: 'events' as const }));
  } catch (error) {
    logger.error('FTS search failed for events', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchOpportunitiesFTS(tsQuery: string, limit: number): Promise<FTSResult[]> {
  try {
    const results = await prisma.$queryRaw<FTSResult[]>`
      SELECT id, title,
        ts_headline('english', COALESCE(description, ''), to_tsquery('english', ${tsQuery}),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') as snippet,
        ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '')),
          to_tsquery('english', ${tsQuery})) as rank
      FROM "BusinessOpportunity"
      WHERE to_tsvector('english', title || ' ' || COALESCE(description, ''))
        @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
    return results.map(r => ({ ...r, rank: Number(r.rank), source: 'opportunities' as const }));
  } catch (error) {
    logger.error('FTS search failed for opportunities', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchBlogsFTS(tsQuery: string, limit: number): Promise<FTSResult[]> {
  try {
    const results = await prisma.$queryRaw<FTSResult[]>`
      SELECT id, title,
        ts_headline('english', COALESCE(content, ''), to_tsquery('english', ${tsQuery}),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') as snippet,
        ts_rank(to_tsvector('english', title || ' ' || COALESCE(content, '')),
          to_tsquery('english', ${tsQuery})) as rank
      FROM "BlogPost"
      WHERE to_tsvector('english', title || ' ' || COALESCE(content, ''))
        @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
    return results.map(r => ({ ...r, rank: Number(r.rank), source: 'blogs' as const }));
  } catch (error) {
    logger.error('FTS search failed for blogs', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Run full-text search across legacy models.
 * Returns results sorted by relevance rank.
 */
export async function fullTextSearch(query: string, limit: number = 10): Promise<FTSResult[]> {
  const tsQuery = buildTsQuery(query);
  if (!tsQuery) return [];

  const [news, companies, events, opportunities, blogs] = await Promise.all([
    searchNewsFTS(tsQuery, limit),
    searchCompaniesFTS(tsQuery, limit),
    searchEventsFTS(tsQuery, limit),
    searchOpportunitiesFTS(tsQuery, limit),
    searchBlogsFTS(tsQuery, limit),
  ]);

  return [...news, ...companies, ...events, ...opportunities, ...blogs]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}

// ────────────────────────────────────────────────────────────
// Entity-aware, normalized search functions (global search)
// ────────────────────────────────────────────────────────────

const MAX_PER_ENTITY = 20;

function clampLimit(limit: number): number {
  return Math.min(Math.max(1, Math.floor(limit) || 5), MAX_PER_ENTITY);
}

/** Prisma "contains, insensitive" filter builder. */
function ci(query: string) {
  return { contains: query, mode: 'insensitive' as const };
}

export async function searchNewsArticles(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const take = clampLimit(limit);

  try {
    // Prefer FTS when we have multiple words; otherwise ILIKE.
    const ts = buildTsQuery(q);
    const wordCount = q.split(/\s+/).filter(Boolean).length;

    if (wordCount >= 2 && ts) {
      const rows = await searchNewsFTS(ts, take);
      if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        const metaRows = await prisma.newsArticle.findMany({
          where: { id: { in: ids } },
          select: { id: true, url: true, source: true, publishedAt: true, category: true, summary: true },
        });
        const metaMap = new Map(metaRows.map(m => [m.id, m]));
        return rows.map(r => {
          const m = metaMap.get(r.id);
          return {
            id: r.id,
            type: 'news' as const,
            title: r.title,
            snippet: r.snippet || truncate(m?.summary || ''),
            url: m?.url || '#',
            metadata: { source: m?.source, category: m?.category },
            createdAt: m?.publishedAt,
            score: r.rank,
          };
        });
      }
    }

    const rows = await prisma.newsArticle.findMany({
      where: { OR: [{ title: ci(q) }, { summary: ci(q) }] },
      select: { id: true, title: true, summary: true, url: true, source: true, category: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take,
    });
    return rows.map(r => ({
      id: r.id,
      type: 'news' as const,
      title: r.title,
      snippet: truncate(r.summary),
      url: r.url,
      metadata: { source: r.source, category: r.category },
      createdAt: r.publishedAt,
    }));
  } catch (error) {
    logger.error('searchNewsArticles failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchCompanies(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const take = clampLimit(limit);

  try {
    const rows = await prisma.companyProfile.findMany({
      where: {
        OR: [
          { name: ci(q) },
          { description: ci(q) },
          { ticker: ci(q) },
          { sector: ci(q) },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        sector: true,
        tier: true,
        headquarters: true,
        logoUrl: true,
        isPublic: true,
        ticker: true,
        updatedAt: true,
      },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      take,
    });

    return rows.map(r => ({
      id: r.id,
      type: 'company' as const,
      title: r.name,
      snippet: truncate(r.description),
      url: `/company-profiles/${r.slug}`,
      metadata: {
        sector: r.sector,
        tier: r.tier,
        headquarters: r.headquarters,
        logoUrl: r.logoUrl,
        isPublic: r.isPublic,
        ticker: r.ticker,
      },
      createdAt: r.updatedAt,
    }));
  } catch (error) {
    logger.error('searchCompanies failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchJobs(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const take = clampLimit(limit);

  try {
    const rows = await prisma.spaceJobPosting.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { title: ci(q) },
              { description: ci(q) },
              { company: ci(q) },
              { specialization: ci(q) },
              { location: ci(q) },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remoteOk: true,
        description: true,
        category: true,
        specialization: true,
        seniorityLevel: true,
        salaryMin: true,
        salaryMax: true,
        sourceUrl: true,
        postedDate: true,
      },
      orderBy: { postedDate: 'desc' },
      take,
    });

    return rows.map(r => ({
      id: r.id,
      type: 'job' as const,
      title: r.title,
      snippet: truncate(r.description),
      url: r.sourceUrl || `/space-talent?tab=jobs&jobId=${r.id}`,
      metadata: {
        company: r.company,
        location: r.location,
        remoteOk: r.remoteOk,
        category: r.category,
        specialization: r.specialization,
        seniorityLevel: r.seniorityLevel,
        salaryMin: r.salaryMin,
        salaryMax: r.salaryMax,
      },
      createdAt: r.postedDate,
    }));
  } catch (error) {
    logger.error('searchJobs failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchInvestors(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const take = clampLimit(limit);

  try {
    const rows = await prisma.investor.findMany({
      where: {
        OR: [
          { name: ci(q) },
          { description: ci(q) },
          { headquarters: ci(q) },
          { type: ci(q) },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        headquarters: true,
        website: true,
        logoUrl: true,
        sectorFocus: true,
        investmentStage: true,
        portfolioCount: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
      take,
    });

    return rows.map(r => ({
      id: r.id,
      type: 'investor' as const,
      title: r.name,
      snippet: truncate(r.description),
      url: `/investors?q=${encodeURIComponent(r.name)}`,
      metadata: {
        investorType: r.type,
        headquarters: r.headquarters,
        website: r.website,
        logoUrl: r.logoUrl,
        sectorFocus: r.sectorFocus,
        investmentStage: r.investmentStage,
        portfolioCount: r.portfolioCount,
      },
      createdAt: r.updatedAt,
    }));
  } catch (error) {
    logger.error('searchInvestors failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchMarketplaceListings(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const take = clampLimit(limit);

  try {
    const rows = await prisma.serviceListing.findMany({
      where: {
        AND: [
          { status: 'active' },
          {
            OR: [
              { name: ci(q) },
              { description: ci(q) },
              { category: ci(q) },
              { subcategory: ci(q) },
            ],
          },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        subcategory: true,
        pricingType: true,
        priceMin: true,
        priceMax: true,
        priceUnit: true,
        featured: true,
        createdAt: true,
        company: { select: { name: true, slug: true, logoUrl: true } },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take,
    });

    return rows.map(r => ({
      id: r.id,
      type: 'marketplace' as const,
      title: r.name,
      snippet: truncate(r.description),
      url: `/marketplace/listings/${r.slug}`,
      metadata: {
        category: r.category,
        subcategory: r.subcategory,
        pricingType: r.pricingType,
        priceMin: r.priceMin,
        priceMax: r.priceMax,
        priceUnit: r.priceUnit,
        featured: r.featured,
        companyName: r.company?.name,
        companySlug: r.company?.slug,
        companyLogoUrl: r.company?.logoUrl,
      },
      createdAt: r.createdAt,
    }));
  } catch (error) {
    logger.error('searchMarketplaceListings failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchForumThreads(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const take = clampLimit(limit);

  try {
    const rows = await prisma.forumThread.findMany({
      where: {
        OR: [
          { title: ci(q) },
          { content: ci(q) },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
        viewCount: true,
        upvoteCount: true,
        tags: true,
        createdAt: true,
        category: { select: { slug: true, name: true } },
        author: { select: { name: true } },
        _count: { select: { posts: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take,
    });

    return rows.map(r => ({
      id: r.id,
      type: 'forum' as const,
      title: r.title,
      snippet: truncate(r.content),
      url: `/community/forums/${r.category.slug}/${r.id}`,
      metadata: {
        categoryName: r.category.name,
        categorySlug: r.category.slug,
        authorName: r.author?.name,
        viewCount: r.viewCount,
        upvoteCount: r.upvoteCount,
        postCount: r._count.posts,
        tags: r.tags,
      },
      createdAt: r.createdAt,
    }));
  } catch (error) {
    logger.error('searchForumThreads failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchPodcastEpisodes(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const take = clampLimit(limit);

  try {
    // Fetch episodes whose title/description matches OR whose transcript body matches
    const rows = await prisma.podcastEpisode.findMany({
      where: {
        OR: [
          { title: ci(q) },
          { description: ci(q) },
          { transcript: { body: ci(q) } },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        publishedAt: true,
        durationSec: true,
        episodeNumber: true,
        seasonNumber: true,
        podcast: { select: { slug: true, name: true, artworkUrl: true } },
        transcript: { select: { body: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take,
    });

    return rows.map(r => {
      // Prefer transcript snippet if it contains the term, else description
      const lowered = q.toLowerCase();
      let snippet = '';
      const tBody = r.transcript?.body || '';
      const tIdx = tBody.toLowerCase().indexOf(lowered);
      if (tBody && tIdx >= 0) {
        const start = Math.max(0, tIdx - 80);
        const end = Math.min(tBody.length, tIdx + lowered.length + 140);
        snippet = (start > 0 ? '…' : '') + tBody.slice(start, end) + (end < tBody.length ? '…' : '');
      } else {
        snippet = truncate(r.description);
      }

      return {
        id: r.id,
        type: 'podcast' as const,
        title: r.title,
        snippet,
        url: `/podcasts/${r.podcast.slug}/${r.slug}`,
        metadata: {
          podcastName: r.podcast.name,
          podcastSlug: r.podcast.slug,
          artworkUrl: r.podcast.artworkUrl,
          durationSec: r.durationSec,
          episodeNumber: r.episodeNumber,
          seasonNumber: r.seasonNumber,
          hasTranscript: Boolean(r.transcript?.body),
        },
        createdAt: r.publishedAt ?? undefined,
      };
    });
  } catch (error) {
    logger.error('searchPodcastEpisodes failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function searchBlogPosts(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const take = clampLimit(limit);

  try {
    const rows = await prisma.blogPost.findMany({
      where: {
        OR: [
          { title: ci(q) },
          { excerpt: ci(q) },
          { content: ci(q) },
        ],
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        url: true,
        authorName: true,
        imageUrl: true,
        topic: true,
        publishedAt: true,
        source: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take,
    });

    return rows.map(r => ({
      id: r.id,
      type: 'blog' as const,
      title: r.title,
      snippet: truncate(r.excerpt),
      url: r.url,
      metadata: {
        authorName: r.authorName,
        imageUrl: r.imageUrl,
        topic: r.topic,
        sourceName: r.source?.name,
        sourceSlug: r.source?.slug,
      },
      createdAt: r.publishedAt,
    }));
  } catch (error) {
    logger.error('searchBlogPosts failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
