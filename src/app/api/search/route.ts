import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import prisma from '@/lib/db';
import { searchQuerySchema, validateSearchParams } from '@/lib/validations';
import type { SearchModule, SearchSortBy } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { fullTextSearch, buildTsQuery } from '@/lib/full-text-search';

export const dynamic = 'force-dynamic';

/**
 * Build a date filter object for Prisma queries.
 * Returns undefined if no date bounds are set.
 */
function buildDateFilter(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (dateFrom) filter.gte = dateFrom;
  if (dateTo) filter.lte = dateTo;
  return filter;
}

/**
 * Determine the Prisma orderBy clause based on sortBy and sortOrder.
 * For 'relevance', we keep the default (no explicit sort beyond what Prisma returns).
 * For 'date', sort by the model's date field.
 * For 'title', sort by the model's title/name field.
 */
function getOrderBy(
  sortBy: SearchSortBy,
  sortOrder: 'asc' | 'desc',
  dateField: string,
  titleField: string
): Record<string, 'asc' | 'desc'> | undefined {
  switch (sortBy) {
    case 'date':
      return { [dateField]: sortOrder };
    case 'title':
      return { [titleField]: sortOrder };
    case 'relevance':
    default:
      // For relevance, fall back to date desc as a sensible default
      return { [dateField]: 'desc' };
  }
}

/**
 * Build a JSON response with ETag header and 304 support.
 */
function buildETagResponse(
  req: NextRequest,
  responseData: Record<string, unknown>
): NextResponse {
  const body = JSON.stringify(responseData);
  const etag = `"${createHash('md5').update(body).digest('hex')}"`;

  // Check If-None-Match for conditional GET
  const ifNoneMatch = req.headers.get('If-None-Match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  return NextResponse.json(responseData, {
    headers: { ETag: etag },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const validation = validateSearchParams(searchQuerySchema, searchParams);

    if (!validation.success) {
      return validationError('Invalid search parameters', validation.errors);
    }

    const { q, limit, modules, dateFrom, dateTo, sortBy, sortOrder } = validation.data;

    // Track which modules to search
    const activeModules = new Set<SearchModule>(modules);

    // Determine if we should try full-text search first:
    // Use FTS for queries with 2+ words, no date filters, and relevance sort
    const wordCount = q.trim().split(/\s+/).filter(Boolean).length;
    const canUseFTS = wordCount >= 2 && !dateFrom && !dateTo && sortBy === 'relevance';

    if (canUseFTS) {
      const ftsResults = await fullTextSearch(q, limit);

      if (ftsResults.length > 0) {
        // Group FTS results by source into the standard response shape
        const response: Record<string, unknown> = {
          news: ftsResults.filter(r => r.source === 'news' && activeModules.has('news')),
          companies: ftsResults.filter(r => r.source === 'companies' && activeModules.has('companies')),
          events: ftsResults.filter(r => r.source === 'events' && activeModules.has('events')),
          opportunities: ftsResults.filter(r => r.source === 'opportunities' && activeModules.has('opportunities')),
          blogs: ftsResults.filter(r => r.source === 'blogs' && activeModules.has('blogs')),
          _meta: { searchMethod: 'fts' },
        };

        return buildETagResponse(req, response);
      }
      // FTS returned empty — fall through to ILIKE
    }

    // --- ILIKE fallback (original logic) ---

    const containsFilter = { contains: q, mode: 'insensitive' as const };
    const dateFilter = buildDateFilter(dateFrom, dateTo);

    // Build parallel queries only for requested modules
    const queries: Promise<unknown>[] = [];
    const queryKeys: SearchModule[] = [];

    if (activeModules.has('news')) {
      queryKeys.push('news');
      const newsDateFilter = dateFilter ? { publishedAt: dateFilter } : {};
      queries.push(
        prisma.newsArticle.findMany({
          where: {
            AND: [
              {
                OR: [
                  { title: containsFilter },
                  { summary: containsFilter },
                ],
              },
              newsDateFilter,
            ],
          },
          select: {
            id: true,
            title: true,
            summary: true,
            url: true,
            source: true,
            publishedAt: true,
          },
          orderBy: getOrderBy(sortBy, sortOrder, 'publishedAt', 'title'),
          take: limit,
        })
      );
    }

    if (activeModules.has('companies')) {
      queryKeys.push('companies');
      // Query CompanyProfile for richer company intelligence data
      queries.push(
        (prisma.companyProfile as any).findMany({
          where: {
            OR: [
              { name: containsFilter },
              { description: containsFilter },
              { ticker: containsFilter },
            ],
          },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            headquarters: true,
            isPublic: true,
            ticker: true,
            sector: true,
            tier: true,
            totalFunding: true,
            logoUrl: true,
            dataCompleteness: true,
            _count: {
              select: {
                newsArticles: true,
                contracts: true,
                serviceListings: true,
                satelliteAssets: true,
                fundingRounds: true,
                products: true,
              },
            },
          },
          orderBy: sortBy === 'title'
            ? { name: sortOrder }
            : [{ tier: 'asc' as const }, { name: 'asc' as const }],
          take: limit,
        })
      );
    }

    if (activeModules.has('events')) {
      queryKeys.push('events');
      const eventsDateFilter = dateFilter ? { launchDate: dateFilter } : {};
      queries.push(
        prisma.spaceEvent.findMany({
          where: {
            AND: [
              {
                OR: [
                  { name: containsFilter },
                  { description: containsFilter },
                  { mission: containsFilter },
                ],
              },
              eventsDateFilter,
            ],
          },
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            status: true,
            launchDate: true,
            agency: true,
          },
          orderBy: getOrderBy(sortBy, sortOrder, 'launchDate', 'name'),
          take: limit,
        })
      );
    }

    if (activeModules.has('opportunities')) {
      queryKeys.push('opportunities');
      const oppsDateFilter = dateFilter ? { publishedAt: dateFilter } : {};
      queries.push(
        prisma.businessOpportunity.findMany({
          where: {
            AND: [
              {
                OR: [
                  { title: containsFilter },
                  { description: containsFilter },
                ],
              },
              oppsDateFilter,
            ],
          },
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            type: true,
            category: true,
            sector: true,
            publishedAt: true,
          },
          orderBy: getOrderBy(sortBy, sortOrder, 'discoveredAt', 'title'),
          take: limit,
        })
      );
    }

    if (activeModules.has('blogs')) {
      queryKeys.push('blogs');
      const blogsDateFilter = dateFilter ? { publishedAt: dateFilter } : {};
      queries.push(
        prisma.blogPost.findMany({
          where: {
            AND: [
              {
                OR: [
                  { title: containsFilter },
                  { excerpt: containsFilter },
                ],
              },
              blogsDateFilter,
            ],
          },
          select: {
            id: true,
            title: true,
            excerpt: true,
            url: true,
            authorName: true,
            publishedAt: true,
          },
          orderBy: getOrderBy(sortBy, sortOrder, 'publishedAt', 'title'),
          take: limit,
        })
      );
    }

    const results = await Promise.all(queries);

    // Map results back to their module keys
    const response: Record<string, unknown> = {};
    queryKeys.forEach((key, index) => {
      response[key] = results[index];
    });

    // Fill in empty arrays for modules that weren't searched
    const allModules: SearchModule[] = ['news', 'companies', 'events', 'opportunities', 'blogs'];
    for (const mod of allModules) {
      if (!response[mod]) {
        response[mod] = [];
      }
    }

    // Add search method metadata
    response._meta = { searchMethod: 'ilike' };

    return buildETagResponse(req, response);
  } catch (error) {
    logger.error('Search failed', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Search failed');
  }
}
