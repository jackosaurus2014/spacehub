/**
 * @jest-environment node
 *
 * Opt-in email programs on the shared EmailProgramSend ledger:
 *   - Space Markets Daily (markets-daily), Monthly Hiring Index (hiring-index),
 *     Monthly Launch Slip Report (slip-report).
 *   - Composers: null on empty data (the cron then skips the period), subject
 *     formatting, scoped + global unsubscribe URLs in html AND plain.
 *   - POST /api/cron/email-programs: 401 without Bearer, unknown program 400,
 *     ledger claim before send, P2002 claim race prevents a double send,
 *     skipped periods recorded without email.
 *
 * Prisma, the data sources and the Resend batch sender are always mocked.
 */

import { NextRequest } from 'next/server';

const mockSubscriberFindMany = jest.fn();
const mockLedgerFindUnique = jest.fn();
const mockLedgerCreate = jest.fn();
const mockLedgerUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    newsletterSubscriber: { findMany: (...a: unknown[]) => mockSubscriberFindMany(...a) },
    emailProgramSend: {
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

const mockGetMarketsDaily = jest.fn();
jest.mock('@/lib/markets-daily', () => ({
  getMarketsDaily: (...a: unknown[]) => mockGetMarketsDaily(...a),
}));

const mockGetHiringIndex = jest.fn();
jest.mock('@/lib/hiring-index', () => {
  const actual = jest.requireActual('@/lib/hiring-index');
  return { ...actual, getHiringIndex: (...a: unknown[]) => mockGetHiringIndex(...a) };
});

jest.mock('@/lib/hiring-coverage', () => ({
  coverageChangesInWindow: (since: Date, until: Date) => {
    const t = Date.UTC(2026, 8, 1); // 2026-09-01 — Blue Origin board joins
    return t >= new Date(since).getTime() && t <= new Date(until).getTime()
      ? [{ date: '2026-09-01', company: 'Blue Origin', jobsDelta: 1590, note: 'Blue Origin board joined the tracker.' }]
      : [];
  },
}));

const mockGetSlipData = jest.fn();
jest.mock('@/lib/launch-slips', () => ({
  PROVIDER_STATS_THRESHOLD: 25,
  RECORDING_SINCE: '2026-08-29',
  getSlipData: (...a: unknown[]) => mockGetSlipData(...a),
}));

import { composeMarketsDaily, marketsSubject, fmtPct } from '@/lib/markets-daily-email';
import {
  composeHiringIndexReport,
  composeSlipReport,
  hiringIndexSubject,
  slipReportSubject,
  momPercent,
} from '@/lib/monthly-reports-email';
import { POST as cronPOST } from '@/app/api/cron/email-programs/route';
import { EMAIL_PROGRAMS } from '@/lib/email-programs';

const NOW = new Date('2026-09-03T14:00:00Z');

const marketsFixture = {
  asOf: '2026-09-03T21:35:12.000Z',
  index: { value: 0.83, members: 24, gainers: 15, decliners: 8 },
  topMovers: [
    { slug: 'rocket-lab', name: 'Rocket Lab', ticker: 'RKLB', changePct: 5.21 },
    { slug: 'ast-spacemobile', name: 'AST SpaceMobile', ticker: 'ASTS', changePct: 3.4 },
  ],
  bottomMovers: [
    { slug: 'spire', name: 'Spire Global', ticker: 'SPIR', changePct: -4.9 },
    { slug: null as unknown as string, name: 'Un<linked> Co', ticker: 'UNL', changePct: -1.1 },
  ],
  deals: [{ company: 'K2 Space', slug: 'k2-space', amount: 110_000_000, series: 'Series B', date: '2026-09-03T00:00:00Z' }],
  contracts: [{ company: 'Firefly', title: 'Alpha launch services <NSSL>', value: 24_000_000, agency: 'Space Force' }],
};

const hiringFixture = {
  month: '2026-08',
  monthLabel: 'August 2026',
  activeAtMonthEnd: 6512,
  activeAtMonthEndDate: '2026-08-31',
  activeNow: 6600,
  priorActiveAtMonthEnd: 6300,
  momChange: 212,
  newPostings: {
    total: 1480,
    byCategory: [{ key: 'engineering', count: 800 }, { key: 'operations', count: 300 }],
    bySeniority: [{ key: 'mid', count: 700 }, { key: 'c_suite', count: 4 }],
  },
  topCompanies: [{ companyName: 'SpaceX', slug: 'spacex', activeJobs: 1200, snapshotDate: '2026-08-31' }],
  movers: {
    gainers: [{ companyName: 'Relativity', slug: 'relativity', first: 40, last: 65, change: 25, percentChange: 62.5, firstDate: '2026-08-01', lastDate: '2026-08-31' }],
    decliners: [{ companyName: 'Astra', slug: null, first: 30, last: 12, change: -18, percentChange: -60, firstDate: '2026-08-01', lastDate: '2026-08-31' }],
  },
  remoteShare: { remote: 640, total: 6512, percent: 9.8 },
  topLocations: [{ location: 'Hawthorne, CA', count: 900 }],
  generatedAt: '2026-09-03T13:00:00Z',
};

const slipFixture = {
  asOf: '2026-09-03T15:00:00Z',
  totalChanges: 12,
  launchesTracked: 9,
  biggestRecentSlipDays: 21,
  recent: [
    { eventId: 'a', mission: 'Starlink G10-40', provider: 'SpaceX', rocket: 'Falcon 9', fromDate: '2026-09-04', toDate: '2026-09-06', deltaDays: 2, observedAt: '2026-09-01T00:00:00Z' },
    { eventId: 'b', mission: 'Vulcan USSF-87 & <friends>', provider: 'ULA', rocket: 'Vulcan', fromDate: '2026-09-10', toDate: '2026-10-01', deltaDays: 21, observedAt: '2026-09-02T00:00:00Z' },
    { eventId: 'c', mission: 'Electron Kinéis', provider: 'Rocket Lab', rocket: 'Electron', fromDate: '2026-09-12', toDate: '2026-09-09', deltaDays: -3, observedAt: '2026-09-02T00:00:00Z' },
  ],
  providerStatsUnlocked: false,
  providers: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = 'test-cron-secret';
});

