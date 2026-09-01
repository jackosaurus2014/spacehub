/**
 * @jest-environment node
 *
 * Space Tycoon weekly corporation report email (2026-09-01).
 * Covers: compose returns null for a dormant profile, the cash-flow table
 * sums by reason, the unsubscribe token round-trips and rejects tampering,
 * the cron claims TycoonWeeklySend before sending, and the route is 401
 * without the cron secret.
 */
const mockProfileFindUnique = jest.fn();
const mockProfileFindMany = jest.fn();
const mockProfileCount = jest.fn();
const mockLedgerFindMany = jest.fn();
const mockTradeFindMany = jest.fn();
const mockActivityFindMany = jest.fn();
const mockReportFindFirst = jest.fn();
const mockSendCreate = jest.fn();
const mockSendDeleteMany = jest.fn();
const mockWorldStats = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    gameProfile: {
      findUnique: (...a: unknown[]) => mockProfileFindUnique(...a),
      findMany: (...a: unknown[]) => mockProfileFindMany(...a),
      count: (...a: unknown[]) => mockProfileCount(...a),
    },
    gameLedgerEntry: { findMany: (...a: unknown[]) => mockLedgerFindMany(...a) },
    tradeStatDaily: { findMany: (...a: unknown[]) => mockTradeFindMany(...a) },
    playerActivity: { findMany: (...a: unknown[]) => mockActivityFindMany(...a) },
    publishedCorpReport: { findFirst: (...a: unknown[]) => mockReportFindFirst(...a) },
    tycoonWeeklySend: { create: (...a: unknown[]) => mockSendCreate(...a), deleteMany: (...a: unknown[]) => mockSendDeleteMany(...a) },
  },
}));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/newsletter/email-service', () => ({ sendVerificationEmail: jest.fn(async () => ({ success: true })) }));
jest.mock('@/lib/weekly-economy-report', () => ({ getTycoonWorldStats: (...a: unknown[]) => mockWorldStats(...a) }));

import { NextRequest } from 'next/server';
import {
  buildCashFlowTable, composeWeeklyCorpReport, mintUnsubscribeToken, verifyUnsubscribeToken,
  runTycoonWeeklyReportDeliveries, weeklyNetWorthPct, formatPct, STALE_PROFILE_MS,
} from '@/lib/game/weekly-report-email';
import { POST as cronPost } from '@/app/api/cron/tycoon-weekly-report/route';

const NOW = new Date('2026-09-07T09:30:00Z'); // a Monday
const SECRET = 'unit-test-cron-secret';

function profileRow(over: Record<string, unknown> = {}) {
  return {
    companyName: 'Orbital Dynamics', money: 250_000_000, netWorth: 1_000_000_000, peakNetWorth: 1_100_000_000,
    buildingCount: 12, researchCount: 20, serviceCount: 6, locationsUnlocked: 4, gameYear: 2031,
    rivalWins: 3, rivalLosses: 1, dailyBonusStreak: 5, bidReliability: 0.92,
    lastSyncAt: new Date(NOW.getTime() - 2 * 24 * 3600_000),
    user: { email: 'ceo@example.com' },
    ...over,
  };
}

function primeHappyPath() {
  mockProfileFindUnique.mockResolvedValue(profileRow());
  mockLedgerFindMany.mockResolvedValue([
    { moneyDelta: 50_000_000, reason: 'order_sale_revenue' },
    { moneyDelta: 30_000_000, reason: 'order_sale_revenue' },
    { moneyDelta: -20_000_000, reason: 'order_escrow' },
    { moneyDelta: -5_000_000, reason: 'bid_collateral' },
  ]);
  mockTradeFindMany.mockResolvedValue([{ buyVol: 100, sellVol: 40, buyValue: 1_000_000, sellValue: 800_000 }]);
  mockActivityFindMany.mockResolvedValue([{ title: 'Claimed first lunar milestone', createdAt: NOW }]);
  mockReportFindFirst.mockResolvedValue({ reportJson: JSON.stringify({ netWorth: 9e8, quarterNumber: 3, gameYear: 2031, quarterOfYear: 3, quarterIndex: 2, revenue: 1, costs: 1, profit: 0, fleetCount: 0, buildingCount: 1, corporationTier: 1, notableEvents: [], growthRatePct: null }), publishedAt: NOW });
  mockWorldStats.mockResolvedValue({ totalCorporations: 40, topCorp: { companyName: 'Helios', netWorth: 5e9, tier: 4 }, allianceCount: 2, newestReport: null });
  mockProfileCount.mockResolvedValue(6);
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  for (const m of [mockProfileFindUnique, mockProfileFindMany, mockProfileCount, mockLedgerFindMany, mockTradeFindMany, mockActivityFindMany, mockReportFindFirst, mockSendCreate, mockSendDeleteMany, mockWorldStats]) m.mockReset();
  mockSendCreate.mockResolvedValue({});
  mockSendDeleteMany.mockResolvedValue({ count: 1 });
});

