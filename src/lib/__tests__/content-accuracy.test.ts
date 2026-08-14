/**
 * Tests for src/lib/content-accuracy.ts — the daily content-accuracy
 * sentinel checklist runner backing /api/cron/content-accuracy.
 *
 * Covers pass and fail paths for every check, the data-driven runner
 * (runContentAccuracyChecks — including a check that throws), and the
 * summary-alert behavior in runContentAccuracySentinel (sends exactly one
 * alert via the existing freshness-alerts mechanism when anything fails,
 * sends nothing when everything passes).
 */

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockSendFreshnessAlert = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/freshness-alerts', () => ({
  sendFreshnessAlert: (...args: unknown[]) => mockSendFreshnessAlert(...args),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    spaceEvent: { findMany: jest.fn() },
    countdownWidget: { findMany: jest.fn() },
    spaceJobPosting: { findFirst: jest.fn() },
    newsArticle: { findFirst: jest.fn() },
    aIInsight: { findFirst: jest.fn() },
    publishedBrief: { findFirst: jest.fn() },
  },
}));

const mockGetArtemisNewsArticles = jest.fn();
jest.mock('@/lib/artemis-news', () => ({
  getArtemisNewsArticles: (...args: unknown[]) => mockGetArtemisNewsArticles(...args),
}));

const mockGetStarshipNewsArticles = jest.fn();
jest.mock('@/lib/starship-news', () => ({
  getStarshipNewsArticles: (...args: unknown[]) => mockGetStarshipNewsArticles(...args),
}));

import prisma from '@/lib/db';
import { STARTUP_HUB_ASOF } from '@/lib/startup-hub-data';
import { REPORT_CARDS_QUARTER_ASSESSED } from '@/lib/report-cards-data';
import {
  CONTENT_ACCURACY_CHECKS,
  runContentAccuracyChecks,
  runContentAccuracySentinel,
  quartersElapsedSince,
  type AccuracyCheckDef,
} from '@/lib/content-accuracy';

const mockPrisma = prisma as unknown as {
  spaceEvent: { findMany: jest.Mock };
  countdownWidget: { findMany: jest.Mock };
  spaceJobPosting: { findFirst: jest.Mock };
  newsArticle: { findFirst: jest.Mock };
  aIInsight: { findFirst: jest.Mock };
  publishedBrief: { findFirst: jest.Mock };
};

function getCheck(id: string): AccuracyCheckDef {
  const check = CONTENT_ACCURACY_CHECKS.find((c) => c.id === id);
  if (!check) throw new Error(`No check registered with id "${id}"`);
  return check;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('mission-control-featured-future', () => {
  it('passes when no marquee mission is marked upcoming with a past date', async () => {
    mockPrisma.spaceEvent.findMany.mockResolvedValueOnce([]);
    const result = await getCheck('mission-control-featured-future').run();
    expect(result.ok).toBe(true);
    expect(mockPrisma.spaceEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'upcoming' }) })
    );
  });

  it('fails when a marquee mission is marked upcoming with a past launch date', async () => {
    mockPrisma.spaceEvent.findMany.mockResolvedValueOnce([
      { id: 'evt-1', name: 'Artemis II', launchDate: new Date('2026-04-01T00:00:00Z') },
    ]);
    const result = await getCheck('mission-control-featured-future').run();
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('Artemis II');
  });
});