// ---------------------------------------------------------------------------
// Space Markets Daily
// ---------------------------------------------------------------------------

describe('composeMarketsDaily', () => {
  it('returns null when the snapshot is unavailable (skip the day)', async () => {
    mockGetMarketsDaily.mockResolvedValue(null);
    expect(await composeMarketsDaily(NOW)).toBeNull();
  });

  it('returns null when there are no movers at all', async () => {
    mockGetMarketsDaily.mockResolvedValue({ ...marketsFixture, topMovers: [], bottomMovers: [] });
    expect(await composeMarketsDaily(NOW)).toBeNull();
  });

  it('formats the subject from the index and the biggest absolute mover, ≤ 78 chars', () => {
    expect(marketsSubject(marketsFixture)).toBe('Space Markets Daily: Index +0.8% · Rocket Lab +5.2%');
    // biggest ABSOLUTE move wins even when it is a decline
    const down = { ...marketsFixture, bottomMovers: [{ slug: 's', name: 'Spire Global', ticker: 'SPIR', changePct: -9.4 }] };
    expect(marketsSubject(down)).toBe('Space Markets Daily: Index +0.8% · Spire Global -9.4%');
    // no index → no index clause
    expect(marketsSubject({ ...marketsFixture, index: { ...marketsFixture.index, value: null } })).toBe(
      'Space Markets Daily: Rocket Lab +5.2%'
    );
    // long names are trimmed, never the numbers
    const long = { ...marketsFixture, topMovers: [{ slug: 'x', name: 'A'.repeat(120), ticker: 'AAA', changePct: 12.34 }] };
    const s = marketsSubject(long);
    expect(s.length).toBeLessThanOrEqual(78);
    expect(s.endsWith(' +12.3%')).toBe(true);
  });

  it('renders index, movers, deals, contracts, provenance and escapes everything', async () => {
    mockGetMarketsDaily.mockResolvedValue(marketsFixture);
    const email = (await composeMarketsDaily(NOW))!;
    expect(email).not.toBeNull();
    expect(email.html).toContain('SpaceNexus Pure-Play Index');
    expect(email.html).toContain('/company-profiles/rocket-lab');
    expect(email.html).toContain('Un&lt;linked&gt; Co');
    expect(email.html).not.toContain('Un<linked>');
    expect(email.html).toContain('Alpha launch services &lt;NSSL&gt;');
    expect(email.html).toContain('K2 Space');
    expect(email.html).toContain('$110M');
    // provenance uses the feed's own asOf, never a made-up time
    expect(email.html).toContain('Quotes: Yahoo Finance, as of 2026-09-03 21:35 UTC');
    expect(email.plain).toContain('Quotes: Yahoo Finance, as of 2026-09-03 21:35 UTC');
    expect(email.plain).toContain('- Rocket Lab (RKLB) +5.2%');
    expect(email.plain).toContain('- Spire Global (SPIR) -4.9%');
  });

  it('embeds the scoped and global unsubscribe URLs in html and plain', async () => {
    mockGetMarketsDaily.mockResolvedValue(marketsFixture);
    const email = (await composeMarketsDaily(NOW))!;
    for (const body of [email.html, email.plain]) {
      expect(body).toContain('/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}&scope=markets');
      expect(body).toMatch(/\/api\/newsletter\/unsubscribe\?token=\{\{UNSUBSCRIBE_TOKEN\}\}(?!&)/);
      expect(body).toContain('/markets-daily');
    }
  });

  it('fmtPct signs and rounds', () => {
    expect(fmtPct(0.83, { ascii: true })).toBe('+0.8%');
    expect(fmtPct(-4.96, { ascii: true })).toBe('-5.0%');
    expect(fmtPct(0)).toBe('0.0%');
  });
});

