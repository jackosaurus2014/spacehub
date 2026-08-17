/**
 * Tests for src/lib/ceo-brief.ts — the weekly founder CEO brief backing
 * /api/cron/ceo-brief. Covers pure composition (all five sections, delta
 * formatting, null-metric honesty), week-over-week snapshot diffing, the
 * per-week idempotency marker, the RESEND guard, and per-source error
 * isolation. Resend is always mocked — no real email can be sent from tests.
 */

const mockResendSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dynamicContent: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
    spaceJobPosting: { count: jest.fn() },
    fundingRound: { count: jest.fn() },
    newsletterSubscriber: { count: jest.fn() },
    adCampaign: { count: jest.fn() },
    feedbackSubmission: { count: jest.fn() },
  },
}));

const mockGetGrowthSnapshot = jest.fn();
jest.mock('@/lib/growth-metrics', () => ({
  getGrowthSnapshot: (...args: unknown[]) => mockGetGrowthSnapshot(...args),
}));

const mockRunChecks = jest.fn();
jest.mock('@/lib/content-accuracy', () => ({
  runContentAccuracyChecks: (...args: unknown[]) => mockRunChecks(...args),
}));

const mockGetCronJobStatus = jest.fn();
jest.mock('@/lib/cron-scheduler', () => ({
  getCronJobStatus: (...args: unknown[]) => mockGetCronJobStatus(...args),
}));

import prisma from '@/lib/db';
import { FOUNDER_EMAIL } from '@/lib/constants';
import {
  collectCeoBriefData,
  composeCeoBriefEmail,
  processCeoBrief,
  getCeoBriefMarkerKey,
  getCeoBriefSnapshotKey,
  formatWeekOfLabel,
  type CeoBriefData,
} from '@/lib/ceo-brief';

const mockPrisma = prisma as unknown as {
  dynamicContent: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
  spaceJobPosting: { count: jest.Mock };
  fundingRound: { count: jest.Mock };
  newsletterSubscriber: { count: jest.Mock };
  adCampaign: { count: jest.Mock };
  feedbackSubmission: { count: jest.Mock };
};

// A Wednesday — its week's Monday is 2026-08-10.
const NOW = new Date('2026-08-12T13:37:00.000Z');

const HEALTHY_CRON_STATUS = {
  schedulerUpSince: '2026-08-10T00:00:00.000Z',
  uptimeMinutes: 3600,
  jobs: [
    { label: 'news-fetch', schedule: '*/5 * * * *', lastSuccessAt: '2026-08-12T13:30:00.000Z', lastFailureAt: null, lastError: null, consecutiveFailures: 0, totalRuns: 100, totalFailures: 0, isStale: false, staleAfterMinutes: 20 },
  ],
  summary: { total: 1, healthy: 1, stale: 0, failing: 0 },
};

const GROWTH = {
  generatedAt: NOW.toISOString(),
  mau: 1500,
  wau: 600,
  searchClicks: 250,
  searchImpressions: 9000,
  goal: { target: 10_000, milestones: [], currentTarget: 900, onTrack: true },
  errors: [] as string[],
};

function primeHappyPath() {
  mockGetGrowthSnapshot.mockResolvedValue({ ...GROWTH });
  mockRunChecks.mockResolvedValue([
    { id: 'news-articles-fresh', label: 'News crons alive', ok: true, detail: 'fresh' },
  ]);
  mockGetCronJobStatus.mockReturnValue(HEALTHY_CRON_STATUS);
  mockPrisma.dynamicContent.findUnique.mockResolvedValue(null);
  mockPrisma.dynamicContent.findMany.mockResolvedValue([]);
  mockPrisma.dynamicContent.upsert.mockResolvedValue({});
  mockPrisma.spaceJobPosting.count.mockResolvedValue(320);
  mockPrisma.fundingRound.count.mockResolvedValue(4);
  mockPrisma.newsletterSubscriber.count
    .mockResolvedValueOnce(180) // total
    .mockResolvedValueOnce(12); // new this week
  mockPrisma.adCampaign.count.mockResolvedValue(2);
  mockPrisma.feedbackSubmission.count
    .mockResolvedValueOnce(7) // new this week
    .mockResolvedValueOnce(3); // unreviewed
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.RESEND_API_KEY;
});

afterAll(() => {
  delete process.env.RESEND_API_KEY;
});

