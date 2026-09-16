/**
 * @jest-environment node
 */
/**
 * A resumable sweep that gets cut short must not read as a dead feed
 * (2026-09-16).
 *
 * The funding-feed liveness check used to read only the NEWEST DataSourceRun
 * row. That is wrong for any sweep which walks a roster a slice at a time and
 * is driven by an HTTP request a platform edge will cut after a few minutes:
 * the cut leaves a startedAt with no finishedAt, so the newest row is very
 * often a killed one while the feed is perfectly healthy. On 2026-09-16 the
 * USAspending sweep had written 11,612 verified awards across 173 companies
 * and the alarm still called it dead, which also dragged
 * `research-still-sellable` red on a product that was on sale.
 *
 * An alarm that cannot clear is one nobody reads. Same failure as the
 * security test that failed one run in three, and as the money clamp that
 * reported caught abuse as our own bug.
 *
 * The rule these tests pin: a feed is alive when a run COMPLETED SUCCESSFULLY
 * inside its window. A killed attempt alongside a recent success is noise. A
 * killed attempt with no success in the window is still a failure.
 */
import { CONTENT_ACCURACY_CHECKS } from '@/lib/content-accuracy';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dataSourceRun: { findMany: jest.fn() },
    // The check also asserts the TABLE is still filling, not just that the
    // run ledger is green — a sweep can run clean forever while writing
    // nothing. These stubs keep that half satisfied so each test isolates
    // the run-ledger rule it is actually about.
    fundingRound: {
      count: jest.fn().mockResolvedValue(220),
      findFirst: jest.fn().mockResolvedValue({ createdAt: new Date(), sourceUrl: 'https://example.gov/x' }),
    },
  },
}));

const db = jest.requireMock('@/lib/db').default;

function run(overrides: Partial<{ startedAt: Date; finishedAt: Date | null; ok: boolean; error: string | null; itemsWritten: number }>) {
  return {
    startedAt: new Date(Date.now() - 3600_000),
    finishedAt: new Date(Date.now() - 3000_000),
    ok: true,
    error: null,
    itemsWritten: 50,
    ...overrides,
  };
}

async function runFeedCheck() {
  const check = CONTENT_ACCURACY_CHECKS.find((c) => c.id === 'funding-feeds-alive');
  if (!check) throw new Error('funding-feeds-alive check not registered');
  return check.run();
}

describe('funding feed liveness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stays GREEN when the latest attempt was killed but a recent run succeeded', async () => {
    // Newest row killed (no finishedAt), previous row a clean success.
    db.dataSourceRun.findMany.mockResolvedValue([
      run({ finishedAt: null, ok: false }),
      run({ ok: true, itemsWritten: 6141 }),
    ]);
    const res = await runFeedCheck();
    expect(res.ok).toBe(true);
    // The cut attempt is still surfaced, just not as a failure.
    expect(res.detail).toMatch(/cut short/i);
  });

  it('goes RED when the sweep has been killed every time and never completed', async () => {
    db.dataSourceRun.findMany.mockResolvedValue([
      run({ finishedAt: null, ok: false }),
      run({ finishedAt: null, ok: false }),
    ]);
    const res = await runFeedCheck();
    expect(res.ok).toBe(false);
    expect(res.detail).toMatch(/no run has ever completed/i);
  });

  it('goes RED when the last SUCCESS is older than the feed policy allows', async () => {
    const old = new Date(Date.now() - 40 * 24 * 3600_000);
    db.dataSourceRun.findMany.mockResolvedValue([
      run({ startedAt: old, finishedAt: old, ok: true }),
    ]);
    const res = await runFeedCheck();
    expect(res.ok).toBe(false);
    expect(res.detail).toMatch(/SUCCESSFUL run/i);
  });

  it('goes RED when a feed has never run at all', async () => {
    db.dataSourceRun.findMany.mockResolvedValue([]);
    const res = await runFeedCheck();
    expect(res.ok).toBe(false);
    expect(res.detail).toMatch(/never run/i);
  });
});
