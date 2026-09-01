/**
 * @jest-environment node
 */

// My Desk composition (src/lib/desk.ts): watermark math, silo dedupe,
// quiet-company partitioning, and one-dead-silo resilience.

const mockDb = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  companyWatchlistItem: { findMany: jest.fn() },
  companyFollow: { findMany: jest.fn() },
  companyWatch: { findMany: jest.fn() },
  companyProfile: { findMany: jest.fn() },
  launchWatch: { findMany: jest.fn() },
  spaceEvent: { findMany: jest.fn() },
  launchDateChange: { findMany: jest.fn() },
  notification: { findMany: jest.fn(), count: jest.fn() },
  alertDelivery: { findMany: jest.fn(), count: jest.fn() },
  savedSearch: { findMany: jest.fn() },
  savedProcurementSearch: { findMany: jest.fn() },
  savedSearchMatch: { groupBy: jest.fn() },
};

// Lazy getter: jest.mock is hoisted above mockDb's initialization, so the
// factory must not touch it until the code under test actually calls prisma.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const mockCollectCompanyBrief = jest.fn();
jest.mock('@/lib/company-brief', () => ({
  collectCompanyBrief: (...args: unknown[]) => mockCollectCompanyBrief(...args),
  briefIsEmpty: (d: { jobs: { count: number }; contracts: unknown[]; funding: unknown[]; filings: unknown[]; news: unknown[] }) =>
    d.jobs.count === 0 && d.contracts.length === 0 && d.funding.length === 0 && d.filings.length === 0 && d.news.length === 0,
}));

// Pure matcher replicated so the test never loads launch-watch's email chain.
jest.mock('@/lib/launch-watch', () => ({
  watchMatchesEvent: (
    w: { eventId: string | null; rocket: string | null; site: string | null },
    e: { id: string; rocket: string | null; location: string | null }
  ) => {
    if (w.eventId) return w.eventId === e.id;
    if (w.rocket) return !!e.rocket && e.rocket.toLowerCase().includes(w.rocket.toLowerCase());
    if (w.site) return !!e.location && e.location.toLowerCase().includes(w.site.toLowerCase());
    return false;
  },
}));

const mockGetLiveQuotesBatch = jest.fn();
jest.mock('@/lib/stock-quote', () => ({
  getLiveQuotesBatch: (...args: unknown[]) => mockGetLiveQuotesBatch(...args),
}));

import { getDesk, DESK_DEFAULT_WINDOW_MS, DESK_MAX_WINDOW_MS } from '@/lib/desk';

const NOW = new Date('2026-08-31T12:00:00Z');
const USER = 'user-1';
const EMAIL = 'jay@example.com';

function makeBrief(over: Partial<{ jobs: number; contracts: number; funding: number; filings: number; news: number }> = {}) {
  const n = { jobs: 0, contracts: 0, funding: 0, filings: 0, news: 0, ...over };
  return {
    jobs: { count: n.jobs, titles: [] },
    contracts: Array.from({ length: n.contracts }, () => ({})),
    funding: Array.from({ length: n.funding }, () => ({})),
    filings: Array.from({ length: n.filings }, () => ({})),
    news: Array.from({ length: n.news }, () => ({})),
  };
}

function resetAll() {
  for (const model of Object.values(mockDb)) for (const fn of Object.values(model)) (fn as jest.Mock).mockReset();
  mockCollectCompanyBrief.mockReset();
  mockGetLiveQuotesBatch.mockReset();

  // A user with nothing watched and no history — individual tests override.
  mockDb.user.findUnique.mockResolvedValue({ lastDeskVisitAt: null, deskVisitCount: 0, email: EMAIL });
  mockDb.user.update.mockResolvedValue({});
  mockDb.companyWatchlistItem.findMany.mockResolvedValue([]);
  mockDb.companyFollow.findMany.mockResolvedValue([]);
  mockDb.companyWatch.findMany.mockResolvedValue([]);
  mockDb.companyProfile.findMany.mockResolvedValue([]);
  mockDb.launchWatch.findMany.mockResolvedValue([]);
  mockDb.spaceEvent.findMany.mockResolvedValue([]);
  mockDb.launchDateChange.findMany.mockResolvedValue([]);
  mockDb.notification.findMany.mockResolvedValue([]);
  mockDb.notification.count.mockResolvedValue(0);
  mockDb.alertDelivery.findMany.mockResolvedValue([]);
  mockDb.alertDelivery.count.mockResolvedValue(0);
  mockDb.savedSearch.findMany.mockResolvedValue([]);
  mockDb.savedProcurementSearch.findMany.mockResolvedValue([]);
  mockDb.savedSearchMatch.groupBy.mockResolvedValue([]);
  mockCollectCompanyBrief.mockResolvedValue(makeBrief());
  mockGetLiveQuotesBatch.mockResolvedValue(new Map());
}