describe('countdown-widgets-future', () => {
  it('passes when there are no past-dated mission-linked widgets', async () => {
    mockPrisma.countdownWidget.findMany.mockResolvedValueOnce([]);
    const result = await getCheck('countdown-widgets-future').run();
    expect(result.ok).toBe(true);
  });

  it('passes when past-dated widgets only point to completed/scrubbed missions', async () => {
    mockPrisma.countdownWidget.findMany.mockResolvedValueOnce([
      { id: 'w1', slug: 'artemis-ii', missionName: 'Artemis II', targetTime: new Date('2026-04-01'), eventId: 'evt-1' },
    ]);
    mockPrisma.spaceEvent.findMany.mockResolvedValueOnce([{ id: 'evt-1', status: 'completed' }]);
    const result = await getCheck('countdown-widgets-future').run();
    expect(result.ok).toBe(true);
  });

  it('fails when a past-dated widget points to a mission not marked completed/scrubbed', async () => {
    mockPrisma.countdownWidget.findMany.mockResolvedValueOnce([
      { id: 'w1', slug: 'artemis-iii', missionName: 'Artemis III', targetTime: new Date('2027-01-01'), eventId: 'evt-2' },
    ]);
    mockPrisma.spaceEvent.findMany.mockResolvedValueOnce([{ id: 'evt-2', status: 'upcoming' }]);
    const result = await getCheck('countdown-widgets-future').run();
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('artemis-iii');
  });
});

describe('startup-hub-asof-fresh', () => {
  it('passes when STARTUP_HUB_ASOF is well within 100 days', () => {
    const anchor = new Date(STARTUP_HUB_ASOF).getTime();
    jest.useFakeTimers().setSystemTime(anchor + 50 * DAY);
    const result = getCheck('startup-hub-asof-fresh').run() as { ok: boolean; detail: string };
    expect(result.ok).toBe(true);
  });

  it('fails once STARTUP_HUB_ASOF is older than 100 days', () => {
    const anchor = new Date(STARTUP_HUB_ASOF).getTime();
    jest.useFakeTimers().setSystemTime(anchor + 150 * DAY);
    const result = getCheck('startup-hub-asof-fresh').run() as { ok: boolean; detail: string };
    expect(result.ok).toBe(false);
  });
});

describe('report-cards-quarter-fresh (quartersElapsedSince)', () => {
  it('computes 0 quarters elapsed for the current quarter', () => {
    expect(quartersElapsedSince('Q3 2026', new Date('2026-08-13'))).toBe(0);
  });

  it('computes elapsed quarters across a year boundary', () => {
    expect(quartersElapsedSince('Q4 2025', new Date('2026-08-13'))).toBe(3);
  });

  it('returns null for an unparseable label', () => {
    expect(quartersElapsedSince('not-a-quarter')).toBeNull();
  });

  it('passes when REPORT_CARDS_QUARTER_ASSESSED is within 2 quarters', () => {
    const elapsed = quartersElapsedSince(REPORT_CARDS_QUARTER_ASSESSED, new Date());
    // Anchor "now" at exactly the assessed quarter so this test doesn't rot.
    const [, q, y] = /^Q([1-4]) (\d{4})$/.exec(REPORT_CARDS_QUARTER_ASSESSED)!;
    const anchorMonth = (parseInt(q, 10) - 1) * 3;
    jest.useFakeTimers().setSystemTime(new Date(parseInt(y, 10), anchorMonth, 15));
    const result = getCheck('report-cards-quarter-fresh').run() as { ok: boolean; detail: string };
    expect(result.ok).toBe(true);
    void elapsed;
  });

  it('fails once REPORT_CARDS_QUARTER_ASSESSED is more than 2 quarters old', () => {
    const [, q, y] = /^Q([1-4]) (\d{4})$/.exec(REPORT_CARDS_QUARTER_ASSESSED)!;
    const futureMonth = (parseInt(q, 10) - 1) * 3;
    jest.useFakeTimers().setSystemTime(new Date(parseInt(y, 10) + 1, futureMonth, 15));
    const result = getCheck('report-cards-quarter-fresh').run() as { ok: boolean; detail: string };
    expect(result.ok).toBe(false);
  });
});

