import { getAll, remove, count } from './idb-store';

interface CacheConfig {
  maxItems: number;
  sortField: string;
}

const STORE_LIMITS: Record<string, CacheConfig> = {
  articles: { maxItems: 500, sortField: 'publishedAt' },
  events: { maxItems: 200, sortField: 'launchDate' },
  watchlist: { maxItems: 100, sortField: 'id' },
};

export interface CacheStats {
  articles: number;
  events: number;
  watchlist: number;
  syncQueue: number;
}

/**
 * Get current cache statistics.
 */
export async function getCacheStats(): Promise<CacheStats> {
  const [articles, events, watchlist, syncQueue] = await Promise.all([
    count('articles'),
    count('events'),
    count('watchlist'),
    count('sync-queue'),
  ]);
  return { articles, events, watchlist, syncQueue };
}

/**
 * Evict oldest items when a store exceeds its limit.
 */
export async function evictStaleData(): Promise<void> {
  for (const [storeName, config] of Object.entries(STORE_LIMITS)) {
    const currentCount = await count(storeName);
    if (currentCount <= config.maxItems) continue;

    const items = await getAll<Record<string, unknown>>(storeName);

    // Sort by the configured field (oldest first)
    items.sort((a, b) => {
      const aVal = String(a[config.sortField] || '');
      const bVal = String(b[config.sortField] || '');
      return aVal.localeCompare(bVal);
    });

    // Remove oldest items to get back under the limit
    const toRemove = items.slice(0, currentCount - config.maxItems);
    for (const item of toRemove) {
      const key = item.id as string | number;
      if (key !== undefined) {
        await remove(storeName, key);
      }
    }
  }
}