const profile = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  slug: `co-${id}`,
  name: `Company ${id.toUpperCase()}`,
  ticker: null,
  stockPrice: null,
  priceChange24h: null,
  ...over,
});

describe('getDesk watermark math', () => {
  beforeEach(resetAll);

  it('defaults the since-watermark to 7 days back when the user has never visited', async () => {
    const desk = await getDesk(USER, EMAIL, NOW);
    expect(desk.since).toBe(new Date(NOW.getTime() - DESK_DEFAULT_WINDOW_MS).toISOString());
  });

  it('uses lastDeskVisitAt as the watermark when it is recent', async () => {
    const last = new Date(NOW.getTime() - 2 * 24 * 3600_000);
    mockDb.user.findUnique.mockResolvedValue({ lastDeskVisitAt: last, deskVisitCount: 4, email: EMAIL });
    const desk = await getDesk(USER, EMAIL, NOW);
    expect(desk.since).toBe(last.toISOString());
    expect(desk.visitCount).toBe(4);
  });

  it('caps the window at 30 days for a long-absent user', async () => {
    const last = new Date(NOW.getTime() - 90 * 24 * 3600_000);
    mockDb.user.findUnique.mockResolvedValue({ lastDeskVisitAt: last, deskVisitCount: 1, email: EMAIL });
    const desk = await getDesk(USER, EMAIL, NOW);
    expect(desk.since).toBe(new Date(NOW.getTime() - DESK_MAX_WINDOW_MS).toISOString());
  });

  it('passes the capped since date into the company-brief engine', async () => {
    mockDb.user.findUnique.mockResolvedValue({
      lastDeskVisitAt: new Date(NOW.getTime() - 90 * 24 * 3600_000),
      deskVisitCount: 1,
      email: EMAIL,
    });
    mockDb.companyWatchlistItem.findMany.mockResolvedValue([{ companyProfileId: 'c1' }]);
    mockDb.companyProfile.findMany.mockResolvedValue([profile('c1')]);
    await getDesk(USER, EMAIL, NOW);
    expect(mockCollectCompanyBrief).toHaveBeenCalledWith('c1', new Date(NOW.getTime() - DESK_MAX_WINDOW_MS));
  });

  it('advances the watermark only AFTER the desk has composed', async () => {
    const order: string[] = [];
    mockDb.companyWatchlistItem.findMany.mockResolvedValue([{ companyProfileId: 'c1' }]);
    mockDb.companyProfile.findMany.mockResolvedValue([profile('c1')]);
    mockCollectCompanyBrief.mockImplementation(async () => {
      order.push('brief');
      return makeBrief({ news: 1 });
    });
    mockDb.notification.findMany.mockImplementation(async () => {
      order.push('unread');
      return [];
    });
    mockDb.user.update.mockImplementation(async () => {
      order.push('watermark');
      return {};
    });

    await getDesk(USER, EMAIL, NOW);

    expect(order[order.length - 1]).toBe('watermark');
    expect(order.indexOf('watermark')).toBeGreaterThan(order.indexOf('brief'));
    expect(order.indexOf('watermark')).toBeGreaterThan(order.indexOf('unread'));
    expect(mockDb.user.update).toHaveBeenCalledTimes(1);
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: USER },
      data: { lastDeskVisitAt: NOW, deskVisitCount: { increment: 1 } },
    });
  });
});

describe('getDesk company silo dedupe', () => {
  beforeEach(resetAll);

  it('merges CompanyWatchlistItem, CompanyFollow and CompanyWatch and dedupes ids', async () => {
    mockDb.companyWatchlistItem.findMany.mockResolvedValue([{ companyProfileId: 'c1' }, { companyProfileId: 'c2' }]);
    mockDb.companyFollow.findMany.mockResolvedValue([{ companyId: 'c2' }, { companyId: 'c3' }]);
    mockDb.companyWatch.findMany.mockResolvedValue([{ companyProfileId: 'c3' }, { companyProfileId: 'c1' }]);
    mockDb.companyProfile.findMany.mockResolvedValue([profile('c1'), profile('c2'), profile('c3')]);

    const desk = await getDesk(USER, EMAIL, NOW);

    const hydrateArgs = mockDb.companyProfile.findMany.mock.calls[0][0];
    expect([...hydrateArgs.where.id.in].sort()).toEqual(['c1', 'c2', 'c3']);
    expect(desk.companies.total).toBe(3);
    expect(desk.companies.list).toHaveLength(3);
    // The email-silo query only sees verified, still-subscribed watches.
    expect(mockDb.companyWatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: EMAIL, verified: true, unsubscribedAt: null } })
    );
  });

  it('lower-cases the email before hitting the email-keyed silo', async () => {
    await getDesk(USER, 'Jay@Example.COM', NOW);
    expect(mockDb.companyWatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ email: 'jay@example.com' }) })
    );
  });
});