describe('buildCashFlowTable', () => {
  it('sums income and spend by reason, keeps totals over every entry', () => {
    const t = buildCashFlowTable([
      { moneyDelta: 10, reason: 'a' }, { moneyDelta: 5, reason: 'a' }, { moneyDelta: -3, reason: 'a' },
      { moneyDelta: -7, reason: 'b' }, { moneyDelta: 0, reason: 'zero' }, { moneyDelta: NaN, reason: 'nan' },
    ]);
    expect(t.rows).toEqual([{ reason: 'a', income: 15, spend: 3 }, { reason: 'b', income: 0, spend: 7 }]);
    expect(t).toMatchObject({ income: 15, spend: 10, net: 5 });
  });

  it('caps rows at 12 but totals still cover the tail', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ moneyDelta: i + 1, reason: `r${i}` }));
    const t = buildCashFlowTable(entries);
    expect(t.rows).toHaveLength(12);
    expect(t.rows[0].reason).toBe('r19');
    expect(t.income).toBe(210);
  });
});

describe('unsubscribe token', () => {
  it('round-trips and rejects tampering, wrong secret, and malformed input', () => {
    const tok = mintUnsubscribeToken('clx123abc', SECRET)!;
    expect(tok).toMatch(/^clx123abc\.[a-f0-9]{64}$/);
    expect(verifyUnsubscribeToken(tok, SECRET)).toBe('clx123abc');
    expect(verifyUnsubscribeToken(tok.replace(/.$/, c => (c === '0' ? '1' : '0')), SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(tok.replace('clx123abc', 'clx123abd'), SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(tok, 'other-secret')).toBeNull();
    expect(verifyUnsubscribeToken('nodot', SECRET)).toBeNull();
    expect(verifyUnsubscribeToken('', SECRET)).toBeNull();
    expect(mintUnsubscribeToken('clx123abc', '')).toBeNull();
    expect(verifyUnsubscribeToken(tok, '')).toBeNull();
  });
});

describe('weeklyNetWorthPct / formatPct', () => {
  it('measures the ledger net against the start-of-week net worth', () => {
    expect(weeklyNetWorthPct(1_100, 100)).toBeCloseTo(10);
    expect(weeklyNetWorthPct(900, -100)).toBeCloseTo(-10);
    expect(weeklyNetWorthPct(0, 0)).toBe(0);
    expect(formatPct(10)).toBe('+10.0%');
    expect(formatPct(-2.345)).toBe('−2.3%');
  });
});

describe('composeWeeklyCorpReport', () => {
  it('returns null for a profile with no sync in 14 days', async () => {
    mockProfileFindUnique.mockResolvedValue(profileRow({ lastSyncAt: new Date(NOW.getTime() - STALE_PROFILE_MS - 1000) }));
    expect(await composeWeeklyCorpReport('p1', NOW)).toBeNull();
    expect(mockLedgerFindMany).not.toHaveBeenCalled();
  });

  it('returns null for an unknown profile', async () => {
    mockProfileFindUnique.mockResolvedValue(null);
    expect(await composeWeeklyCorpReport('nope', NOW)).toBeNull();
  });

  it('builds subject, cash-flow table, rank, registry link and unsubscribe link from server rows', async () => {
    primeHappyPath();
    const mail = await composeWeeklyCorpReport('p1', NOW);
    expect(mail).not.toBeNull();
    // ledger net +55M on a 1B net worth → start 945M → +5.8%
    expect(mail!.subject).toBe('Your week at Orbital Dynamics: net worth +5.8%, #7 of 40');
    expect(mail!.to).toBe('ceo@example.com');
    expect(mail!.plain).toContain('order sale revenue: +$80.0M / −$0');
    expect(mail!.plain).toContain('order escrow: +$0 / −$20.0M');
    expect(mail!.plain).toContain('income $80.0M, spend $25.0M, net +$55.0M');
    expect(mail!.plain).toContain('bought 100 units ($1.0M), sold 40 units ($800K)');
    expect(mail!.plain).toContain('Claimed first lunar milestone');
    expect(mail!.plain).toContain('Latest published quarterly: Q3 2031');
    expect(mail!.plain).toContain('/space-tycoon/registry');
    expect(mail!.html).toContain('/space-tycoon"');
    expect(mail!.html).toContain(`/api/space-tycoon/weekly-report/unsubscribe?token=${mail!.unsubscribeToken}`);
    expect(verifyUnsubscribeToken(mail!.unsubscribeToken)).toBe('p1');
    expect(mockProfileCount).toHaveBeenCalledWith({ where: { netWorth: { gt: 1_000_000_000 } } });
  });

  it('escapes player-controlled strings in HTML', async () => {
    primeHappyPath();
    mockProfileFindUnique.mockResolvedValue(profileRow({ companyName: '<img src=x onerror=alert(1)> Corp' }));
    const mail = await composeWeeklyCorpReport('p1', NOW);
    expect(mail!.html).not.toContain('<img src=x');
    expect(mail!.html).toContain('&lt;img src=x');
  });
});

describe('runTycoonWeeklyReportDeliveries', () => {
  it('claims the ISO week before sending, skips profiles already claimed, and releases a failed send', async () => {
    primeHappyPath();
    mockProfileFindMany.mockResolvedValue([
      { id: 'p1', user: { email: 'a@x.io' } },
      { id: 'p2', user: { email: 'b@x.io' } },
      { id: 'p3', user: { email: null } },
      { id: 'p4', user: { email: 'd@x.io' } },
    ]);
    mockSendCreate
      .mockResolvedValueOnce({})                       // p1 claimed
      .mockRejectedValueOnce(new Error('P2002'))       // p2 already sent this week
      .mockResolvedValueOnce({});                      // p4 claimed
    const sent: string[] = [];
    const r = await runTycoonWeeklyReportDeliveries(NOW, async (to) => { sent.push(to); return to !== 'd@x.io'; });
    expect(sent).toEqual(['a@x.io', 'd@x.io']);
    expect(r).toEqual({ profiles: 4, sent: 1, skipped: 2, claimed: 1, dormant: 0 });
    expect(mockSendCreate).toHaveBeenCalledWith({ data: { profileId: 'p1', periodKey: '2026-W37' } });
    expect(mockSendDeleteMany).toHaveBeenCalledWith({ where: { profileId: 'p4', periodKey: '2026-W37' } });
  });

  it('honours the per-run cap', async () => {
    primeHappyPath();
    mockProfileFindMany.mockResolvedValue([{ id: 'p1', user: { email: 'a@x.io' } }, { id: 'p2', user: { email: 'b@x.io' } }]);
    const r = await runTycoonWeeklyReportDeliveries(NOW, async () => true, 1);
    expect(r).toMatchObject({ sent: 1, skipped: 1 });
  });
});

describe('POST /api/cron/tycoon-weekly-report', () => {
  it('is 401 without the cron secret', async () => {
    const res = await cronPost(new NextRequest('https://spacenexus.us/api/cron/tycoon-weekly-report', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect(mockProfileFindMany).not.toHaveBeenCalled();
  });

  it('runs with the secret', async () => {
    mockProfileFindMany.mockResolvedValue([]);
    const res = await cronPost(new NextRequest('https://spacenexus.us/api/cron/tycoon-weekly-report', { method: 'POST', headers: { authorization: `Bearer ${SECRET}` } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, profiles: 0, sent: 0 });
  });
});