describe('job-postings-fresh', () => {
  it('passes when the freshest posting is under 3 days old', async () => {
    mockPrisma.spaceJobPosting.findFirst.mockResolvedValueOnce({ postedDate: new Date(Date.now() - 1 * HOUR) });
    const result = await getCheck('job-postings-fresh').run();
    expect(result.ok).toBe(true);
  });

  it('fails when the freshest posting is over 3 days old', async () => {
    mockPrisma.spaceJobPosting.findFirst.mockResolvedValueOnce({ postedDate: new Date(Date.now() - 4 * DAY) });
    const result = await getCheck('job-postings-fresh').run();
    expect(result.ok).toBe(false);
  });

  it('fails when there are no job postings at all', async () => {
    mockPrisma.spaceJobPosting.findFirst.mockResolvedValueOnce(null);
    const result = await getCheck('job-postings-fresh').run();
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('No SpaceJobPosting rows found');
  });
});

describe('news-articles-fresh', () => {
  it('passes when the freshest article is under 12h old', async () => {
    mockPrisma.newsArticle.findFirst.mockResolvedValueOnce({ publishedAt: new Date(Date.now() - 2 * HOUR) });
    const result = await getCheck('news-articles-fresh').run();
    expect(result.ok).toBe(true);
  });

  it('fails when the freshest article is over 12h old', async () => {
    mockPrisma.newsArticle.findFirst.mockResolvedValueOnce({ publishedAt: new Date(Date.now() - 20 * HOUR) });
    const result = await getCheck('news-articles-fresh').run();
    expect(result.ok).toBe(false);
  });
});

describe('ai-insights-fresh', () => {
  it('passes when the freshest insight is under 48h old', async () => {
    mockPrisma.aIInsight.findFirst.mockResolvedValueOnce({ generatedAt: new Date(Date.now() - 10 * HOUR) });
    const result = await getCheck('ai-insights-fresh').run();
    expect(result.ok).toBe(true);
  });

  it('fails when the freshest insight is over 48h old', async () => {
    mockPrisma.aIInsight.findFirst.mockResolvedValueOnce({ generatedAt: new Date(Date.now() - 72 * HOUR) });
    const result = await getCheck('ai-insights-fresh').run();
    expect(result.ok).toBe(false);
  });
});

describe('artemis-tracker-freshness', () => {
  it('passes when the freshest Artemis-matching article is under 7 days old', async () => {
    mockGetArtemisNewsArticles.mockResolvedValueOnce([
      { title: 'Artemis III milestone update', publishedAt: new Date(Date.now() - 2 * DAY) },
    ]);
    const result = await getCheck('artemis-tracker-freshness').run();
    expect(result.ok).toBe(true);
    expect(mockGetArtemisNewsArticles).toHaveBeenCalledWith(1);
  });

  it('fails when the freshest Artemis-matching article is over 7 days old', async () => {
    mockGetArtemisNewsArticles.mockResolvedValueOnce([
      { title: 'Artemis III milestone update', publishedAt: new Date(Date.now() - 10 * DAY) },
    ]);
    const result = await getCheck('artemis-tracker-freshness').run();
    expect(result.ok).toBe(false);
  });

  it('fails when there are no Artemis-matching articles at all', async () => {
    mockGetArtemisNewsArticles.mockResolvedValueOnce([]);
    const result = await getCheck('artemis-tracker-freshness').run();
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('No Artemis-matching NewsArticle rows found');
  });
});

describe('starship-tracker-freshness', () => {
  it('passes when the freshest Starship-matching article is under 7 days old', async () => {
    mockGetStarshipNewsArticles.mockResolvedValueOnce([
      { title: 'Starship Flight 14 targets tower catch', publishedAt: new Date(Date.now() - 2 * DAY) },
    ]);
    const result = await getCheck('starship-tracker-freshness').run();
    expect(result.ok).toBe(true);
    expect(mockGetStarshipNewsArticles).toHaveBeenCalledWith(1);
  });

  it('fails when the freshest Starship-matching article is over 7 days old', async () => {
    mockGetStarshipNewsArticles.mockResolvedValueOnce([
      { title: 'Starship Flight 14 targets tower catch', publishedAt: new Date(Date.now() - 10 * DAY) },
    ]);
    const result = await getCheck('starship-tracker-freshness').run();
    expect(result.ok).toBe(false);
  });

  it('fails when there are no Starship-matching articles at all', async () => {
    mockGetStarshipNewsArticles.mockResolvedValueOnce([]);
    const result = await getCheck('starship-tracker-freshness').run();
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('No Starship-matching NewsArticle rows found');
  });
});

