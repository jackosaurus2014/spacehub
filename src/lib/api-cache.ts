/**
 * Server-side in-memory cache for external API responses.
 *
 * Features:
 *   - Map-based storage with configurable TTL per entry
 *   - Stale-while-revalidate (SWR) pattern via `withCache`
 *   - LRU eviction when the cache exceeds MAX_ENTRIES (500)
 *   - Periodic automatic cleanup of expired entries (every 5 min)
 *   - Pattern-based cache invalidation
 *   - Hit/miss statistics
 *
 * Cache failures never break the app -- all public methods catch internally.
 *
 * No external dependencies.
 */

import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  stale: boolean;
  /** Tracks last-access time for LRU eviction. */
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: string;
  entries: Array<{ key: string; isStale: boolean; ageMs: number }>;
}

export interface CacheOptions {
  /** Time-to-live in seconds. */
  ttlSeconds: number;
  /**
   * When true, returns stale data immediately and revalidates in the
   * background. The next caller gets the fresh value.
   */
  staleWhileRevalidate?: boolean;
  /**
   * When true, on fetch error returns stale data instead of throwing.
   */
  fallbackToStale?: boolean;
}

// ---------------------------------------------------------------------------
// TTL Constants
// ---------------------------------------------------------------------------

/** Semantic TTL constants in **seconds** for use with `withCache`. */
export const CACHE_TTL = {
  /** 1 minute -- ISS position, solar weather. */
  REALTIME: 60,
  /** 5 minutes -- news feeds, upcoming launches. */
  FREQUENT: 300,
  /** 30 minutes -- company data, market data. */
  STANDARD: 1_800,
  /** 24 hours -- static reference data. */
  DAILY: 86_400,
  /** 7 days -- historical / archival data. */
  WEEKLY: 604_800,
} as const;

/**
 * TTL constants in **milliseconds** for direct use with `apiCache.set()`.
 *
 * These match the original API surface. For new code using `withCache`,
 * prefer `CACHE_TTL` (seconds).
 */
export const CacheTTL = {
  /** 1 minute -- for fast-changing data like news */
  NEWS: 60_000,
  /** 5 minutes -- general default for most data */
  DEFAULT: 300_000,
  /** 10 minutes -- for slower-changing data like stock quotes */
  STOCKS: 600_000,
  /** 15 minutes -- for data that rarely changes */
  SLOW: 900_000,
  /** 30 minutes -- for very stable data like regulatory documents */
  VERY_SLOW: 1_800_000,
} as const;

// ---------------------------------------------------------------------------
// Internal storage type (mirrors the original shape for backward compat)
// ---------------------------------------------------------------------------

