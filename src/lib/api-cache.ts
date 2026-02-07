/**
 * Simple in-memory cache for external API responses.
 *
 * When external services are healthy the cache is updated on every successful
 * call. When an external service fails, the last successful response is served
 * from the cache so the application remains functional.
 *
 * Features:
 *   - Map-based storage with configurable TTL per entry
 *   - `get()` returns cached value if not expired, `null` otherwise
 *   - `set()` stores a value with a TTL in milliseconds
 *   - `getStale()` returns the cached value even if expired (for fallback use)
 *   - `getStats()` returns cache size and hit/miss statistics
 *   - Periodic automatic cleanup of expired entries
 *
 * No external dependencies.
 */

import { logger } from './logger';

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  storedAt: number;
}

/** Default TTLs in milliseconds */
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

class ApiCache {
  private store = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Run cleanup every 5 minutes to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 300_000);
      // unref() prevents this interval from keeping the Node.js event loop alive,
      // so the process can exit cleanly during serverless cold-shutdown
      if (this.cleanupInterval && typeof this.cleanupInterval === 'object' && 'unref' in this.cleanupInterval) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Get a cached value. Returns `null` if the key does not exist or has expired.
   */
  get<T = unknown>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Get a cached value even if it has expired.
   * Useful as a fallback when the external API is down --
   * stale data is better than no data.
   *
   * Returns `null` only if no entry exists for the key at all.
   */
  getStale<T = unknown>(key: string): { value: T; isStale: boolean; storedAt: number } | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    const isStale = Date.now() > entry.expiresAt;
    return {
      value: entry.value as T,
      isStale,
      storedAt: entry.storedAt,
    };
  }

  /**
   * Store a value in the cache with a time-to-live.
   *
   * @param key   Cache key
   * @param value The value to store
   * @param ttlMs Time-to-live in milliseconds (defaults to CacheTTL.DEFAULT)
   */
  set<T = unknown>(key: string, value: T, ttlMs: number = CacheTTL.DEFAULT): void {
    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: now + ttlMs,
      storedAt: now,
    });
  }

  /**
   * Delete a specific cache entry.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Remove all expired entries from the cache.
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    // Expired entries aren't deleted immediately because getStale() uses them
    // as fallbacks when external APIs are down. We only evict entries that are
    // 10x past their TTL -- old enough that the data is no longer useful.
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
      logger.debug(`[ApiCache] Cleanup removed ${removed} ancient entries, ${this.store.size} remain`);
    }
  }

  /**
   * Return current cache statistics.
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: string;
    entries: Array<{ key: string; isStale: boolean; ageMs: number }>;
  } {
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

/**
 * Singleton cache instance shared across the application.
 *
 * In Next.js serverless environments this persists for the lifetime of the
 * Node.js process (which may span many requests).
 */
export const apiCache = new ApiCache();
