// Mock the logger to silence output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { apiCache, CacheTTL } from '../api-cache';

beforeEach(() => {
  apiCache.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Basic cache operations — degradation focus
// ---------------------------------------------------------------------------
describe('apiCache — basic operations for degradation', () => {
  it('get() returns null for a key that was never set', () => {
    expect(apiCache.get('nonexistent')).toBeNull();
  });

  it('set() stores and get() retrieves a value', () => {
    apiCache.set('mykey', { data: 'hello' });
    expect(apiCache.get('mykey')).toEqual({ data: 'hello' });
  });

  it('expires after TTL', () => {
    apiCache.set('short-lived', 'value', 2000);

    jest.advanceTimersByTime(1999);
    expect(apiCache.get('short-lived')).toBe('value');

    jest.advanceTimersByTime(2);
    expect(apiCache.get('short-lived')).toBeNull();
  });

  it('can be deleted', () => {
    apiCache.set('removable', 'data');
    expect(apiCache.get('removable')).toBe('data');

    apiCache.delete('removable');
    expect(apiCache.get('removable')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Multiple keys don't interfere
// ---------------------------------------------------------------------------
describe('apiCache — key isolation', () => {
  it('stores and retrieves multiple independent keys', () => {
    apiCache.set('key-a', 'alpha');
    apiCache.set('key-b', 'beta');
    apiCache.set('key-c', 'gamma');

    expect(apiCache.get('key-a')).toBe('alpha');
    expect(apiCache.get('key-b')).toBe('beta');
    expect(apiCache.get('key-c')).toBe('gamma');
  });

  it('expiring one key does not affect others', () => {
    apiCache.set('expires-fast', 'ephemeral', 1_000);
    apiCache.set('expires-slow', 'persistent', 60_000);

    jest.advanceTimersByTime(2_000);

    expect(apiCache.get('expires-fast')).toBeNull();
    expect(apiCache.get('expires-slow')).toBe('persistent');
  });

  it('deleting one key does not affect others', () => {
    apiCache.set('keep', 'stays');
    apiCache.set('remove', 'goes');

    apiCache.delete('remove');

    expect(apiCache.get('keep')).toBe('stays');
    expect(apiCache.get('remove')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cache clear
// ---------------------------------------------------------------------------
describe('apiCache — clear', () => {
  it('removes all entries and resets stats', () => {
    apiCache.set('x', 1);
    apiCache.set('y', 2);
    apiCache.get('x'); // hit
    apiCache.get('z'); // miss

    apiCache.clear();

    // Stats were reset by clear()
    const statsAfterClear = apiCache.getStats();
    expect(statsAfterClear.size).toBe(0);
    expect(statsAfterClear.hits).toBe(0);
    expect(statsAfterClear.misses).toBe(0);

    // Entries are gone -- these will register as new misses
    expect(apiCache.get('x')).toBeNull();
    expect(apiCache.get('y')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stale-while-revalidate behavior (getStale)
// ---------------------------------------------------------------------------
describe('apiCache — stale-while-revalidate (getStale)', () => {
  it('returns value as NOT stale before TTL expires', () => {
    apiCache.set('swr-key', 'fresh-data', 5_000);

    jest.advanceTimersByTime(3_000);

    const result = apiCache.getStale('swr-key');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('fresh-data');
    expect(result!.isStale).toBe(false);
  });

  it('returns value as stale AFTER TTL expires', () => {
    apiCache.set('swr-key', 'stale-data', 5_000);

    jest.advanceTimersByTime(6_000);

    // get() returns null for expired entries
    expect(apiCache.get('swr-key')).toBeNull();

    // getStale() still returns the value with isStale = true
    const result = apiCache.getStale('swr-key');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('stale-data');
    expect(result!.isStale).toBe(true);
  });

  it('returns null from getStale for a key that was never set', () => {
    expect(apiCache.getStale('never-existed')).toBeNull();
  });

  it('includes storedAt timestamp in the stale result', () => {
    const before = Date.now();
    apiCache.set('ts-key', 'val', 1_000);
    const after = Date.now();

    const result = apiCache.getStale('ts-key');
    expect(result).not.toBeNull();
    expect(result!.storedAt).toBeGreaterThanOrEqual(before);
    expect(result!.storedAt).toBeLessThanOrEqual(after);
  });

  it('returns stale data even after a very long time', () => {
    apiCache.set('ancient', 'old-data', 1_000);

    // Advance a long time -- but NOT past the cleanup threshold (10x TTL)
    jest.advanceTimersByTime(9_000);

    const result = apiCache.getStale('ancient');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('old-data');
    expect(result!.isStale).toBe(true);
  });

  it('returns null from getStale after a deleted key', () => {
    apiCache.set('deleted-swr', 'data');
    apiCache.delete('deleted-swr');

    expect(apiCache.getStale('deleted-swr')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Degradation scenario: simulating API failure with cache fallback
// ---------------------------------------------------------------------------
describe('apiCache — degradation scenario', () => {
  it('serves stale data when the "API" fails after cache population', () => {
    // Simulate: API was healthy and populated the cache
    apiCache.set('api-response', { launches: ['Falcon 9'] }, 5_000);

    // Time passes, TTL expires
    jest.advanceTimersByTime(10_000);

    // Fresh get() returns null (expired)
    expect(apiCache.get('api-response')).toBeNull();

    // But getStale() still returns the cached data for degraded service
    const stale = apiCache.getStale<{ launches: string[] }>('api-response');
    expect(stale).not.toBeNull();
    expect(stale!.value.launches).toEqual(['Falcon 9']);
    expect(stale!.isStale).toBe(true);
  });

  it('correctly updates cache when the API recovers', () => {
    // Old stale data
    apiCache.set('api-data', 'old', 1_000);
    jest.advanceTimersByTime(2_000);
    expect(apiCache.get('api-data')).toBeNull();

    // API recovers, new fresh data is stored
    apiCache.set('api-data', 'new', 5_000);
    expect(apiCache.get('api-data')).toBe('new');

    // getStale also returns fresh data now
    const result = apiCache.getStale('api-data');
    expect(result!.value).toBe('new');
    expect(result!.isStale).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cleanup behavior
// ---------------------------------------------------------------------------
describe('apiCache — cleanup of ancient entries', () => {
  it('cleanup() removes entries that are 10x past their TTL', () => {
    apiCache.set('ephemeral', 'data', 1_000);

    // Advance past 10x the TTL (10,000ms)
    jest.advanceTimersByTime(10_001);

    apiCache.cleanup();

    // Even getStale() should return null because cleanup physically removed it
    expect(apiCache.getStale('ephemeral')).toBeNull();
    expect(apiCache.getStats().size).toBe(0);
  });

  it('cleanup() preserves entries that are stale but not yet 10x past TTL', () => {
    apiCache.set('recent-stale', 'data', 1_000);

    // Advance past TTL but not past 10x TTL
    jest.advanceTimersByTime(5_000);

    apiCache.cleanup();

    // Entry is still available via getStale
    const result = apiCache.getStale('recent-stale');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('data');
    expect(result!.isStale).toBe(true);
  });

  it('cleanup() handles a mix of ancient and recent entries', () => {
    apiCache.set('ancient', 'old', 1_000);
    apiCache.set('recent', 'new', 60_000);

    // Advance far enough to evict 'ancient' (10x its 1s TTL = 10s)
    // but not enough to evict 'recent' (10x its 60s TTL = 600s)
    jest.advanceTimersByTime(15_000);

    apiCache.cleanup();

    expect(apiCache.getStale('ancient')).toBeNull();
    expect(apiCache.getStale('recent')).not.toBeNull();
    expect(apiCache.getStats().size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Stats tracking under degradation
// ---------------------------------------------------------------------------
describe('apiCache — stats under degradation', () => {
  it('tracks misses for expired entries', () => {
    apiCache.set('expires', 'val', 1_000);

    apiCache.get('expires'); // hit
    jest.advanceTimersByTime(2_000);
    apiCache.get('expires'); // miss (expired)

    const stats = apiCache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe('50.0%');
  });

  it('getStats().entries shows stale status per key', () => {
    apiCache.set('fresh-entry', 'f', 10_000);
    apiCache.set('stale-entry', 's', 1_000);

    jest.advanceTimersByTime(2_000);

    const stats = apiCache.getStats();
    const freshInfo = stats.entries.find((e) => e.key === 'fresh-entry');
    const staleInfo = stats.entries.find((e) => e.key === 'stale-entry');

    expect(freshInfo).toBeDefined();
    expect(freshInfo!.isStale).toBe(false);

    expect(staleInfo).toBeDefined();
    expect(staleInfo!.isStale).toBe(true);
  });

  it('getStats().entries includes ageMs for each entry', () => {
    apiCache.set('aged', 'data', 60_000);

    jest.advanceTimersByTime(5_000);

    const stats = apiCache.getStats();
    const entry = stats.entries.find((e) => e.key === 'aged');
    expect(entry).toBeDefined();
    expect(entry!.ageMs).toBeGreaterThanOrEqual(5_000);
  });
});

// ---------------------------------------------------------------------------
// CacheTTL constants (quick sanity check)
// ---------------------------------------------------------------------------
describe('CacheTTL constants', () => {
  it('defines expected TTL values', () => {
    expect(CacheTTL.NEWS).toBe(60_000);
    expect(CacheTTL.DEFAULT).toBe(300_000);
    expect(CacheTTL.STOCKS).toBe(600_000);
    expect(CacheTTL.SLOW).toBe(900_000);
    expect(CacheTTL.VERY_SLOW).toBe(1_800_000);
  });
});