// ---------------------------------------------------------------------------
// Monthly Hiring Index
// ---------------------------------------------------------------------------

describe('composeHiringIndexReport', () => {
  it('returns null when the edition has no data', async () => {
    mockGetHiringIndex.mockResolvedValue(null);
    expect(await composeHiringIndexReport(NOW)).toBeNull();
  });

  it('asks for the latest COMPLETED edition (August when run on Sept 3)', async () => {
    mockGetHiringIndex.mockResolvedValue(hiringFixture);
    await composeHiringIndexReport(NOW);
    expect(mockGetHiringIndex).toHaveBeenCalledWith(2026, 8);
  });

  it('formats the subject with month, open roles and MoM %', () => {
    expect(momPercent(hiringFixture)).toBeCloseTo(3.365, 2);
    expect(hiringIndexSubject(hiringFixture, 6512)).toBe('Space Hiring Index — August 2026: 6,512 open roles (+3.4%)');
    expect(hiringIndexSubject({ ...hiringFixture, momChange: null, priorActiveAtMonthEnd: null }, 6512)).toBe(
      'Space Hiring Index — August 2026: 6,512 open roles'
    );
  });

  it('links the edition and /jobs, carries the coverage caveat, escapes, and has both unsubscribe URLs', async () => {
    mockGetHiringIndex.mockResolvedValue(hiringFixture);
    const email = (await composeHiringIndexReport(NOW))!;
    expect(email.subject).toBe('Space Hiring Index — August 2026: 6,512 open roles (+3.4%)');
    expect(email.html).toContain('/hiring-index/2026-08');
    expect(email.html).toContain('/jobs');
    expect(email.html).toContain('Coverage note (2026-09-01)');
    expect(email.plain).toContain('COVERAGE NOTE (2026-09-01)');
    expect(email.html).toContain('C suite 4');
    expect(email.plain).toContain('- Astra -18 (−60.0%) (30 -> 12)');
    for (const body of [email.html, email.plain]) {
      expect(body).toContain('/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}&scope=monthly');
      expect(body).toMatch(/\/api\/newsletter\/unsubscribe\?token=\{\{UNSUBSCRIBE_TOKEN\}\}(?!&)/);
    }
  });

  it('omits the coverage caveat for a month with no coverage change', async () => {
    mockGetHiringIndex.mockResolvedValue({ ...hiringFixture, month: '2026-09', monthLabel: 'September 2026' });
    // Run on Nov 3 → edition October 2026: the 2026-09-01 change is outside the window.
    const email = (await composeHiringIndexReport(new Date('2026-11-03T14:00:00Z')))!;
    expect(mockGetHiringIndex).toHaveBeenCalledWith(2026, 10);
    expect(email.html).not.toContain('Coverage note');
  });
});

// ---------------------------------------------------------------------------
// Monthly Launch Slip Report
// ---------------------------------------------------------------------------