describe('getDesk quiet-company partitioning', () => {
  beforeEach(resetAll);

  it('keeps empty-brief companies listed but flagged quiet, active companies first', async () => {
    mockDb.companyWatchlistItem.findMany.mockResolvedValue([
      { companyProfileId: 'c1' },
      { companyProfileId: 'c2' },
      { companyProfileId: 'c3' },
    ]);
    // Hydration returns alphabetical: A(quiet), B(active), C(quiet).
    mockDb.companyProfile.findMany.mockResolvedValue([
      profile('c1', { name: 'Astra' }),
      profile('c2', { name: 'Blue Origin' }),
      profile('c3', { name: 'Cygnus' }),
    ]);
    mockCollectCompanyBrief.mockImplementation(async (id: string) =>
      id === 'c2' ? makeBrief({ jobs: 3, news: 2 }) : makeBrief()
    );

    const desk = await getDesk(USER, EMAIL, NOW);

    expect(desk.companies.list.map((c) => [c.name, c.quiet])).toEqual([
      ['Blue Origin', false],
      ['Astra', true],
      ['Cygnus', true],
    ]);
    expect(desk.companies.list[0].brief).toEqual({ jobs: 3, contracts: 0, funding: 0, filings: 0, news: 2 });
    expect(desk.companies.list[1].brief).toBeNull();
    expect(desk.totals.companyEvents).toBe(5);
  });

  it('caps brief composition at 8 companies; the overflow stays listed as quiet', async () => {
    const ids = Array.from({ length: 10 }, (_, i) => `c${i}`);
    mockDb.companyWatchlistItem.findMany.mockResolvedValue(ids.map((id) => ({ companyProfileId: id })));
    mockDb.companyProfile.findMany.mockResolvedValue(ids.map((id) => profile(id)));
    mockCollectCompanyBrief.mockResolvedValue(makeBrief({ news: 1 }));

    const desk = await getDesk(USER, EMAIL, NOW);

    expect(mockCollectCompanyBrief).toHaveBeenCalledTimes(8);
    expect(desk.companies.list).toHaveLength(10);
    expect(desk.companies.list.filter((c) => c.quiet)).toHaveLength(2);
  });
});

describe('getDesk resilience', () => {
  beforeEach(resetAll);

  it('survives a dead unread silo: that panel errors, the rest of the desk is intact', async () => {
    mockDb.notification.findMany.mockRejectedValue(new Error('relation does not exist'));
    mockDb.companyWatchlistItem.findMany.mockResolvedValue([{ companyProfileId: 'c1' }]);
    mockDb.companyProfile.findMany.mockResolvedValue([profile('c1')]);
    mockCollectCompanyBrief.mockResolvedValue(makeBrief({ contracts: 1 }));

    const desk = await getDesk(USER, EMAIL, NOW);

    expect(desk.unread.error).toBe(true);
    expect(desk.unread.list).toEqual([]);
    expect(desk.companies.error).toBe(false);
    expect(desk.companies.list[0].brief).toEqual({ jobs: 0, contracts: 1, funding: 0, filings: 0, news: 0 });
    // The watermark still advances — the desk did compose.
    expect(mockDb.user.update).toHaveBeenCalled();
  });

  it('survives every silo dying at once', async () => {
    for (const model of [
      mockDb.companyWatchlistItem,
      mockDb.companyFollow,
      mockDb.companyWatch,
      mockDb.launchWatch,
      mockDb.savedSearch,
    ]) {
      (model.findMany as jest.Mock).mockRejectedValue(new Error('down'));
    }
    mockDb.notification.findMany.mockRejectedValue(new Error('down'));
    mockDb.savedProcurementSearch.findMany.mockRejectedValue(new Error('down'));

    const desk = await getDesk(USER, EMAIL, NOW);

    expect(desk.companies.list).toEqual([]);
    expect(desk.launches.error).toBe(true);
    expect(desk.unread.error).toBe(true);
    expect(desk.searches.error).toBe(true);
    expect(desk.totals).toEqual({ companyEvents: 0, launchUpdates: 0, unread: 0, newMatches: 0 });
  });

  it('a failed watermark write never rejects the desk', async () => {
    mockDb.user.update.mockRejectedValue(new Error('deadlock'));
    await expect(getDesk(USER, EMAIL, NOW)).resolves.toBeTruthy();
  });
});
