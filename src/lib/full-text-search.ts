import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export interface FTSResult {
  id: string;
  title: string;
  snippet: string;
  rank: number;
  source: 'news' | 'companies' | 'events' | 'opportunities' | 'blogs';
}

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
    .filter(Boolean); // Remove words that became empty after sanitization

  if (words.length === 0) return '';

  return words.map(word => word + ':*').join(' & ');
}

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
 * Run full-text search across all models.
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
