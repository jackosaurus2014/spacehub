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
// Basic set and get operations
// ---------------------------------------------------------------------------
describe('apiCache — set and get', () => {
  it('stores a value and retrieves it', () => {
    apiCache.set('key1', { data: 'hello' });
    expect(apiCache.get('key1')).toEqual({ data: 'hello' });
  });

  it('stores different types of values', () => {
    apiCache.set('string', 'abc');
    apiCache.set('number', 42);
    apiCache.set('array', [1, 2, 3]);

    expect(apiCache.get('string')).toBe('abc');
    expect(apiCache.get('number')).toBe(42);
    expect(apiCache.get('array')).toEqual([1, 2, 3]);
  });

  it('overwrites an existing key with a new value', () => {
    apiCache.set('key', 'first');
    apiCache.set('key', 'second');
    expect(apiCache.get('key')).toBe('second');
  });
});

// ---------------------------------------------------------------------------
// TTL expiration
// ---------------------------------------------------------------------------
describe('apiCache — TTL expiration', () => {
  it('returns the value before TTL expires', () => {
    apiCache.set('ttl-key', 'alive', 5000);
    jest.advanceTimersByTime(4999);
    expect(apiCache.get('ttl-key')).toBe('alive');
  });

  it('returns null after TTL expires', () => {
    apiCache.set('ttl-key', 'alive', 5000);
    jest.advanceTimersByTime(5001);
    expect(apiCache.get('ttl-key')).toBeNull();
  });

  it('uses CacheTTL.DEFAULT when no TTL is specified', () => {
    apiCache.set('default-ttl', 'data');
    // Advance just under the 5-minute default (300,000ms)
    jest.advanceTimersByTime(299_999);
    expect(apiCache.get('default-ttl')).toBe('data');

    // Advance past the default
    jest.advanceTimersByTime(2);
    expect(apiCache.get('default-ttl')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cache miss
// ---------------------------------------------------------------------------
describe('apiCache — cache miss', () => {
  it('returns null for a key that was never set', () => {
    expect(apiCache.get('nonexistent')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cache clear
// ---------------------------------------------------------------------------
describe('apiCache — clear', () => {
  it('removes all entries', () => {
    apiCache.set('a', 1);
    apiCache.set('b', 2);
    apiCache.set('c', 3);

    apiCache.clear();

    expect(apiCache.get('a')).toBeNull();
    expect(apiCache.get('b')).toBeNull();
    expect(apiCache.get('c')).toBeNull();
  });

  it('resets hit/miss stats', () => {
    apiCache.set('key', 'val');
    apiCache.get('key'); // hit
    apiCache.get('miss'); // miss

    apiCache.clear();
    const stats = apiCache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple keys don't interfere
// ---------------------------------------------------------------------------
describe('apiCache — key isolation', () => {
  it('stores and retrieves independent keys', () => {
    apiCache.set('alpha', 'A');
    apiCache.set('beta', 'B');
    apiCache.set('gamma', 'C');

    expect(apiCache.get('alpha')).toBe('A');
    expect(apiCache.get('beta')).toBe('B');
    expect(apiCache.get('gamma')).toBe('C');
  });

  it('expiring one key does not affect another', () => {
    apiCache.set('short', 'gone-soon', 1000);
    apiCache.set('long', 'stays', 60_000);

    jest.advanceTimersByTime(2000);

    expect(apiCache.get('short')).toBeNull();
    expect(apiCache.get('long')).toBe('stays');
  });
});

// ---------------------------------------------------------------------------
// getStale
// ---------------------------------------------------------------------------
describe('apiCache — getStale', () => {
  it('returns the value as not stale before TTL', () => {
    apiCache.set('stale-key', 'fresh', 5000);
    const result = apiCache.getStale('stale-key');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('fresh');
    expect(result!.isStale).toBe(false);
  });

  it('returns the value as stale after TTL expires', () => {
    apiCache.set('stale-key', 'old-data', 5000);
    jest.advanceTimersByTime(6000);
    const result = apiCache.getStale('stale-key');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('old-data');
    expect(result!.isStale).toBe(true);
  });

  it('returns null for a key that was never set', () => {
    expect(apiCache.getStale('nonexistent')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------
describe('apiCache — delete', () => {
  it('removes a specific entry', () => {
    apiCache.set('to-delete', 'bye');
    expect(apiCache.delete('to-delete')).toBe(true);
    expect(apiCache.get('to-delete')).toBeNull();
  });

  it('returns false for a nonexistent key', () => {
    expect(apiCache.delete('nope')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------
describe('apiCache — getStats', () => {
  it('tracks cache size, hits, and misses', () => {
    apiCache.set('a', 1);
    apiCache.set('b', 2);

    apiCache.get('a'); // hit
    apiCache.get('b'); // hit
    apiCache.get('c'); // miss

    const stats = apiCache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe('66.7%');
  });

  it('returns N/A hit rate when no gets have been made', () => {
    const stats = apiCache.getStats();
    expect(stats.hitRate).toBe('N/A');
  });
});

// ---------------------------------------------------------------------------
// CacheTTL constants
// ---------------------------------------------------------------------------
describe('CacheTTL', () => {
  it('has expected default values', () => {
    expect(CacheTTL.NEWS).toBe(60_000);
    expect(CacheTTL.DEFAULT).toBe(300_000);
    expect(CacheTTL.STOCKS).toBe(600_000);
    expect(CacheTTL.SLOW).toBe(900_000);
    expect(CacheTTL.VERY_SLOW).toBe(1_800_000);
  });
});
