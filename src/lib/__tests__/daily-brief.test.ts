/**
 * @jest-environment node
 *
 * Daily Brief (G7) — compose + cron route tests.
 *   - composeDailyBrief: empty sections are omitted; all-empty returns null
 *     (the cron then skips the day); subject line composition.
 *   - POST /api/cron/daily-brief: one compose shared by all recipients,
 *     batch-send call shape, and one-send-per-day idempotency (ledger row +
 *     P2002 claim race).
 *
 * Prisma and the Resend batch sender are always mocked — no real DB, no email.
 */

import { NextRequest } from 'next/server';

const mockSpaceEventFindMany = jest.fn();
const mockNewsFindMany = jest.fn();
const mockCompanyFindMany = jest.fn();
const mockAwardFindMany = jest.fn();
const mockRoundFindMany = jest.fn();
const mockSubscriberFindMany = jest.fn();
const mockLedgerFindUnique = jest.fn();
const mockLedgerCreate = jest.fn();
const mockLedgerUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    spaceEvent: { findMany: (...a: unknown[]) => mockSpaceEventFindMany(...a) },
    newsArticle: { findMany: (...a: unknown[]) => mockNewsFindMany(...a) },
    companyProfile: { findMany: (...a: unknown[]) => mockCompanyFindMany(...a) },
    governmentContractAward: { findMany: (...a: unknown[]) => mockAwardFindMany(...a) },
    fundingRound: { findMany: (...a: unknown[]) => mockRoundFindMany(...a) },
    newsletterSubscriber: { findMany: (...a: unknown[]) => mockSubscriberFindMany(...a) },
    dailyBriefSend: {
      findUnique: (...a: unknown[]) => mockLedgerFindUnique(...a),
      create: (...a: unknown[]) => mockLedgerCreate(...a),
      update: (...a: unknown[]) => mockLedgerUpdate(...a),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockSendDailyDigest = jest.fn();
jest.mock('@/lib/newsletter/email-service', () => ({
  sendDailyDigest: (...a: unknown[]) => mockSendDailyDigest(...a),
}));

import { composeDailyBrief, tMinus, fmtUsd } from '@/lib/daily-brief';
import { POST as cronPOST } from '@/app/api/cron/daily-brief/route';

const NOW = new Date('2026-09-01T07:04:00Z');

/** spaceEvent.findMany serves two sections; route on the queried status. */
function mockSpaceEvents(upcoming: unknown[], flown: unknown[]) {
  mockSpaceEventFindMany.mockImplementation((args: { where: { status: unknown } }) =>
    Promise.resolve(args.where.status === 'upcoming' ? upcoming : flown)
  );
}

function emptyAllSections() {
  mockSpaceEvents([], []);
  mockNewsFindMany.mockResolvedValue([]);
  mockCompanyFindMany.mockResolvedValue([]);
  mockAwardFindMany.mockResolvedValue([]);
  mockRoundFindMany.mockResolvedValue([]);
}

const upcomingLaunch = {
  name: 'Falcon 9 | Starlink G10-12',
  rocket: 'Falcon 9',
  location: 'Cape Canaveral',
  launchDate: new Date(NOW.getTime() + 5 * 3600_000 + 32 * 60_000),
};

beforeEach(() => {
  jest.clearAllMocks();
  // requireCronSecret: with a secret configured, the Bearer header authorizes
  // (a bare NextRequest has no host header, so the localhost path can't).
  process.env.CRON_SECRET = 'test-cron-secret';
});

describe('composeDailyBrief', () => {
  it('omits empty sections entirely', async () => {
    emptyAllSections();
    mockSpaceEvents([upcomingLaunch], []);

    const brief = await composeDailyBrief(NOW);
    expect(brief).not.toBeNull();
    expect(brief!.sectionCount).toBe(1);
    expect(brief!.html).toContain('Launching in the next 24h');
    // every other section is absent from both bodies
    for (const missing of ['Top stories', 'Stock mover', 'New government contracts', 'New funding', 'launch outcomes']) {
      expect(brief!.html).not.toContain(missing);
    }
    expect(brief!.plain).not.toContain('TOP STORIES');
    expect(brief!.plain).not.toContain('NEW FUNDING');
  });

  it('returns null when every section is empty (skip the day)', async () => {
    emptyAllSections();
    expect(await composeDailyBrief(NOW)).toBeNull();
  });

  it('composes the subject from the first upcoming launch and the date', async () => {
    emptyAllSections();
    mockSpaceEvents([upcomingLaunch], []);

    const brief = await composeDailyBrief(NOW);
    expect(brief!.subject).toBe('☀ SpaceNexus Daily — Falcon 9 | Starlink G10-12, Sep 1');
  });

  it('falls back to the top story for the subject when no launches', async () => {
    emptyAllSections();
    mockNewsFindMany.mockResolvedValue([
      { title: 'NASA awards lunar lander study', url: 'https://x/1', source: 'SpaceNews' },
      { title: 'Second story', url: 'https://x/2', source: 'Ars' },
    ]);

    const brief = await composeDailyBrief(NOW);
    expect(brief!.subject).toBe('☀ SpaceNexus Daily — NASA awards lunar lander study, Sep 1');
    expect(brief!.html).toContain('Top stories');
  });

  it('prefers distinct sources in the top-5 stories', async () => {
    emptyAllSections();
    mockNewsFindMany.mockResolvedValue([
      { title: 'A1', url: 'https://x/a1', source: 'SpaceNews' },
      { title: 'A2', url: 'https://x/a2', source: 'SpaceNews' },
      { title: 'B1', url: 'https://x/b1', source: 'Ars' },
      { title: 'C1', url: 'https://x/c1', source: 'NSF' },
      { title: 'D1', url: 'https://x/d1', source: 'Reuters' },
      { title: 'E1', url: 'https://x/e1', source: 'BBC' },
      { title: 'F1', url: 'https://x/f1', source: 'CNBC' },
    ]);
    const brief = await composeDailyBrief(NOW);
    // A2 (duplicate source) loses its slot to the five distinct sources
    expect(brief!.plain).not.toContain('A2');
    for (const t of ['A1', 'B1', 'C1', 'D1', 'E1']) expect(brief!.plain).toContain(t);
  });

  it('picks the biggest absolute stock mover, null-safe', async () => {
    emptyAllSections();
    mockCompanyFindMany.mockResolvedValue([
      { name: 'Rocket Lab', ticker: 'RKLB', slug: 'rocket-lab', stockPrice: 8.1, priceChange24h: 3.2 },
      { name: 'AST', ticker: 'ASTS', slug: 'ast', stockPrice: 30.5, priceChange24h: -7.8 },
      { name: 'NoData', ticker: 'ND', slug: 'nodata', stockPrice: null, priceChange24h: null },
    ]);
    const brief = await composeDailyBrief(NOW);
    expect(brief!.plain).toContain('AST (ASTS) -7.8%');
    expect(brief!.plain).not.toContain('Rocket Lab');
  });

  it('embeds the per-recipient unsubscribe placeholder and both footer links', async () => {
    emptyAllSections();
    mockSpaceEvents([upcomingLaunch], []);
    const brief = await composeDailyBrief(NOW);
    expect(brief!.html).toContain('token={{UNSUBSCRIBE_TOKEN}}&scope=daily');
    expect(brief!.html).toContain('/newsletter');
    expect(brief!.html).toContain('/desk');
    expect(brief!.plain).toContain('token={{UNSUBSCRIBE_TOKEN}}');
  });
});

describe('helpers', () => {
  it('tMinus formats countdowns', () => {
    expect(tMinus(new Date(NOW.getTime() + 5 * 3600_000 + 32 * 60_000), NOW)).toBe('T−5h 32m');
    expect(tMinus(new Date(NOW.getTime() + 12 * 60_000), NOW)).toBe('T−12m');
    expect(tMinus(new Date(NOW.getTime() - 1000), NOW)).toBe('T−0');
  });
  it('fmtUsd compacts dollar values', () => {
    expect(fmtUsd(1_200_000_000)).toBe('$1.2B');
    expect(fmtUsd(450_000_000)).toBe('$450M');
    expect(fmtUsd(820_000)).toBe('$820K');
  });
});

describe('POST /api/cron/daily-brief', () => {
  const req = () =>
    new NextRequest('http://localhost/api/cron/daily-brief', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret' },
    });

  it('composes once and batch-sends to opted-in verified subscribers', async () => {
    emptyAllSections();
    mockSpaceEvents([upcomingLaunch], []);
    mockLedgerFindUnique.mockResolvedValue(null);
    mockLedgerCreate.mockResolvedValue({});
    mockLedgerUpdate.mockResolvedValue({});
    const subs = [
      { email: 'a@x.com', unsubscribeToken: 't1' },
      { email: 'b@x.com', unsubscribeToken: 't2' },
    ];
    mockSubscriberFindMany.mockResolvedValue(subs);
    mockSendDailyDigest.mockResolvedValue({ success: true, sentCount: 2, failedCount: 0, errors: [] });

    const res = await cronPOST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentCount).toBe(2);

    // recipient selection: verified + not unsubscribed + dailyBrief flag
    expect(mockSubscriberFindMany).toHaveBeenCalledWith({
      where: { verified: true, unsubscribedAt: null, dailyBrief: true },
      select: { email: true, unsubscribeToken: true },
    });

    // ONE send call, shaped (subscribers, html, plain, subject)
    expect(mockSendDailyDigest).toHaveBeenCalledTimes(1);
    const [sentSubs, html, plain, subject] = mockSendDailyDigest.mock.calls[0];
    expect(sentSubs).toEqual(subs);
    expect(typeof html).toBe('string');
    expect(typeof plain).toBe('string');
    expect(subject).toMatch(/^☀ SpaceNexus Daily — /);

    // ledger row claimed before send, then updated with counts
    expect(mockLedgerCreate).toHaveBeenCalledTimes(1);
    expect(mockLedgerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { sentCount: 2, failedCount: 0 } })
    );
  });

  it('is idempotent: an existing ledger row for today short-circuits the send', async () => {
    mockLedgerFindUnique.mockResolvedValue({ date: '2026-09-01', sentCount: 5, skipped: false });

    const res = await cronPOST(req());
    const body = await res.json();
    expect(body.alreadySent).toBe(true);
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
    expect(mockSpaceEventFindMany).not.toHaveBeenCalled();
    expect(mockLedgerCreate).not.toHaveBeenCalled();
  });

  it('loses the claim race gracefully (P2002) without sending', async () => {
    emptyAllSections();
    mockSpaceEvents([upcomingLaunch], []);
    mockLedgerFindUnique.mockResolvedValue(null);
    mockSubscriberFindMany.mockResolvedValue([{ email: 'a@x.com', unsubscribeToken: 't1' }]);
    mockLedgerCreate.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

    const res = await cronPOST(req());
    const body = await res.json();
    expect(body.alreadySent).toBe(true);
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
  });

  it('records a skipped day (no email) when everything is empty', async () => {
    emptyAllSections();
    mockLedgerFindUnique.mockResolvedValue(null);
    mockLedgerCreate.mockResolvedValue({});

    const res = await cronPOST(req());
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
    expect(mockLedgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ skipped: true }) })
    );
  });
});
