import { logger } from '@/lib/logger';
import {
  searchNewsArticles,
  searchCompanies,
  searchJobs,
  searchInvestors,
  searchMarketplaceListings,
  searchForumThreads,
  searchBlogPosts,
  type SearchResult,
} from '@/lib/full-text-search';
import type { GlobalSearchType } from '@/lib/validations';

const PER_TYPE_LIMIT = 20;

export interface SavedSearchRunResult {
  results: SearchResult[];
  totals: Record<string, number>;
}

/**
 * Re-execute a saved search by calling each FTS helper directly. Mirrors what
 * `/api/search` does, but runs in-process (no HTTP hop) so it's safe to call
 * from cron handlers and route handlers alike. All branches share the same
 * per-type limit and gracefully degrade on failure.
 */
export async function executeSavedSearch(
  query: string,
  type: GlobalSearchType
): Promise<SavedSearchRunResult> {
  const runAll = type === 'all';

  const wrap = async (
    key: string,
    matchType: GlobalSearchType,
    fn: () => Promise<SearchResult[]>
  ): Promise<[string, SearchResult[]]> => {
    if (!runAll && type !== matchType) return [key, []];
    try {
      return [key, await fn()];
    } catch (err) {
      logger.warn(`saved-search ${key} branch failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return [key, []];
    }
  };

  const settled = await Promise.all([
    wrap('news', 'news', () => searchNewsArticles(query, PER_TYPE_LIMIT)),
    wrap('companies', 'companies', () => searchCompanies(query, PER_TYPE_LIMIT)),
    wrap('jobs', 'jobs', () => searchJobs(query, PER_TYPE_LIMIT)),
    wrap('investors', 'investors', () => searchInvestors(query, PER_TYPE_LIMIT)),
    wrap('marketplace', 'marketplace', () => searchMarketplaceListings(query, PER_TYPE_LIMIT)),
    wrap('forum', 'forum', () => searchForumThreads(query, PER_TYPE_LIMIT)),
    wrap('blog', 'blog', () => searchBlogPosts(query, PER_TYPE_LIMIT)),
  ]);

  const buckets: Record<string, SearchResult[]> = {};
  let merged: SearchResult[] = [];
  for (const [key, rows] of settled) {
    buckets[key] = rows;
    merged = merged.concat(rows);
  }

  const totals = Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [k, v.length])
  );

  return { results: merged, totals };
}

export function savedSearchResultKey(r: SearchResult): string {
  return `${r.type}:${r.id}`;
}
