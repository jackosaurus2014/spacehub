/**
 * Tests for src/lib/podcast-sync.ts — pure/DB-selection logic behind the
 * podcast directory's RSS sync. This is the extraction that backs both the
 * admin per-show sync route (POST /api/podcasts/sync/[slug]) and the
 * scheduled cron route (POST /api/cron/podcasts-sync), which replaced a
 * no-op cron that previously pointed at the read-only GET /api/podcasts
 * directory listing and synced nothing.
 *
 * Network calls (rss-parser) are not exercised here — only the pure
 * stalest-selection query logic, which is what determines cron correctness
 * (never-synced shows must always be prioritized over stale-but-synced ones).
 */

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    podcast: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    podcastEpisode: {
      upsert: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import { getStalestPodcasts } from '@/lib/podcast-sync';

const mockPrisma = prisma as unknown as {
  podcast: { findMany: jest.Mock; update: jest.Mock };
  podcastEpisode: { upsert: jest.Mock; count: jest.Mock };
};

describe('getStalestPodcasts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prioritizes never-fetched podcasts (lastFetchedAt: null) ahead of stale-but-synced ones', async () => {
    const neverFetched = [
      { id: 'p1', slug: 'show-a', name: 'Show A', feedUrl: 'https://a.example/rss' },
      { id: 'p2', slug: 'show-b', name: 'Show B', feedUrl: 'https://b.example/rss' },
    ];
    mockPrisma.podcast.findMany.mockResolvedValueOnce(neverFetched); // never-fetched query

    const result = await getStalestPodcasts(2);

    expect(result).toEqual(neverFetched);
    // Only the never-fetched query should have run — limit was already satisfied
    expect(mockPrisma.podcast.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { feedUrl: { not: null }, lastFetchedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 2,
      }),
    );
  });

  it('backfills with the oldest lastFetchedAt rows when fewer than N shows are unsynced', async () => {
    const neverFetched = [
      { id: 'p1', slug: 'show-a', name: 'Show A', feedUrl: 'https://a.example/rss' },
    ];
    const stalest = [
      { id: 'p2', slug: 'show-b', name: 'Show B', feedUrl: 'https://b.example/rss' },
      { id: 'p3', slug: 'show-c', name: 'Show C', feedUrl: 'https://c.example/rss' },
    ];
    mockPrisma.podcast.findMany
      .mockResolvedValueOnce(neverFetched) // never-fetched query
      .mockResolvedValueOnce(stalest); // oldest-fetched backfill query

    const result = await getStalestPodcasts(3);

    expect(result).toEqual([...neverFetched, ...stalest]);
    expect(mockPrisma.podcast.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.podcast.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { feedUrl: { not: null }, lastFetchedAt: { not: null } },
        orderBy: { lastFetchedAt: 'asc' },
        take: 2, // remaining = 3 - 1
      }),
    );
  });

  it('excludes podcasts with no feedUrl from both queries', async () => {
    mockPrisma.podcast.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await getStalestPodcasts(5);

    for (const call of mockPrisma.podcast.findMany.mock.calls) {
      const where = call[0].where as Record<string, unknown>;
      expect(where.feedUrl).toEqual({ not: null });
    }
  });

  it('returns an empty array when there are no podcasts with feeds configured', async () => {
    mockPrisma.podcast.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await getStalestPodcasts(8);

    expect(result).toEqual([]);
  });
});
