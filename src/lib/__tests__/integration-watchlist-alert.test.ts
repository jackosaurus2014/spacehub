/**
 * @jest-environment node
 */

/**
 * Integration tests for the watchlist alert processor.
 *
 * Tests the full processWatchlistAlerts flow with mocked Prisma,
 * verifying that news, contract, and listing alerts are correctly
 * created for watched companies.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    newsArticle: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    alertDelivery: {
      create: jest.fn().mockResolvedValue({ id: 'delivery-1' }),
    },
    // Models accessed via (prisma as any)
    companyWatchlistItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    watchlistAlertLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    },
    governmentContractAward: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    serviceListing: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as any;
}

// ── Import under test ────────────────────────────────────────────────────────

import { processWatchlistAlerts } from '@/lib/alerts/watchlist-alert-processor';

// ── Test data factories ──────────────────────────────────────────────────────

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'article-1',
    title: 'SpaceX launches Starship',
    summary: 'SpaceX successfully launched Starship from Boca Chica.',
    url: 'https://example.com/article-1',
    source: 'SpaceNews',
    companyTags: [
      { id: 'company-1', name: 'SpaceX', slug: 'spacex' },
    ],
    ...overrides,
  };
}

function makeContract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    title: 'Satellite Constellation Contract',
    awardAmount: 250_000_000,
    agency: 'NASA',
    companyProfileId: 'company-1',
    companyProfile: { id: 'company-1', name: 'SpaceX', slug: 'spacex' },
    ...overrides,
  };
}

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    title: 'Launch Service Package',
    category: 'Launch Services',
    companyProfileId: 'company-1',
    companyProfile: { id: 'company-1', name: 'SpaceX', slug: 'spacex' },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('processWatchlistAlerts — integration', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  // ── No-op scenarios ──────────────────────────────────────────────────────

  describe('no-op when no data exists', () => {
    it('returns zeros when there are no recent news, contracts, or listings', async () => {
      const result = await processWatchlistAlerts(mockPrisma);

      expect(result).toEqual({ newsAlerts: 0, contractAlerts: 0, listingAlerts: 0 });
      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.governmentContractAward.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.serviceListing.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.alertDelivery.create).not.toHaveBeenCalled();
    });
  });

  describe('no-op when no watchers exist', () => {
    it('returns zeros when there are articles but no watchers', async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([makeArticle()]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([]);

      const result = await processWatchlistAlerts(mockPrisma);

      expect(result).toEqual({ newsAlerts: 0, contractAlerts: 0, listingAlerts: 0 });
      // Watchers were queried but none found
      expect(mockPrisma.companyWatchlistItem.findMany).toHaveBeenCalledWith({
        where: {
          companyProfileId: 'company-1',
          notifyNews: true,
        },
        select: { userId: true },
      });
      expect(mockPrisma.alertDelivery.create).not.toHaveBeenCalled();
    });
  });

  // ── News alerts ──────────────────────────────────────────────────────────

  describe('news alerts', () => {
    it('creates in-app and email deliveries for a watcher when a tagged article exists', async () => {
      const article = makeArticle();
      mockPrisma.newsArticle.findMany.mockResolvedValue([article]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      // watchlistAlertLog.create succeeds (no duplicate)
      mockPrisma.watchlistAlertLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await processWatchlistAlerts(mockPrisma);

      expect(result.newsAlerts).toBe(1);

      // Should have created exactly 2 deliveries (in_app + email)
      expect(mockPrisma.alertDelivery.create).toHaveBeenCalledTimes(2);

      // Verify in-app delivery
      const inAppCall = mockPrisma.alertDelivery.create.mock.calls[0][0];
      expect(inAppCall.data.userId).toBe('user-1');
      expect(inAppCall.data.channel).toBe('in_app');
      expect(inAppCall.data.status).toBe('pending');
      expect(inAppCall.data.title).toBe('SpaceX: SpaceX launches Starship');
      expect(inAppCall.data.source).toBe('watchlist');
      expect(inAppCall.data.data.type).toBe('watchlist_news');
      expect(inAppCall.data.data.companySlug).toBe('spacex');
      expect(inAppCall.data.data.link).toBe('/company-profiles/spacex');

      // Verify email delivery
      const emailCall = mockPrisma.alertDelivery.create.mock.calls[1][0];
      expect(emailCall.data.userId).toBe('user-1');
      expect(emailCall.data.channel).toBe('email');
      expect(emailCall.data.status).toBe('pending');
      expect(emailCall.data.data.emailFrequency).toBe('daily_digest');
    });

    it('creates alerts for multiple watchers of the same company', async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([makeArticle()]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      mockPrisma.watchlistAlertLog.create.mockResolvedValue({ id: 'log-x' });

      const result = await processWatchlistAlerts(mockPrisma);

      // 2 watchers => 2 newsAlerts
      expect(result.newsAlerts).toBe(2);
      // 2 watchers x 2 channels (in_app + email) = 4 deliveries
      expect(mockPrisma.alertDelivery.create).toHaveBeenCalledTimes(4);
    });

    it('creates alerts for an article tagged to multiple companies', async () => {
      const article = makeArticle({
        companyTags: [
          { id: 'company-1', name: 'SpaceX', slug: 'spacex' },
          { id: 'company-2', name: 'Blue Origin', slug: 'blue-origin' },
        ],
      });
      mockPrisma.newsArticle.findMany.mockResolvedValue([article]);
      // Both companies have one watcher each
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockPrisma.watchlistAlertLog.create.mockResolvedValue({ id: 'log-x' });

      const result = await processWatchlistAlerts(mockPrisma);

      // 2 companies x 1 watcher each = 2 newsAlerts
      expect(result.newsAlerts).toBe(2);
      // 2 x 2 deliveries = 4
      expect(mockPrisma.alertDelivery.create).toHaveBeenCalledTimes(4);
    });

    it('uses article summary as message, falls back to source-based message', async () => {
      const articleNoSummary = makeArticle({ summary: null });
      mockPrisma.newsArticle.findMany.mockResolvedValue([articleNoSummary]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockPrisma.watchlistAlertLog.create.mockResolvedValue({ id: 'log-1' });

      await processWatchlistAlerts(mockPrisma);

      const inAppCall = mockPrisma.alertDelivery.create.mock.calls[0][0];
      expect(inAppCall.data.message).toBe('New article about SpaceX from SpaceNews');
    });
  });

  // ── Deduplication ────────────────────────────────────────────────────────

  describe('deduplication via watchlistAlertLog', () => {
    it('skips delivery when watchlistAlertLog.create throws (duplicate)', async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([makeArticle()]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      // Simulate unique constraint violation
      mockPrisma.watchlistAlertLog.create.mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`userId`,`companyProfileId`,`alertType`,`referenceId`)')
      );

      const result = await processWatchlistAlerts(mockPrisma);

      // No alerts should be created because dedup check failed
      expect(result.newsAlerts).toBe(0);
      expect(mockPrisma.alertDelivery.create).not.toHaveBeenCalled();
    });

    it('delivers to second watcher even when first is a duplicate', async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([makeArticle()]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      // First call: duplicate (throws), second call: success
      mockPrisma.watchlistAlertLog.create
        .mockRejectedValueOnce(new Error('Unique constraint violation'))
        .mockResolvedValueOnce({ id: 'log-2' });

      const result = await processWatchlistAlerts(mockPrisma);

      // Only user-2 got the alert
      expect(result.newsAlerts).toBe(1);
      // 1 watcher x 2 channels = 2 deliveries
      expect(mockPrisma.alertDelivery.create).toHaveBeenCalledTimes(2);

      // Verify it was user-2 who received the delivery
      const inAppCall = mockPrisma.alertDelivery.create.mock.calls[0][0];
      expect(inAppCall.data.userId).toBe('user-2');
    });
  });

  // ── Contract alerts ──────────────────────────────────────────────────────

  describe('contract alerts', () => {
    it('creates delivery for a watcher when a new contract is awarded', async () => {
      const contract = makeContract();
      mockPrisma.governmentContractAward.findMany.mockResolvedValue([contract]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockPrisma.watchlistAlertLog.create.mockResolvedValue({ id: 'log-c1' });

      const result = await processWatchlistAlerts(mockPrisma);

      expect(result.contractAlerts).toBe(1);

      // Verify watcher query used notifyContracts
      expect(mockPrisma.companyWatchlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyProfileId: 'company-1',
            notifyContracts: true,
          }),
        })
      );

      // in_app + email = 2 deliveries
      expect(mockPrisma.alertDelivery.create).toHaveBeenCalledTimes(2);

      const inAppCall = mockPrisma.alertDelivery.create.mock.calls[0][0];
      expect(inAppCall.data.title).toBe('SpaceX: New $250.0M Contract');
      expect(inAppCall.data.data.type).toBe('watchlist_contract');
      expect(inAppCall.data.data.link).toBe('/company-profiles/spacex?tab=contracts');
    });

    it('formats undisclosed amount correctly when awardAmount is null', async () => {
      const contract = makeContract({ awardAmount: null });
      mockPrisma.governmentContractAward.findMany.mockResolvedValue([contract]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockPrisma.watchlistAlertLog.create.mockResolvedValue({ id: 'log-c2' });

      await processWatchlistAlerts(mockPrisma);

      const inAppCall = mockPrisma.alertDelivery.create.mock.calls[0][0];
      expect(inAppCall.data.title).toBe('SpaceX: New undisclosed amount Contract');
    });

    it('skips contracts with no companyProfile', async () => {
      const contract = makeContract({ companyProfile: null });
      mockPrisma.governmentContractAward.findMany.mockResolvedValue([contract]);

      const result = await processWatchlistAlerts(mockPrisma);

      expect(result.contractAlerts).toBe(0);
      // companyWatchlistItem.findMany should not be called for contracts path
      // (it may still be called for news path, but no contract watchers queried)
    });
  });

  // ── Listing alerts ─────────────────────────────────────────────────────

  describe('listing alerts', () => {
    it('creates delivery for a watcher when a new listing is posted', async () => {
      const listing = makeListing();
      mockPrisma.serviceListing.findMany.mockResolvedValue([listing]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockPrisma.watchlistAlertLog.create.mockResolvedValue({ id: 'log-l1' });

      const result = await processWatchlistAlerts(mockPrisma);

      expect(result.listingAlerts).toBe(1);

      // Verify watcher query used notifyListings
      expect(mockPrisma.companyWatchlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyProfileId: 'company-1',
            notifyListings: true,
          }),
        })
      );

      // Only in_app for listings (no email in the source code)
      expect(mockPrisma.alertDelivery.create).toHaveBeenCalledTimes(1);

      const inAppCall = mockPrisma.alertDelivery.create.mock.calls[0][0];
      expect(inAppCall.data.title).toBe('SpaceX: New Marketplace Listing');
      expect(inAppCall.data.data.type).toBe('watchlist_listing');
      expect(inAppCall.data.data.link).toBe('/marketplace/listings/listing-1');
    });

    it('skips listings with no companyProfile', async () => {
      const listing = makeListing({ companyProfile: null });
      mockPrisma.serviceListing.findMany.mockResolvedValue([listing]);

      const result = await processWatchlistAlerts(mockPrisma);

      expect(result.listingAlerts).toBe(0);
    });
  });

  // ── Combined scenario ────────────────────────────────────────────────────

  describe('combined news + contracts + listings', () => {
    it('processes all three alert types in one call', async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([makeArticle()]);
      mockPrisma.governmentContractAward.findMany.mockResolvedValue([makeContract()]);
      mockPrisma.serviceListing.findMany.mockResolvedValue([makeListing()]);
      mockPrisma.companyWatchlistItem.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockPrisma.watchlistAlertLog.create.mockResolvedValue({ id: 'log-x' });

      const result = await processWatchlistAlerts(mockPrisma);

      expect(result.newsAlerts).toBe(1);
      expect(result.contractAlerts).toBe(1);
      expect(result.listingAlerts).toBe(1);

      // news: 2 (in_app + email) + contract: 2 (in_app + email) + listing: 1 (in_app only)
      expect(mockPrisma.alertDelivery.create).toHaveBeenCalledTimes(5);
    });
  });

  // ── Error handling ───────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns default stats when prisma throws at the top level', async () => {
      mockPrisma.newsArticle.findMany.mockRejectedValue(
        new Error('Database connection lost')
      );

      const result = await processWatchlistAlerts(mockPrisma);

      // The function catches top-level errors and returns the stats accumulated so far
      expect(result).toEqual({ newsAlerts: 0, contractAlerts: 0, listingAlerts: 0 });
    });
  });

  // ── Query shape verification ─────────────────────────────────────────────

  describe('query shapes', () => {
    it('queries recent news with publishedAt >= 24h ago and companyTags', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await processWatchlistAlerts(mockPrisma);

      const newsQuery = mockPrisma.newsArticle.findMany.mock.calls[0][0];
      expect(newsQuery.where.publishedAt.gte).toBeInstanceOf(Date);
      expect(newsQuery.where.companyTags).toEqual({ some: {} });
      expect(newsQuery.select.companyTags).toBeDefined();

      jest.restoreAllMocks();
    });

    it('queries contracts with awardDate >= 24h ago and non-null companyProfileId', async () => {
      await processWatchlistAlerts(mockPrisma);

      const contractQuery = mockPrisma.governmentContractAward.findMany.mock.calls[0][0];
      expect(contractQuery.where.awardDate.gte).toBeInstanceOf(Date);
      expect(contractQuery.where.companyProfileId).toEqual({ not: null });
    });

    it('queries listings with createdAt >= 24h ago and non-null companyProfileId', async () => {
      await processWatchlistAlerts(mockPrisma);

      const listingQuery = mockPrisma.serviceListing.findMany.mock.calls[0][0];
      expect(listingQuery.where.createdAt.gte).toBeInstanceOf(Date);
      expect(listingQuery.where.companyProfileId).toEqual({ not: null });
    });
  });
});