describe('published-briefs-fresh', () => {
  it('passes when the freshest brief is under 10 days old', async () => {
    mockPrisma.publishedBrief.findFirst.mockResolvedValueOnce({ publishedAt: new Date(Date.now() - 3 * DAY) });
    const result = await getCheck('published-briefs-fresh').run();
    expect(result.ok).toBe(true);
  });

  it('fails when the freshest brief is over 10 days old', async () => {
    mockPrisma.publishedBrief.findFirst.mockResolvedValueOnce({ publishedAt: new Date(Date.now() - 14 * DAY) });
    const result = await getCheck('published-briefs-fresh').run();
    expect(result.ok).toBe(false);
  });

  it('fails when there are no PublishedBrief rows at all', async () => {
    mockPrisma.publishedBrief.findFirst.mockResolvedValueOnce(null);
    const result = await getCheck('published-briefs-fresh').run();
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('No PublishedBrief rows found');
  });

  it('passes (skips) when the PublishedBrief table does not exist yet', async () => {
    mockPrisma.publishedBrief.findFirst.mockRejectedValueOnce(new Error('relation "PublishedBrief" does not exist'));
    const result = await getCheck('published-briefs-fresh').run();
    expect(result.ok).toBe(true);
    expect(result.detail).toContain('not migrated yet');
  });
});

describe('runContentAccuracyChecks', () => {
  it('captures a thrown error from a check as a failing result instead of throwing', async () => {
    const checks: AccuracyCheckDef[] = [
      { id: 'boom', label: 'Always throws', run: () => { throw new Error('kaboom'); } },
      { id: 'fine', label: 'Always passes', run: () => ({ ok: true, detail: 'all good' }) },
    ];
    const results = await runContentAccuracyChecks(checks);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ id: 'boom', ok: false });
    expect(results[0].detail).toContain('kaboom');
    expect(results[1]).toMatchObject({ id: 'fine', ok: true });
  });
});

describe('runContentAccuracySentinel', () => {
  it('sends exactly one summary alert when at least one check fails', async () => {
    const checks: AccuracyCheckDef[] = [
      { id: 'ok-check', label: 'ok', run: () => ({ ok: true, detail: 'fine' }) },
      { id: 'bad-check', label: 'bad', run: () => ({ ok: false, detail: 'broken' }) },
    ];
    const result = await runContentAccuracySentinel(checks);
    expect(result.failedCount).toBe(1);
    expect(mockSendFreshnessAlert).toHaveBeenCalledTimes(1);
    expect(mockSendFreshnessAlert.mock.calls[0][0]).toContain('bad-check');
  });

  it('sends no alert when every check passes', async () => {
    const checks: AccuracyCheckDef[] = [
      { id: 'ok-check-1', label: 'ok', run: () => ({ ok: true, detail: 'fine' }) },
      { id: 'ok-check-2', label: 'ok', run: () => ({ ok: true, detail: 'fine' }) },
    ];
    const result = await runContentAccuracySentinel(checks);
    expect(result.failedCount).toBe(0);
    expect(mockSendFreshnessAlert).not.toHaveBeenCalled();
  });

  it('does not throw if sendFreshnessAlert itself rejects', async () => {
    mockSendFreshnessAlert.mockRejectedValueOnce(new Error('resend down'));
    const checks: AccuracyCheckDef[] = [
      { id: 'bad-check', label: 'bad', run: () => ({ ok: false, detail: 'broken' }) },
    ];
    await expect(runContentAccuracySentinel(checks)).resolves.toMatchObject({ failedCount: 1 });
  });
});
