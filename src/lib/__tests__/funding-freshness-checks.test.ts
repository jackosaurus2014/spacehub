/**
 * @jest-environment node
 *
 * The two funding checks in src/lib/content-accuracy.ts.
 *
 * They exist because of a specific incident: two FCC fetchers sat dead for
 * weeks behind a swallowed 403 and read as healthy the whole time, because
 * "wrote nothing" and "found nothing" looked identical. The Research tier is
 * sold on funding depth, so these tests pin the distinction.
 */
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/freshness-alerts', () => ({
  sendFreshnessAlert: jest.fn(),
  resolveFreshnessAlertsByPrefix: jest.fn(async () => 0),
}));
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dataSourceRun: { findFirst: jest.fn() },
    fundingRound: { findFirst: jest.fn(), count: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import { CONTENT_ACCURACY_CHECKS, runContentAccuracyChecks } from '@/lib/content-accuracy';

const db = prisma as unknown as {
  dataSourceRun: { findFirst: jest.Mock };
  fundingRound: { findFirst: jest.Mock; count: jest.Mock };
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function check(id: string) {
  const def = CONTENT_ACCURACY_CHECKS.find((c) => c.id === id);
  if (!def) throw new Error(`check "${id}" is not registered`);
  return def;
}

async function run(id: string) {
  const [result] = await runContentAccuracyChecks([check(id)]);
  return result;
}

/** A run row shaped like a healthy sweep that finished `ageDays` ago. */
function healthyRun(ageDays: number, itemsWritten = 6) {
  return {
    startedAt: new Date(Date.now() - ageDays * DAY),
    finishedAt: new Date(Date.now() - ageDays * DAY + HOUR),
    ok: true,
    error: null,
    itemsWritten,
    httpErrors: 0,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  db.dataSourceRun.findFirst.mockResolvedValue(healthyRun(1));
  db.fundingRound.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 2 * DAY) });
  db.fundingRound.count.mockResolvedValue(0);
});

describe('funding-feeds-alive', () => {
  it('is registered on the daily checklist', () => {
    expect(check('funding-feeds-alive').label).toMatch(/silently-dead/i);
  });

  it('passes when both feeds ran recently and the table is growing', async () => {
    const result = await run('funding-feeds-alive');
    expect(result.ok).toBe(true);
    expect(result.detail).toMatch(/funding feed\(s\) alive/);
  });

  it('fails when a feed has never run at all', async () => {
    db.dataSourceRun.findFirst.mockResolvedValue(null);
    const result = await run('funding-feeds-alive');
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/has never run/);
  });

  it('fails when the last run never finished', async () => {
    db.dataSourceRun.findFirst.mockResolvedValue({ ...healthyRun(1), finishedAt: null });
    const result = await run('funding-feeds-alive');
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/never finished/);
  });

  it('surfaces the verbatim error of a failed run', async () => {
    db.dataSourceRun.findFirst.mockResolvedValue({
      ...healthyRun(1),
      ok: false,
      itemsWritten: 0,
      httpErrors: 12,
      error: 'HTTP 403 https://efts.sec.gov/LATEST/search-index\n  at secFetch',
    });
    const result = await run('funding-feeds-alive');
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('HTTP 403');
    expect(result.detail).not.toContain('at secFetch');
  });

  it('fails when the last successful run is older than the policy window', async () => {
    db.dataSourceRun.findFirst.mockResolvedValue(healthyRun(40));
    const result = await run('funding-feeds-alive');
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/last successful run/);
  });

  it('fails when the feeds look fine but the table has stopped growing', async () => {
    db.fundingRound.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 120 * DAY) });
    const result = await run('funding-feeds-alive');
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/nothing is filling the table/);
  });

  it('fails when FundingRound is empty', async () => {
    db.fundingRound.findFirst.mockResolvedValue(null);
    const result = await run('funding-feeds-alive');
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/EMPTY/);
  });
});

describe('funding-rows-cite-a-source', () => {
  it('passes when every recent row cites a source and nothing is silently null', async () => {
    db.fundingRound.count
      .mockResolvedValueOnce(14) // recent
      .mockResolvedValueOnce(0) // unsourced
      .mockResolvedValueOnce(0); // amount null without amountUndisclosed
    const result = await run('funding-rows-cite-a-source');
    expect(result.ok).toBe(true);
  });

  it('fails when a new row was added without a source URL', async () => {
    db.fundingRound.count
      .mockResolvedValueOnce(14)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);
    const result = await run('funding-rows-cite-a-source');
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/3 of 14 FundingRound rows/);
  });

  it('fails when a NULL amount is not flagged as undisclosed', async () => {
    db.fundingRound.count
      .mockResolvedValueOnce(14)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(5);
    const result = await run('funding-rows-cite-a-source');
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/amountUndisclosed/);
  });
});
