import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { internalError, validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  searchNewsArticles,
  searchCompanies,
  searchJobs,
  searchInvestors,
  searchMarketplaceListings,
  searchForumThreads,
  searchBlogPosts,
  SearchResult,
} from '@/lib/full-text-search';
import { GLOBAL_SEARCH_TYPES, GlobalSearchType } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// Per-entity cap to keep the API fast.
const MAX_PER_ENTITY = 20;

type ResultsByType = {
  news: SearchResult[];
  companies: SearchResult[];
  jobs: SearchResult[];
  investors: SearchResult[];
  marketplace: SearchResult[];
  forum: SearchResult[];
  blog: SearchResult[];
};

type EntityKey = keyof ResultsByType;

const EMPTY_RESULTS: ResultsByType = {
  news: [],
  companies: [],
  jobs: [],
  investors: [],
  marketplace: [],
  forum: [],
  blog: [],
};

function clampLimit(raw: string | null, fallback = 10): number {
  const parsed = parseInt(raw || `${fallback}`, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(1, parsed), MAX_PER_ENTITY);
}

function isValidType(value: string): value is GlobalSearchType {
  return (GLOBAL_SEARCH_TYPES as readonly string[]).includes(value);
}

/**
 * Build a JSON response with ETag header and 304 support.
 */
function buildETagResponse(req: NextRequest, data: Record<string, unknown>): NextResponse {
  const body = JSON.stringify(data);
  const etag = `"${createHash('md5').update(body).digest('hex')}"`;

  const ifNoneMatch = req.headers.get('If-None-Match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  return NextResponse.json(data, { headers: { ETag: etag } });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = (searchParams.get('q') || '').trim();
    const rawType = (searchParams.get('type') || 'all').toLowerCase();
    const limit = clampLimit(searchParams.get('limit'), 10);

    if (rawQuery.length < 2) {
      return validationError('Search query must be at least 2 characters', {
        q: 'Query too short',
      });
    }

    if (rawQuery.length > 200) {
      return validationError('Search query is too long', {
        q: 'Query exceeds 200 characters',
      });
    }

    const type: GlobalSearchType = isValidType(rawType) ? rawType : 'all';

    // Determine which entity searches to run
    const runAll = type === 'all';
    const perTypeLimit = runAll ? Math.min(limit, 5) : limit;

    // Helper: run a search if the active type matches (or we're running 'all')
    const run = async <K extends EntityKey>(
      key: K,
      matchType: GlobalSearchType,
      fn: () => Promise<SearchResult[]>
    ): Promise<[K, SearchResult[]]> => {
      if (!runAll && type !== matchType) return [key, []];
      const rows = await fn();
      return [key, rows];
    };

    const [news, companies, jobs, investors, marketplace, forum, blog] = await Promise.all([
      run('news', 'news', () => searchNewsArticles(rawQuery, perTypeLimit)),
      run('companies', 'companies', () => searchCompanies(rawQuery, perTypeLimit)),
      run('jobs', 'jobs', () => searchJobs(rawQuery, perTypeLimit)),
      run('investors', 'investors', () => searchInvestors(rawQuery, perTypeLimit)),
      run('marketplace', 'marketplace', () => searchMarketplaceListings(rawQuery, perTypeLimit)),
      run('forum', 'forum', () => searchForumThreads(rawQuery, perTypeLimit)),
      run('blog', 'blog', () => searchBlogPosts(rawQuery, perTypeLimit)),
    ]);

    const results: ResultsByType = {
      ...EMPTY_RESULTS,
      [news[0]]: news[1],
      [companies[0]]: companies[1],
      [jobs[0]]: jobs[1],
      [investors[0]]: investors[1],
      [marketplace[0]]: marketplace[1],
      [forum[0]]: forum[1],
      [blog[0]]: blog[1],
    };

    const totals = {
      news: results.news.length,
      companies: results.companies.length,
      jobs: results.jobs.length,
      investors: results.investors.length,
      marketplace: results.marketplace.length,
      forum: results.forum.length,
      blog: results.blog.length,
      all:
        results.news.length +
        results.companies.length +
        results.jobs.length +
        results.investors.length +
        results.marketplace.length +
        results.forum.length +
        results.blog.length,
    };

    return buildETagResponse(req, {
      query: rawQuery,
      type,
      results,
      totals,
      _meta: {
        perTypeLimit,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Global search failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Search failed');
  }
}