describe('composeSlipReport', () => {
  it('returns null when the ledger is unavailable or empty', async () => {
    mockGetSlipData.mockResolvedValue(null);
    expect(await composeSlipReport(NOW)).toBeNull();
    mockGetSlipData.mockResolvedValue({ ...slipFixture, totalChanges: 0, recent: [] });
    expect(await composeSlipReport(NOW)).toBeNull();
  });

  it('formats the subject with the send month and headline counts', () => {
    expect(slipReportSubject(slipFixture, NOW)).toBe('Launch Slip Report — September 2026: 12 date changes across 9 launches');
    expect(slipReportSubject({ totalChanges: 1, launchesTracked: 1 }, NOW)).toBe(
      'Launch Slip Report — September 2026: 1 date change across 1 launch'
    );
  });

  it('lists the biggest slips first, shows the unlock line while locked, links /launch-slips, escapes', async () => {
    mockGetSlipData.mockResolvedValue(slipFixture);
    const email = (await composeSlipReport(NOW))!;
    expect(email.html).toContain('Vulcan USSF-87 &amp; &lt;friends&gt;');
    expect(email.plain.indexOf('Vulcan USSF-87')).toBeLessThan(email.plain.indexOf('Electron Kin'));
    expect(email.plain.indexOf('Electron Kin')).toBeLessThan(email.plain.indexOf('Starlink G10-40'));
    expect(email.plain).toContain('+21d (ULA / Vulcan): 2026-09-10 -> 2026-10-01');
    expect(email.html).toContain('Provider scorecard unlocks at 25 recorded changes; recording since 2026-08-29.');
    expect(email.html).not.toContain('Provider scorecard</p>');
    expect(email.html).toContain('/launch-slips');
    expect(email.html).toContain('Ledger as of 2026-09-03T15:00:00Z');
    for (const body of [email.html, email.plain]) {
      expect(body).toContain('/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}&scope=monthly');
      expect(body).toMatch(/\/api\/newsletter\/unsubscribe\?token=\{\{UNSUBSCRIBE_TOKEN\}\}(?!&)/);
    }
  });

  it('renders the provider scorecard only once unlocked', async () => {
    mockGetSlipData.mockResolvedValue({
      ...slipFixture,
      totalChanges: 30,
      providerStatsUnlocked: true,
      providers: [{ provider: 'SpaceX', changes: 20, avgSlipDays: 2.4, netDaysLost: 48 }],
    });
    const email = (await composeSlipReport(NOW))!;
    expect(email.html).toContain('Provider scorecard</p>');
    expect(email.plain).toContain('- SpaceX: 20 changes, avg +2d, net +48d');
    expect(email.html).not.toContain('scorecard unlocks at');
  });
});

// ---------------------------------------------------------------------------
// Cron route
// ---------------------------------------------------------------------------