interface InternalEntry {
  value: unknown;
  /** Absolute timestamp when this entry expires. */
  expiresAt: number;
  /** Absolute timestamp when this entry was stored. */
  storedAt: number;
  /** Last-access time for LRU eviction. */
  lastAccessed: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 500;
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

class ApiCache {
  private store = new Map<string, InternalEntry>();
  private hits = 0;
  private misses = 0;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Run cleanup every 5 minutes to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
      // unref() prevents this interval from keeping the Node.js event loop alive,
      // so the process can exit cleanly during serverless cold-shutdown.
      if (
        this.cleanupInterval &&
        typeof this.cleanupInterval === 'object' &&
        'unref' in this.cleanupInterval
      ) {
        (this.cleanupInterval as NodeJS.Timeout).unref();
      }
    }
  }

  // -----------------------------------------------------------------------
  // Core CRUD
  // -----------------------------------------------------------------------

  /**
   * Get a cached value. Returns `null` if the key does not exist or has
   * expired.
   */
  get<T = unknown>(key: string): T | null {
    try {
      const entry = this.store.get(key);

      if (!entry) {
        this.misses++;
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        this.misses++;
        return null;
      }

      entry.lastAccessed = Date.now();
      this.hits++;
      return entry.value as T;
    } catch {
      this.misses++;
      return null;
    }
  }

  /**
   * Get a cached value even if it has expired. Useful as a fallback when the
   * external API is down -- stale data is better than no data.
   *
   * Returns `null` only if no entry exists for the key at all.
   * Returns `{ value, isStale, storedAt }` otherwise.
   */
  getStale<T = unknown>(key: string): { value: T; isStale: boolean; storedAt: number } | null {
    try {
      const entry = this.store.get(key);

      if (!entry) {
        return null;
      }

      entry.lastAccessed = Date.now();
      const isStale = Date.now() > entry.expiresAt;
      return {
        value: entry.value as T,
        isStale,
        storedAt: entry.storedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Store a value in the cache with a time-to-live.
   *
   * @param key   Cache key
   * @param value The value to store
   * @param ttlMs Time-to-live in **milliseconds** (defaults to CacheTTL.DEFAULT)
   */
  set<T = unknown>(key: string, value: T, ttlMs: number = CacheTTL.DEFAULT): void {
    try {
      const now = Date.now();
      this.store.set(key, {
        value,
        expiresAt: now + ttlMs,
        storedAt: now,
        lastAccessed: now,
      });

      // Enforce max size with LRU eviction
      if (this.store.size > MAX_ENTRIES) {
        this.evictLRU();
      }
    } catch (err) {
      logger.warn('[ApiCache] Failed to set cache entry', {
        key,
        error: String(err),
      });
    }
  }

  /**
   * Invalidate (delete) a specific cache entry by key.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys that contain the given pattern string.
   *
   * Example: `invalidatePattern('company')` removes keys like
   * `company:list`, `company:detail:123`, etc.
   */
  invalidatePattern(pattern: string): void {
    try {
      const keysToDelete: string[] = [];
      Array.from(this.store.keys()).forEach((key) => {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => {
        this.store.delete(key);
      });
      if (keysToDelete.length > 0) {
        logger.debug(`[ApiCache] Invalidated ${keysToDelete.length} entries matching "${pattern}"`);
      }
    } catch {
      // Swallow -- cache failures must never break the app.
    }
  }

  // -----------------------------------------------------------------------
  // Backward-compatible aliases
  // -----------------------------------------------------------------------

  /** Delete a specific cache entry. Returns true if the key existed. */
  delete(key: string): boolean {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed;
  }

  /** Remove all entries and reset stats. */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  // -----------------------------------------------------------------------
  // Maintenance
  // -----------------------------------------------------------------------

  /**
   * Remove entries that are far past their TTL.
   *
   * Expired entries aren't deleted immediately because getStale() uses them
   * as fallbacks when external APIs are down. We only evict entries that are
   * 10x past their TTL -- old enough that the data is no longer useful.
   */
  cleanup(): void {
    try {
      const now = Date.now();
      let removed = 0;
      const STALE_GRACE = 10;

      for (const [key, entry] of Array.from(this.store.entries())) {
        const ttl = entry.expiresAt - entry.storedAt;
        const maxAge = ttl * STALE_GRACE;

        if (now - entry.storedAt > maxAge) {
          this.store.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        logger.debug(
          `[ApiCache] Cleanup removed ${removed} ancient entries, ${this.store.size} remain`,
        );
      }
    } catch {
      // Swallow -- cleanup failures are non-critical.
    }
  }

  /**
   * Evict least-recently-used entries until the cache is back at or under
   * MAX_ENTRIES.
   */
  private evictLRU(): void {
    try {
      const entries = Array.from(this.store.entries());
      // Sort by lastAccessed ascending (oldest access first)
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      const toEvict = this.store.size - MAX_ENTRIES;
      for (let i = 0; i < toEvict && i < entries.length; i++) {
        this.store.delete(entries[i][0]);
      }

      if (toEvict > 0) {
        logger.debug(`[ApiCache] LRU evicted ${toEvict} entries, ${this.store.size} remain`);
      }
    } catch {
      // Swallow -- eviction failures are non-critical.
    }
  }

  // -----------------------------------------------------------------------
  // Statistics
  // -----------------------------------------------------------------------

  /**
   * Return current cache statistics.
   */
  getStats(): CacheStats {
    const now = Date.now();
    const entries = Array.from(this.store.entries()).map(([key, entry]) => ({
      key,
      isStale: now > entry.expiresAt,
      ageMs: now - entry.storedAt,
    }));

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : 'N/A';

    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      entries,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Singleton cache instance shared across the application.
 *
 * In Next.js serverless environments this persists for the lifetime of the
 * Node.js process (which may span many requests).
 */
export const apiCache = new ApiCache();

// ---------------------------------------------------------------------------
// High-level SWR wrapper
// ---------------------------------------------------------------------------

/**
 * Fetch-through cache with stale-while-revalidate support.
 *
 * Usage:
 * ```ts
 * const data = await withCache('news:latest', () => fetchNews(), {
 *   ttlSeconds: CACHE_TTL.FREQUENT,
 *   staleWhileRevalidate: true,
 *   fallbackToStale: true,
 * });
 * ```
 *
 * Behavior:
 * 1. If cache has a fresh value, return it immediately.
 * 2. If `staleWhileRevalidate` is true and stale data exists, return stale
 *    data and kick off a background revalidation.
 * 3. If no cached value, call `fetcher`, cache the result, and return it.
 * 4. If `fetcher` throws and `fallbackToStale` is true, return stale data
 *    instead of propagating the error.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions,
): Promise<T> {
  const { ttlSeconds, staleWhileRevalidate = false, fallbackToStale = false } = options;
  const ttlMs = ttlSeconds * 1000;

  // 1. Check for fresh cached value
  const fresh = apiCache.get<T>(key);
  if (fresh !== null) {
    return fresh;
  }

  // 2. Check for stale value (SWR path)
  const staleResult = apiCache.getStale<T>(key);

  if (staleWhileRevalidate && staleResult !== null) {
    // Return stale data immediately, revalidate in background
    revalidateInBackground(key, fetcher, ttlMs);
    return staleResult.value;
  }

  // 3. No cache at all (or SWR disabled) -- call fetcher
  try {
    const data = await fetcher();
    apiCache.set(key, data, ttlMs);
    return data;
  } catch (err) {
    // 4. Fallback to stale on error
    if (fallbackToStale && staleResult !== null) {
      logger.warn(`[ApiCache] Fetcher failed for "${key}", returning stale data`, {
        error: String(err),
      });
      return staleResult.value;
    }

    throw err;
  }
}

/**
 * Fire-and-forget background revalidation. Errors are logged, never thrown.
 */
function revalidateInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): void {
  // Use Promise.resolve().then() to defer to the next microtask
  Promise.resolve()
    .then(() => fetcher())
    .then((data) => {
      apiCache.set(key, data, ttlMs);
      logger.debug(`[ApiCache] Background revalidation complete for "${key}"`);
    })
    .catch((err) => {
      logger.warn(`[ApiCache] Background revalidation failed for "${key}"`, {
        error: String(err),
      });
    });
}