// ---------------------------------------------------------------------------
// Keys & labels
// ---------------------------------------------------------------------------

describe('week keys', () => {
  it('anchors marker + snapshot keys and label to the week Monday (UTC)', () => {
    expect(getCeoBriefMarkerKey(NOW)).toBe('ceo-brief:sent:2026-08-10');
    expect(getCeoBriefSnapshotKey(NOW)).toBe('ceo-brief:snapshot:2026-08-10');
    expect(formatWeekOfLabel(NOW)).toBe('August 10, 2026');
  });

  it('treats any day in the same calendar week as the same run', () => {
    const sunday = new Date('2026-08-16T23:59:00.000Z');
    expect(getCeoBriefMarkerKey(sunday)).toBe('ceo-brief:sent:2026-08-10');
  });
});

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

describe('collectCeoBriefData', () => {
  it('computes week-over-week deltas against the most recent prior snapshot', async () => {
    primeHappyPath();
    mockPrisma.dynamicContent.findMany.mockResolvedValue([
      {
        contentKey: 'ceo-brief:snapshot:2026-08-03',
        data: JSON.stringify({
          weekKey: '2026-08-03',
          generatedAt: '2026-08-03T13:37:00.000Z',
          mau: 1400,
          wau: 650,
          searchClicks: 200,
          searchImpressions: 8000,
          newsletterSubscribers: 170,
        }),
      },
    ]);

    const data = await collectCeoBriefData(NOW);

    expect(data.deltas.mau).toBe(100); // 1500 - 1400
    expect(data.deltas.wau).toBe(-50); // 600 - 650
    expect(data.deltas.searchClicks).toBe(50);
    expect(data.deltas.searchImpressions).toBe(1000);
    expect(data.deltas.newsletterSubscribers).toBe(10); // 180 - 170
    expect(data.priorSnapshot?.weekKey).toBe('2026-08-03');
    // Prior-snapshot lookup must exclude the current week's key
    expect(mockPrisma.dynamicContent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          module: 'ceo-brief',
          section: 'snapshot',
          contentKey: { lt: 'ceo-brief:snapshot:2026-08-10' },
        }),
      })
    );
  });

  it('returns null deltas on the first recorded week', async () => {
    primeHappyPath();
    const data = await collectCeoBriefData(NOW);
    expect(data.priorSnapshot).toBeNull();
    expect(data.deltas).toEqual({
      mau: null,
      wau: null,
      searchClicks: null,
      searchImpressions: null,
      newsletterSubscribers: null,
    });
  });

  it('isolates a failing business-signal source instead of crashing the brief', async () => {
    primeHappyPath();
    mockPrisma.spaceJobPosting.count.mockRejectedValue(new Error('relation missing'));

    const data = await collectCeoBriefData(NOW);

    expect(data.business.jobsSyncedThisWeek).toBeNull();
    expect(data.business.fundingRoundsThisWeek).toBe(4);
    expect(data.errors.some((e) => e.startsWith('jobs:'))).toBe(true);
  });

  it('treats a missing FeedbackSubmission table as a soft miss (nulls, no error)', async () => {
    primeHappyPath();
    mockPrisma.feedbackSubmission.count.mockReset();
    mockPrisma.feedbackSubmission.count.mockRejectedValue(new Error('table does not exist'));

    const data = await collectCeoBriefData(NOW);

    expect(data.business.feedbackNewThisWeek).toBeNull();
    expect(data.business.feedbackUnreviewed).toBeNull();
    expect(data.errors.some((e) => e.includes('feedback'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Composition (pure)
// ---------------------------------------------------------------------------

function makeData(overrides: Partial<CeoBriefData> = {}): CeoBriefData {
  return {
    weekKey: '2026-08-10',
    weekOfLabel: 'August 10, 2026',
    growth: { ...GROWTH },
    priorSnapshot: null,
    deltas: { mau: 100, wau: -50, searchClicks: null, searchImpressions: null, newsletterSubscribers: 10 },
    sentinel: [
      { id: 'news-articles-fresh', label: 'News crons alive', ok: true, detail: 'fresh' },
    ],
    pipeline: {
      summary: { total: 60, healthy: 58, stale: 1, failing: 1 },
      schedulerUpSince: '2026-08-10T00:00:00.000Z',
      staleJobs: [{ label: 'ats-jobs-refresh', lastSuccessAt: '2026-08-09T06:30:00.000Z' }],
      failingJobs: [{ label: 'ai-insights', lastError: 'HTTP 500: no credits', consecutiveFailures: 3 }],
    },
    business: {
      jobsSyncedThisWeek: 320,
      fundingRoundsThisWeek: 4,
      newsletterSubscribers: 180,
      newsletterNewThisWeek: 12,
      pendingAdCampaigns: 2,
      feedbackNewThisWeek: 7,
      feedbackUnreviewed: 3,
    },
    errors: [],
    ...overrides,
  };
}

describe('composeCeoBriefEmail', () => {
  it('uses the mandated subject line', () => {
    const email = composeCeoBriefEmail(makeData());
    expect(email.subject).toBe('SpaceNexus CEO Brief — Week of August 10, 2026');
  });

  it('renders all five sections in both html and text', () => {
    const email = composeCeoBriefEmail(makeData());
    for (const heading of ['Growth vs goal', 'Content-accuracy sentinel', 'Pipeline health', 'Business signals', 'Gated on you']) {
      expect(email.html).toContain(heading);
    }
    for (const heading of ['GROWTH VS GOAL', 'SENTINEL', 'PIPELINE HEALTH', 'BUSINESS SIGNALS', 'GATED ON YOU']) {
      expect(email.text).toContain(heading);
    }
  });

  it('shows on-track status and formatted WoW deltas', () => {
    const email = composeCeoBriefEmail(makeData());
    expect(email.html).toContain('ON TRACK');
    expect(email.html).toContain('+100');
    expect(email.html).toContain('-50');
    expect(email.text).toContain('+100');
  });

  it('marks the growth section BEHIND when under the curve', () => {
    const email = composeCeoBriefEmail(
      makeData({ growth: { ...GROWTH, mau: 500, goal: { ...GROWTH.goal, currentTarget: 900, onTrack: false } } })
    );
    expect(email.html).toContain('BEHIND');
  });

  it('lists failing sentinel checks with their details', () => {
    const email = composeCeoBriefEmail(
      makeData({
        sentinel: [
          { id: 'news-articles-fresh', label: 'News', ok: true, detail: 'fresh' },
          { id: 'feedback-review-cadence', label: 'Feedback reviewed', ok: false, detail: 'Oldest "new" is 9.2 days old' },
        ],
      })
    );
    expect(email.html).toContain('feedback-review-cadence');
    expect(email.html).toContain('9.2 days old');
    expect(email.text).toContain('✗ feedback-review-cadence');
  });

  it('celebrates a clean sentinel run', () => {
    const email = composeCeoBriefEmail(makeData());
    expect(email.html).toContain('All 1 content-accuracy checks passing');
  });

  it('surfaces stale and failing cron jobs by label', () => {
    const email = composeCeoBriefEmail(makeData());
    expect(email.html).toContain('ats-jobs-refresh');
    expect(email.html).toContain('ai-insights');
    expect(email.text).toContain('STALE ats-jobs-refresh');
    expect(email.text).toContain('FAILING ai-insights (3x)');
  });

  it('adds dynamic gated-on-you items for pending ads and unreviewed feedback', () => {
    const email = composeCeoBriefEmail(makeData());
    expect(email.html).toContain('2 ad campaign(s) awaiting review');
    expect(email.html).toContain('/advertise/dashboard');
    expect(email.html).toContain('3 feedback submission(s) unreviewed');
    expect(email.html).toContain('/admin?tab=feedback');
  });

  it('omits dynamic gated items at zero but keeps the standing checklist', () => {
    const email = composeCeoBriefEmail(
      makeData({
        business: {
          ...makeData().business,
          pendingAdCampaigns: 0,
          feedbackUnreviewed: 0,
        },
      })
    );
    expect(email.html).not.toContain('awaiting review');
    expect(email.html).not.toContain('unreviewed');
    expect(email.html).toContain('Search Console');
  });

  it('renders null metrics honestly as n/a and lists collection errors', () => {
    const email = composeCeoBriefEmail(
      makeData({
        growth: { ...GROWTH, mau: null, wau: null, searchClicks: null, searchImpressions: null, goal: { ...GROWTH.goal, onTrack: null } },
        deltas: { mau: null, wau: null, searchClicks: null, searchImpressions: null, newsletterSubscribers: null },
        business: { ...makeData().business, jobsSyncedThisWeek: null },
        errors: ['growth: GOOGLE_METRICS_CREDENTIALS is not configured'],
      })
    );
    expect(email.html).toContain('n/a');
    expect(email.html).toContain('UNKNOWN');
    expect(email.html).toContain('Data-collection notes');
    expect(email.html).toContain('GOOGLE_METRICS_CREDENTIALS');
  });
});

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

describe('processCeoBrief', () => {
  it('skips when the weekly marker already exists', async () => {
    mockPrisma.dynamicContent.findUnique.mockResolvedValue({ contentKey: 'ceo-brief:sent:2026-08-10' });

    const result = await processCeoBrief(NOW);

    expect(result.skipped).toBe(true);
    expect(result.sent).toBe(false);
    expect(mockGetGrowthSnapshot).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(mockPrisma.dynamicContent.upsert).not.toHaveBeenCalled();
  });

  it('without RESEND_API_KEY: computes, persists snapshot + marker, sends nothing', async () => {
    primeHappyPath();

    const result = await processCeoBrief(NOW);

    expect(result.skipped).toBe(false);
    expect(result.sent).toBe(false);
    expect(mockResendSend).not.toHaveBeenCalled();

    const upsertKeys = mockPrisma.dynamicContent.upsert.mock.calls.map(
      (c) => c[0].where.contentKey
    );
    expect(upsertKeys).toEqual([
      'ceo-brief:snapshot:2026-08-10',
      'ceo-brief:sent:2026-08-10',
    ]);

    // Snapshot payload carries this week's metrics for next week's deltas
    const snapshotCall = mockPrisma.dynamicContent.upsert.mock.calls[0][0];
    const stored = JSON.parse(snapshotCall.create.data);
    expect(stored).toMatchObject({ weekKey: '2026-08-10', mau: 1500, wau: 600, newsletterSubscribers: 180 });
  });

  it('with RESEND_API_KEY: sends one email to the founder inbox', async () => {
    primeHappyPath();
    process.env.RESEND_API_KEY = 'test-key';
    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    const result = await processCeoBrief(NOW);

    expect(result.sent).toBe(true);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const args = mockResendSend.mock.calls[0][0];
    expect(args.to).toBe(FOUNDER_EMAIL);
    expect(args.subject).toBe('SpaceNexus CEO Brief — Week of August 10, 2026');
    expect(args.html).toContain('Growth vs goal');
  });

  it('on a Resend failure: records the error, keeps the snapshot, WITHHOLDS the marker so catch-up retries', async () => {
    // Semantics fixed 8/17: the 2026-08-17 brief hit a transient Resend
    // error, the marker was written anyway, and the week was silently
    // skipped forever. A failed send with a key present must leave the
    // marker absent (snapshot still persists — it's idempotent on retry).
    primeHappyPath();
    process.env.RESEND_API_KEY = 'test-key';
    mockResendSend.mockResolvedValue({ data: null, error: { message: 'quota exceeded' } });

    const result = await processCeoBrief(NOW);

    expect(result.sent).toBe(false);
    expect(result.errors.some((e) => e.includes('quota exceeded'))).toBe(true);
    const upsertKeys = mockPrisma.dynamicContent.upsert.mock.calls.map(
      (c) => c[0].where.contentKey
    );
    expect(upsertKeys).toContain('ceo-brief:snapshot:2026-08-10');
    expect(upsertKeys).not.toContain('ceo-brief:sent:2026-08-10');
  });

  it('without RESEND_API_KEY: still advances the marker (documented compute-only mode)', async () => {
    primeHappyPath();
    delete process.env.RESEND_API_KEY;

    const result = await processCeoBrief(NOW);

    expect(result.sent).toBe(false);
    const upsertKeys = mockPrisma.dynamicContent.upsert.mock.calls.map(
      (c) => c[0].where.contentKey
    );
    expect(upsertKeys).toContain('ceo-brief:sent:2026-08-10');
  });

  it('reports sentinel failure count in the run result', async () => {
    primeHappyPath();
    mockRunChecks.mockResolvedValue([
      { id: 'a', label: 'A', ok: true, detail: 'ok' },
      { id: 'b', label: 'B', ok: false, detail: 'bad' },
      { id: 'c', label: 'C', ok: false, detail: 'bad' },
    ]);

    const result = await processCeoBrief(NOW);
    expect(result.sentinelFailures).toBe(2);
  });
});