describe('POST /api/cron/email-programs', () => {
  const req = (program: string, withAuth = true) =>
    new NextRequest(`http://localhost/api/cron/email-programs?program=${program}`, {
      method: 'POST',
      headers: withAuth ? { authorization: 'Bearer test-cron-secret' } : {},
    });

  it('returns 401 without a Bearer token', async () => {
    const res = await cronPOST(req('markets-daily', false));
    expect(res.status).toBe(401);
    expect(mockLedgerFindUnique).not.toHaveBeenCalled();
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
  });

  it('rejects an unknown program with 400 and lists the known ones', async () => {
    const res = await cronPOST(req('nope'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.known).toEqual(['markets-daily', 'hiring-index', 'slip-report']);
    expect(mockLedgerFindUnique).not.toHaveBeenCalled();
  });

  it('derives period keys per program', () => {
    const now = new Date('2026-09-03T14:00:00Z');
    expect(EMAIL_PROGRAMS['markets-daily'].periodKey(now)).toBe('2026-09-03');
    expect(EMAIL_PROGRAMS['hiring-index'].periodKey(now)).toBe('2026-08');
    expect(EMAIL_PROGRAMS['slip-report'].periodKey(now)).toBe('2026-09');
    expect(EMAIL_PROGRAMS['markets-daily'].flag).toBe('marketsDaily');
    expect(EMAIL_PROGRAMS['hiring-index'].flag).toBe('monthlyReports');
    expect(EMAIL_PROGRAMS['slip-report'].flag).toBe('monthlyReports');
  });

  it('composes once, claims the ledger row BEFORE sending, then records counts', async () => {
    mockGetMarketsDaily.mockResolvedValue(marketsFixture);
    mockLedgerFindUnique.mockResolvedValue(null);
    mockLedgerCreate.mockResolvedValue({});
    mockLedgerUpdate.mockResolvedValue({});
    const subs = [
      { email: 'a@x.com', unsubscribeToken: 't1' },
      { email: 'b@x.com', unsubscribeToken: 't2' },
    ];
    mockSubscriberFindMany.mockResolvedValue(subs);
    const order: string[] = [];
    mockLedgerCreate.mockImplementation(async () => { order.push('claim'); return {}; });
    mockSendDailyDigest.mockImplementation(async () => { order.push('send'); return { success: true, sentCount: 2, failedCount: 0, errors: [] }; });

    const res = await cronPOST(req('markets-daily'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentCount).toBe(2);
    expect(body.periodKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(mockSubscriberFindMany).toHaveBeenCalledWith({
      where: { verified: true, unsubscribedAt: null, marketsDaily: true },
      select: { email: true, unsubscribeToken: true },
    });
    expect(order).toEqual(['claim', 'send']);
    expect(mockLedgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ program: 'markets-daily', skipped: false, subject: expect.stringMatching(/^Space Markets Daily: /) }),
      })
    );
    expect(mockSendDailyDigest).toHaveBeenCalledTimes(1);
    const [sentSubs, html, plain, subject] = mockSendDailyDigest.mock.calls[0];
    expect(sentSubs).toEqual(subs);
    expect(html).toContain('{{UNSUBSCRIBE_TOKEN}}');
    expect(plain).toContain('{{UNSUBSCRIBE_TOKEN}}');
    expect(subject).toBe('Space Markets Daily: Index +0.8% · Rocket Lab +5.2%');
    expect(mockLedgerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { program_periodKey: { program: 'markets-daily', periodKey: body.periodKey } },
        data: { sentCount: 2, failedCount: 0 },
      })
    );
  });

  it('is idempotent: an existing ledger row short-circuits before compose', async () => {
    mockLedgerFindUnique.mockResolvedValue({ program: 'hiring-index', periodKey: '2026-08', sentCount: 7, skipped: false });
    const res = await cronPOST(req('hiring-index'));
    const body = await res.json();
    expect(body.alreadySent).toBe(true);
    expect(mockGetHiringIndex).not.toHaveBeenCalled();
    expect(mockLedgerCreate).not.toHaveBeenCalled();
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
  });

  it('loses the claim race gracefully (P2002) without sending', async () => {
    mockGetSlipData.mockResolvedValue(slipFixture);
    mockLedgerFindUnique.mockResolvedValue(null);
    mockSubscriberFindMany.mockResolvedValue([{ email: 'a@x.com', unsubscribeToken: 't1' }]);
    mockLedgerCreate.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

    const res = await cronPOST(req('slip-report'));
    const body = await res.json();
    expect(body.alreadySent).toBe(true);
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
    expect(mockLedgerUpdate).not.toHaveBeenCalled();
  });

  it('records a skipped period (no email) when the composer has nothing', async () => {
    mockGetSlipData.mockResolvedValue({ ...slipFixture, totalChanges: 0, recent: [] });
    mockLedgerFindUnique.mockResolvedValue(null);
    mockLedgerCreate.mockResolvedValue({});

    const res = await cronPOST(req('slip-report'));
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(mockSubscriberFindMany).not.toHaveBeenCalled();
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
    expect(mockLedgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ program: 'slip-report', skipped: true }) })
    );
  });

  it('selects monthlyReports recipients for the monthly programs', async () => {
    mockGetHiringIndex.mockResolvedValue(hiringFixture);
    mockLedgerFindUnique.mockResolvedValue(null);
    mockLedgerCreate.mockResolvedValue({});
    mockLedgerUpdate.mockResolvedValue({});
    mockSubscriberFindMany.mockResolvedValue([]);

    const res = await cronPOST(req('hiring-index'));
    const body = await res.json();
    expect(body.sentCount).toBe(0);
    expect(mockSubscriberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { verified: true, unsubscribedAt: null, monthlyReports: true } })
    );
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
  });
});
